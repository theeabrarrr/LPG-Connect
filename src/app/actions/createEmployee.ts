'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Admin client for bypassing RLS during user creation
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

export async function createEmployee(prevState: any, formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;
    const shift = formData.get('shift') as string;
    const phone = formData.get('phone') as string;
    const vehicleNumber = formData.get('vehicle_number') as string;
    const phoneNumber = formData.get('phone_number') as string;

    const finalPhone = phoneNumber || phone || '';

    if (!name || !email || !password || !role || !shift) {
        return { error: 'Please fill in all required fields (Name, Email, Password, Role, Shift)' };
    }

    try {
        // 1. Get current Authenticated Admin
        const supabase = await createClient();
        const { data: { user: adminAuth }, error: adminAuthError } = await supabase.auth.getUser();

        if (adminAuthError || !adminAuth) {
            return { error: 'Unauthorized: You must be logged in to create employees.' };
        }

        // 2. Resolve Tenant ID (Robustly)
        let tenantId = adminAuth.app_metadata?.tenant_id || adminAuth.user_metadata?.tenant_id;

        if (!tenantId) {
            // Fallback: Check DB via auth_id
            const { data: dbAdmin } = await supabaseAdmin
                .from('users')
                .select('tenant_id')
                .eq('auth_id', adminAuth.id)
                .single();
            if (dbAdmin) tenantId = dbAdmin.tenant_id;
        }

        if (!tenantId) {
            // Fallback 2: Check DB via ID (Legacy)
            const { data: dbAdminLegacy } = await supabaseAdmin
                .from('users')
                .select('tenant_id')
                .eq('id', adminAuth.id)
                .single();
            if (dbAdminLegacy) tenantId = dbAdminLegacy.tenant_id;
        }

        if (!tenantId) {
            return { error: 'Critical Security Error: Tenant Context Missing. Cannot proceed.' };
        }

        // 3. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name: name,
                role: role,
                shift: shift,
                phone_number: finalPhone,
                vehicle_number: vehicleNumber || '',
                tenant_id: tenantId
            },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('User creation failed');

        const authUserId = authData.user.id;

        // 4. Manual DB Creation Removed
        // public.handle_new_user check (Trigger automatically creates: User, Profile, Wallet)

        // Wait briefly for trigger to fire (optional but helps UI consistency immediately after)
        // In a real production app, we might poll or just assume success.

        return { success: true, message: `Employee ${name} created successfully!` };

    } catch (error: any) {
        console.error('Create Employee Error:', error);
        return { error: error.message };
    }
}
