"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUserTenantId } from "@/lib/utils/tenantHelper";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";

const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);



export async function getTenantInfo() {
    const supabase = await createClient();

    // 1. Get User to identify Tenant
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (!user || !tenantId) return { name: "Tenant Information" };

    // 2. Fetch Tenant Name via Users Join (or metadata if reliable, but DB join is safer for fresh name)
    // Assuming 'users' has 'tenant_id' and we join 'tenants'.
    const { data: profile } = await supabase
        .from("profiles") // Changed from "users" to "profiles"
        .select("tenant_id, tenants(name)")
        .eq("id", user.id)
        .eq("tenant_id", tenantId)
        .single();

    // Type assertion or check
    const tenantName = (profile as any)?.tenants?.name || "My Organization";
    return { name: tenantName };
}

export async function getTenantUsers() {
    const supabase = await createClient();

    // 1. Get Current User (Auth Check)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error("Auth error:", authError);
        return [];
    }

    // 2. Verified Query using RLS
    // We rely on the "Tenant Isolation" policy on 'profiles' to filter data automatically.
    // If the policy is working, this returns only the profiles for the user's tenant.
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*");

    if (error) {
        console.error("Error fetching available profiles:", error);
        return [];
    }

    // Map profiles to Employee shape
    const mappedUsers = profiles?.map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        email: p.email || 'N/A', // Email is in profiles now
        role: p.role || 'staff',
        phone_number: p.phone_number,
        shift: p.shift || 'Day', // Shift is now in profiles
        created_at: p.created_at || new Date().toISOString(),
        profiles: { // Keeping for compatibility with existing UI if any
            vehicle_number: p.vehicle_number,
            phone_number: p.phone_number
        }
    })) || [];

    return mappedUsers;
}

export async function getDrivers() {
    const supabase = await createClient();

    // 1. Session & Metadata
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (!user || !tenantId) return [];

    // 2. Verified Query
    const { data, error } = await supabase
        .from('profiles') // Changed from 'users' to 'profiles'
        .select('id, full_name, email') // Select relevant fields from profiles
        .eq('role', 'driver')
        .eq('tenant_id', tenantId) // Double Lock
        .order('full_name');

    if (error) {
        console.error("Error fetching drivers:", error);
        return [];
    }

    return data?.map(d => ({ id: d.id, name: d.full_name, email: d.email })) || []; // Map to expected format
}

// 4. GET PENDING HANDOVERS (Approvals)
export async function getPendingHandovers() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;

    // 1. Get raw handovers from view
    const { data: handovers } = await supabase
        .from('view_admin_approvals')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (!handovers || handovers.length === 0) return [];

    // 2. Fetch Roles manually (since view doesn't have it and join is tricky with permissions)
    const userIds = Array.from(new Set(handovers.map(h => h.user_id).filter(Boolean)));

    const { data: profiles } = await supabase
        .from('profiles') // Changed from 'users' to 'profiles'
        .select('id, role')
        .in('id', userIds);

    // 3. Merge Role into result as 'users' object to match frontend expectation
    const enrichedData = handovers.map(h => {
        const p = profiles?.find(p => p.id === h.user_id);
        return {
            ...h,
            users: { role: p?.role || 'driver' } // Default to driver if checking fails
        };
    });

    return enrichedData;
}

// 4.1 GET HANDOVER HISTORY (Approvals)
export async function getHandoverHistory(filters?: { status?: string, driverId?: string, startDate?: string, endDate?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;

    // Fetch from handover_logs
    let query = supabase
        .from('handover_logs')
        .select('*, sender:profiles!sender_id(full_name, role)')
        .eq('tenant_id', tenantId)
        .neq('status', 'pending')
        .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }
    if (filters?.driverId && filters.driverId !== 'all') {
        query = query.eq('sender_id', filters.driverId);
    }
    if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching handover history:", error);
        return [];
    }

    // Map to normalized shape to match pending handovers
    return data?.map(h => ({
        ...h,
        id: h.id,
        transaction_id: h.id,
        user_id: h.sender_id,
        driver_name: (h.sender as any)?.full_name || 'Unknown',
        users: { role: (h.sender as any)?.role || 'driver' }
    })) || [];
}

// 4.5 HELPER: Get Pending Cylinder Details (For UI)
export async function getPendingCylinderDetails() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;

    const { data } = await supabase
        .from('cylinders')
        .select('id, serial_number, current_holder_id, status')
        .eq('status', 'handover_pending')
        .eq('tenant_id', tenantId);

    return data || [];
}

