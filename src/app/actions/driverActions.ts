"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * DRIVER LOGISTICS ACTIONS - SECURE DOUBLE-LOCK
 */

// 0. FETCH DRIVER INVENTORY (New Schema)
export async function getDriverInventory() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { count: 0, cylinders: [] };
    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) return { count: 0, cylinders: [] };

    const { data, error, count } = await supabase
        .from('cylinders')
        .select('id, serial_number, size, status, current_location_type', { count: 'exact' })
        .eq('current_holder_id', user.id)
        .eq('current_location_type', 'driver')
        .eq('status', 'full') // Only count full cylinders available for delivery
        .eq('tenant_id', tenantId);

    if (error) {
        console.error("Fetch Driver Inventory Error:", error);
        return { count: 0, cylinders: [] };
    }

    return { count: count || 0, cylinders: data || [] };
}

// 1. FETCH MY ROUTE (Assigned Orders)
export async function getDriverOrders() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];
    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) return [];

    const { data, error } = await supabase
        .from('orders')
        .select(`
            id, 
            friendly_id,
            total_amount, 
            status, 
            created_at,
            customer_id,
            customers (name, address, phone, current_balance),
            order_items (product_name, quantity),
            cylinders (serial_number) 
        `)
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'on_trip', 'on-the-road', 'delivering']) // Active statuses
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Fetch Route Error:", error);
        return [];
    }
    return data || [];
}

// 2. START TRIP (Updates Status)
export async function startTrip(orderIds: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (!user || !tenantId) return { error: "Unauthorized" };

    if (!orderIds || orderIds.length === 0) return { error: "No orders selected" };

    const { error } = await supabase
        .from('orders')
        .update({ status: 'on_trip', trip_started_at: new Date().toISOString() })
        .in('id', orderIds)
        .eq('driver_id', user.id) // Security: Only my orders
        .eq('tenant_id', tenantId);

    if (error) return { error: error.message };

    revalidatePath('/driver');
    return { success: true };
}

