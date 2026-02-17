import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateSalesReportPDF(reportData: any, date: string) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text('Daily Sales Report', 14, 20)
  doc.setFontSize(12)
  doc.text(`Date: ${date}`, 14, 30)
  
  // Summary
  doc.setFontSize(10)
  doc.text(`Total Orders: ${reportData.totalOrders}`, 14, 45)
  doc.text(`Completed Orders: ${reportData.completedOrders}`, 14, 52)
  doc.text(`Total Revenue: $${reportData.totalRevenue.toFixed(2)}`, 14, 59)
  doc.text(`Cash Collected: $${reportData.cashCollected.toFixed(2)}`, 14, 66)
  doc.text(`Total Expenses: $${reportData.totalExpenses.toFixed(2)}`, 14, 73)
  doc.text(`Net Profit: $${reportData.netProfit.toFixed(2)}`, 14, 80)
  
  // Orders table
  if (reportData.orders && reportData.orders.length > 0) {
    autoTable(doc, {
      startY: 90,
      head: [['Order ID', 'Customer', 'Driver', 'Amount', 'Status']],
      body: reportData.orders.map((order: any) => [
        order.id.slice(0, 8),
        order.customer?.name || 'N/A',
        order.driver?.full_name || 'Unassigned', // Changed to full_name
        `$${order.total_amount.toFixed(2)}`, // Changed to total_amount
        order.status
      ])
    })
  }
  
  // Save
  doc.save(`sales_report_${date}.pdf`)
}

export function generateMonthlyReportPDF(reportData: any, month: string) {
  const doc = new jsPDF()
  
  doc.setFontSize(20)
  doc.text('Monthly Summary Report', 14, 20)
  doc.setFontSize(12)
  doc.text(`Month: ${month}`, 14, 30)
  
  doc.setFontSize(10)
  doc.text(`Total Orders: ${reportData.totalOrders}`, 14, 45)
  doc.text(`Total Revenue: $${reportData.totalRevenue.toFixed(2)}`, 14, 52)
  doc.text(`Total Expenses: $${reportData.totalExpenses.toFixed(2)}`, 14, 59)
  doc.text(`Net Profit: $${reportData.netProfit.toFixed(2)}`, 14, 66)
  doc.text(`Profit Margin: ${reportData.profitMargin.toFixed(2)}%`, 14, 73)
  
  // Expenses by category
  if (reportData.expensesByCategory) {
    autoTable(doc, {
      startY: 85,
      head: [['Category', 'Amount']],
      body: Object.entries(reportData.expensesByCategory).map(([category, amount]: any) => [
        category,
        `$${amount.toFixed(2)}`
      ])
    })
  }
  
  doc.save(`monthly_report_${month}.pdf`)
}

export function generateOutstandingBalancesPDF(reportData: any) {
  const doc = new jsPDF()
  
  doc.setFontSize(20)
  doc.text('Outstanding Balances Report', 14, 20)
  doc.setFontSize(12)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
  
  doc.setFontSize(10)
  doc.text(`Total Outstanding: $${reportData.totalOutstanding.toFixed(2)}`, 14, 45)
  doc.text(`Number of Customers: ${reportData.customerCount}`, 14, 52)
  doc.text(`Average Outstanding: $${reportData.averageOutstanding.toFixed(2)}`, 14, 59)
  
  // Customers table
  if (reportData.customers && reportData.customers.length > 0) {
    autoTable(doc, {
      startY: 70,
      head: [['Customer Name', 'Phone', 'Balance']],
      body: reportData.customers.map((customer: any) => [
        customer.name,
        customer.phone,
        `$${customer.current_balance.toFixed(2)}` // Changed to current_balance
      ])
    })
  }
  
  doc.save(`outstanding_balances_${Date.now()}.pdf`)
}

export function generateDriverCommissionPDF(reportData: any) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text('Driver Commission Report', 14, 20);
  doc.setFontSize(12);
  doc.text(`Driver: ${reportData.driverName}`, 14, 30);
  doc.text(`Period: ${reportData.period.startDate} to ${reportData.period.endDate}`, 14, 37);

  doc.setFontSize(10);
  doc.text(`Total Orders: ${reportData.totalOrders}`, 14, 50);
  doc.text(`Total Collections: $${reportData.totalCollections.toFixed(2)}`, 14, 57);
  doc.text(`Commission Rate: ${reportData.commissionRate.toFixed(2)}%`, 14, 64);
  doc.text(`Commission Earned: $${reportData.commission.toFixed(2)}`, 14, 71);

  doc.save(`driver_commission_report_${reportData.driverName}_${Date.now()}.pdf`);
}