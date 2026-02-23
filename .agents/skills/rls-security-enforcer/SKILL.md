---
name: rls-security-enforcer
description: Strictly enforces Row Level Security (RLS) policies and tenant isolation for multi-tenant applications. Use this skill when creating new database tables, writing Server Actions, or debugging cross-tenant data leaks.
---

# RLS Security Enforcer Skill

This skill ensures strict multi-tenant isolation across the SaaS platform to prevent data leakage between tenants.

## Workflow

### 1. Database Level (RLS Policies)
For every table, ensure RLS is enabled and policies are properly defined:
- **SELECT**: Users can only read rows where `tenant_id` matches their own (unless they are a super admin).
- **INSERT/UPDATE/DELETE**: Strict checks verifying the actor's role and `tenant_id`.
- **No Public Access**: Never use "Public" policies (e.g., `true`) for any table containing tenant data.

### 2. Application Level (Server Actions)
Never trust client inputs for `tenant_id`. Always fetch it securely on the server:
- **Fetch Securely:** Always import and use `const tenantId = await getCurrentUserTenantId()` from `@/lib/utils/tenantHelper`.
- **Filter Explicitly:** Append `.eq('tenant_id', tenantId)` to ALL Supabase data queries, even if RLS is enabled (defense-in-depth).
- **Verify Ownership:** Before updating or deleting a record by UUID, first query to verify that the record's `tenant_id` matches the current user's `tenant_id`. If it does not, throw an authorization error and log a security alert.
