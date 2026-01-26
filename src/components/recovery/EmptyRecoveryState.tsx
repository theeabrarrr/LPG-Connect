import { CheckCircle2 } from "lucide-react";

export function EmptyRecoveryState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="relative">
                <div className="absolute inset-0 bg-emerald-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="h-24 w-24 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full flex items-center justify-center relative z-10 shadow-lg ring-4 ring-white">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-slate-800 font-bold text-xl tracking-tight">All Clear!</h3>
                <p className="text-slate-500 text-sm max-w-[240px] mx-auto leading-relaxed">
                    No pending recoveries at the moment. You've hit zero active debts!
                </p>
            </div>
        </div>
    );
}
