---
name: saas-migration-auditor
description: Audits and verifies database migration logic for a multi-tenant SaaS. Ensures that all users (especially legacy single-tenant users) have valid tenant_id bindings, and that Super Admins safely bypass RLS without breaking UI functionality.
---

# SaaS Migration Auditor

This skill provides mandatory guidelines for verifying and maintaining data integrity when transitioning from a single-tenant to a multi-tenant SaaS architecture.

## Rules

### 1. Tenant ID Verification
Always ensure that every record in the `users`, `customers`, `orders`, and other core tables has a valid `tenant_id`. Legacy users missing a `tenant_id` are considered corrupted and must be migrated or patched. 

### 2. Multi-Tier Authentication Audit
When auditing authentication flows, verify both the `auth.users` JSON payload (`raw_user_meta_data`) and the `public.users` table.
- **Super Admins:** Must have `role: 'super_admin'` and typically a specifically designated system `tenant_id` (e.g., `00000000-0000-0000-0000-000000000000` or the owner tenant ID).
- **Tenant Users:** Must have a valid UUID `tenant_id` mapping to an active tenant in the `tenants` table.

### 3. Super Admin RLS Bypass Confirmation
Verify that Row Level Security (RLS) policies accurately grant Super Admins cross-tenant `SELECT` access where intended, without compromising the insert/update integrity of individual tenant data. The Super Admin UI should not break when encountering mixed tenant data.

### 4. Supabase MCP Usage
Use the Supabase MCP to actively query live database states when performing migration audits, rather than guessing data schemas.
