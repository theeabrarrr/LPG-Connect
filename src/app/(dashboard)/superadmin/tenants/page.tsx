import { listTenants } from "@/app/actions/tenantActions";
import { CreateTenantModal } from "@/components/superadmin/CreateTenantModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function TenantsPage() {
    const result = await listTenants();
    const tenants = result.success ? result.data : [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Tenant Management</h1>
                    <p className="text-slate-500 mt-1">Manage platform franchises and subscriptions.</p>
                </div>
                <CreateTenantModal />
            </div>

            {!result.success && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md">
                    Failed to load tenants: {result.error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>All Tenants</CardTitle>
                    <CardDescription>A complete list of onboarding franchises.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tenant Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead className="text-right">Users Count</TableHead>
                                <TableHead className="text-right">Created At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tenants?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No tenants found. Onboard one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tenants?.map((tenant: any) => (
                                    <TableRow key={tenant.id}>
                                        <TableCell className="font-medium">{tenant.name}</TableCell>
                                        <TableCell className="text-slate-500 text-sm">{tenant.slug}</TableCell>
                                        <TableCell>
                                            <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}
                                                className={tenant.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                                {tenant.status || 'active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="capitalize">{tenant.subscription_plan}</TableCell>
                                        <TableCell className="text-right">{tenant.userCount}</TableCell>
                                        <TableCell className="text-right text-slate-500 text-sm">
                                            {format(new Date(tenant.created_at), 'PPP')}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
