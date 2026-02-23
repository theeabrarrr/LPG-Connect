import { getPlatformStats } from "@/app/actions/tenantActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, ShoppingCart, AlertCircle } from "lucide-react";

export default async function SuperAdminDashboard() {
    const statsResult = await getPlatformStats();

    if (!statsResult.success) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    <div className="flex items-center gap-2 font-medium mb-1">
                        <AlertCircle className="h-4 w-4" />
                        Error
                    </div>
                    <span className="block sm:inline">
                        Failed to load platform stats: {statsResult.error}
                    </span>
                </div>
            </div>
        );
    }

    const stats = statsResult.data!;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Platform Analytics</h1>
                <p className="text-slate-500 mt-1">High-level overview of the SaaS platform</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Tenants</CardTitle>
                        <Building2 className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTenants}</div>
                        <p className="text-xs text-slate-500 mt-1">Active franchises on platform</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-slate-500 mt-1">Across all tenants</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Orders Processed</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                        <p className="text-xs text-slate-500 mt-1">Platform-wide lifetime orders</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
