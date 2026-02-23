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
    minAmount?: string;
    maxAmount?: string;
    paymentMode?: string;
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
        if (filters.paymentMode && filters.paymentMode !== 'all') query = query.eq('payment_method', filters.paymentMode);
        if (filters.minAmount) query = query.gte('total_amount', parseFloat(filters.minAmount));
        if (filters.maxAmount) query = query.lte('total_amount', parseFloat(filters.maxAmount));
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

    // 2. Perform Atomic Order Creation via RPC
    const { data: orderId, error: rpcError } = await supabase.rpc('create_order_with_ledger', {
        p_tenant_id: tenantId,
        p_customer_id: customerId,
        p_driver_id: finalDriverId,
        p_cylinders_count: cylindersCount,
        p_total_amount: totalAmount,
        p_status: isUnassigned ? 'pending' : 'assigned',
        p_created_by: user.id,
        p_product_name: productName,
        p_price: price,
        p_cylinder_ids: targetCylinderIds,
        p_is_unassigned: isUnassigned
    });

    if (rpcError) {
        console.error("Create Order RPC Error:", rpcError);
        return {
            error: `Failed to create order: ${rpcError.message}`,
            details: (rpcError as any).details,
            hint: (rpcError as any).hint
        };
    }

    revalidatePath("/admin/orders");
    return { success: true, orderId: orderId, assignedSerials };
}

/**
 * 4. SECURE BULK ASSIGN ORDERS
 * Uses the atomic Postgres RPC: bulk_assign_orders
 */
export async function bulkAssignOrders(orderIds: string[], driverId: string) {
    const supabase = await createClient();

    // 1. Session & Metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Authentication required" };

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
        console.error("CRITICAL: Tenant ID missing in bulkAssignOrders");
        return { success: false, error: "Unauthorized: Tenant Context Missing" };
    }

    if (!orderIds || orderIds.length === 0) {
        return { success: false, error: "No orders selected for assignment." };
    }

    if (!driverId) {
        return { success: false, error: "Driver must be explicitly selected." };
    }

    // 2. Execute Atomic RPC
    const { data, error } = await supabase.rpc('bulk_assign_orders', {
        p_order_ids: orderIds,
        p_driver_id: driverId,
        p_tenant_id: tenantId
    });

    if (error) {
        console.error("Bulk Assignment Failed:", error);
        return { success: false, error: error.message || "Failed to assign orders. Check driver capacity." };
    }

    // 3. Clear Cache
    revalidatePath("/admin/orders");
    return { success: true, data };
}
