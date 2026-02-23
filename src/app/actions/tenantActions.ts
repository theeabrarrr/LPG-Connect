'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Service Role Client for Admin Operations (User Creation)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

/**
 * Check if current user is Super Admin
 */
export async function checkSuperAdmin() {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return false;

    // Check public users table for role
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    return userData?.role === 'super_admin';
}

/**
 * LIST TENANTS
 */
export async function listTenants() {
    if (!await checkSuperAdmin()) {
        return { success: false, error: 'Unauthorized: Super Admin access required' };
    }

    const supabase = await createServerClient();

    // Get tenants with user count
    const { data: tenants, error } = await supabase
        .from('tenants')
        .select(`
            *,
            users:users(count)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    // Transform data to include user count cleanly
    const enrichedTenants = tenants.map(t => ({
        ...t,
        userCount: t.users?.[0]?.count || 0
    }));

    return { success: true, data: enrichedTenants };
}

/**
 * GET TENANT DETAILS
 */
export async function getTenant(id: string) {
    if (!await checkSuperAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

/**
 * CREATE TENANT
 * 1. Create Tenant Record
 * 2. Create Initial Admin User (Auth + Public)
 */
export async function createTenant(formData: FormData) {
    if (!await checkSuperAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const plan = formData.get('plan') as string || 'basic';
    const adminEmail = formData.get('adminEmail') as string;
    const adminPassword = formData.get('adminPassword') as string;
    const adminName = formData.get('adminName') as string;

    if (!name || !adminEmail || !adminPassword) {
        return { success: false, error: 'Missing required fields' };
    }

    try {
        const supabase = await createServerClient();

        // 1. Create Tenant
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                name,
                slug,
                subscription_plan: plan,
                status: 'active'
            })
            .select()
            .single();

        if (tenantError) throw new Error(`Tenant creation failed: ${tenantError.message}`);
        if (!tenant) throw new Error("Tenant created but returned no data");

        // 2. Create Admin User (using Supabase Admin)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: {
                tenant_id: tenant.id,
                role: 'admin',
                name: adminName
            }
        });

        if (authError) throw new Error(`Admin user creation failed: ${authError.message}`);
        if (!authUser.user) throw new Error("Auth user created but returned null");

        // 3. Create Public User Record (Manual Sync)
        const { error: publicUserError } = await supabaseAdmin
            .from('users')
            .insert({
                id: authUser.user.id,
                email: adminEmail,
                name: adminName,
                role: 'admin',
                tenant_id: tenant.id, // Explicitly set tenant_id
                status: 'active'
            });

        if (publicUserError) {
            // Rollback (delete auth user)? Ideally yes, but for MVP just throw
            throw new Error(`Public user sync failed: ${publicUserError.message}`);
        }

        revalidatePath('/superadmin/tenants');
        return { success: true, message: 'Tenant and Admin created successfully' };

    } catch (error: any) {
        console.error("Create Tenant Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * UPDATE TENANT
 */
export async function updateTenant(id: string, updates: any) {
    if (!await checkSuperAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServerClient();
    const { error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/superadmin/tenants');
    return { success: true };
}

/**
 * UPDATE SUBSCRIPTION
 */
export async function updateSubscription(id: string, formData: FormData) {
    if (!await checkSuperAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }

    const plan = formData.get('plan') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;

    if (!plan) return { success: false, error: 'Plan is required' };

    const updates: any = {
        subscription_plan: plan,
        subscription_start_date: startDate || null,
        subscription_end_date: endDate || null
    };

    // If future end date, ensure active status
    if (endDate && new Date(endDate) > new Date()) {
        updates.status = 'active';
    }

    const result = await updateTenant(id, updates);
    return result;
}

/**
 * SUSPEND/ACTIVATE TENANT
 */
export async function toggleTenantStatus(id: string, status: 'active' | 'suspended') {
    return updateTenant(id, { status });
}

/**
 * GET PLATFORM STATS
 */
export async function getPlatformStats() {
    if (!await checkSuperAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServerClient();

    // Parallel queries
    const [
        { count: tenantCount },
        { count: userCount },
        { count: orderCount }
    ] = await Promise.all([
        supabase.from('tenants').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }) // Super admin can see all
    ]);

    return {
        success: true,
        data: {
            totalTenants: tenantCount || 0,
            totalUsers: userCount || 0,
            totalOrders: orderCount || 0
        }
    };
}
