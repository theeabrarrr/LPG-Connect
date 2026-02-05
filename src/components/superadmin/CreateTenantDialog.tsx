'use client';

import { useState } from 'react';
import { createTenant } from '@/app/actions/tenantActions';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Building2, User, Key, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CreateTenantDialogProps {
    onSuccess: () => void;
}

export function CreateTenantDialog({ onSuccess }: CreateTenantDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await createTenant(formData);

        if (result.success) {
            toast.success('Tenant created successfully');
            setOpen(false);
            onSuccess();
        } else {
            toast.error(result.error || 'Failed to create tenant');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Tenant
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Onboard New Organization</DialogTitle>
                        <DialogDescription>
                            Create a new tenant workspace and provision the initial admin account.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Organization Details */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Organization Details
                            </h3>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Organization Name</Label>
                                <Input id="name" name="name" placeholder="e.g. Ali Gas" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="plan">Subscription Plan</Label>
                                <Select name="plan" defaultValue="basic">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="basic">Basic (Free)</SelectItem>
                                        <SelectItem value="pro">Pro ($29/mo)</SelectItem>
                                        <SelectItem value="enterprise">Enterprise (Custom)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Admin User Provisioning */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <User className="w-4 h-4" /> Initial Admin User
                            </h3>

                            <div className="grid gap-2">
                                <Label htmlFor="adminName">Full Name</Label>
                                <Input id="adminName" name="adminName" placeholder="e.g. Ali Khan" required />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="adminEmail">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input id="adminEmail" name="adminEmail" type="email" placeholder="admin@company.com" className="pl-9" required />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="adminPassword">Temporary Password</Label>
                                <div className="relative">
                                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="adminPassword"
                                        name="adminPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        minLength={6}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Must be at least 6 characters.</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Provisioning...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Create Tenant
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