// 5. APPROVE HANDOVER
// 5. APPROVE HANDOVER (With Reconciliation Logic)
// 5. APPROVE HANDOVER (With Reconciliation Logic)
// 5. APPROVE HANDOVER (RPC-Based)
export async function approveHandover(transactionId: string, _confirmedQty?: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };
    if (!transactionId) return { error: "Transaction ID is missing" };

    // 1. Call Secure RPC
    // This handles Transaction Status Update + Asset Move + Wallet Deduction atomically on the DB side.
    const { data: rpcData, error: rpcError } = await supabase.rpc('approve_driver_handover', {
        p_transaction_id: transactionId,
        p_admin_user_id: user.id
    });

    if (rpcError) {
        console.error("Approval RPC Error:", rpcError);
        return { error: rpcError.message || "Admin Approval Failed (RPC Error)" };
    }

    // RPC returns JSON object { success: boolean, message: string }
    // We check success flag
    const result = rpcData as any;

    if (!result || !result.success) {
        console.error("Approval RPC returned failure:", result);
        return { error: result?.message || "Admin Approval Failed (Logic Error)" };
    }

    revalidatePath('/admin/approvals');
    revalidatePath('/admin/inventory');
    return { success: true, message: "Handover Approved Successfully" };
}

// 5.1 GET PENDING PAYMENTS
export async function getPendingPayments() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;

    // Fetch transactions waiting for verificaion
    const { data, error } = await supabase
        .from('cash_book_entries')
        .select(`
            *,
            customers (name)
        `)
        .eq('tenant_id', tenantId)
        .eq('category', 'collection')
        .eq('status', 'pending_verification') // Explicit status for Bank/Cheque
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching pending payments:", error);
        return [];
    }

    return data || [];
}

// 5.1.B GET PAYMENT HISTORY
export async function getPaymentHistory(filters?: { status?: string, startDate?: string, endDate?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;

    let query = supabase
        .from('cash_book_entries')
        .select(`
            *,
            customers (name)
        `)
        .eq('tenant_id', tenantId)
        .eq('category', 'collection')
        .neq('status', 'pending_verification') // Exclude pending
        .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }
    if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
        // To include the entire end day, we add 23:59:59
        query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching payment history:", error);
        return [];
    }

    return data || [];
}

// 5.2 VERIFY PAYMENT (Bank/Cheque)
export async function verifyPayment(transactionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };
    const tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;

    if (!transactionId) return { error: "Transaction ID missing" };

    // 1. Get Transaction Details
    const { data: txn, error: txnError } = await supabase
        .from('cash_book_entries')
        .select('*')
        .eq('id', transactionId)
        .eq('tenant_id', tenantId)
        .single();

    if (txnError || !txn) return { error: "Transaction not found" };
    if (txn.status !== 'pending_verification') return { error: "Transaction already processed" };

    // 2. Perform Atomic Updates (Ideally RPC, but doing manual for now as per plan/speed)
    // A. Update Transaction Status
    const { error: updateError } = await supabase
        .from('cash_book_entries')
        .update({ status: 'completed' })
        .eq('id', transactionId);

    if (updateError) return { error: "Failed to update transaction status" };

    // B. Credit Customer Balance (Reduce Debt)
    // Fetch current first
    const { data: customer } = await supabase.from('customers').select('current_balance').eq('id', txn.customer_id).single();
    if (customer) {
        const newBalance = (customer.current_balance || 0) - Math.abs(txn.amount); // Reduce debt
        await supabase.from('customers').update({ current_balance: newBalance }).eq('id', txn.customer_id);
    }

    // C. Update Company Ledger (Real Money In) - Renamed to customer_ledgers
    await supabase.from('customer_ledgers').insert({
        tenant_id: tenantId,
        amount: Math.abs(txn.amount),
        transaction_type: 'credit',
        category: 'customer_payment_verified',
        description: `Verified ${txn.payment_method} from Customer (Txn #${txn.id.slice(0, 8)})`,
        created_by: user.id // Use created_by instead of admin_id
    });

    revalidatePath('/admin/approvals');
    revalidatePath('/admin/finance');
    revalidatePath('/admin/customers');

    return { success: true, message: "Payment Verified Successfully" };
}

// 5.3 REJECT PAYMENT
export async function rejectPayment(transactionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // Just mark as rejected. No financial rollback needed as it was never applied.
    const { error } = await supabase
        .from('cash_book_entries')
        .update({ status: 'rejected' })
        .eq('id', transactionId);

    if (error) return { error: "Failed to reject payment" };

    revalidatePath('/admin/approvals');
    return { success: true, message: "Payment Rejected" };
}

