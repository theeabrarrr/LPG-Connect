'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTenant, updateTenant, updateSubscription, toggleTenantStatus } from '@/app/actions/tenantActions';
import { toast } from 'sonner';
import {
    Loader2, Save, Building, Calendar, CreditCard, Shield, AlertTriangle, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function TenantDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [plan, setPlan] = useState('basic');
    const [status, setStatus] = useState('active');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        loadTenant();
    }, []);

    const loadTenant = async () => {
        setLoading(true);
        const res = await getTenant(params.id);
        if (res.success) {
            setTenant(res.data);
            setName(res.data.name);
            setPlan(res.data.subscription_plan || 'basic');
            setStatus(res.data.status || 'active');
            setStartDate(res.data.subscription_start_date ? res.data.subscription_start_date.split('T')[0] : '');
            setEndDate(res.data.subscription_end_date ? res.data.subscription_end_date.split('T')[0] : '');
        } else {
            toast.error(res.error || "Failed to load tenant");
            router.push('/super-admin/tenants');
        }
        setLoading(false);
    };

    const handleSaveGeneral = async () => {
        setSaving(true);
        const res = await updateTenant(params.id, { name });
        if (res.success) toast.success("Tenant details updated");
        else toast.error(res.error);
        setSaving(false);
    };

    const handleSaveSubscription = async () => {
        setSaving(true);
        const formData = new FormData();
        formData.append('plan', plan);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);

        const res = await updateSubscription(params.id, formData);
        if (res.success) toast.success("Subscription updated");
        else toast.error(res.error);
        setSaving(false);
    };

    const handleToggleStatus = async () => {
        const newStatus = status === 'active' ? 'suspended' : 'active';
        if (!confirm(`Are you sure you want to set status to ${newStatus.toUpperCase()}?`)) return;

        setSaving(true);
        const res = await toggleTenantStatus(params.id, newStatus);
        if (res.success) {
            setStatus(newStatus);
            toast.success(`Tenant ${newStatus}`);
        } else {
            toast.error(res.error);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!tenant) return <div>Tenant not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in pb-32">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/super-admin/tenants" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{tenant.name}</h1>
                    <p className="text-slate-500 font-mono text-sm">ID: {tenant.id}</p>
                </div>
                <div className="ml-auto">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* General Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-6 text-slate-900 border-b border-slate-100 pb-4">
                        <Building className="text-blue-600" />
                        <h2 className="text-xl font-bold">General Details</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tenant Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                            />
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={handleSaveGeneral}
                                disabled={saving}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Details</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Subscription Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-6 text-slate-900 border-b border-slate-100 pb-4">
                        <CreditCard className="text-emerald-600" />
                        <h2 className="text-xl font-bold">Subscription</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plan</label>
                            <select
                                value={plan}
                                onChange={(e) => setPlan(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 appearance-none"
                            >
                                <option value="basic">Basic</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                                />
                            </div>
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={handleSaveSubscription}
                                disabled={saving}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Update Subscription</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="md:col-span-2 bg-red-50 p-6 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-2 mb-4 text-red-900">
                        <AlertTriangle className="text-red-600" />
                        <h2 className="text-xl font-bold">Danger Zone</h2>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-red-900">
                                {status === 'active' ? 'Suspend Tenant Access' : 'Reactivate Tenant Access'}
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                                {status === 'active'
                                    ? 'This will immediately block all users in this tenant from logging in.'
                                    : 'This will restore access for all users in this tenant.'}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleStatus}
                            disabled={saving}
                            className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${status === 'active' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                        >
                            {status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
