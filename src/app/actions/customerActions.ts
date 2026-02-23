"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * CUSTOMER ACTIONS - DOUBLE-LOCK SECURITY
 */

export async function getCustomers(
    page: number = 1,
    limit: number = 20,
    search: string = '',
    status: 'all' | 'active' | 'inactive' = 'all',
    filters?: {
        balanceStatus?: 'all' | 'positive' | 'negative' | 'zero';
    }
) {
    const supabase = await createClient();

    // 1. Session & Metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: [], total: 0 };

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
        console.error("CRITICAL: Tenant ID missing in getCustomers");
        return { data: [], total: 0 };
    }

    // 2. Build Query
    let query = supabase
        .from("customers")
        .select("*", { count: 'exact' })
        .eq("tenant_id", tenantId);

    // 3. Filters
    if (search) {
        // Search by name or phone
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (status !== 'all') {
        const isActive = status === 'active';
        query = query.eq('is_active', isActive);
    }

    if (filters?.balanceStatus && filters.balanceStatus !== 'all') {
        if (filters.balanceStatus === 'positive') query = query.gt('current_balance', 0);
        else if (filters.balanceStatus === 'negative') query = query.lt('current_balance', 0);
        else if (filters.balanceStatus === 'zero') query = query.eq('current_balance', 0);
    }

    // 4. Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching customers:", error);
        return { data: [], total: 0 };
    }

    return { data: data || [], total: count || 0 };
}

// NEW: Dashboard Stats
export async function getCustomerStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) return { totalReceivables: 0, defaultersCount: 0 };

    // 1. Total Receivables & At Risk (Positive Debt Model)
    // "Receivables" = Money people owe us (Positive Balance > 0)

    const { data: debtors } = await supabase
        .from('customers')
        .select('current_balance')
        .eq('tenant_id', tenantId)
        .gt('current_balance', 0);

    let totalReceivables = 0;
    let defaultersCount = 0;

    if (debtors) {
        debtors.forEach(c => {
            totalReceivables += c.current_balance;
            defaultersCount++;
        });
    }

    return { totalReceivables, defaultersCount };
}