// 6. REJECT HANDOVER
export async function rejectHandover(transactionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.user_metadata?.tenant_id || user?.app_metadata?.tenant_id;

    if (!user || !tenantId) return { error: "Unauthorized" };

    const { data: txn } = await supabase
        .from('cash_book_entries')
        .select('*')
        .eq('id', transactionId)
        .eq('receiver_id', user.id)
        .single();

    if (!txn) return { error: "Transaction not found" };

    // 1. Revert Cylinder Status (handover_pending -> full/empty?)
    // This is tricky. We don't know previous status.
    // We will set them to 'empty' (safe bet for returns) or keeps them with driver?
    // If rejected, they stay with Driver. Status should probably revert to 'empty' (as they were likely empty returns)
    // OR 'full' if they were full returns?
    // Safe bet: Revert to 'empty' as most returns are empty. Or just 'empty'.
    // Actually, let's set them to 'empty' but keep with driver.

    await supabase.from('cylinders').update({
        status: 'empty', // Revert to empty
        updated_at: new Date().toISOString()
    })
        .eq('current_holder_id', txn.created_by)
        .eq('status', 'handover_pending')
        .eq('tenant_id', tenantId);

    // 2. Mark Transaction Rejected
    await supabase.from('cash_book_entries').update({
        status: 'rejected'
    }).eq('id', transactionId);

    revalidatePath('/admin/approvals');
    return { success: true };
}

// 7. DASHBOARD STATS (Consolidated)
export async function getDashboardStats() {
    const supabase = await createClient();

    // 🔒 SECURITY FIX: Get tenant_id securely
    let tenantId: string;
    try {
        const id = await getCurrentUserTenantId();
        if (!id) return {
            totalCash: 0,
            activeDrivers: 0,
            totalAssets: 0,
            emptyCylinders: 0,
            chartData: [],
            recentActivity: []
        };
        tenantId = id;
    } catch (error) {
        console.error("Dashboard Stats Auth Error:", error);
        return {
            totalCash: 0,
            activeDrivers: 0,
            totalAssets: 0,
            emptyCylinders: 0,
            chartData: [],
            recentActivity: []
        };
    }

    // Parallel Fetching
    const [cashResult, driversResult, assetsResult, emptyResult, ordersResult, recentResult, fullResult] = await Promise.allSettled([
        // 1. Total Cash (Source of Truth: cash_book_entries)
        supabase.from('cash_book_entries').select('amount, transaction_type').eq('tenant_id', tenantId),

        // 2. Active Drivers - Querying profiles table
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'driver').eq('tenant_id', tenantId),

        // 3. Total Assets
        supabase.from('cylinders').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),

        // 4. Empty Cylinders
        supabase.from('cylinders').select('*', { count: 'exact', head: true }).eq('status', 'empty').eq('tenant_id', tenantId),

        // 5. Chart Data (Last 7 Days)
        supabase.from('orders')
            .select('created_at, total_amount')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .eq('tenant_id', tenantId)  // Double check tenant filter
            .order('created_at', { ascending: true }),

        // 6. Recent Activity
        supabase.from('orders')
            .select('id, friendly_id, status, total_amount, created_at, customers(name)')
            .eq('tenant_id', tenantId)  // Double check tenant filter
            .order('created_at', { ascending: false })
            .limit(5),

        // 7. Full Cylinders (In Warehouse) - For Low Stock Alert
        supabase.from('cylinders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'full')
            .eq('current_location_type', 'warehouse')
            .eq('tenant_id', tenantId)
    ]);

    // Process Cash (Cash In - Cash Out)
    let totalCash = 0;
    if (cashResult.status === 'fulfilled' && cashResult.value.data) {
        totalCash = cashResult.value.data.reduce((acc, curr) => {
            const amt = Number(curr.amount) || 0;
            return curr.transaction_type === 'cash_in' ? acc + amt : acc - amt;
        }, 0);
    }

    // Process Counts
    const activeDrivers = driversResult.status === 'fulfilled' ? (driversResult.value.count || 0) : 0;
    const totalAssets = assetsResult.status === 'fulfilled' ? (assetsResult.value.count || 0) : 0;
    const emptyCylinders = emptyResult.status === 'fulfilled' ? (emptyResult.value.count || 0) : 0;
    const fullCylinders = fullResult.status === 'fulfilled' ? (fullResult.value.count || 0) : 0;
    const recentActivity = recentResult.status === 'fulfilled' && recentResult.value.data ? recentResult.value.data : [];

    // Process Chart Data (Group by Day)
    const chartMap = new Map<string, number>();

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue
        chartMap.set(dateStr, 0);
    }

    if (ordersResult.status === 'fulfilled' && ordersResult.value.data) {
        ordersResult.value.data.forEach((order) => {
            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { weekday: 'short' });
            if (chartMap.has(dateStr)) {
                chartMap.set(dateStr, (chartMap.get(dateStr) || 0) + 1);
            }
        });
    }

    const chartData = Array.from(chartMap.entries()).map(([name, value]) => ({ name, value }));

    return {
        totalCash,
        activeDrivers,
        totalAssets,
        emptyCylinders,
        fullCylinders, // Added
        chartData,
        recentActivity
    };
}

