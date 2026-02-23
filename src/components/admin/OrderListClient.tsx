'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignOrdersToDriver } from '@/app/actions/adminActions';
import { format } from 'date-fns';
import Link from 'next/link';
import { Printer, Calendar, Trash2, Truck, CheckSquare, Square, X, ShoppingCart, Filter } from 'lucide-react';
import { toast } from 'sonner';

type OrderListClientProps = {
    initialOrders: any[];
    drivers: { id: string, name: string }[];
    currentFilters: any;
};

export default function OrderListClient({ initialOrders, drivers, currentFilters }: OrderListClientProps) {
    const router = useRouter();
    const [orders] = useState(initialOrders); // State controlled by server props

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    // Filters UI State (Initialized from URL)
    const [filters, setFilters] = useState(currentFilters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    const updateFilter = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);

        // Build URL Search Params
        const params = new URLSearchParams();
        Object.keys(newFilters).forEach(k => {
            if (newFilters[k] && newFilters[k] !== 'all') {
                params.set(k, newFilters[k]);
            }
        });

        router.push(`/admin/orders?${params.toString()}`);
    };

    const resetFilters = () => {
        setFilters({
            status: 'all', driverId: 'all', startDate: '', endDate: '', minAmount: '', maxAmount: '', paymentMode: 'all'
        });
        router.push(`/admin/orders`);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === orders.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(orders.map(o => o.id)));
    };

    const handleBulkAssign = async () => {
        if (!selectedDriverId) return toast.error("Please select a driver");

        setIsAssigning(true);
        const res = await assignOrdersToDriver(Array.from(selectedIds), selectedDriverId);
        setIsAssigning(false);

        if (res.success) {
            toast.success(res.message);
            setIsAssignModalOpen(false);
            setSelectedIds(new Set());
            setSelectedDriverId('');
            router.refresh(); // Refresh Server Component
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen pb-32 font-sans relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order History</h1>
                    <p className="text-sm text-slate-500 font-medium">Track all dispatch and sales records</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto justify-center"
                    >
                        <Filter size={16} /> Filters
                    </button>
                    <Link href="/admin/orders/new" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 w-full md:w-auto justify-center">
                        <ShoppingCart size={16} /> New Order
                    </Link>
                </div>
            </div>

            {/* Configurable Filter Panel */}
            {isFilterPanelOpen && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                            <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 p-2.5 outline-none font-medium">
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="assigned">Assigned</option>
                                <option value="on_trip">On Trip</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Driver</label>
                            <select value={filters.driverId} onChange={(e) => updateFilter('driverId', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 p-2.5 outline-none font-medium">
                                <option value="all">All</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Payment Mode</label>
                            <select value={filters.paymentMode} onChange={(e) => updateFilter('paymentMode', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 p-2.5 outline-none font-medium">
                                <option value="all">All</option>
                                <option value="cash">Cash</option>
                                <option value="credit">Credit</option>
                                <option value="bank">Bank Transfer</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Min Amount</label>
                            <input type="number" value={filters.minAmount} onChange={(e) => updateFilter('minAmount', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 p-2.5 outline-none font-medium" placeholder="Min Rs" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Max Amount</label>
                            <input type="number" value={filters.maxAmount} onChange={(e) => updateFilter('maxAmount', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 p-2.5 outline-none font-medium" placeholder="Max Rs" />
                        </div>

                        <div className="space-y-1 flex items-end">
                            <button onClick={resetFilters} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-lg transition-colors">
                                Reset All
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Date Range Start</label>
                            <input type="date" value={filters.startDate} onChange={(e) => updateFilter('startDate', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 p-2.5 outline-none font-medium" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Date Range End</label>
                            <input type="date" value={filters.endDate} onChange={(e) => updateFilter('endDate', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 p-2.5 outline-none font-medium" />
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="p-4 w-12 text-center">
                                    <button onClick={toggleAll} className="text-slate-400 hover:text-emerald-600">
                                        {orders.length > 0 && selectedIds.size === orders.length ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </button>
                                </th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-400">No orders found matching filters.</td></tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(order.id) ? 'bg-emerald-50/50' : ''}`}>
                                        <td className="p-4 text-center">
                                            <button onClick={() => toggleSelection(order.id)} className={`${selectedIds.has(order.id) ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500'}`}>
                                                {selectedIds.has(order.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </button>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-slate-600 text-xs">
                                            #{order.friendly_id || order.id.slice(0, 8).toUpperCase()}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 text-sm">{order.customers?.name || 'Guest'}</div>
                                            <div className="text-xs text-slate-400">{order.customers?.address || '-'}</div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {order.driver?.name || <span className="text-amber-500 font-bold text-xs uppercase bg-amber-50 px-2 py-1 rounded-full">Unassigned</span>}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 flex items-center gap-2">
                                            <Calendar size={14} />
                                            {format(new Date(order.created_at), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-black uppercase tracking-wider ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                order.status === 'on_trip' ? 'bg-purple-100 text-purple-700' :
                                                    order.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                                                        order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {order.status === 'on_trip' ? 'ON WAY' : order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-slate-900">
                                            Rs {order.total_amount?.toLocaleString() || 0}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={`/invoice/${order.id}`}
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                                                    title="View Invoice"
                                                >
                                                    <Printer size={16} />
                                                </Link>
                                                {['assigned', 'pending', 'delivered'].includes(order.status) && (
                                                    <button
                                                        onClick={async () => {
                                                            const reason = window.prompt("Enter cancellation reason:");
                                                            if (reason) {
                                                                toast.loading("Cancelling Order...");
                                                                const { cancelOrder } = await import('@/app/actions/adminActions');
                                                                const res = await cancelOrder(order.id, reason);
                                                                toast.dismiss();
                                                                if (res.success) {
                                                                    toast.success(res.message);
                                                                    router.refresh();
                                                                } else {
                                                                    toast.error(res.error);
                                                                }
                                                            }
                                                        }}
                                                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                        title="Cancel Order"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BULK ACTION BAR */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 animate-in slide-in-from-bottom duration-300">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700">
                        <div className="font-bold text-sm">
                            <span className="text-emerald-400 text-lg mr-2">{selectedIds.size}</span>
                            Orders Selected
                        </div>
                        <div className="h-6 w-px bg-slate-700"></div>
                        <button
                            onClick={() => setIsAssignModalOpen(true)}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                            <Truck size={16} /> Assign to Driver
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* ASSIGN MODAL */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Assign Orders</h2>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <p className="text-slate-500 text-sm mb-6">
                            Assigning <strong className="text-slate-900">{selectedIds.size} orders</strong> to a driver. This will move reserved inventory to the driver's truck.
                        </p>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Driver</label>
                            <select
                                value={selectedDriverId}
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold appearance-none"
                            >
                                <option value="">-- Choose Driver --</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleBulkAssign}
                            disabled={isAssigning || !selectedDriverId}
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
                        >
                            {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
