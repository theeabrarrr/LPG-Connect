import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getRecoveryStats, getDueCustomers, getRecoveryReceivers } from "@/app/actions/recoveryActions";
import { Card, CardContent } from "@/components/ui/card";
import { HandoverDialog } from "@/components/recovery/HandoverDialog";
import { LogoutButton } from "@/components/recovery/LogoutButton";
import { RecoveryStats } from "@/components/recovery/RecoveryStats";
import { RecoveryList } from "@/components/recovery/RecoveryList";

export const dynamic = "force-dynamic";

export default async function RecoveryDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const stats = await getRecoveryStats();
    const dueCustomers = await getDueCustomers();
    const receivers = await getRecoveryReceivers();

    // Get User Name
    const agentName = user.user_metadata?.full_name || user.user_metadata?.name || "Agent";

    // Calculate total due
    const totalDue = dueCustomers.reduce((acc, curr) => acc + Math.abs(curr.current_balance), 0);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 pb-20 font-sans">
            {/* 1. HERO SECTION & HEADER */}
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 pt-8 pb-20 px-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl -ml-10 pointer-events-none"></div>

                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                        <p className="text-emerald-100/80 text-sm font-medium tracking-wide mb-1 uppercase">Welcome Back</p>
                        <h1 className="text-2xl font-bold text-white tracking-tight">{agentName}</h1>
                        <p className="text-emerald-200/70 text-xs mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="flex gap-2">
                        <a href="/recovery/history" className="p-2 bg-white/10 rounded-full text-emerald-100 hover:bg-white/20 transition-colors">
                            <span className="sr-only">History</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /></svg>
                        </a>
                        <LogoutButton />
                    </div>
                </div>
            </div>

            {/* 2. FLOATING WALLET CARD */}
            <div className="px-6 -mt-16 relative z-20 space-y-5">
                <Card className="shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border-0 bg-white/95 backdrop-blur-xl ring-1 ring-slate-100 rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="text-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available to Handover</span>
                                <div className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
                                    <span className="text-2xl align-top text-slate-400 font-medium mr-1">Rs</span>
                                    {(stats.cashOnHand - (stats.pendingAmount || 0)).toLocaleString()}
                                </div>
                                {(stats.pendingAmount || 0) > 0 && (
                                    <p className="text-xs text-amber-600 font-bold mt-2 bg-amber-50 inline-block px-2 py-1 rounded-full border border-amber-100">
                                        Rs {(stats.pendingAmount || 0).toLocaleString()} Pending Approval
                                    </p>
                                )}
                            </div>

                            <div className="w-full flex justify-center">
                                <HandoverDialog
                                    currentBalance={stats.cashOnHand - (stats.pendingAmount || 0)}
                                    receivers={receivers}
                                />
                            </div>
                        </div>
                    </CardContent>
                    {/* Subtle bottom stripe */}
                    <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 opacity-80"></div>
                </Card>

                {/* 3. NEW STATS WIDGET */}
                <RecoveryStats totalDue={totalDue} count={dueCustomers.length} />
            </div>

            {/* 4. DUE LIST SECTION */}
            <div className="flex-1 px-6 mt-8">
                <div className="flex justify-between items-end mb-4 px-1">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Due Payments</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Focus on highest debt first</p>
                    </div>
                </div>

                <RecoveryList customers={dueCustomers} />
            </div>
        </div>
    );
}

