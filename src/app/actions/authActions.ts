"use server";

import { createClient } from "@/utils/supabase/server";

export async function checkSystemAlreadySetup() {
    const supabase = await createClient();
    const OWNER_TENANT_ID = process.env.NEXT_PUBLIC_OWNER_TENANT_ID;

    if (!OWNER_TENANT_ID) return false;

    // Check if any user exists with this tenant ID and super_admin role
    const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', OWNER_TENANT_ID)
        .eq('role', 'super_admin');

    if (error) {
        console.error("Error checking system setup:", error);
        // Fail safe: assume setup to prevent override if DB error
        return true;
    }

    return (count || 0) > 0;
}

export async function signupSuperAdmin(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    const supabase = await createClient();

    // CRITICAL: Hardcoded Owner Tenant ID for the first Super Admin
    const OWNER_TENANT_ID = process.env.NEXT_PUBLIC_OWNER_TENANT_ID!;

    if (!OWNER_TENANT_ID) {
        return { error: "System Configuration Error: Missing Owner Tenant ID" };
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                tenant_id: OWNER_TENANT_ID,
                role: 'super_admin',
                name: 'System Owner'
            }
        }
    });

    if (error) {
        return { error: error.message };
    }

    // Check if session exists (Auto-confirm enabled) or user needs to verify email
    if (data.session) {
        return { success: true, redirect: "/super-admin" };
    } else if (data.user) {
        return { success: true, message: "Please check your email to confirm account." };
    }

    return { error: "Unknown error occurred" };
}
