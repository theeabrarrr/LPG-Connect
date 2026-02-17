# Database Schema Documentation

> **Note:** This schema reflects the **strict tenant isolation** architecture. All tables (except `tenants` and `profiles`) must have a `tenant_id` column and RLS enabled.

## Core Identity & Multi-Tenancy

### `public.tenants`
The root entity for isolation.
- `id` (uuid, PK): Unique Tenant ID
- `name` (text): Organization Name
- `slug` (text, unique): Subdomain/URL slug
- `status` (text): 'active', 'suspended', 'trial', 'cancelled'
- `subscription_plan` (text): 'free', 'pro', 'enterprise'
- `settings` (jsonb): Configs (branding, preferences)
- `created_at` (timestamptz)

### `public.profiles`
Extends Supabase Auth. Users belong to **one** tenant.
- `id` (uuid, PK): References `auth.users(id)`
- `tenant_id` (uuid): References `public.tenants(id)`
- `full_name` (text)
- `email` (text)
- `phone_number` (text)
- `role` (text): 'super_admin', 'admin', 'staff', 'driver', 'recovery_agent'
- `status` (text): 'idle', 'on_trip', 'offline'
- `shift` (text): 'Day', 'Night'
- `is_online` (boolean)

---

## Core Operations

### `public.customers`
- `id` (uuid, PK)
- `tenant_id` (uuid): FK `tenants`
- `name` (text)
- `phone` (text)
- `address` (text)
- `current_balance` (numeric): Positive = Debt, Negative = Advance
- `credit_limit` (integer)
- `is_active` (boolean)

### `public.orders`
- `id` (uuid, PK)
- `friendly_id` (int): Sequential ID for humans
- `tenant_id` (uuid): FK `tenants`
- `customer_id` (uuid): FK `customers`
- `driver_id` (uuid): FK `profiles`
- `status` (text): 'pending', 'assigned', 'on_trip', 'delivered', 'completed', 'cancelled'
- `payment_method` (text): 'cash', 'credit', 'online'
- `total_amount` (numeric)
- `amount_received` (numeric)
- `cylinders_count` (int)
- `created_at` (timestamptz)

### `public.transactions`
**Source of Truth for Customer Financial History**
- `id` (uuid, PK)
- `tenant_id` (uuid): FK `tenants`
- `user_id` (uuid): FK `profiles` (Agent/Driver)
- `customer_id` (uuid, nullable): FK `customers`
- `order_id` (uuid, nullable): FK `orders`
- `type` (text): 'collection', 'payment', 'handover_request', 'credit', 'debit'
- `status` (text): 'pending', 'verified', 'rejected', 'completed'
- `amount` (numeric): Negative reduces debt, Positive increases debt (usually)
- `payment_method` (text): 'cash', 'bank', 'cheque'
- `proof_url` (text)
- `description` (text)
- `created_at` (timestamptz)

### `public.trips`
Tracks driver movements and bulk delivery sessions.
- `id` (uuid, PK)
- `tenant_id` (uuid): FK `tenants`
- `driver_id` (uuid): FK `profiles`
- `status` (text): 'started', 'completed'
- `start_time` (timestamptz)
- `end_time` (timestamptz)
- `start_gps_lat` (float)
- `start_gps_long` (float)
- `end_gps_lat` (float)
- `end_gps_long` (float)
- `vehicle_id` (text)

---

## Inventory & Assets

### `public.cylinders`
- `id` (uuid, PK)
- `tenant_id` (uuid): FK `tenants`
- `serial_number` (text)
- `status` (text): 'full', 'empty', 'handover_pending'
- `current_location_type` (text): 'warehouse', 'driver', 'customer'
- `current_holder_id` (uuid): FK `profiles` or `customers`

### `public.stock_logs`
- `id` (uuid, PK)
- `tenant_id` (uuid): FK `tenants`
- `cylinder_id` (uuid): FK `cylinders`
- `action` (text): 'filled', 'issued', 'returned', 'sold'
- `changed_by` (uuid): FK `profiles`
- `created_at` (timestamptz)

---

## Finance (Internal)

### `public.employee_wallets`
Tracks cash-in-hand for drivers and agents.
- `user_id` (uuid, PK): FK `profiles`
- `tenant_id` (uuid): FK `tenants`
- `balance` (numeric): Current cash holding

### `public.expenses`
- `id` (uuid, PK)
- `tenant_id` (uuid): FK `tenants`
- `user_id` (uuid): FK `profiles` (Requester)
- `amount` (numeric)
- `category` (text)
- `status` (text): 'pending', 'approved', 'rejected'
- `proof_url` (text)

### `public.cash_book_entries`
Internal Company Ledger (Cash Flow).
- `id` (uuid, PK)
- `tenant_id` (uuid): FK `tenants`
- `amount` (numeric)
- `transaction_type` (text): 'credit' (Income), 'debit' (Expense)
- `description` (text)
- `created_at` (timestamptz)

---

## Deprecated / Removed
- `old_users`: Removed (Merged into `profiles`)
- `company_ledger`: Removed (Use `cash_book_entries`)
- `customer_communications`: Removed