import Link from 'next/link';
import { Shield, Users, BarChart3, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Verify Super Admin Access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userData?.role !== 'super_admin') {
        redirect('/dashboard'); // Kick back to normal dashboard
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 border-b border-slate-800 flex items-center gap-2">
                    <Shield className="w-8 h-8 text-red-500" />
                    <div>
                        <h1 className="font-bold text-lg">Iron Dome</h1>
                        <p className="text-xs text-slate-400">Super Admin Console</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/superadmin/tenants">
                        <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
                            <Users className="w-5 h-5 mr-3" />
                            Tenants
                        </Button>
                    </Link>
                    <Link href="/superadmin/analytics">
                        <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
                            <BarChart3 className="w-5 h-5 mr-3" />
                            Platform Analytics
                        </Button>
                    </Link>
                    <Link href="/superadmin/settings">
                        <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
                            <Settings className="w-5 h-5 mr-3" />
                            System Settings
                        </Button>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <form action="/auth/signout" method="post">
                        <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Overview</h2>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-right">
                            <p className="font-medium text-gray-900">Super Admin</p>
                            <p className="text-gray-500">{user.email}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold border border-red-200">
                            SA
                        </div>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
