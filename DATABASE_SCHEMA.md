# Database Schema Documentation

> **Note:** This schema reflects the live database tables and columns as synced using Supabase MCP.

### `public.locations`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `name` (text, unique)

---

### `public.products`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `type` (USER-DEFINED, unique)
- `name` (text)

---

### `public.inventory`
*RLS Enabled: Yes*

- `product_id` (uuid, PK) -> FK public.products.id
- `location_id` (uuid, PK) -> FK public.locations.id
- `count_full` (integer, nullable, default: 0)
- `count_empty` (integer, nullable, default: 0)

---

### `public.stock_logs`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `location_id` (uuid, nullable) -> FK public.locations.id
- `product_id` (uuid, nullable) -> FK public.products.id
- `changed_by` (uuid, nullable)
- `old_count_full` (integer, nullable)
- `new_count_full` (integer, nullable)
- `old_count_empty` (integer, nullable)
- `new_count_empty` (integer, nullable)
- `reason` (text, nullable)
- `created_at` (timestamp with time zone, nullable, default: now())

---

### `public.customers`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `name` (text)
- `phone` (text, nullable, unique)
- `custom_rate` (numeric, nullable, default: 0.00)
- `current_balance` (numeric, nullable, default: 0.00)
- `gps_lat` (double precision, nullable)
- `gps_long` (double precision, nullable)
- `created_at` (timestamp with time zone, nullable, default: now())
- `opening_balance` (numeric, nullable, default: 0)
- `address` (text, nullable)
- `tenant_id` (uuid) -> FK public.tenants.id
- `credit_limit` (integer, nullable, default: 50000)
- `is_active` (boolean, nullable, default: true)
- `last_order_at` (timestamp with time zone, nullable)

---



### `public.trips`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `driver_id` (uuid, nullable)
- `start_time` (timestamp with time zone, nullable, default: now())
- `end_time` (timestamp with time zone, nullable)
- `cylinders_out` (jsonb, nullable, default: '[]'::jsonb)
- `cylinders_in` (jsonb, nullable, default: '[]'::jsonb)
- `residual_gas_weight` (double precision, nullable, default: 0.0)
- `status` (text, nullable, default: 'ongoing'::text)
- `returns_verified` (boolean, nullable, default: false)
- `tenant_id` (uuid, nullable) -> FK public.tenants.id

---

### `public.orders`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `customer_id` (uuid) -> FK public.customers.id
- `driver_id` (uuid, nullable)
- `total_amount` (numeric, default: 0)
- `status` (text, nullable, default: 'pending'::text)
- `payment_method` (text, nullable, default: 'pending'::text)
- `created_at` (timestamp with time zone, default: timezone('utc'::text, now()))
- `notes` (text, nullable)
- `trip_started_at` (timestamp with time zone, nullable)
- `trip_completed_at` (timestamp with time zone, nullable)
- `updated_at` (timestamp with time zone, nullable, default: timezone('utc'::text, now()))
- `amount_received` (numeric, nullable, default: 0)
- `tenant_id` (uuid, nullable) -> FK public.tenants.id
- `created_by` (uuid, nullable) -> FK auth.users.id
- `cylinders_count` (integer, nullable, default: 0)
- `friendly_id` (integer, default: nextval('orders_friendly_id_seq'::regclass))

---

### `public.order_items`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `order_id` (uuid) -> FK public.orders.id
- `product_name` (text)
- `quantity` (integer)
- `price` (numeric)

---

### `public.cylinders`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `serial_number` (text)
- `type` (text, default: '45.4KG'::text)
- `status` (text, default: 'full'::text)
- `condition` (text, nullable, default: 'good'::text)
- `current_location_type` (text, nullable, default: 'godown'::text)
- `current_holder_id` (uuid, nullable)
- `created_at` (timestamp with time zone, default: now())
- `updated_at` (timestamp with time zone, default: timezone('utc'::text, now()))
- `last_order_id` (uuid, nullable) -> FK public.orders.id
- `tenant_id` (uuid, nullable) -> FK public.tenants.id
- `qr_code_data` (text, nullable, default: ((('tenant='::text || tenant_id) || '&id='::text) || serial_number))

---

### `public.profiles`
*RLS Enabled: Yes*

- `id` (uuid, PK) -> FK auth.users.id
- `full_name` (text, nullable)
- `role` (text, nullable, default: 'driver'::text)
- `availability_status` (text, nullable, default: 'FREE'::text)
- `is_online` (boolean, nullable, default: false)
- `tenant_id` (uuid, nullable)
- `vehicle_number` (text, nullable)
- `vehicle_capacity` (integer, nullable)
- `current_load` (integer, nullable, default: 0)
- `phone_number` (text, nullable)
- `updated_at` (timestamp with time zone, nullable, default: timezone('utc'::text, now()))

---

