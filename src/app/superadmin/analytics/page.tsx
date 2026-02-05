'use client';

import { useEffect, useState } from 'react';
import { getPlatformStats } from '@/app/actions/tenantActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, ShoppingCart, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface PlatformStats {
    totalTenants: number;
    totalUsers: number;
    totalOrders: number;
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const result = await getPlatformStats();
                if (result.success && result.data) {
                    setStats(result.data);
                } else {
                    toast.error(result.error || 'Failed to load analytics');
                }
            } catch (error) {
                toast.error('An unexpected error occurred');
            } finally {
                setLoading(false);
            }
        }

        loadStats();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
                <p className="text-muted-foreground">High-level metrics across all organizations.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Organizations
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalTenants}</div>
                        <p className="text-xs text-muted-foreground">
                            Active tenants on platform
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all organizations
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Orders
                        </CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">
                            Lifetime platform volume
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Placeholder for deeper analytics */}
            <Card className="mt-6 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <TrendingUp className="h-10 w-10 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Advanced Reporting Coming Soon</p>
                    <p className="text-sm">Detailed revenue breakdowns and churn metrics will be available in Phase 2.</p>
                </CardContent>
            </Card>
        </div>
    );
}
