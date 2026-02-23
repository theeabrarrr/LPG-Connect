'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface DriverPerformance {
    id: string;
    name: string;
    total_orders: number;
    avg_delivery_time_mins: number;
    cash_collected: number;
    cash_deposited: number;
    current_liability: number;
}

export function DriverPerformanceCharts({ data }: { data: DriverPerformance[] }) {
    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-slate-500">No driver data available for this period.</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Delivery Volume</CardTitle>
                    <CardDescription>Total completed orders per driver</CardDescription>
                </CardHeader>
                <CardContent className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip cursor={{ fill: '#F1F5F9' }} />
                            <Bar dataKey="total_orders" name="Total Deliveries" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cash Flow Tracking</CardTitle>
                    <CardDescription>Collected vs Deposited Cash handling</CardDescription>
                </CardHeader>
                <CardContent className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip cursor={{ fill: '#F1F5F9' }} />
                            <Legend />
                            <Bar dataKey="cash_collected" name="Collected" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="cash_deposited" name="Deposited" fill="#6366F1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Average Delivery Time (Minutes)</CardTitle>
                    <CardDescription>Time from starting trip to delivery completion</CardDescription>
                </CardHeader>
                <CardContent className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="avg_delivery_time_mins" name="Avg Mins" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
