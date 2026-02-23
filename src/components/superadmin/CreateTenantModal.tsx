'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createTenant } from '@/app/actions/tenantActions';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';

export function CreateTenantModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function onSubmit(formData: FormData) {
        setLoading(true);
        try {
            const res = await createTenant(formData);
            if (res.success) {
                toast.success(res.message || "Tenant created successfully");
                setOpen(false);
            } else {
                toast.error(res.error || "Failed to create tenant");
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Onboard New Tenant
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Onboard Tenant</DialogTitle>
                        <DialogDescription>
                            Create a new franchise and provision its first admin account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Tenant Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g. LPG City Central"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="plan">Subscription Plan</Label>
                            <Select name="plan" defaultValue="basic">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">Free Trial</SelectItem>
                                    <SelectItem value="basic">Basic (Up to 5 users)</SelectItem>
                                    <SelectItem value="pro">Pro (Unlimited)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="my-2 border-t pt-4">
                            <h4 className="text-sm font-semibold mb-3">Admin Account</h4>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="adminName">Admin Full Name</Label>
                                    <Input
                                        id="adminName"
                                        name="adminName"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="adminEmail">Admin Email</Label>
                                    <Input
                                        id="adminEmail"
                                        name="adminEmail"
                                        type="email"
                                        placeholder="admin@lpgcity.com"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="adminPassword">Admin Password</Label>
                                    <Input
                                        id="adminPassword"
                                        name="adminPassword"
                                        type="password"
                                        placeholder="Min. 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Provisioning...
                                </>
                            ) : (
                                "Create Tenant"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