/**
 * Get recent orders for dashboard (with tenant filter)
 * Separate export for granular partial hydration if needed.
 */
export async function getRecentOrders(limit: number = 10) {
    const supabase = await createClient();

    let tenantId: string;
    try {
        const id = await getCurrentUserTenantId();
        if (!id) return { success: false, error: 'Authentication required' };
        tenantId = id;
    } catch (error) {
        return { success: false, error: 'Authentication required' };
    }

    const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(name), driver:profiles!driver_id(full_name)') // Changed to profiles
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

// 8. CANCEL ORDER
export async function cancelOrder(orderId: string, reason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };
    if (!orderId) return { success: false, error: "Order ID is missing" };
    if (!reason) return { success: false, error: "Cancellation reason is required" };

    // Call Atomic RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('cancel_order_transaction', {
        p_order_id: orderId,
        p_admin_id: user.id,
        p_reason: reason
    });

    if (rpcError) {
        console.error("Cancel RPC Error:", rpcError);
        return { success: false, error: rpcError.message || "Cancellation Failed (RPC Error)" };
    }

    const result = rpcData as any;
    if (!result || !result.success) {
        return { success: false, error: result?.message || "Cancellation Failed" };
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin/inventory');
    revalidatePath('/admin/finance');

    return { success: true, message: "Order Cancelled Successfully" };
}

// 9. BULK ASSIGN ORDERS
export async function assignOrdersToDriver(orderIds: string[], driverId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };
    if (!orderIds || orderIds.length === 0) return { success: false, error: "No orders selected" };
    if (!driverId) return { success: false, error: "Driver required" };

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) return { success: false, error: "Tenant ID missing" };

    // 🔒 SECURITY CHECK: Verify Driver belongs to Tenant
    const { data: driverCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', driverId)
        .eq('tenant_id', tenantId)
        .single();

    if (!driverCheck) return { success: false, error: "Invalid Driver for this Tenant" };

    // ⏳ ATOMIC RPC: Bulk Assign
    const { data: rpcData, error: rpcError } = await supabase.rpc('bulk_assign_orders', {
        p_order_ids: orderIds,
        p_driver_id: driverId,
        p_tenant_id: tenantId,
        p_user_id: user.id
    });

    if (rpcError) {
        console.error("Bulk Assign RPC Error:", rpcError);
        return { success: false, error: `Assignment Failed: ${rpcError.message}` };
    }

    const result = rpcData as any;
    if (!result || !result.success) {
        return { success: false, error: result?.message || "Assignment Failed" };
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin/inventory');

    return { success: true, message: result.message };
}

// 10. DRIVER ANALYTICS
export async function getDriverAnalytics(driverId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };
    if (!driverId) return { success: false, error: "Driver ID required" };

    const tenantId = user.app_metadata?.tenant_id;

    const [ordersResult, inventoryResult] = await Promise.allSettled([
        // 1. Order Stats
        supabase.from('orders')
            .select('status, total_amount, created_at')
            .eq('driver_id', driverId)
            .eq('tenant_id', tenantId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()), // Last 30 Days

        // 2. Current Inventory
        supabase.from('cylinders')
            .select('status, serial_number')
            .eq('current_holder_id', driverId)
            .eq('current_location_type', 'driver')
            .eq('tenant_id', tenantId)
    ]);

    const orders = ordersResult.status === 'fulfilled' && ordersResult.value.data ? ordersResult.value.data : [];
    const inventory = inventoryResult.status === 'fulfilled' && inventoryResult.value.data ? inventoryResult.value.data : [];

    // Calculate Stats
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    const totalRevenue = orders
        .filter(o => o.status === 'completed' || o.status === 'delivered')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const fullCylinders = inventory.filter(c => c.status === 'full').length;
    const emptyCylinders = inventory.filter(c => c.status === 'empty').length;

    return {
        success: true,
        data: {
            totalOrders,
            completedOrders,
            totalRevenue,
            currentStock: {
                full: fullCylinders,
                empty: emptyCylinders,
                total: inventory.length
            },
            recentOrders: orders.slice(0, 5) // Just first 5 for preview
        }
    };
}
