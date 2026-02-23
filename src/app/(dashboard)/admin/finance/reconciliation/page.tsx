'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, RefreshCw, ArrowRight, Download, FileText } from 'lucide-react';
import { getReconciliationReport, fixCustomerBalance } from '@/app/actions/financeActions';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Discrepancy {
    customerId: string;
    customerName: string;
    systemBalance: number;
    realBalance: number;
    variance: number;
}

export default function ReconciliationPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalChecked: 0, totalDiscrepancies: 0 });
    const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
    const [fixing, setFixing] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getReconciliationReport();
            if (res.success && res.data) {
                setDiscrepancies(res.data);
                setStats({
                    totalChecked: res.totalChecked || 0,
                    totalDiscrepancies: res.totalDiscrepancies || 0
                });
                if (res.totalDiscrepancies === 0) {
                    toast.success("All accounts are healthy!");
                } else {
                    toast.warning(`Found ${res.totalDiscrepancies} mismatches.`);
                }
            } else {
                toast.error(res.error || "Failed to load report");
            }
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleFix = async (customerId: string) => {
        setFixing(customerId);
        try {
            const res = await fixCustomerBalance(customerId);
            if (res.success) {
                toast.success("Balance corrected successfully");
                // Remove from local state
                setDiscrepancies(prev => prev.filter(d => d.customerId !== customerId));
                setStats(prev => ({ ...prev, totalDiscrepancies: prev.totalDiscrepancies - 1 }));
            } else {
                toast.error(res.error || "Failed to fix balance");
            }
        } catch (error) {
            toast.error("Failed to execute fix");
        } finally {
            setFixing(null);
        }
    };

    const exportToCSV = () => {
        if (discrepancies.length === 0) {
            toast.info("No data to export");
            return;
        }

        const headers = ["Customer Name", "System Balance", "Real Balance", "Variance"];
        const rows = discrepancies.map(d => [
            `"${d.customerName}"`, // Quote name to handle commas
            d.systemBalance.toFixed(2),
            d.realBalance.toFixed(2),
            d.variance.toFixed(2)
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(e => e.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `reconciliation_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        if (discrepancies.length === 0) {
            toast.info("No data to export");
            return;
        }

        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text("Reconciliation Report", 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        // Stats
        doc.text(`Total Checked: ${stats.totalChecked}`, 14, 40);
        doc.text(`Discrepancies Found: ${stats.totalDiscrepancies}`, 80, 40);

        // Table
        const tableColumn = ["Customer", "System Balance", "Real Balance", "Variance"];
        const tableRows = discrepancies.map(d => [
            d.customerName,
            formatCurrency(d.systemBalance),
            formatCurrency(d.realBalance),
            formatCurrency(d.variance)
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'striped',
            headStyles: { fillColor: [63, 81, 181] }
        });

        doc.save(`reconciliation_report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Ledger Reconciliation</h1>
                    <p className="text-slate-500 mt-1">Detect and repair discrepancies between Customer Balances and Transaction History.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/admin/finance">
                        <Button variant="outline">Back to Finance</Button>
                    </Link>
                    <Button variant="outline" onClick={exportToCSV} disabled={discrepancies.length === 0}>
                        <FileText className="w-4 h-4 mr-2" />
                        CSV
                    </Button>
                    <Button variant="outline" onClick={exportToPDF} disabled={discrepancies.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                    </Button>
                    <Button onClick={loadData} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Scan Now
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Accounts Scanned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalChecked}</div>
                    </CardContent>
                </Card>
                <Card className={stats.totalDiscrepancies > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}>
                    <CardHeader className="pb-2">
                        <CardTitle className={`text-sm font-medium ${stats.totalDiscrepancies > 0 ? "text-red-600" : "text-emerald-600"}`}>
                            Health Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold flex items-center gap-2 ${stats.totalDiscrepancies > 0 ? "text-red-700" : "text-emerald-700"}`}>
                            {stats.totalDiscrepancies > 0 ? (
                                <>
                                    <AlertTriangle className="w-6 h-6" />
                                    {stats.totalDiscrepancies} Errors Found
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-6 h-6" />
                                    System Healthy
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Discrepancy Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Mismatched Accounts</CardTitle>
                    <CardDescription>
                        The "Current Balance" in the customer profile does not match the sum of their transactions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : discrepancies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                            <CheckCircle className="w-12 h-12 mb-4 text-emerald-300" />
                            <p className="font-medium text-emerald-700">All balances match transaction history.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>System Balance (Wrong)</TableHead>
                                    <TableHead>Actual Balance (Right)</TableHead>
                                    <TableHead>Variance</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {discrepancies.map((item) => (
                                    <TableRow key={item.customerId}>
                                        <TableCell className="font-medium">{item.customerName}</TableCell>
                                        <TableCell className="text-red-500 font-mono">
                                            {formatCurrency(item.systemBalance)}
                                        </TableCell>
                                        <TableCell className="text-emerald-600 font-bold font-mono bg-emerald-50 w-fit px-2 rounded">
                                            {formatCurrency(item.realBalance)}
                                        </TableCell>
                                        <TableCell className="text-slate-500">
                                            {formatCurrency(item.variance)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handleFix(item.customerId)}
                                                disabled={fixing === item.customerId}
                                                className="bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                {fixing === item.customerId ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        Fix Balance <ArrowRight className="w-3 h-3 ml-1" />
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