// NEW: Toggle Status
export async function toggleCustomerStatus(id: string, newStatus: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (!tenantId) return { error: "Unauthorized" };

    const { error } = await supabase
        .from('customers')
        .update({ is_active: newStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId);

    if (error) return { error: error.message };

    revalidatePath('/admin/customers');
    return { success: true };
}



export async function createCustomer(prevState: any, formData: FormData) {
    const supabase = await createClient();

    // 1. Session & Metadata
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (!user || !tenantId) {
        return { error: "Unauthorized: Tenant Context Missing" };
    }

    // Extract Data
    const name = formData.get("name")?.toString();
    const phone = formData.get("phone")?.toString();
    const city = formData.get("city")?.toString() || "";
    let address = formData.get("address")?.toString() || "";

    // Financials
    // Opening Balance: Positive = Debt (Asset), Negative = Advance (Liability)
    const openingBalance = parseFloat(formData.get("opening_balance")?.toString() || "0");
    // Security Deposit: Always Positive from input, but represents Liability (Negative balance)
    const securityDeposit = parseFloat(formData.get("security_deposit")?.toString() || "0");
    // Credit Limit
    const creditLimit = parseInt(formData.get("credit_limit")?.toString() || "50000");

    if (!name || !phone) {
        return { error: "Name and Phone are required" };
    }

    // Combine City with Address if provided
    if (city) {
        address = address ? `${address}, ${city}` : city;
    }

    // Net Initial Balance Calculation
    // Logic: (Opening Debt) - (Security Deposit)
    // Example: Debt 1000, Deposit 5000 -> Balance -4000 (Advance)
    const netBalance = openingBalance - securityDeposit;

    // 2. Force Tenant ID on Write
    const { data: newCustomer, error } = await supabase.from("customers").insert({
        tenant_id: tenantId, // <--- FORCE OVERRIDE
        name,
        phone,
        address,
        current_balance: netBalance,
        credit_limit: creditLimit
    }).select().single();

    if (error) {
        console.error("Create Customer Error:", error);
        return { error: error.message };
    }

    // 3. Create Ledger Entries (If applicable)
    // We do this silently. If it fails, the customer is still created (Non-atomic for now, but acceptable)
    try {
        if (openingBalance !== 0) {
            await supabase.from("customer_ledgers").insert({
                tenant_id: tenantId,
                customer_id: newCustomer.id,
                amount: Math.abs(openingBalance),
                transaction_type: openingBalance > 0 ? 'debit' : 'credit',
                category: 'opening_balance',
                description: 'Opening Balance Brought Forward',
                created_by: user.id
            });
        }

        if (securityDeposit > 0) {
            await supabase.from("customer_ledgers").insert({
                tenant_id: tenantId,
                customer_id: newCustomer.id,
                amount: securityDeposit,
                transaction_type: 'credit',
                category: 'security_deposit',
                description: 'Security Deposit (Cylinders)',
                created_by: user.id
            });
        }
    } catch (txError) {
        console.error("Failed to create initial transactions:", txError);
    }

    revalidatePath("/admin/customers");
    revalidatePath("/admin/customers");
    return { success: true };
}

export async function updateCustomer(prevState: any, formData: FormData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (!user || !tenantId) return { error: "Unauthorized" };

    const id = formData.get("id")?.toString();
    const name = formData.get("name")?.toString();
    const phone = formData.get("phone")?.toString();
    const city = formData.get("city")?.toString();
    let address = formData.get("address")?.toString();
    const creditLimit = parseInt(formData.get("credit_limit")?.toString() || "0");

    if (!id || !name || !phone) {
        return { error: "Name and Phone are required" };
    }

    if (city && address) {
        // If address doesn't already contain city, append it (simple heuristic)
        if (!address.toLowerCase().includes(city.toLowerCase())) {
            address = `${address}, ${city}`;
        }
    } else if (city) {
        address = city;
    }

    const { error } = await supabase
        .from("customers")
        .update({
            name,
            phone,
            address,
            credit_limit: creditLimit
        })
        .eq("id", id)
        .eq("tenant_id", tenantId);

    if (error) return { error: error.message };

    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    return { success: true };
}

export async function bulkCreateCustomers(prevState: any, formData: FormData) {
    const supabase = await createClient();

    // 1. Session & Metadata Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (authError || !user || !tenantId) {
        return { error: "Unauthorized: Tenant Context Missing" };
    }

    // 2. Parse Payload
    const rawPayload = formData.get("payload")?.toString();
    if (!rawPayload) return { error: "No data provided" };

    let items: any[] = [];
    try {
        items = JSON.parse(rawPayload);
    } catch (e) {
        return { error: "Invalid JSON data" };
    }

    if (!Array.isArray(items) || items.length === 0) {
        return { error: "Empty or invalid list" };
    }

    // 3. Prepare Data with Forced Tenant ID
    const validItems = items.map(item => ({
        tenant_id: tenantId, // <--- FORCE OVERRIDE
        name: item.name,
        phone: item.phone,
        address: item.address || '',
        current_balance: item.current_balance || 0
    }));

    // 4. Bulk Insert
    const { error } = await supabase.from("customers").insert(validItems);

    if (error) {
        console.error("Bulk Customer Create Error:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/customers");
    return { success: true, count: validItems.length };
}

// CRM HELPER ACTIONS

export async function getCustomerDetails(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) return null;

    const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (error) return null;
    return data;
}

export async function getCustomerTransactions(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) return [];

    const { data, error } = await supabase
        .from("customer_ledgers")
        .select("*")
        .eq("customer_id", id)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    return data || [];
}

export async function getCustomerAssets(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) return [];

    const { data, error } = await supabase
        .from("cylinders")
        .select("*")
        .eq("current_holder_id", id)
        .eq("current_location_type", "customer") // Explicit check
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

    return data || [];
}

export async function getCustomerOrderHistory(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) return [];

    const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            driver:users (name)
        `)
        .eq("customer_id", id)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    return data || [];
}
