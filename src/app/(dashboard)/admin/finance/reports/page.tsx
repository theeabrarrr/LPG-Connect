'use client'

import { useState, useEffect } from 'react'
import {
  generateDailySalesReport,
  generateMonthlySummary,
  generateProfitLossStatement,
  getOutstandingBalancesReport,
  getDriverCommissionReport
} from '@/app/actions/reportActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download, Calendar, TrendingUp, DollarSign, Users, FileText } from 'lucide-react'
import { getDriverUsers as getDrivers } from '@/app/actions/manageUser'
import {
  generateSalesReportPDF,
  generateMonthlyReportPDF,
  generateOutstandingBalancesPDF,
  generateDriverCommissionPDF,
} from '@/lib/utils/pdfExport' // Import PDF generation functions

export default function FinanceReportsPage() {
  const [reportType, setReportType] = useState<string>('daily')
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [drivers, setDrivers] = useState<any[]>([])
  const [selectedDriver, setSelectedDriver] = useState<string>('')

  useEffect(() => {
    async function fetchDrivers() {
      const { success, data } = await getDrivers();
      if (success && data) {
        setDrivers(data);
        if (data.length > 0) setSelectedDriver(data[0].id);
      }
    }
    if (reportType === 'driver_commission') {
      fetchDrivers();
    }
  }, [reportType]);

  const generateReport = async () => {
    setLoading(true)
    setReportData(null) // Clear previous report data
    let result: any

    try {
      switch (reportType) {
        case 'daily':
          result = await generateDailySalesReport(selectedDate)
          break
        case 'monthly':
          result = await generateMonthlySummary(selectedMonth)
          break
        case 'profitloss':
          result = await generateProfitLossStatement(dateRange)
          break
        case 'outstanding':
          result = await getOutstandingBalancesReport()
          break
        case 'driver_commission':
          if (!selectedDriver) {
            alert('Please select a driver.');
            setLoading(false);
            return;
          }
          result = await getDriverCommissionReport(selectedDriver, dateRange);
          break;
        default:
          alert('Please select a valid report type.');
          return
      }

      if (result.success) {
        setReportData(result.data)
      } else {
        alert('Error generating report: ' + result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = () => {
    if (!reportData) return

    // Determine data for CSV export
    let dataToExport: any[] = [];
    let fileName = `${reportType}_report`;

    if (reportType === 'outstanding') {
      dataToExport = reportData.customers;
      fileName += `_${selectedDate || selectedMonth || 'all'}`;
    } else if (reportType === 'daily' || reportType === 'monthly' || reportType === 'profitloss' || reportType === 'driver_commission') {
      dataToExport = [reportData];
      if (reportType === 'daily') fileName += `_${selectedDate}`;
      if (reportType === 'monthly') fileName += `_${selectedMonth}`;
      if (reportType === 'profitloss' || reportType === 'driver_commission') fileName += `_${dateRange.startDate}_to_${dateRange.endDate}`;
    } else {
      // Fallback or error for unknown report types
      console.warn("Unhandled report type for CSV export:", reportType);
      return;
    }

    if (dataToExport.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => headers.map(header => {
        // Handle nested objects for CSV, e.g., driver.name
        if (typeof header === 'object' && header !== null) {
          return JSON.stringify(header); // Basic handling for objects
        }
        return row[header];
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  }

  const downloadPDF = () => {
    if (!reportData) return;

    switch (reportType) {
      case 'daily':
        generateSalesReportPDF(reportData, selectedDate);
        break;
      case 'monthly':
        generateMonthlyReportPDF(reportData, selectedMonth);
        break;
      case 'outstanding':
        generateOutstandingBalancesPDF(reportData);
        break;
      case 'driver_commission':
        generateDriverCommissionPDF(reportData);
        break;
      case 'profitloss': // You might want a specific PDF for profit/loss too
      default:
        alert('PDF export not available for this report type yet.');
        break;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Sales Report</SelectItem>
                  <SelectItem value="monthly">Monthly Summary</SelectItem>
                  <SelectItem value="profitloss">Profit & Loss Statement</SelectItem>
                  <SelectItem value="outstanding">Outstanding Balances</SelectItem>
                  <SelectItem value="driver_commission">Driver Commission</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'daily' && (
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            )}

            {reportType === 'monthly' && (
              <div>
                <Label htmlFor="month">Month</Label>
                <Input
                  id="month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            )}

            {(reportType === 'profitloss' || reportType === 'driver_commission') && (
              <>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  />
                </div>
              </>
            )}

            {reportType === 'driver_commission' && (
              <div>
                <Label htmlFor="driver">Select Driver</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.full_name || driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={generateReport} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            {reportData && (
              <>
                <Button variant="outline" onClick={downloadCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={downloadPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-4">
          {/* Summary Cards */}
          {reportType === 'daily' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Orders</p>
                      <p className="text-2xl font-bold">{reportData.totalOrders}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="text-2xl font-bold">${reportData.totalRevenue.toFixed(2)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Expenses</p>
                      <p className="text-2xl font-bold">${reportData.totalExpenses.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Net Profit</p>
                      <p className="text-2xl font-bold">${reportData.netProfit.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {reportType === 'monthly' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold">${reportData.totalRevenue.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-gray-500">Net Profit</p>
                    <p className="text-2xl font-bold">${reportData.netProfit.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-gray-500">Profit Margin</p>
                    <p className="text-2xl font-bold">{reportData.profitMargin.toFixed(2)}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {reportType === 'driver_commission' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-gray-500">Driver</p>
                    <p className="text-xl font-bold">{reportData.driverName}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-gray-500">Total Collections</p>
                    <p className="text-2xl font-bold">${reportData.totalCollections.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-gray-500">Commission Earned</p>
                    <p className="text-2xl font-bold">${reportData.commission.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          {reportType === 'monthly' && reportData.expensesByCategory && (
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(reportData.expensesByCategory).map(([category, amount]) => ({
                    category,
                    amount
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Outstanding Balances Table */}
          {reportType === 'outstanding' && (
            <Card>
              <CardHeader>
                <CardTitle>Outstanding Balances ({reportData.customerCount} customers)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Customer</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-right p-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.customers.map((customer: any) => (
                        <tr key={customer.id} className="border-b">
                          <td className="p-2">{customer.name}</td>
                          <td className="p-2">{customer.phone}</td>
                          <td className="p-2 text-right">${customer.current_balance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}