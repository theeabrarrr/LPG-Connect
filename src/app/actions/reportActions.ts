'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUserTenantId } from '@/lib/utils/tenantHelper'

interface DateRange {
  startDate: string  // ISO format: YYYY-MM-DD
  endDate: string
}

/**
 * Generate daily sales report
 */
export async function generateDailySalesReport(date: string) {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getCurrentUserTenantId() as string
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  // Get orders for the day
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, customer:customers(name), driver:profiles!driver_id(full_name)') // Changed to profiles
    .eq('tenant_id', tenantId)
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`)

  if (ordersError) {
    return { success: false, error: ordersError.message }
  }

  // Get org settings for unit cost
  const { data: settings } = await supabase
    .from('organization_settings')
    .select('default_unit_cost')
    .eq('tenant_id', tenantId)
    .single()
  const unitCost = settings?.default_unit_cost || 0

  // Calculate metrics
  const totalOrders = orders.length
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length

  let totalRevenue = 0;
  let totalCoGS = 0;

  orders.forEach(o => {
    if (o.status === 'completed' || o.status === 'delivered') {
      totalRevenue += (o.total_amount || 0);

      let qty = 0;
      o.order_items?.forEach((item: any) => qty += (item.quantity || 0));
      totalCoGS += (qty * unitCost);
    }
  })

  // Get cash flow from cash_book_entries instead of interpreting orders
  const { data: cashEntries, error: cashError } = await supabase
    .from('cash_book_entries')
    .select('amount, transaction_type, category')
    .eq('tenant_id', tenantId)
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`)

  let cashCollected = 0
  let onlinePayments = 0 // Using cash_book_entries to track actual physical vs digital might require category checks

  if (!cashError && cashEntries) {
    cashCollected = cashEntries
      .filter(e => e.transaction_type === 'cash_in' && e.category === 'customer_payment_verified')
      .reduce((sum, e) => sum + (e.amount || 0), 0)

    // Note: If online payments are explicitly 'cash_in' but separate category, adjust here. 
    // For now, physical cash collection (from recoveries/handovers) would be tracked here better as well.
    cashCollected = cashEntries
      .filter(e => e.transaction_type === 'cash_in')
      .reduce((sum, e) => sum + (e.amount || 0), 0)
  }

  // Get expenses for the day
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`)

  const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

  return {
    success: true,
    data: {
      date,
      totalOrders,
      completedOrders,
      pendingOrders: totalOrders - completedOrders,
      totalRevenue,
      cashCollected,
      onlinePayments,
      totalExpenses,
      totalCoGS,
      netProfit: totalRevenue - totalExpenses - totalCoGS, // Accrual net profit
      orders
    }
  }
}

/**
 * Generate monthly revenue/expense summary
 */
export async function generateMonthlySummary(yearMonth: string) {
  // yearMonth format: YYYY-MM
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getCurrentUserTenantId() as string
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  const startDate = `${yearMonth}-01`
  const endDate = `${yearMonth}-31`

  // Get org settings for unit cost
  const { data: settings } = await supabase
    .from('organization_settings')
    .select('default_unit_cost')
    .eq('tenant_id', tenantId)
    .single()
  const unitCost = settings?.default_unit_cost || 0

  // Revenue from completed orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('total_amount, created_at, status, order_items(quantity)') // Fetch order_items for CoGS
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'delivered'])
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  let totalRevenue = 0;
  let totalCoGS = 0;

  orders?.forEach(o => {
    totalRevenue += (o.total_amount || 0);
    let qty = 0;
    o.order_items?.forEach((item: any) => qty += (item.quantity || 0));
    totalCoGS += (qty * unitCost);
  })

  // Expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount, category, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

  // Group expenses by category
  const expensesByCategory = expenses?.reduce((acc, e) => {
    const category = e.category || 'Other'
    acc[category] = (acc[category] || 0) + (e.amount || 0)
    return acc
  }, {} as Record<string, number>) || {}

  return {
    success: true,
    data: {
      month: yearMonth,
      totalRevenue,
      totalExpenses,
      totalCoGS,
      netProfit: totalRevenue - totalExpenses - totalCoGS,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses - totalCoGS) / totalRevenue) * 100 : 0,
      totalOrders: orders?.length || 0,
      expensesByCategory
    }
  }
}

/**
 * Generate profit & loss statement
 */
export async function generateProfitLossStatement(dateRange: DateRange) {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getCurrentUserTenantId() as string
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  // Get org settings for unit cost
  const { data: settings } = await supabase
    .from('organization_settings')
    .select('default_unit_cost')
    .eq('tenant_id', tenantId)
    .single()
  const unitCost = settings?.default_unit_cost || 0

  // Revenue
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount, order_items(quantity)') // Updated for CoGS
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'delivered'])
    .gte('created_at', dateRange.startDate)
    .lte('created_at', dateRange.endDate)

  let totalRevenue = 0;
  let totalCoGS = 0;

  orders?.forEach(o => {
    totalRevenue += (o.total_amount || 0);
    let qty = 0;
    o.order_items?.forEach((item: any) => qty += (item.quantity || 0));
    totalCoGS += (qty * unitCost);
  })

  // Expenses by category
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .gte('created_at', dateRange.startDate)
    .lte('created_at', dateRange.endDate)

  const expensesByCategory = expenses?.reduce((acc, e) => {
    const category = e.category || 'Other'
    acc[category] = (acc[category] || 0) + (e.amount || 0)
    return acc
  }, {} as Record<string, number>) || {}

  const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0)

  // Calculate EBITDA
  const grossProfit = totalRevenue - totalCoGS
  const operatingExpenses = (expensesByCategory['Operational'] || 0) + (expensesByCategory['Fuel'] || 0) + totalExpenses // Explicit split if needed
  const EBITDA = grossProfit - totalExpenses
  const netProfit = totalRevenue - totalExpenses - totalCoGS

  return {
    success: true,
    data: {
      period: dateRange,
      revenue: {
        totalRevenue
      },
      expenses: {
        byCategory: expensesByCategory,
        totalExpenses,
        totalCoGS
      },
      profitability: {
        grossProfit,
        EBITDA,
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
      }
    }
  }
}

/**
 * Get outstanding balances report
 */
export async function getOutstandingBalancesReport() {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getCurrentUserTenantId() as string
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, phone, address, current_balance, created_at') // Changed to current_balance
    .eq('tenant_id', tenantId)
    .gt('current_balance', 0) // Changed to current_balance
    .order('current_balance', { ascending: false }) // Changed to current_balance

  if (error) {
    return { success: false, error: error.message }
  }

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.current_balance || 0), 0) // Changed to current_balance
  const customerCount = customers.length

  // Categorize by balance range
  const ranges = {
    '0-1000': customers.filter(c => c.current_balance <= 1000).length, // Changed to current_balance
    '1001-5000': customers.filter(c => c.current_balance > 1000 && c.current_balance <= 5000).length, // Changed to current_balance
    '5001-10000': customers.filter(c => c.current_balance > 5000 && c.current_balance <= 10000).length, // Changed to current_balance
    '10000+': customers.filter(c => c.current_balance > 10000).length // Changed to current_balance
  }

  return {
    success: true,
    data: {
      totalOutstanding,
      customerCount,
      averageOutstanding: customerCount > 0 ? totalOutstanding / customerCount : 0,
      balanceRanges: ranges,
      customers
    }
  }
}

/**
 * Get driver commission report
 */
export async function getDriverCommissionReport(driverId: string, dateRange: DateRange) {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getCurrentUserTenantId() as string
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  // Verify driver belongs to tenant
  const { data: driver, error: driverError } = await supabase
    .from('profiles') // Changed from users
    .select('full_name, tenant_id') // Changed from name
    .eq('id', driverId)
    .eq('tenant_id', tenantId)
    .single()

  if (driverError || !driver) {
    return { success: false, error: 'Driver not found' }
  }

  // Get completed orders
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount, created_at') // Changed from amount
    .eq('driver_id', driverId)
    .eq('status', 'completed')
    .gte('created_at', dateRange.startDate)
    .lte('created_at', dateRange.endDate)

  const totalCollections = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0 // Changed from amount
  const totalOrders = orders?.length || 0

  // Calculate commission (example: 5% of collections)
  const commissionRate = 0.05
  const commission = totalCollections * commissionRate

  return {
    success: true,
    data: {
      driverId,
      driverName: driver.full_name, // Changed from name
      period: dateRange,
      totalOrders,
      totalCollections,
      commissionRate: commissionRate * 100,  // Show as percentage
      commission
    }
  }
}