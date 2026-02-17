"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTenant, updateSubscription, toggleTenantStatus } from "@/app/actions/tenantActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Building, Users, Shield, Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function TenantDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadTenant();
    }, []);

    const loadTenant = async () => {
        try {
            const { success, data, error } = await getTenant(params.id as string);
            if (!success) throw new Error(error);
            setTenant(data);
        } catch (error: any) {
            toast.error(error.message);
            router.push("/super-admin");
        } finally {
            setLoading(false);
        }
    };

    const handleSubscriptionUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUpdating(true);
        const formData = new FormData(e.currentTarget);

        try {
            const { success, error } = await updateSubscription(tenant.id, formData);
            if (!success) throw new Error(error);
            toast.success("Subscription Updated");
            loadTenant();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusToggle = async () => {
        if (!confirm("Are you sure you want to change this tenant's status?")) return;

        try {
            const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
            const { success, error } = await toggleTenantStatus(tenant.id, newStatus);
            if (!success) throw new Error(error);
            toast.success(`Tenant ${newStatus === 'active' ? 'Activated' : 'Suspended'}`);
            loadTenant();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Tenant Details...</div>;
    if (!tenant) return <div className="p-8 text-center text-red-500">Tenant not found</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/super-admin">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Building className="text-primary" />
                            {tenant.name}
                        </h1>
                        <p className="text-muted-foreground text-sm font-mono">{tenant.id}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <Badge variant={tenant.status === 'active' ? 'success' : 'destructive'} className="text-lg px-4 py-1">
                            {tenant.status.toUpperCase()}
                        </Badge>
                        <Button
                            variant={tenant.status === 'active' ? 'destructive' : 'default'}
                            onClick={handleStatusToggle}
                        >
                            {tenant.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Subscription Management */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="text-purple-500" />
                                Subscription & Plan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubscriptionUpdate} className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Current Plan</Label>
                                    <select
                                        name="plan"
                                        defaultValue={tenant.subscription_plan}
                                        className="w-full h-10 rounded-md border border-input px-3 py-2 bg-white"
                                    >
                                        <option value="basic">Basic</option>
                                        <option value="standard">Standard</option>
                                        <option value="premium">Premium</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Input value={tenant.subscription_status} disabled className="bg-slate-100" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Input
                                        name="startDate"
                                        type="date"
                                        defaultValue={tenant.subscription_start_date ? new Date(tenant.subscription_start_date).toISOString().split('T')[0] : ''}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input
                                        name="endDate"
                                        type="date"
                                        defaultValue={tenant.subscription_end_date ? new Date(tenant.subscription_end_date).toISOString().split('T')[0] : ''}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={updating}>
                                        {updating ? 'Updating...' : 'Update Subscription'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Quick Stats / Metadata */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="text-blue-500" />
                                Metadata
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm text-slate-500">Created At</span>
                                <span className="font-medium">{new Date(tenant.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm text-slate-500">Slug</span>
                                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{tenant.slug}</span>
                            </div>

                            {/* Warning Zone */}
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 mt-6">
                                <div className="flex items-center gap-2 text-red-600 font-bold mb-2">
                                    <AlertTriangle size={16} />
                                    Danger Zone
                                </div>
                                <p className="text-xs text-red-500 mb-3">
                                    Deleting a tenant is permanent and will wipe all associated data.
                                </p>
                                <Button variant="destructive" size="sm" className="w-full" disabled>
                                    Delete Tenant (Disabled)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}

// Icon component helper if needed, or just import
import { Activity } from "lucide-react";
