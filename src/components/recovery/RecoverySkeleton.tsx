import { Card, CardContent } from "@/components/ui/card";

export function RecoverySkeleton() {
    return (
        <div className="space-y-4">
            {/* Simulate Stats Widget */}
            <div className="h-24 w-full bg-slate-200 rounded-2xl animate-pulse mb-6" />

            {/* Simulate List Items */}
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-0 shadow-sm ring-1 ring-slate-100 rounded-xl overflow-hidden">
                    <CardContent className="p-5 pl-7 relative">
                        <div className="flex justify-between items-start mb-3">
                            <div className="space-y-2 w-full">
                                {/* Name */}
                                <div className="h-6 w-1/2 bg-slate-200 rounded animate-pulse" />
                                {/* Details */}
                                <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                                <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
                            </div>
                            {/* Amount */}
                            <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
