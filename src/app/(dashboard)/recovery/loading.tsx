import { RecoverySkeleton } from "@/components/recovery/RecoverySkeleton";

export default function Loading() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 pb-20 font-sans">
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 pt-8 pb-32 px-6 rounded-b-[2.5rem] relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-white/20 rounded animate-pulse"></div>
                        <div className="h-8 w-40 bg-white/20 rounded animate-pulse"></div>
                    </div>
                    <div className="h-10 w-10 bg-white/20 rounded-full animate-pulse"></div>
                </div>
            </div>

            <div className="px-6 -mt-24 relative z-20 space-y-5">
                <div className="h-48 w-full bg-white rounded-2xl shadow-lg animate-pulse"></div>
                <RecoverySkeleton />
            </div>
        </div>
    );
}
