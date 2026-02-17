"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * ORDER ACTIONS - DOUBLE-LOCK SECURITY
 */

export async function getOrders(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    driverId?: string;
}) {
    const supabase = await createClient();

    // 1. Session & Metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return [];

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
        console.error("CRITICAL: Tenant ID missing in getOrders");
        return [];
    }

    // 2. Build Query
    let query = supabase
        .from("orders")
        .select(`
            *,
            customers (name, address),
            driver:users (name)
        `)
        .eq("tenant_id", tenantId) // Double Lock
        .order("created_at", { ascending: false });

    // 3. Apply Filters
    if (filters) {
        if (filters.startDate) query = query.gte('created_at', filters.startDate);
        if (filters.endDate) {
            // Adjust end date to end of day if needed, or just standard comparison
            // Assuming ISO string passed
            query = query.lte('created_at', filters.endDate);
        }
        if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
        if (filters.driverId && filters.driverId !== 'all') query = query.eq('driver_id', filters.driverId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching orders:", error);
        return [];
    }

    return data || [];
}

// 3. SECURE CREATE ORDER (Full Transaction)
export async function createOrder(prevState: any, formData: FormData) {
    const supabase = await createClient();

    // 1. Session & Metadata
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (!user || !tenantId) {
        return { error: "Unauthorized: Tenant Context Missing" };
    }

    // Extract Data
    const customerId = formData.get("customer_id")?.toString();
    const driverId = formData.get("driver_id")?.toString();
    const cylindersCount = parseInt(formData.get("cylinders_count")?.toString() || "0");
    const totalAmount = parseFloat(formData.get("total_amount")?.toString() || "0");
    const productName = formData.get("product_name")?.toString() || "LPG Cylinder";
    const price = parseFloat(formData.get("price")?.toString() || "0");

    // Serials (Passed as JSON string)
    const serialsJson = formData.get("serials")?.toString();
    const explicitSerials: string[] = serialsJson ? JSON.parse(serialsJson) : [];

    // Validation
    if (!customerId) return { error: "Customer is required" };
    if (cylindersCount < 1) return { error: "Invalid Quantity" };

    // Valid Driver Check (Empty string = Unassigned)
    const isUnassigned = !driverId || driverId === '' || driverId === 'unassigned';
    const finalDriverId = isUnassigned ? null : driverId;

    // STOCK CHECK & SELECTION
    let targetCylinderIds: string[] = [];
    let assignedSerials: string[] = [];

    if (explicitSerials.length > 0) {
        // Validate explicit serials match quantity
        if (explicitSerials.length !== cylindersCount) {
            return { error: `Serial mismatch: Expected ${cylindersCount}, got ${explicitSerials.length}` };
        }

        // Fetch these specific cylinders to ensure they are in godown
        const { data: explicitStock, error: stockError } = await supabase
            .from('cylinders')
            .select('id, serial_number, current_location_type')
            .in('serial_number', explicitSerials)
            .eq('tenant_id', tenantId);

        if (stockError || !explicitStock) return { error: "Error verifying selected cylinders" };

        // Verify all are in godown
        const invalid = explicitStock.filter(c => c.current_location_type !== 'warehouse');
        if (invalid.length > 0) {
            return { error: `Some selected cylinders are not in Warehouse: ${invalid.map(c => c.serial_number).join(', ')}` };
        }

        targetCylinderIds = explicitStock.map(c => c.id);
        assignedSerials = explicitStock.map(c => c.serial_number);

    } else {
        // Auto-Selection (FIFO)
        // 1. Check Total Available
        const { count, error: countError } = await supabase
            .from('cylinders')
            .select('*', { count: 'exact', head: true })
            .eq('current_location_type', 'warehouse')
            .eq('status', 'full')
            .eq('tenant_id', tenantId);

        if (countError) return { error: "Failed to check stock levels" };

        const available = count || 0;
        if (available < cylindersCount) {
            return { error: `Cannot Dispatch ${cylindersCount}. Only ${available} Available in Warehouse.` };
        }

        // 2. Lock/Select N Cylinders
        const { data: autoStock, error: autoError } = await supabase
            .from('cylinders')
            .select('id, serial_number')
            .eq('current_location_type', 'warehouse')
            .eq('status', 'full')
            .eq('tenant_id', tenantId)
            .limit(cylindersCount);

        if (autoError || !autoStock || autoStock.length < cylindersCount) {
            return { error: "Race Condition: Stock changed during checkout. Please try again." };
        }

        targetCylinderIds = autoStock.map(c => c.id);
        assignedSerials = autoStock.map(c => c.serial_number);
    }

    // 2. Perform Updates
    // A. Create Order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            tenant_id: tenantId,
            customer_id: customerId,
            driver_id: finalDriverId, // Can be null
            cylinders_count: cylindersCount,
            total_amount: totalAmount,
            status: isUnassigned ? 'pending' : 'assigned', // Pending if no driver
            payment_method: 'pending',
            created_by: user.id
        })
        .select()
        .single();

    if (orderError) {
        console.error("Create Order Error:", orderError);
        return {
            error: `Failed to create order: ${orderError.message}`,
            details: orderError.details,
            hint: orderError.hint
        };
    }

    // B. Create Order Items
    const { error: itemError } = await supabase.from('order_items').insert({
        order_id: order.id,
        product_name: productName,
        quantity: cylindersCount,
        price: price
    });

    if (itemError) {
        console.error("Create Item Error:", itemError);
    }

    // C. Update Cylinders (Assign to Driver OR Reserve)
    const cylinderUpdate = isUnassigned ? {
        status: 'reserved',
        current_location_type: 'warehouse',
        current_holder_id: null,
        last_order_id: order.id,
        updated_at: new Date().toISOString()
    } : {
        status: 'full', // Already full
        current_location_type: 'driver',
        current_holder_id: finalDriverId,
        last_order_id: order.id,
        updated_at: new Date().toISOString()
    };

    const { error: cylinderError } = await supabase
        .from('cylinders')
        .update(cylinderUpdate)
        .in('id', targetCylinderIds)
        .eq('tenant_id', tenantId);

    if (cylinderError) {
        console.error("Cylinder Update Error:", cylinderError);
        return { error: "Order created but asset assignment failed. Please check system logs." };
    }

    revalidatePath("/admin/orders");
    return { success: true, orderId: order.id, assignedSerials };
}
