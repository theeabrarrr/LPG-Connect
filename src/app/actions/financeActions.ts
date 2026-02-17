'use server';

import { createClient } from "@/utils/supabase/server";
import { getCurrentUserTenantId } from "@/lib/utils/tenantHelper";
import { revalidatePath } from "next/cache";

// 1. Get Totals (Live Calculation)
export async function getCompanyStats() {
    const supabase = await createClient();
    let tenantId: string;
    try {
        const id = await getCurrentUserTenantId();
        if (!id) return { totalBalance: 0 };
        tenantId = id;
    } catch (error) {
        console.error("Finance Stats Auth Error:", error);
        return { totalBalance: 0 };
    }

    // Sum of all amounts
    const { data, error } = await supabase
        .from('customer_ledgers')
        .select('amount')
        .eq('tenant_id', tenantId);

    if (error) {
        console.error("Finance Stats Error:", error);
        return { totalBalance: 0 };
    }

    const total = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return { totalBalance: total };
}

// 2. Get Ledger History
export async function getLedgerHistory() {
    const supabase = await createClient();
    let tenantId: string;
    try {
        const id = await getCurrentUserTenantId();
        if (!id) return [];
        tenantId = id;
    } catch (error) {
        console.error("Finance History Auth Error:", error);
        return [];
    }

    const { data, error } = await supabase
        .from('customer_ledgers')
        .select(`
            id,
            amount,
            transaction_type,
            description,
            created_at,
            created_at,
            created_by,
            profiles (full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Finance History Error:", error);
        return [];
    }

    return data || [];
}

// 3. GET ALL CUSTOMERS (Lite Version for Dropdown)
export async function getAllCustomersClient() {
    const supabase = await createClient();
    let tenantId: string;
    try {
        const id = await getCurrentUserTenantId();
        if (!id) return { data: [] };
        tenantId = id;
    } catch (error) {
        console.error("Customers Client Auth Error:", error);
        return { data: [] };
    }

    const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(100); // Reasonable limit for dropdown

    return { data: data || [] };
}

// 4. CREATE TRANSACTION (Smart Action)
export async function createTransaction(formData: FormData) {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { error: "Unauthorized" };
    
        let tenantId: string;
        try {
            const id = await getCurrentUserTenantId();
            if (!id) return { error: "Authentication required" };
            tenantId = id;
        } catch (error) {
            console.error("Create Transaction Auth Error:", error);
            return { error: "Authentication failed" };
        }
    


    // Parse Data
    const type = formData.get('type')?.toString(); // 'income' | 'expense'
    const category = formData.get('category')?.toString();
    const amountStr = formData.get('amount')?.toString();
    const description = formData.get('description')?.toString();
    const dateStr = formData.get('date')?.toString();
    const customerId = formData.get('customer_id')?.toString();

    let amount = parseFloat(amountStr || '0');
    if (isNaN(amount) || amount <= 0) return { error: "Invalid amount" };

    // If Expense, make negative
    if (type === 'expense') {
        amount = -amount;
    }

    // Map to DB Allowed Types (credit/debit)
    const dbTransactionType = type === 'income' ? 'credit' : 'debit';

    try {
        // A. Create Company Ledger Entry (The visible cash change)
        const { error: ledgerError } = await supabase.from('customer_ledgers').insert({
            tenant_id: tenantId,
            amount: amount,
            transaction_type: dbTransactionType, // 'credit' or 'debit'
            category: category,                  // Specific category (e.g. 'Customer Payment')
            description: description,
            created_by: user.id, // Changed from admin_id
            created_at: dateStr || new Date().toISOString()
        });

        if (ledgerError) throw new Error(`Ledger Error: ${ledgerError.message}`);

        // B. Handle Customer Linkage (If Payment)
        if (category === 'customer_payment' && customerId) {

            // 1. Credit the Customer (Decrease Debt)
            // Fetch current balance first to be safe (or use RPC increment if available, but simple update is fine for low concurrency)
            const { data: customer } = await supabase.from('customers').select('current_balance').eq('id', customerId).single();
            const currentBalance = customer?.current_balance || 0;

            // Payment reduces the balance (Debt - Payment)
            // Amount here is POSITIVE because we parsed it as such, but wait...
            // In the "Type" check above, income remains Positive.
            // So if Customer Pays 5000:
            // Ledger: +5000 (Income)
            // Customer Balance: Old - 5000

            // We need the absolute value for the customer calculation
            const absAmount = Math.abs(amount);
            const newBalance = currentBalance - absAmount;

            await supabase.from('customers')
                .update({ current_balance: newBalance })
                .eq('id', customerId)
                .eq('tenant_id', tenantId);

            // 2. Add to Customer History (Transactions Table)
            // This is crucial for the customer to see "Payment Received"
            await supabase.from('transactions').insert({
                tenant_id: tenantId,
                customer_id: customerId,
                amount: -absAmount, // Credit is Negative in Transactions table usually (reduces debt)
                type: 'payment',
                payment_method: 'cash', // Assumed cash since it's "Manual Finance Entry"
                description: description || 'Direct Payment at Office',
                created_at: dateStr || new Date().toISOString()
            });
        }

        revalidatePath('/admin/finance');
        if (customerId) revalidatePath('/admin/customers');
        return { success: true };

    } catch (err: any) {
        console.error("Transaction Error:", err);
        return { error: err.message };
    }
}

// 5. GET LEDGER ENTRIES (Customer History)
// Mapped to 'transactions' table as 'ledgers' does not exist
export async function getLedgerEntries(customerId: string) {
    const supabase = await createClient();

    // 🔒 SECURITY FIX: Get and verify tenant
    let tenantId: string;
    try {
        const id = await getCurrentUserTenantId();
        if (!id) return { success: false, error: 'Authentication required' };
        tenantId = id;
    } catch (error) {
        return { success: false, error: 'Authentication required' };
    }

    // 🔒 First verify customer belongs to tenant
    const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('tenant_id')
        .eq('id', customerId)
        .eq('tenant_id', tenantId)  // ✅ Verify tenant match
        .single();

    if (customerError || !customer) {
        return { success: false, error: 'Customer not found or access denied' };
    }

    // ✅ Now safe to fetch transactions (ledger)
    const { data, error } = await supabase
        .from('customer_ledgers') // Changed from 'transactions'
        .select('*')
        .eq('customer_id', customerId)
        .eq('tenant_id', tenantId)  // ✅ ADDED
        .order('created_at', { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

// 6. GET CASH BOOK ENTRIES (Company Ledger)
// Mapped to 'cash_book_entries' table
export async function getCashBookEntries(filters?: { startDate?: string, endDate?: string }) {
    const supabase = await createClient();

    let tenantId: string;
    try {
        const id = await getCurrentUserTenantId();
        if (!id) return { success: false, error: 'Authentication required' };
        tenantId = id;
    } catch (error) {
        return { success: false, error: 'Authentication required' };
    }

    let query = supabase
        .from('cash_book_entries') // Schema mapped from 'cash_book_entries'
        .select('*, profiles (full_name)') // User changed to profiles
        .eq('tenant_id', tenantId)  // ✅ ADDED
        .order('created_at', { ascending: false });

    if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

// 7. GET OUTSTANDING BALANCES
export async function getOutstandingBalances() {
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
        .from('customers')
        .select('id, name, phone, current_balance') // 'current_balance' is the column name in createTransaction
        .eq('tenant_id', tenantId)  // ✅ ADDED
        .gt('current_balance', 0)  // Only customers with outstanding balance (Debt)
        .order('current_balance', { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

// 8. RECONCILIATION REPORT (Detect Discrepancies)
export async function getReconciliationReport() {
    const supabase = await createClient();

    // Auth & Tenant
    let tenantId: string;
    try {
        const id = await getCurrentUserTenantId();
        if (!id) return { success: false, error: 'Authentication required' };
        tenantId = id;
    } catch (error) {
        return { success: false, error: 'Authentication required' };
    }

    // 1. Fetch All Customers with their current cached balance
    const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, name, current_balance')
        .eq('tenant_id', tenantId);

    if (custError) return { success: false, error: custError.message };

    // 2. Fetch Aggregated Transaction Sums (The Truth)
    // We can't do a complex join-aggregate easily with Supabase client (limited group by).
    // So we'll fetch raw transactions and aggregate in JS (assuming < 10k transactions for now).
    // For Production: Use a Postgres RPC for this aggregation!
    // RPC Name Idea: `get_customer_ledger_sums(tenant_id)`

    const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select('customer_id, amount')
        .eq('tenant_id', tenantId);

    if (txnError) return { success: false, error: txnError.message };

    // 3. Aggregate in JS
    const realBalances: Record<string, number> = {};

    txns.forEach(t => {
        if (!realBalances[t.customer_id]) realBalances[t.customer_id] = 0;
        realBalances[t.customer_id] += (t.amount || 0);
    });

    // 4. Compare & Find Discrepancies
    interface Discrepancy {
        customerId: string;
        customerName: string;
        systemBalance: number;
        realBalance: number;
        variance: number;
    }

    const discrepancies: Discrepancy[] = [];

    customers.forEach(c => {
        const real = realBalances[c.id] || 0;
        const system = c.current_balance || 0;
        // Float precision handling
        const diff = Math.abs(system - real);

        if (diff > 0.01) { // Tolerance for float errors
            discrepancies.push({
                customerId: c.id,
                customerName: c.name,
                systemBalance: system,
                realBalance: real,
                variance: system - real
            });
        }
    });

    return {
        success: true,
        data: discrepancies,
        totalChecked: customers.length,
        totalDiscrepancies: discrepancies.length
    };
}

// 9. FIX BALANCE (One-Click Repair)
export async function fixCustomerBalance(customerId: string, correctBalance: number) {
    const supabase = await createClient();

    let tenantId: string;
    try {
        const id = await getCurrentUserTenantId();
        if (!id) return { success: false, error: 'Authentication required' };
        tenantId = id;
    } catch (error) {
        return { success: false, error: 'Authentication required' };
    }

    // Update
    const { error } = await supabase
        .from('customers')
        .update({
            current_balance: correctBalance,
            updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .eq('tenant_id', tenantId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/finance/reconciliation');
    revalidatePath('/admin/customers');

    return { success: true };
}