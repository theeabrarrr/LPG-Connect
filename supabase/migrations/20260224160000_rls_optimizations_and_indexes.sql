-- 1. Drop redundant / unoptimized policies
DROP POLICY IF EXISTS "Tenant Isolation Select" ON customers;
DROP POLICY IF EXISTS "Tenant Isolation" ON customers;

DROP POLICY IF EXISTS "Tenant Isolation Select" ON profiles;
DROP POLICY IF EXISTS "Tenant Isolation" ON profiles;

DROP POLICY IF EXISTS "Tenant Isolation Select" ON cylinders;
DROP POLICY IF EXISTS "Tenant Isolation" ON cylinders;

DROP POLICY IF EXISTS "Tenant Isolation Select" ON orders;
DROP POLICY IF EXISTS "Tenant Isolation" ON orders;

DROP POLICY IF EXISTS "Tenant Isolation Select" ON handover_logs;
DROP POLICY IF EXISTS "Tenant Isolation Select" ON expenses;
DROP POLICY IF EXISTS "Tenant Isolation Select" ON customer_ledgers;
DROP POLICY IF EXISTS "Tenant Isolation Select" ON cash_book_entries;

DROP POLICY IF EXISTS "Tenant Isolation Logs" ON cylinder_logs;
DROP POLICY IF EXISTS "Insert Logs" ON cylinder_logs;

-- 2. Create Optimized RLS Policies (using SELECT wrappers to avoid auth_rls_initplan warnings)
-- Customers
CREATE POLICY "Tenant Isolation" ON customers 
FOR ALL USING (tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- Profiles (Users can see themselves, or tenant users can see their tenant)
CREATE POLICY "Tenant Isolation" ON profiles 
FOR ALL USING (
    id = (select auth.uid()) 
    OR 
    tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
);

-- Cylinders
CREATE POLICY "Tenant Isolation" ON cylinders 
FOR ALL USING (tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- Orders
CREATE POLICY "Tenant Isolation" ON orders 
FOR ALL USING (tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- Handover Logs
CREATE POLICY "Tenant Isolation Select" ON handover_logs 
FOR SELECT USING (tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- Expenses
CREATE POLICY "Tenant Isolation Select" ON expenses 
FOR SELECT USING (tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- Customer Ledgers
CREATE POLICY "Tenant Isolation Select" ON customer_ledgers 
FOR SELECT USING (tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- Cash Book Entries
CREATE POLICY "Tenant Isolation Select" ON cash_book_entries 
FOR SELECT USING (tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- Cylinder Logs
CREATE POLICY "Tenant Isolation Logs" ON cylinder_logs 
FOR SELECT USING (tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));
CREATE POLICY "Insert Logs" ON cylinder_logs 
FOR INSERT WITH CHECK (tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));


-- 3. Add Covering Indexes for Foreign Keys (Fixing unindexed_foreign_keys warning)
CREATE INDEX IF NOT EXISTS stock_logs_location_id_idx ON stock_logs(location_id);
CREATE INDEX IF NOT EXISTS stock_logs_product_id_idx ON stock_logs(product_id);

CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_created_by_idx ON orders(created_by);
CREATE INDEX IF NOT EXISTS orders_tenant_id_idx ON orders(tenant_id);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

CREATE INDEX IF NOT EXISTS handover_logs_tenant_id_idx ON handover_logs(tenant_id);
CREATE INDEX IF NOT EXISTS handover_logs_sender_id_idx ON handover_logs(sender_id);
CREATE INDEX IF NOT EXISTS handover_logs_receiver_id_idx ON handover_logs(receiver_id);

CREATE INDEX IF NOT EXISTS cylinder_logs_order_id_idx ON cylinder_logs(order_id);
CREATE INDEX IF NOT EXISTS cylinder_logs_tenant_id_idx ON cylinder_logs(tenant_id);
CREATE INDEX IF NOT EXISTS cylinder_logs_cylinder_id_idx ON cylinder_logs(cylinder_id);

CREATE INDEX IF NOT EXISTS cylinders_last_order_id_idx ON cylinders(last_order_id);
CREATE INDEX IF NOT EXISTS cylinders_tenant_id_idx ON cylinders(tenant_id);

CREATE INDEX IF NOT EXISTS cash_book_entries_tenant_id_idx ON cash_book_entries(tenant_id);
CREATE INDEX IF NOT EXISTS cash_book_entries_created_by_idx ON cash_book_entries(created_by);
CREATE INDEX IF NOT EXISTS cash_book_entries_receiver_id_idx ON cash_book_entries(receiver_id);
CREATE INDEX IF NOT EXISTS cash_book_entries_customer_id_idx ON cash_book_entries(customer_id);

CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON customers(tenant_id);

CREATE INDEX IF NOT EXISTS trips_tenant_id_idx ON trips(tenant_id);

CREATE INDEX IF NOT EXISTS employee_wallets_tenant_id_idx ON employee_wallets(tenant_id);

CREATE INDEX IF NOT EXISTS organization_settings_tenant_id_idx ON organization_settings(tenant_id);

CREATE INDEX IF NOT EXISTS expenses_approved_by_idx ON expenses(approved_by);
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_cash_book_entry_id_idx ON expenses(cash_book_entry_id);

CREATE INDEX IF NOT EXISTS customer_ledgers_tenant_id_idx ON customer_ledgers(tenant_id);
CREATE INDEX IF NOT EXISTS customer_ledgers_customer_id_idx ON customer_ledgers(customer_id);
CREATE INDEX IF NOT EXISTS customer_ledgers_order_id_idx ON customer_ledgers(order_id);
CREATE INDEX IF NOT EXISTS customer_ledgers_created_by_idx ON customer_ledgers(created_by);
