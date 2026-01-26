"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, CheckCircle, RefreshCw, Box, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface TripMetric {
    trip_id: string;
    driver_name: string;
    start_time: string;
    end_time: string | null;
    completed_orders_count: number;
    expected_empty_returns: number;
}

interface TripCylinder {
    cylinder_id: string;
    serial_number: string;
    size: string;
    current_status: string; // The status BEFORE return (likely 'customer' or similar)
    return_status?: string; // The user selected status ('empty' | 'full' | 'defective')
}

export default function ReturnCheckInModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [trips, setTrips] = useState<TripMetric[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [cylinders, setCylinders] = useState<TripCylinder[]>([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTripMetrics();
            setSelectedTripId(null);
            setCylinders([]);
        }
    }, [isOpen]);

    const fetchTripMetrics = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_trip_return_metrics");
        if (error) {
            console.error("Error fetching metrics:", error);
            toast.error("Failed to load active trips.");
        } else {
            setTrips(data || []);
        }
        setLoading(false);
    };

    const handleSelectTrip = async (tripId: string) => {
        setSelectedTripId(tripId);
        setLoading(true);
        // Fetch cylinders for this trip
        const { data, error } = await supabase.rpc("get_trip_cylinders", {
            p_trip_id: tripId,
        });

        if (error) {
            toast.error("Failed to fetch cylinders");
            setSelectedTripId(null);
        } else {
            // Default all to 'empty'
            const mapped = (data || []).map((c: any) => ({
                ...c,
                return_status: 'empty'
            }));
            setCylinders(mapped);
        }
        setLoading(false);
    };

    const updateCylinderStatus = (id: string, status: string) => {
        setCylinders(prev => prev.map(c =>
            c.cylinder_id === id ? { ...c, return_status: status } : c
        ));
    };

    const handleFinalizeReturn = async () => {
        if (!selectedTripId) return;
        setProcessing(true);

        const payload = cylinders.map(c => ({
            id: c.cylinder_id,
            status: c.return_status
        }));

        try {
            const { data, error } = await supabase.rpc("process_trip_returns", {
                p_trip_id: selectedTripId,
                p_returned_items: payload
            });

            if (error) throw error;

            toast.success(`Processed ${data.cylinders_processed} cylinders.`);
            // Reset
            setSelectedTripId(null);
            fetchTripMetrics();
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <RefreshCw className="text-emerald-400" />
                            {selectedTripId ? "Verify Return Items" : "Return Check-in"}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {selectedTripId ? "Select the condition of each returned cylinder" : "Verify empty cylinders returned by drivers"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400 animate-pulse">
                            Loading...
                        </div>
                    ) : selectedTripId ? (
                        // RECONCILIATION VIEW
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-slate-700">Cylinders Expected ({cylinders.length})</h3>
                                <button
                                    onClick={() => setSelectedTripId(null)}
                                    className="text-sm text-slate-500 hover:text-slate-800 underline"
                                >
                                    Back to Trips
                                </button>
                            </div>

                            {cylinders.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 border border-dashed rounded-lg">
                                    No cylinders found for this trip's orders.
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                <th className="p-3 font-medium text-slate-600">Serial</th>
                                                <th className="p-3 font-medium text-slate-600">Size</th>
                                                <th className="p-3 font-medium text-slate-600">Condition</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {cylinders.map((cyl) => (
                                                <tr key={cyl.cylinder_id} className="group hover:bg-slate-50/50">
                                                    <td className="p-3 font-mono text-slate-700">{cyl.serial_number}</td>
                                                    <td className="p-3 text-slate-600">{cyl.size}</td>
                                                    <td className="p-2">
                                                        <Select
                                                            value={cyl.return_status}
                                                            onValueChange={(val) => updateCylinderStatus(cyl.cylinder_id, val)}
                                                        >
                                                            <SelectTrigger className="h-8 w-[140px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="empty">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> Empty
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="full">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-blue-500" /> Full (Return)
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="defective">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-red-500" /> Defective
                                                                    </div>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedTripId(null)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleFinalizeReturn}
                                    disabled={processing || cylinders.length === 0}
                                    className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 transition-all active:scale-95"
                                >
                                    {processing ? "Processing..." : "Confirm & Restock"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        // TRIP LIST VIEW
                        trips.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <CheckCircle className="mx-auto mb-3 text-slate-300" size={48} />
                                <p>No pending returns found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="pb-3 pl-2">Driver</th>
                                            <th className="pb-3">Trip Start</th>
                                            <th className="pb-3 text-center">Delivered</th>
                                            <th className="pb-3 text-center">Expected</th>
                                            <th className="pb-3 text-right pr-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {trips.map((trip) => (
                                            <tr
                                                key={trip.trip_id}
                                                className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                <td className="py-4 pl-2 font-medium text-slate-900">
                                                    {trip.driver_name}
                                                    {trip.end_time ? (
                                                        <span className="ml-2 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                                            Ended
                                                        </span>
                                                    ) : (
                                                        <span className="ml-2 text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full animate-pulse">
                                                            Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 text-slate-500">
                                                    {new Date(trip.start_time).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </td>
                                                <td className="py-4 text-center font-semibold text-slate-700">
                                                    {trip.completed_orders_count}
                                                </td>
                                                <td className="py-4 text-center">
                                                    <span className="bg-orange-50 text-orange-700 font-bold px-3 py-1 rounded-lg border border-orange-100">
                                                        {trip.expected_empty_returns}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right pr-2">
                                                    <button
                                                        onClick={() => handleSelectTrip(trip.trip_id)}
                                                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm active:scale-95 transition-all"
                                                    >
                                                        Process Return
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
                    {selectedTripId ? "Please verify all items before confirming." : "Select a trip to begin reconciliation."}
                </div>
            </div>
        </div>
    );
}
