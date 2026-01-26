'use client';

import { useState, useEffect } from 'react';
import { getPendingHandovers, approveHandover, rejectHandover, getPendingCylinderDetails, getPendingPayments, verifyPayment, rejectPayment } from '@/app/actions/adminActions';
import { toast } from 'sonner';
import { CheckCircle, XCircle, RefreshCw, DollarSign, Package, AlertTriangle, ArrowRight, CreditCard, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';

export default function ApprovalsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [pendingCylinders, setPendingCylinders] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ id: string, type: 'approve' | 'reject' | 'verify_payment' | 'reject_payment', qty?: number, msg: string } | null>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        const [reqs, cyls, payPending] = await Promise.all([
            getPendingHandovers(),
            getPendingCylinderDetails(),
            getPendingPayments()
        ]);
        setRequests(reqs);
        setPendingCylinders(cyls);
        setPayments(payPending);
        setLoading(false);
    };

    const handleApprove = (req: any) => {
        const cyls = pendingCylinders.filter(c => c.current_holder_id === req.user_id);
        const msg = `Confirm Handover Approval?\n\nCash: Rs ${req.amount}\nCylinders: ${cyls.length}`;
        setConfirmModal({ id: req.transaction_id || req.id, type: 'approve', msg });
    };

    const handleReject = (id: string) => {
        setConfirmModal({ id, type: 'reject', msg: "Reject this handover request? Items will remain with the driver." });
    };

    const handleVerifyPayment = (pay: any) => {
        setConfirmModal({
            id: pay.id,
            type: 'verify_payment',
            msg: `Verify Payment of Rs ${pay.amount}?\n\nCustomer: ${pay.customers?.name}\nMethod: ${pay.payment_method}`
        });
    };

    const handleRejectPayment = (id: string) => {
        setConfirmModal({
            id,
            type: 'reject_payment',
            msg: "Reject this payment? The customer balance will NOT be updated."
        });
    };

    const executeAction = async () => {
        if (!confirmModal) return;
        const { id, type } = confirmModal;

        setProcessing(id);
        let res;

        if (type === 'reject') {
            res = await rejectHandover(id);
        } else if (type === 'approve') {
            res = await approveHandover(id);
        } else if (type === 'verify_payment') {
            res = await verifyPayment(id);
        } else if (type === 'reject_payment') {
            res = await rejectPayment(id);
        }

        setConfirmModal(null);

        if (res?.error) {
            if (res.error.includes("not found") || res.error.toLowerCase().includes("processed")) {
                toast.info("Request was already processed.");
                loadRequests();
            } else {
                toast.error(res.error);
            }
        } else {
            toast.success(
                type === 'reject' ? "Request Rejected" :
                    type === 'reject_payment' ? "Payment Rejected" :
                        "Action Successful"
            );
            loadRequests();
        }
        setProcessing(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Reconciliation Hub</h1>
                    <p className="text-slate-500 font-medium mt-1">Verify Driver Deposits & Banking</p>
                </div>
                <button
                    onClick={loadRequests}
                    className="p-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            {/* SECTION 1: PENDING PAYMENTS (High Priority) */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="text-slate-400" size={20} />
                    <h2 className="text-xl font-bold text-slate-700">Pending Bank / Cheque Payments</h2>
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{payments.length}</span>
                </div>

                {loading && <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />}

                {!loading && payments.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-white/50">
                        <p className="text-slate-400 font-medium">No pending bank verifications.</p>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {payments.map((pay) => (
                        <div key={pay.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col justify-between group">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Customer</p>
                                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{pay.customers?.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 uppercase">
                                            {pay.payment_method}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">Amount Declared</p>
                                        <p className="font-black text-2xl text-slate-800">Rs {pay.amount?.toLocaleString()}</p>
                                    </div>
                                    {pay.proof_url && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button className="text-xs flex items-center gap-1 font-bold text-blue-600 hover:underline">
                                                    <ImageIcon size={14} /> View Proof
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-0 shadow-none">
                                                <div className="relative w-full h-[80vh] rounded-lg overflow-hidden bg-black/80 flex items-center justify-center">
                                                    {/* Using standard img for reliability with external URLs if domain not configured in next.config */}
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={pay.proof_url}
                                                        alt="Proof"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>

                                {pay.description && (
                                    <p className="text-sm text-slate-500 italic mb-4 line-clamp-2">"{pay.description}"</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-50 mt-2">
                                <button
                                    onClick={() => handleRejectPayment(pay.id)}
                                    disabled={!!processing}
                                    className="flex-1 py-2 bg-white border border-red-100 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleVerifyPayment(pay)}
                                    disabled={!!processing}
                                    className="flex-[2] py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing === pay.id ? <RefreshCw className="animate-spin" size={16} /> : 'Verify Payment'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECTION 2: DRIVER HANDOVERS */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Package className="text-slate-400" size={20} />
                    <h2 className="text-xl font-bold text-slate-700">Staff Handovers (Cash & Assets)</h2>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{requests.length}</span>
                </div>

                {loading && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl" />)}
                    </div>
                )}

                {!loading && requests.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-white/50">
                        <p className="text-slate-400 font-medium">No pending driver handovers.</p>
                    </div>
                )}

                {!loading && requests.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {requests.map((req, idx) => {
                            const reqId = req.transaction_id || req.id;
                            const driverName = req.driver_name || req.users?.name || 'Unknown Driver';
                            const driverCylinders = pendingCylinders.filter(c => c.current_holder_id === req.user_id);

                            return (
                                <div key={reqId || idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200 font-bold">
                                                    {driverName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                        {req.users?.role === 'recovery_agent' ? 'Recovery Agent' : 'Driver'}
                                                    </p>
                                                    <p className="font-bold text-slate-800">{driverName}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                                {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                                            </span>
                                        </div>

                                        {/* UNIFIED DETAILS CARD */}
                                        <div className="space-y-3 mb-6">
                                            {/* CASH */}
                                            {req.amount > 0 && (
                                                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                    <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold">
                                                        <DollarSign size={16} /> Cash
                                                    </div>
                                                    <span className="font-black text-lg text-emerald-800">Rs {req.amount.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {/* ASSETS */}
                                            {driverCylinders.length > 0 && (
                                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2 text-amber-700 text-sm font-bold">
                                                            <Package size={16} /> Cylinders
                                                        </div>
                                                        <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-600">
                                                            {driverCylinders.length} Returns
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {driverCylinders.map((c: any) => (
                                                            <span key={c.id} className="text-[10px] font-bold bg-white border border-amber-200 text-slate-500 px-1 rounded">
                                                                {c.serial_number}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Fallback for Empty Request */}
                                            {req.amount === 0 && driverCylinders.length === 0 && (
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                                    <p className="text-xs text-slate-400 italic">No cash or assets detected.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ACTIONS */}
                                    <div className="flex gap-2 pt-4 border-t border-slate-50">
                                        <button
                                            onClick={() => handleReject(reqId)}
                                            disabled={!!processing}
                                            className="flex-1 py-2 bg-white border border-red-100 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(req)}
                                            disabled={!!processing}
                                            className="flex-[2] py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {processing === reqId ? <RefreshCw className="animate-spin" size={16} /> : 'Approve Handover'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
                }
            </section >

            {/* Confirmation Modal */}
            {
                confirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl border border-slate-100 scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className={`p-3 rounded-full ${['reject', 'reject_payment'].includes(confirmModal.type) ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {['reject', 'reject_payment'].includes(confirmModal.type) ? <XCircle size={32} /> : <CheckCircle size={32} />}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {confirmModal.type === 'reject' ? 'Reject Handover' :
                                        confirmModal.type === 'reject_payment' ? 'Reject Payment' :
                                            confirmModal.type === 'verify_payment' ? 'Verify Payment' :
                                                'Approve Handover'}
                                </h3>
                                <p className="text-slate-500 font-medium whitespace-pre-wrap">
                                    {confirmModal.msg}
                                </p>

                                <div className="flex gap-3 w-full pt-4">
                                    <button
                                        onClick={() => setConfirmModal(null)}
                                        disabled={!!processing}
                                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={executeAction}
                                        disabled={!!processing}
                                        className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${['reject', 'reject_payment'].includes(confirmModal.type)
                                            ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                            }`}
                                    >
                                        {processing ? (
                                            <><RefreshCw className="animate-spin" size={20} /> Processing...</>
                                        ) : (
                                            ['reject', 'reject_payment'].includes(confirmModal.type) ? 'Reject' : 'Confirm'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
