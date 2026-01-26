import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getAgentHistory } from "@/app/actions/recoveryActions";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default async function HistoryPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const history = await getAgentHistory();

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header */}
            <div className="bg-emerald-900 pt-8 pb-16 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-4 mb-2">
                    <Link href="/recovery" className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Transaction History</h1>
                </div>
                <p className="text-emerald-200/80 text-sm ml-14">Your evidence log of all collections and handovers.</p>
            </div>

            {/* List */}
            <div className="px-6 -mt-8 relative z-20 space-y-4">
                {history.length === 0 ? (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-8 text-center text-slate-400">
                            <p>No history found.</p>
                        </CardContent>
                    </Card>
                ) : (
                    history.map((txn: any) => (
                        <Card key={txn.id} className="border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${txn.type === 'collection'
                                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {txn.type === 'collection' ? 'Customer Collection' : 'Admin Handover'}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {getStatusIcon(txn.status)}
                                </div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="font-bold text-slate-800 text-lg">
                                            {txn.customers?.name || (txn.type === 'handover_request' ? 'Handover to Admin' : 'Unknown')}
                                        </p>
                                        <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">
                                            {txn.description}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-mono font-bold text-xl ${txn.amount < 0 ? 'text-blue-600' : 'text-slate-800'}`}>
                                            Rs {Math.abs(txn.amount).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Proof View */}
                                {txn.proof_url && (
                                    <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                                                    <ImageIcon size={14} />
                                                    View Proof
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-0 shadow-none">
                                                <div className="relative w-full h-[60vh] rounded-xl overflow-hidden bg-black flex items-center justify-center">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={txn.proof_url}
                                                        alt="Proof"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'collected_cash':
        case 'verified':
        case 'approved':
            return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><CheckCircle size={12} /> Success</span>;
        case 'pending':
        case 'pending_verification':
            return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"><Clock size={12} /> Pending</span>;
        case 'rejected':
            return <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100"><XCircle size={12} /> Rejected</span>;
        default:
            return <span className="text-[10px] font-bold text-slate-400 capitalize">{status.replace('_', ' ')}</span>;
    }
}
