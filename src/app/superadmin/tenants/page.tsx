'use client';

import { useEffect, useState } from 'react';
import { listTenants, toggleTenantStatus } from '@/app/actions/tenantActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Users,
    Search,
    Plus,
    MoreVertical,
    ShieldCheck,
    ShieldAlert,
    Loader2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { CreateTenantDialog } from '@/components/superadmin/CreateTenantDialog';
import { ManageSubscriptionDialog } from '@/components/superadmin/ManageSubscriptionDialog';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    subscription_plan: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
    status: 'active' | 'suspended' | 'trial' | 'cancelled';
    created_at: string;
    userCount: number;
}

export default function TenantManagementPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadTenants();
    }, []);

    async function loadTenants() {
        setLoading(true);
        const result = await listTenants();
        if (result.success && result.data) {
            setTenants(result.data as Tenant[]);
        } else {
            toast.error(result.error || 'Failed to load tenants');
        }
        setLoading(false);
    }

    async function handleStatusToggle(id: string, currentStatus: string) {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const result = await toggleTenantStatus(id, newStatus);

        if (result.success) {
            toast.success(`Tenant ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
            loadTenants(); // Refresh
        } else {
            toast.error('Failed to update status');
        }
    }

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
                    <p className="text-muted-foreground">Manage authorized organizations and their access levels.</p>
                </div>
                <CreateTenantDialog onSuccess={loadTenants} />
            </div>

            {/* Filter Bar */}
            <Card>
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search tenants..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{tenants.length} Total Tenants</span>
                    </div>
                </CardContent>
            </Card>

            {/* Tenants Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Users</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                            Running Query...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredTenants.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No tenants found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTenants.map((tenant) => (
                                    <TableRow key={tenant.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-900">{tenant.name}</p>
                                                <p className="text-xs text-gray-500 font-mono">{tenant.slug}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {tenant.subscription_plan}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span>{tenant.userCount}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {tenant.status === 'active' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                    <ShieldCheck className="w-3 h-3 mr-1" /> Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                                                    <ShieldAlert className="w-3 h-3 mr-1" /> Suspended
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {new Date(tenant.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedTenant(tenant);
                                                            setIsSubscriptionOpen(true);
                                                        }}
                                                    >
                                                        Manage Subscription
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className={tenant.status === 'active' ? "text-red-600 focus:text-red-600" : "text-green-600 focus:text-green-600"}
                                                        onClick={() => handleStatusToggle(tenant.id, tenant.status)}
                                                    >
                                                        {tenant.status === 'active' ? 'Suspend Access' : 'Activate Access'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <ManageSubscriptionDialog
                        tenant={selectedTenant}
                        open={isSubscriptionOpen}
                        onOpenChange={setIsSubscriptionOpen}
                        onSuccess={() => {
                            loadTenants();
                            setIsSubscriptionOpen(false);
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