// 3. COMPLETE DELIVERY (The Complex Transaction)
export async function completeDelivery(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (!user || !tenantId) return { error: "Unauthorized" };

    // Extract Data
    const orderId = formData.get('order_id')?.toString();
    const receivedAmount = parseFloat(formData.get('received_amount')?.toString() || '0');
    const paymentMethod = formData.get('payment_method')?.toString(); // 'cash' | 'credit' | 'bank'
    const proofFile = formData.get('proof_file') as File;
    const notes = formData.get('notes')?.toString() || '';

    // Inventory Returns (Specific Serials)
    const returnedSerialsJson = formData.get('returned_serials')?.toString();
    const returnedSerials: string[] = returnedSerialsJson ? JSON.parse(returnedSerialsJson) : [];

    // Legacy/Fallback Count (If no serials provided but count exists)
    const returnedEmptyCount = parseInt(formData.get('returned_empty_count')?.toString() || '0');

    if (!orderId) return { error: "Missing Order ID" };

    // A. FETCH ORDER DETAILS (Validation)
    const { data: order } = await supabase
        .from('orders')
        .select('id, friendly_id, total_amount, customer_id, tenant_id, order_items(quantity, product_name)')
        .eq('id', orderId)
        .eq('driver_id', user.id)
        .eq('tenant_id', tenantId)
        .single();

    if (!order) return { error: "Order not found or access denied" };

    // SAFETY CHECK: Verify Driver Has Stock
    // Calculate total quantity needed for this order
    let requiredQty = 0;
    order.order_items.forEach((item: any) => requiredQty += item.quantity);

    if (requiredQty > 0) {
        const { count } = await supabase
            .from('cylinders')
            .select('*', { count: 'exact', head: true })
            .eq('current_holder_id', user.id)
            .eq('current_location_type', 'driver')
            .eq('status', 'full')
            .eq('tenant_id', tenantId);

        const availableStock = count || 0;
        // Strictly block if stock is 0, but maybe allow if stock is just less than needed? 
        // User instruction: "If the driver tries to deliver but has 0 stock, throw a clear error"
        if (availableStock === 0) {
            return { error: "No cylinders found on truck! Cannot complete delivery." };
        }
        if (availableStock < requiredQty) {
            return { error: `Insufficient stock! You have ${availableStock}, but order needs ${requiredQty}.` };
        }
    }


    // B. UPLOAD PROOF (If exists)
    let proofUrl = null;
    if (proofFile && proofFile.size > 0) {
        const fileExt = proofFile.name.split(".").pop();
        const fileName = `delivery_${orderId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from("receipts")
            .upload(fileName, proofFile);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(fileName);
            proofUrl = publicUrl;
        }
    }

    // C. CALL ATOMIC RPC (Replaces all manual updates)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_order_transaction', {
        p_order_id: orderId,
        p_driver_id: user.id,
        p_tenant_id: tenantId,
        p_received_amount: receivedAmount,
        p_payment_method: paymentMethod || 'cash',
        p_returned_serials: returnedSerials,
        p_returned_empty_count: returnedEmptyCount,
        p_notes: notes,
        p_proof_url: proofUrl
    });

    if (rpcError) {
        console.error("RPC Error:", rpcError);
        return { error: `Transaction Failed: ${rpcError.message}` };
    }

    if (!rpcResult.success) {
        return { error: rpcResult.message };
    }

    revalidatePath('/driver');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/customers');
    revalidatePath('/admin/inventory');

    return { success: true };
}


// 4. GET MY COMPLETED ORDERS (History)
export async function getCompletedOrders(dateString?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const tenantId = user.app_metadata?.tenant_id;

    // Determine Date Range
    const targetDate = dateString ? new Date(dateString) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();

    const { data } = await supabase
        .from('orders')
        .select('id, friendly_id, total_amount, amount_received, payment_method, created_at, customers(name)')
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

    return data || [];
}

// 5. DRIVER HUD STATS
export async function getDriverStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { cashLiability: 0, emptiesOnHand: 0 };
    const tenantId = user.app_metadata?.tenant_id;

    // 1. Get Cash Liability from Employee Wallet
    const { data: wallet } = await supabase
        .from('employee_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

    // 2. Get Empty Cylinders Count
    const { count: empties } = await supabase
        .from('cylinders')
        .select('*', { count: 'exact', head: true })
        .eq('current_holder_id', user.id)
        .eq('current_location_type', 'driver')
        .eq('status', 'empty')
        .eq('tenant_id', tenantId);

    return {
        cashLiability: wallet?.balance || 0,
        emptiesOnHand: empties || 0
    };
}

// 6. END SHIFT (HANDOVER)
// 6. FETCH ALL ASSETS ON TRUCK (Full & Empty for Handover)
export async function getDriverAllAssets() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const tenantId = user.app_metadata?.tenant_id;

    const { data } = await supabase
        .from('cylinders')
        .select('id, serial_number, size, status, current_location_type')
        .eq('current_holder_id', user.id)
        .eq('current_location_type', 'driver')
        .eq('tenant_id', tenantId)
        .order('status', { ascending: false }); // Full first

    return data || [];
}
// 7. FETCH RECEIVERS (Admins/Managers)
export async function getReceivers() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Safety: Ensure Tenant context
    const tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;
    if (!tenantId) return [];

    const { data } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['admin', 'manager', 'cashier'])
        .eq('tenant_id', tenantId) // STRICT SECURITY: Only my tenant
        .order('name', { ascending: true });

    if (!data) return [];

    // Deduplicate by ID (Safety Check) - Type 'any' for item to avoid lint error quickly
    const uniqueReceivers = Array.from(new Map(data.map((item: any) => [item.id, item])).values());

    return uniqueReceivers;
}

// 8. PROCESS HANDOVER REQUEST (Maker-Checker)
export async function processHandover(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // Robust Tenant ID: Prefer app_metadata (secure), fallback to user_metadata
    const tenantId = user?.app_metadata?.tenant_id || user?.user_metadata?.tenant_id;

    if (!user || !tenantId) return { error: "Unauthorized" };

    // 1. Parse Inputs
    const depositAmount = parseFloat(formData.get('deposit_amount')?.toString() || '0');
    const returnedSerialsJson = formData.get('returned_serials')?.toString();
    const selectedCylinderIds: string[] = returnedSerialsJson ? JSON.parse(returnedSerialsJson) : []; // Using Serials as IDs for now (Frontend sends serials)
    const receiverId = formData.get('receiver_id')?.toString();

    if (!receiverId) return { error: "Please select a receiver." };

    // 2. Validate Cash (If applicable)
    if (depositAmount > 0) {
        const { data: wallet } = await supabase.from('employee_wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single();

        const currentBalance = wallet?.balance || 0;
        if (depositAmount > currentBalance) {
            return { error: `Insufficient Funds. Wallet Balance: Rs ${currentBalance}` };
        }
    }

    // 3. ATOMIC-LIKE HANDOVER SEQUENCE
    // We explicitly verify ownership AND lock in one go.

    // A. Lock Assets (Set status to 'handover_pending')
    // Validation: current_holder_id = user.id AND current_location_type = 'driver'
    let lockedCount = 0;

    if (selectedCylinderIds.length > 0) {
        // Attempt to update. Postgres will only update rows that match conditions.
        const { data: lockedAssets, error: lockError } = await supabase
            .from('cylinders')
            .update({
                status: 'handover_pending',
                updated_at: new Date().toISOString()
            })
            .in('serial_number', selectedCylinderIds) // Frontend sends Serials. If it sent IDs, we'd use .in('id', ...)
            .eq('current_holder_id', user.id)        // <--- VALIDATION 1
            .eq('current_location_type', 'driver')   // <--- VALIDATION 2
            .eq('tenant_id', tenantId)
            .select('id');

        // STRICT CHECK 1: Database Error (RLS Policy Violation often throws this)
        if (lockError) {
            console.error("Handover Asset Lock Error:", lockError);
            return { error: "Permission Denied: Cannot lock assets. Check your connection or permissions." };
        }

        lockedCount = lockedAssets?.length || 0;

        // STRICT CHECK 2: Zero Rows Updated (RLS Policy hiding rows or condition mismatch)
        if (lockedCount === 0) {
            console.error("Critical: Lock attempt returned 0 rows. Serials:", selectedCylinderIds);
            return { error: "Update failed. No assets locked. Ensure you possess these cylinders." };
        }

        // STRICT CHECK 3: Partial Lock (Data Integrity Issue)
        if (lockedCount !== selectedCylinderIds.length) {
            console.error("Asset Mismatch:", { expected: selectedCylinderIds.length, actual: lockedCount });

            // Revert the ones we JUST changed
            if (lockedCount > 0) {
                const lockedIds = lockedAssets?.map(a => a.id) || [];
                await supabase.from('cylinders')
                    .update({ status: 'empty' })
                    .in('id', lockedIds);
            }
            return { error: "Ownership Validation Failed: You do not possess all selected cylinders." };
        }
    }

    // B. Create Transaction
    const { error: txnError } = await supabase.from('transactions').insert({
        tenant_id: tenantId,
        user_id: user.id,
        receiver_id: receiverId,
        type: 'handover_request',
        status: 'pending',
        amount: depositAmount,
        description: `Handover Request: Rs ${depositAmount} + ${lockedCount} Cylinders`,
        payment_method: 'cash',
        created_at: new Date().toISOString()
        // Note: Linked assets aren't stored in transaction directly, but inferred via status='handover_pending' + holder=user
    });

    // C. ROLLBACK ON FAILURE
    if (txnError) {
        console.error("Handover Transaction Failed:", txnError);

        // Attempt RPC Revert (if possible) or just Warn.
        // Since we used a secure RPC to lock, a direct update to unlock might also fail RLS.
        // Ideally, we'd have a 'revert_driver_handover' RPC.
        // For now, we will try to direct revert but suppress errors if it fails, as the Admin can manually reject.
        if (lockedCount > 0) {
            console.log("Attempting to rollback asset lock...");
            const { error: revertError } = await supabase.from('cylinders')
                .update({
                    status: 'empty', // Revert to empty
                    updated_at: new Date().toISOString()
                })
                .in('serial_number', selectedCylinderIds)
                .eq('current_holder_id', user.id);

            if (revertError) {
                console.error("Rollback failed (likely RLS). Admin must handle manually.", revertError);
            }
        }

        return { error: `Transaction Creation Failed: ${txnError.message}. Assets are locked - please contact Admin.` };
    }

    revalidatePath('/driver');
    return { success: true };
}

// 9. GET DRIVER PROFILE
export async function getDriverProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch from 'profiles' table as per instruction
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error("Fetch Profile Error:", error);
        return null;
    }

    return data;
}
