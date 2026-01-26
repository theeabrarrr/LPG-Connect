"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * RECOVERY AGENT ACTIONS
 * Dedicated logic for debt collection and field operations.
 */

// 1. GET AGENT STATS (Wallet Balance)
export async function getRecoveryStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { cashOnHand: 0 };

    // Safety check: Ensure user is recovery agent or admin
    // In a real app we might check roles here, but RLS usually handles data access.

    // 1. Get Wallet Balance
    const { data: wallet } = await supabase
        .from('employee_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

    // 2. Get Pending Handovers (Money in transit)
    const { data: pendingTxns } = await supabase
        .from('transactions')
        .select('id, amount, created_at, status')
        .eq('user_id', user.id)
        .eq('type', 'handover_request')
        .eq('status', 'pending');

    const pendingAmount = pendingTxns?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

    return {
        cashOnHand: wallet?.balance || 0,
        pendingAmount,
        pendingHandovers: pendingTxns || []
    };
}

// 2. GET DUE CUSTOMERS
export async function getDueCustomers() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

    if (!tenantId) {
        console.error("getDueCustomers: No tenant_id found for user", user.id);
        return [];
    }

    // DEBUG: console.log("Fetching due customers for tenant:", tenantId);

    const { data, error } = await supabase
        .from('customers')
        .select('id, name, address, phone, current_balance')
        .eq('tenant_id', tenantId)
        .gt('current_balance', 0) // Debt is positive
        .order('current_balance', { ascending: false }); // Largest debt first

    if (error) {
        console.error("Fetch Due Customers Error:", error);
        return [];
    }

    return data || [];
}

// 3. COLLECT PAYMENT (The main workhorse)
export async function collectPayment(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const tenantId = user.app_metadata?.tenant_id;

    // Parse Input
    const customerId = formData.get('customer_id')?.toString();
    const amount = parseFloat(formData.get('amount')?.toString() || '0');
    const paymentMode = formData.get('payment_mode')?.toString() || 'cash';
    const description = formData.get('description')?.toString();
    const proofImage = formData.get('proof_image') as File | null;

    if (!customerId) return { error: "Customer required" };
    if (isNaN(amount) || amount <= 0) return { error: "Invalid amount" };

    try {
        let proofUrl = null;

        // A. Handle Proof Upload
        if (proofImage && proofImage.size > 0) {
            const fileExt = proofImage.name.split('.').pop();
            const fileName = `${tenantId}/${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('payment-proofs')
                .upload(fileName, proofImage);

            if (uploadError) {
                console.error("Proof Upload Failed:", uploadError);
                return { error: "Failed to upload proof image" };
            }

            const { data: { publicUrl } } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(fileName);

            proofUrl = publicUrl;
        }

        // B. SPLIT LOGIC
        // SCENARIO 1: CASH (Immediate Settlement)
        if (paymentMode === 'cash') {
            // 1. Credit Customer (Reduce Debt)
            const { data: cust } = await supabase
                .from('customers')
                .select('current_balance, name')
                .eq('id', customerId)
                .single();

            if (!cust) return { error: "Customer not found" };

            const newBalance = (cust.current_balance || 0) - amount;

            await supabase
                .from('customers')
                .update({ current_balance: newBalance })
                .eq('id', customerId);

            // 2. Increase Agent Liability (Wallet)
            const { data: w } = await supabase.from('employee_wallets').select('balance').eq('user_id', user.id).single();
            const currentWallet = w?.balance || 0;

            await supabase.from('employee_wallets').upsert({
                user_id: user.id,
                balance: currentWallet + amount,
                updated_at: new Date().toISOString(),
                tenant_id: tenantId
            }, { onConflict: 'user_id' });

            // 3. Log Transaction (Completed)
            const { error: txnError } = await supabase.from('transactions').insert({
                tenant_id: tenantId,
                user_id: user.id,
                customer_id: customerId,
                type: 'collection',
                status: 'collected_cash',
                amount: -amount, // Debt reduction is negative
                payment_method: paymentMode,
                description: description || `Cash Collection from ${cust.name}`,
                proof_url: proofUrl,
                created_at: new Date().toISOString()
            });

            if (txnError) throw new Error(`Txn Error: ${txnError.message}`);

        } else {
            // SCENARIO 2: BANK / ONLINE (Pending Verification)
            // NO Customer Update, NO Wallet Update. Just Transaction Log.

            const { error: txnError } = await supabase.from('transactions').insert({
                tenant_id: tenantId,
                user_id: user.id,
                customer_id: customerId,
                type: 'collection',
                status: 'pending_verification', // CRITICAL: Needs Admin Approval
                amount: -amount,
                payment_method: paymentMode,
                description: description || `Online Payment Claim`,
                proof_url: proofUrl,
                created_at: new Date().toISOString()
            });

            if (txnError) throw new Error(`Txn Error: ${txnError.message}`);
        }

        revalidatePath('/recovery');
        return { success: true };

    } catch (err: any) {
        console.error("Collection Failed:", err);
        return { error: err.message };
    }
}

// 4. PROCESS HANDOVER (Agent -> Admin)
export async function processRecoveryHandover(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const tenantId = user.app_metadata?.tenant_id;

    // Parse
    const receiverId = formData.get('receiver_id')?.toString();
    const amount = parseFloat(formData.get('amount')?.toString() || '0');

    if (!receiverId) return { error: "Select receiver" };
    if (amount <= 0) return { error: "Invalid amount" };

    // Validate Wallet
    const { data: wallet } = await supabase.from('employee_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

    if (!wallet || wallet.balance < amount) {
        return { error: `Insufficient funds. You only have ${wallet?.balance || 0}` };
    }

    // Create Handover Request
    // This puts it in 'pending' state. Valid Money is still in Agent Wallet until Admin Approves.
    const { error } = await supabase.from('transactions').insert({
        tenant_id: tenantId,
        user_id: user.id,
        receiver_id: receiverId,
        type: 'handover_request',
        status: 'pending',
        amount: amount,
        payment_method: 'cash',
        description: `Recovery Handover: Rs ${amount}`,
        created_at: new Date().toISOString()
    });

    if (error) return { error: error.message };

    revalidatePath('/recovery');
    return { success: true };
}

// 5. GET RECEIVERS (Admins)
export async function getRecoveryReceivers() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const tenantId = user.app_metadata?.tenant_id;

    const { data } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['admin', 'manager'])
        .eq('tenant_id', tenantId);

    return data || [];
}

// 6. GET AGENT HISTORY
export async function getAgentHistory() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const tenantId = user.app_metadata?.tenant_id;

    const { data } = await supabase
        .from('transactions')
        .select('id, type, amount, status, created_at, description, proof_url, customers(name), receiver_id')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .in('type', ['collection', 'handover_request'])
        .order('created_at', { ascending: false })
        .limit(50);

    return data || [];
}
