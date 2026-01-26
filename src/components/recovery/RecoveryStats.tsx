import { Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RecoveryStatsProps {
    totalDue: number;
    count: number;
}

export function RecoveryStats({ totalDue, count }: RecoveryStatsProps) {
    return (
        <Card className="border-0 bg-gradient-to-r from-emerald-900 to-teal-900 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            <CardContent className="p-5 flex items-center justify-between relative z-10">
                <div>
                    <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        Collection Target
                    </p>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-2xl font-bold tracking-tight">
                            Rs {totalDue.toLocaleString()}
                        </h2>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1">
                        Across {count} active cases
                    </p>
                </div>

                <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center ring-1 ring-white/20">
                    <TrendingUp className="w-5 h-5 text-emerald-300" />
                </div>
            </CardContent>
        </Card>
    );
}
