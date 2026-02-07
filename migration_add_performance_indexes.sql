-- Performance Optimization: Add indexes for frequently filtered columns
-- Especially 'tenant_id' which is used in almost every query for RLS/Isolation.

-- 1. Cylinders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cylinders_tenant_id ON cylinders(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cylinders_status ON cylinders(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cylinders_serial_number ON cylinders(serial_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cylinders_current_holder_id ON cylinders(current_holder_id);

-- 2. Orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);

-- 3. Customers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

-- 4. Transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_tenant_id ON transactions(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
