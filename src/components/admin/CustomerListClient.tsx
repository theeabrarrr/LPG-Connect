'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Users, UploadCloud, Search, Phone, Wallet, Plus, ArrowRight, AlertTriangle, MoreVertical, Edit2, Ban, CheckCircle, Filter } from 'lucide-react';
import CustomerImportModal from '@/components/admin/customers/CustomerImportModal';
import EditCustomerModal from '@/components/admin/customers/EditCustomerModal';
import AddCustomerModal from '@/components/admin/customers/AddCustomerModal';
import { toggleCustomerStatus } from '@/app/actions/customerActions';
import Link from 'next/link';

interface Customer {
    id: string;
    name: string;
    phone: string;
    address: string;
    current_balance: number;
    tenant_id: string;
    is_active: boolean;
    credit_limit?: number;
    last_order_at?: string;
}

export default function CustomerListClient({
    initialCustomers,
    totalCount,
    stats,
    tenantName,
    currentFilters
}: any) {
    const router = useRouter();

    // UI State
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    // Filters UI State (Initialized from URL)
    const [searchTerm, setSearchTerm] = useState(currentFilters.search);
    const [statusFilter, setStatusFilter] = useState(currentFilters.status);
    const [balanceFilter, setBalanceFilter] = useState(currentFilters.balanceStatus);

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams();

        let newSearch = key === 'search' ? value : searchTerm;
        let newStatus = key === 'status' ? value : statusFilter;
        let newBalance = key === 'balanceStatus' ? value : balanceFilter;
        let newPage = key === 'page' ? value : (key !== 'page' ? '1' : currentFilters.page.toString());

        if (newSearch) params.set('search', newSearch);
        if (newStatus !== 'all') params.set('status', newStatus);
        if (newBalance !== 'all') params.set('balanceStatus', newBalance);
        params.set('page', newPage);
        params.set('limit', currentFilters.limit.toString());

        if (key === 'search') setSearchTerm(value);
        if (key === 'status') setStatusFilter(value);
        if (key === 'balanceStatus') setBalanceFilter(value);

        router.push(`/admin/customers?${params.toString()}`);
    };

    // Debounce manual search
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        // Simple manual trigger. In production, wrap with useDebounce
    };

    const handleSearchSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            updateFilters('search', searchTerm);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setActionMenuOpen(null);
        toast.promise(toggleCustomerStatus(id, !currentStatus), {
            loading: 'Updating status...',
            success: () => {
                router.refresh();
                return 'Status updated';
            },
            error: 'Failed to update status'
        });
    };

    const totalPages = Math.ceil(totalCount / currentFilters.limit);

    return (
        <div className="p-6 bg-slate-50 min-h-screen pb-32 font-sans">

            {/* Header & Stats Row */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Collections Dashboard</h1>
                        <p className="text-sm text-slate-500 font-medium">Overview for <span className="text-slate-900 font-bold">{tenantName}</span></p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20"
                        >
                            <Plus size={16} /> New Customer
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50"
                        >
                            <UploadCloud size={16} /> Import CSV
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Receivables</p>
                            <p className="text-2xl font-black text-slate-900">Rs {stats.totalReceivables.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">At Risk (Defaulters)</p>
                            <p className="text-2xl font-black text-slate-900">{stats.defaultersCount}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Customers</p>
                            <p className="text-2xl font-black text-slate-900">{totalCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">

                {/* Internal Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                placeholder="Search Name or Phone... Enter to search"
                                value={searchTerm}
                                onChange={handleSearch}
                                onKeyDown={handleSearchSubmit}
                                className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold w-full focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                        </div>

                        <div className="flex bg-slate-100 rounded-lg p-1">
                            {['active', 'all', 'inactive'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => updateFilters('status', s)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                            className={`px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg font-bold flex items-center gap-2 transition-colors ${isFilterPanelOpen ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                        >
                            <Filter size={16} />
                            Advanced Filters
                        </button>
                    </div>
                </div>

                {isFilterPanelOpen && (
                    <div className="p-4 border-b border-slate-100 bg-slate-50 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Balance Type</label>
                                <select
                                    value={balanceFilter}
                                    onChange={(e) => updateFilters('balanceStatus', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 p-2.5 outline-none font-medium"
                                >
                                    <option value="all">All Balances</option>
                                    <option value="positive">Debtors (Positive Balance)</option>
                                    <option value="negative">Advances (Negative Balance)</option>
                                    <option value="zero">Zero Balance</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-10">St</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Balance / Limit</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Order</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {initialCustomers.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400">No customers found matching criteria.</td></tr>
                            ) : (
                                initialCustomers.map((c: Customer) => {
                                    const limit = c.credit_limit || 50000;
                                    const usage = (c.current_balance < 0 ? 0 : c.current_balance / limit) * 100;
                                    const isDefaulter = c.current_balance > limit;

                                    return (
                                        <tr key={c.id} className={`hover:bg-slate-50 transition-colors group ${isDefaulter ? 'bg-red-50/50' : ''}`}>
                                            <td className="p-4">
                                                <div className={`w-2.5 h-2.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={c.is_active ? "Active" : "Inactive"} />
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{c.name}</div>
                                                <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                    <Phone size={10} /> {c.phone}
                                                </div>
                                            </td>
                                            <td className="p-4 w-64">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className={`text-sm font-black ${c.current_balance > 0 ? 'text-red-600' : c.current_balance < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                        Rs {c.current_balance.toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">Limit: {limit / 1000}k</span>
                                                </div>
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${usage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(usage, 100)}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-bold text-slate-600">
                                                {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2 relative">
                                                    <Link href={`/admin/customers/${c.id}`} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="View Ledger">
                                                        <ArrowRight size={18} />
                                                    </Link>

                                                    <button
                                                        onClick={() => setActionMenuOpen(actionMenuOpen === c.id ? null : c.id)}
                                                        className="p-2 text-slate-300 hover:text-slate-600 rounded-lg"
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>

                                                    {/* Quick Action Dropdown */}
                                                    {actionMenuOpen === c.id && (
                                                        <div className="absolute right-0 top-10 bg-white shadow-xl border border-slate-100 rounded-lg w-40 py-2 z-10 animate-in fade-in zoom-in-95 duration-100">
                                                            <button
                                                                onClick={() => { setEditingCustomer(c); setActionMenuOpen(null); }}
                                                                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                            >
                                                                <Edit2 size={14} /> Edit Details
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus(c.id, c.is_active)}
                                                                className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 ${c.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                            >
                                                                {c.is_active ? <><Ban size={14} /> Deactivate</> : <><CheckCircle size={14} /> Activate</>}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-500">
                        Showing {((currentFilters.page - 1) * currentFilters.limit) + 1} - {Math.min(currentFilters.page * currentFilters.limit, totalCount)} of {totalCount}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => updateFilters('page', String(currentFilters.page - 1))}
                            disabled={currentFilters.page <= 1}
                            className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => updateFilters('page', String(currentFilters.page + 1))}
                            disabled={currentFilters.page >= totalPages || totalPages === 0}
                            className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && <AddCustomerModal onClose={() => setShowAddModal(false)} onSuccess={() => { router.refresh(); }} />}
            {editingCustomer && <EditCustomerModal customer={editingCustomer} onClose={() => setEditingCustomer(null)} onSuccess={() => { router.refresh(); }} />}
            {showImportModal && <CustomerImportModal onClose={() => setShowImportModal(false)} onSuccess={() => { router.refresh(); }} />}
        </div>
    );
}
