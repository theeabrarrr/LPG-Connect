import { getAllDriverAnalytics } from "@/app/actions/driverAnalyticsActions";
import { DriverPerformanceCharts } from "@/components/admin/DriverPerformanceCharts";
import { format, subDays } from "date-fns";
import { AlertCircle } from "lucide-react";

export default async function DriverAnalyticsPage() {
    // Default to last 30 days for MVP analytics
    const toDate = new Date();
    const fromDate = subDays(toDate, 30);

    const startDateStr = fromDate.toISOString();
    const endDateStr = toDate.toISOString();

    const result = await getAllDriverAnalytics(startDateStr, endDateStr);

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Driver Analytics</h1>
                <p className="text-slate-500 mt-1">
                    Performance, delivery times, and cash collection tracking ({format(fromDate, 'MMM d')} - {format(toDate, 'MMM d')}).
                </p>
            </div>

            {!result.success && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    <div className="flex items-center gap-2 font-medium mb-1">
                        <AlertCircle className="h-4 w-4" />
                        Error
                    </div>
                    <span className="block sm:inline">
                        Failed to load analytics: {result.error}
                    </span>
                </div>
            )}

            {result.success && result.data && <DriverPerformanceCharts data={result.data} />}
        </div>
    );
}
