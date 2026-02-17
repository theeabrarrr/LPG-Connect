'use client';

import { useState, useEffect } from 'react';
import { getDriverAnalytics } from '@/app/actions/adminActions';
import {
    Loader2, X, TrendingUp, Package, CheckCircle, AlertCircle, DollarSign
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface DriverAnalyticsModalProps {
    driverId: string;
    driverName: string;
    onClose: () => void;
}

export default function DriverAnalyticsModal({ driverId, driverName, onClose }: DriverAnalyticsModalProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadStats();
    }, [driverId]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const result = await getDriverAnalytics(driverId);
            if (result.success) {
                setStats(result.data);
            }
        } catch (error) {
            console.error("Failed to load analytics", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Driver Performance</h2>
                        <p className="text-slate-500 text-sm mt-1">Analytics for <span className="font-bold text-emerald-600">{driverName}</span> (Last 30 Days)</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-800">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            <p className="text-slate-500 font-medium animate-pulse">Crunching numbers...</p>
                        </div>
                    ) : stats ? (
                        <div className="space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    title="Total Orders"
                                    value={stats.totalOrders}
                                    icon={<TrendingUp size={16} className="text-blue-600" />}
                                    bg="bg-blue-50"
                                    border="border-blue-100"
                                />
                                <StatCard
                                    title="Revenue"
                                    value={`Rs ${stats.totalRevenue.toLocaleString()}`}
                                    icon={<DollarSign size={16} className="text-emerald-600" />}
                                    bg="bg-emerald-50"
                                    border="border-emerald-100"
                                />
                                <StatCard
                                    title="Full Stock"
                                    value={stats.currentStock.full}
                                    icon={<CheckCircle size={16} className="text-emerald-600" />}
                                    bg="bg-emerald-50"
                                    border="border-emerald-100"
                                    subLabel={stats.currentStock.full < 5 ? 'Low Stock' : 'Available'}
                                    subColor={stats.currentStock.full < 5 ? 'text-rose-600' : 'text-emerald-600'}
                                />
                                <StatCard
                                    title="Empty Stock"
                                    value={stats.currentStock.empty}
                                    icon={<Package size={16} className="text-slate-600" />}
                                    bg="bg-slate-50"
                                    border="border-slate-100"
                                />
                            </div>

                            {/* Detailed Inventory Breakdown */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Package size={16} /> Current Inventory Status
                                </h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-4 flex-1 bg-slate-200 rounded-full overflow-hidden flex">
                                        <div style={{ width: `${(stats.currentStock.full / stats.currentStock.total) * 100}%` }} className="bg-emerald-500 h-full" />
                                        <div style={{ width: `${(stats.currentStock.empty / stats.currentStock.total) * 100}%` }} className="bg-slate-400 h-full" />
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Full ({stats.currentStock.full})
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                        Empty ({stats.currentStock.empty})
                                    </div>
                                    <div>Total: {stats.currentStock.total}</div>
                                </div>
                            </div>

                            {/* Recent Orders */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Recent Activity</h3>
                                <div className="space-y-3">
                                    {stats.recentOrders.length === 0 ? (
                                        <p className="text-slate-400 italic text-sm">No recent activity found.</p>
                                    ) : (
                                        stats.recentOrders.map((order: any) => (
                                            <div key={order.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-emerald-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${order.status === 'completed' || order.status === 'delivered' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {order.status === 'completed' || order.status === 'delivered' ? 'Delivery Completed' : 'Order Pending'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-mono">
                                                            {new Date(order.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-900">Rs {order.total_amount?.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>Failed to load data</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, bg, border, subLabel, subColor }: any) {
    return (
        <div className={`p-4 rounded-xl border ${bg} ${border} flex flex-col justify-between`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mix-blend-multiply">{title}</span>
                {icon}
            </div>
            <div>
                <div className="text-lg font-bold text-slate-900 leading-none">{value}</div>
                {subLabel && (
                    <div className={`text-[10px] font-bold mt-1 ${subColor}`}>
                        {subLabel}
                    </div>
                )}
            </div>
        </div>
    );
}
