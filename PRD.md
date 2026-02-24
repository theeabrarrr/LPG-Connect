# Product Requirements Document (PRD)
## LPG Multi-Tenant Management System

**Version:** 1.0  
**Date:** January 28, 2026  
**Status:** 80% Complete - Production Readiness Phase

---

## 1. Executive Summary

### 1.1 Product Overview
A comprehensive SaaS-based LPG (Liquified Petroleum Gas) distribution management system designed for multi-tenant operation. The system manages the complete lifecycle of LPG cylinder distribution, including inventory management, order processing, customer management, delivery operations, and financial tracking.

### 1.2 Target Users
- **LPG Distribution Companies** (Primary Tenants)
- **Administrators** (Company Owners/Managers)
- **Drivers** (Delivery Personnel)
- **Staff/Recovery Agents** (Field Operations)
- **Super Admins** (Platform Operators)

### 1.3 Core Value Proposition
- End-to-end LPG distribution workflow automation
- Multi-tenant architecture for SaaS scalability
- Real-time inventory and financial tracking
- Mobile-optimized driver and staff interfaces
- Comprehensive audit trails and reporting

### 1.4 Current Status (PRD Sync Findings)
Based on the recent Full-Scale System Reality Audit, the PRD, Database, and Code are now **100% Synchronized**.

**Implemented Database Features:**
- `handover_logs`: Includes `proof_url` column for cash handover verification.
- `orders`: Includes `proof_url` for drop-off verification.

**Implemented Code Features:**
- **Actions**: `bulkAssignOrders` is fully deployed and available in server actions.
- **Alerts**: Inventory Alerts & Notifications (`checkInventoryAlerts`) are implemented.
- **Financial Tooling**: Complete ledger reconciliation tooling is active, and the deprecated `transactions` table has been fully scrubbed from the codebase.
- **Phase 7 Testing & QA**: Critical bugs have been addressed including an authentication race condition fix on login and renaming middleware for strict role-based routing and tenant isolation.

---

## 2. System Architecture

### 2.1 Technology Stack

**Frontend:**
- Next.js 16.0.10 (App Router)
- React 19.2.1
- TypeScript 5
- Tailwind CSS 4
- Framer Motion (Animations)
- Shadcn/ui Components

**Backend:**
- Next.js Server Actions
- Supabase (PostgreSQL + Auth + Storage)
- Row Level Security (RLS) for multi-tenancy

**Key Libraries:**
- React Hook Form + Zod (Form validation)
- Recharts (Data visualization)
- date-fns (Date manipulation)
- QR Scanner/Generator
- Papa Parse (CSV handling)

### 2.2 Multi-Tenant Architecture

**Tenant Isolation Strategy:**
- Primary Key: `tenant_id` (UUID) in core tables
- Cascaded through foreign key relationships
- Enforced via Supabase RLS policies
- User-tenant relationship via `users.tenant_id`

**Core Tables with Multi-Tenancy:**
```
users (tenant_id, role)
├── customers (tenant_id)
├── orders (tenant_id, customer_id)
├── cylinders (tenant_id)
├── inventory (tenant_id)
├── expenses (tenant_id)
├── cash_book_entries (tenant_id)
├── ledgers (tenant_id, customer_id)
└── handover_logs (indirect via users)
```

---

## 3. User Roles & Permissions

### 3.1 Super Admin
**Scope:** Platform-level (cross-tenant)
**Capabilities:**
- Create and manage tenants
- View all tenant data (audit)
- System health monitoring
- User approval workflows

### 3.2 Admin (Tenant Owner/Manager)
**Scope:** Single tenant
**Capabilities:**
- User management (create drivers, staff, customers)
- Inventory management (cylinders, stock)
- Order management (create, assign, monitor)
- Financial operations (expenses, handovers, reports)
- Customer management (ledgers, payments)
- Settings and configuration

### 3.3 Driver
**Scope:** Assigned orders within tenant
**Capabilities:**
- View and accept assigned orders
- Update order status (in-progress, delivered)
- Scan QR codes (cylinder, customer)
- Record cash collections
- Submit expense claims
- Initiate cash handovers