### `public.employee_wallets`
*RLS Enabled: Yes*

- `user_id` (uuid, PK)
- `balance` (numeric, nullable, default: 0)
- `updated_at` (timestamp with time zone, nullable, default: timezone('utc'::text, now()))
- `tenant_id` (uuid, nullable) -> FK public.tenants.id

---

### `public.handover_logs`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `sender_id` (uuid, nullable) -> FK auth.users.id
- `receiver_id` (uuid, nullable) -> FK auth.users.id
- `amount` (numeric)
- `status` (text, nullable, default: 'pending'::text)
- `created_at` (timestamp with time zone, nullable, default: timezone('utc'::text, now()))
- `tenant_id` (uuid) -> FK public.tenants.id

---

### `public.daily_rates`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `product_name` (text, unique)
- `current_rate` (numeric)
- `updated_at` (timestamp with time zone, nullable, default: timezone('utc'::text, now()))

---

### `public.tenants`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `name` (text)
- `created_at` (timestamp with time zone, nullable, default: timezone('utc'::text, now()))
- `subscription_plan` (text, nullable, default: 'free'::text)
- `subscription_status` (text, nullable, default: 'active'::text)
- `slug` (text, unique)
- `logo_url` (text, nullable)
- `contact_email` (text, nullable)
- `contact_phone` (text, nullable)
- `status` (text, nullable, default: 'active'::text)
- `subscription_start_date` (date, nullable)
- `subscription_end_date` (date, nullable)
- `settings` (jsonb, nullable, default: '{}'::jsonb)

---

### `public.cylinder_logs`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `tenant_id` (uuid) -> FK public.tenants.id
- `cylinder_id` (uuid) -> FK public.cylinders.id
- `actor_id` (uuid)
- `action` (text)
- `order_id` (uuid, nullable) -> FK public.orders.id
- `created_at` (timestamp with time zone, nullable, default: timezone('utc'::text, now()))

---

### `public.organization_settings`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `tenant_id` (uuid, unique) -> FK public.tenants.id
- `company_name` (text, nullable, default: 'Ali Gas  '::text)
- `company_address` (text, nullable)
- `company_phone` (text, nullable)
- `invoice_footer` (text, nullable, default: 'Thank you for your business!'::text)
- `default_gas_rate` (numeric, nullable, default: 0)
- `default_unit_cost` (numeric, nullable, default: 0)
- `low_stock_threshold` (integer, nullable, default: 15)
- `created_at` (timestamp with time zone, nullable, default: timezone('utc'::text, now()))
- `updated_at` (timestamp with time zone, nullable, default: timezone('utc'::text, now()))

---

### `public.expenses`
*RLS Enabled: No*

- `id` (uuid, PK, default: gen_random_uuid())
- `user_id` (uuid) -> FK public.profiles.id
- `tenant_id` (uuid)
- `amount` (numeric)
- `category` (text)
- `description` (text, nullable)
- `proof_url` (text, nullable)
- `status` (text, nullable, default: 'pending'::text)
- `created_at` (timestamp with time zone, nullable, default: now())
- `approved_at` (timestamp with time zone, nullable)
- `approved_by` (uuid, nullable) -> FK auth.users.id
- `payment_method` (text, nullable)
- `cash_book_entry_id` (uuid, nullable) -> FK public.cash_book_entries.id

---

### `public.security_audit_logs`
*RLS Enabled: No*

- `id` (uuid, PK, default: gen_random_uuid())
- `event_type` (text)
- `user_id` (uuid, nullable)
- `target_resource` (text, nullable)
- `tenant_id` (uuid, nullable)
- `attempted_tenant_id` (uuid, nullable)
- `action` (text, nullable)
- `timestamp` (timestamp with time zone)
- `ip_address` (text, nullable)
- `user_agent` (text, nullable)

---

### `public.customer_ledgers`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `tenant_id` (uuid) -> FK public.tenants.id
- `customer_id` (uuid) -> FK public.customers.id
- `order_id` (uuid, nullable) -> FK public.orders.id
- `transaction_type` (text, nullable)
- `amount` (numeric)
- `balance_after` (numeric, nullable, default: 0)
- `description` (text, nullable)
- `category` (text, nullable)
- `created_by` (uuid, nullable) -> FK auth.users.id
- `created_at` (timestamp with time zone, nullable, default: now())

---

### `public.cash_book_entries`
*RLS Enabled: Yes*

- `id` (uuid, PK, default: gen_random_uuid())
- `tenant_id` (uuid) -> FK public.tenants.id
- `transaction_type` (text, nullable)
- `amount` (numeric)
- `description` (text, nullable)
- `category` (text, nullable)
- `reference_id` (uuid, nullable)
- `created_by` (uuid, nullable) -> FK auth.users.id
- `created_at` (timestamp with time zone, nullable, default: now())

---

