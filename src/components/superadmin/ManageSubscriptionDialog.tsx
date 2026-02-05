'use client';

import { useState } from 'react';
import { updateSubscription } from '@/app/actions/tenantActions';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Tenant {
    id: string;
    name: string;
    subscription_plan: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
}

interface ManageSubscriptionDialogProps {
    tenant: Tenant | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ManageSubscriptionDialog({
    tenant,
    open,
    onOpenChange,
    onSuccess
}: ManageSubscriptionDialogProps) {
    const [loading, setLoading] = useState(false);

    if (!tenant) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await updateSubscription(tenant.id, formData);

        if (result.success) {
            toast.success('Subscription updated successfully');
            onOpenChange(false);
            onSuccess();
        } else {
            toast.error(result.error || 'Failed to update subscription');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Manage Subscription</DialogTitle>
                        <DialogDescription>
                            Update billing details for <span className="font-semibold text-gray-900">{tenant.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="plan">Current Plan</Label>
                                <Select name="plan" defaultValue={tenant.subscription_plan || 'basic'}>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="startDate">Start Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="startDate"
                                            name="startDate"
                                            type="date"
                                            defaultValue={tenant.subscription_start_date ? new Date(tenant.subscription_start_date).toISOString().split('T')[0] : ''}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="endDate">End Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="endDate"
                                            name="endDate"
                                            type="date"
                                            defaultValue={tenant.subscription_end_date ? new Date(tenant.subscription_end_date).toISOString().split('T')[0] : ''}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