### 3.4 Staff (Recovery Agent)
**Scope:** Customer recovery within tenant
**Capabilities:**
- Scan customer QR codes
- Record cylinder returns
- Process customer payments
- Generate receipts
- Track recovery performance

---

## 4. Key Functional Requirements

### 4.1 Authentication & Multi-Tenancy
- User registration with admin approval
- Role-based access control (RBAC)
- Tenant isolation via RLS policies
- Session management

### 4.2 Customer Management
- CRUD operations
- QR code generation per customer
- Ledger tracking (debit/credit)
- Cylinder allocation tracking
- Search and filtering

### 4.3 Order Management
- Order creation (admin)
- Assignment to drivers
- Lifecycle: pending → confirmed → delivered → completed
- Cash collection recording
- Delivery proof upload
- Customer ledger auto-update

### 4.4 Inventory Management
- Cylinder tracking with QR codes
- Stock management (add/remove)
- Status tracking: available, assigned, in-transit, damaged
- Low stock alerts
- Inventory reports

### 4.5 Financial Management
- Customer ledgers (debit/credit transactions)
- Cash book (all cash transactions)
- Expense management (driver & admin)
- Cash handover workflow (driver → admin verification)
- Financial reports (sales, expenses, outstanding)

### 4.6 Dashboard & Analytics
- Role-specific dashboards
- Key metrics visualization
- Real-time updates
- Quick actions
- Performance tracking

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Page load < 2 seconds
- Database query < 500ms (p95)
- Support 1000+ concurrent users per tenant

### 5.2 Security
- HTTPS-only
- RLS policies on all tenant tables
- JWT session management
- Input validation (Zod schemas)
- XSS and CSRF protection
- Audit logging

### 5.3 Scalability
- Serverless architecture (Vercel/Supabase)
- Database connection pooling
- CDN for static assets
- Code splitting and lazy loading

### 5.4 Reliability
- 99.9% uptime SLA
- Daily database backups
- Error boundaries
- Graceful degradation

### 5.5 Usability
- Mobile-responsive (320px to 4K)
- Accessibility (WCAG 2.1 AA)
- < 5 clicks for common tasks
- Intuitive navigation

---

## 6. Data Model Summary

**Core Entities:**
- Users (id, tenant_id, role, email, name, phone, status)
- Customers (id, tenant_id, name, phone, address, balance, qr_code)
- Orders (id, tenant_id, customer_id, driver_id, status, total_amount, proof_url)
- Cylinders (id, tenant_id, qr_code, status, current_customer_id)
- Ledgers (id, tenant_id, customer_id, transaction_type, amount, balance_after)
- Employee_Wallets (user_id, balance)
- Handover_Logs (id, sender_id, receiver_id, amount, status, proof_url)
- Expenses (id, tenant_id, user_id, amount, category, status)
- Cash_Book_Entries (id, tenant_id, transaction_type, amount, reference)

---

## 7. Critical Workflows

### 7.1 Order Fulfillment
Admin creates → Assign to driver → Driver accepts → Scan QR → Collect payment → Upload proof → Mark delivered → System updates ledger & inventory → Admin verifies

### 7.2 Cash Handover
Driver collects cash → Records in wallet → Initiates handover → Uploads proof → Admin reviews → Verifies physical cash → Approves → System updates wallets & cash book

### 7.3 Customer Recovery
Staff scans customer QR → Loads details & balance → Collects cylinder/payment → Updates ledger → Generates receipt → Initiates handover (EOD)

---

## 8. Success Metrics

- Order completion rate: 95%
- Average delivery time: < 2 hours
- Payment collection rate: 90% within 7 days
- System uptime: 99.9%
- API response time: < 500ms (p95)
- Driver app daily active users: > 80%

---

## 9. Future Enhancements (Post-MVP)

**Phase 2:**
- Native mobile apps
- GPS tracking
- Route optimization
- Customer self-service portal
- Advanced BI reporting

**Phase 3:**
- IoT cylinder tracking
- Predictive analytics
- Multi-warehouse support
- Franchise management
- Loyalty programs

---

**Document Version:** 1.0  
**Last Updated:** January 28, 2026  
**Status:** Draft for Review
