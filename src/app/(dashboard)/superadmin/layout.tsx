import { SuperAdminSidebar } from "@/components/superadmin/SuperAdminSidebar";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { checkSuperAdmin } from "@/app/actions/tenantActions";

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    // 1. Verify Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect('/login');
    }

    // 2. Verify Super Admin Access using the secure server action helper
    const isSuperAdmin = await checkSuperAdmin();
    if (!isSuperAdmin) {
        redirect('/login');
    }

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            <SuperAdminSidebar />
            <main className="flex-1 overflow-y-auto h-screen">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
