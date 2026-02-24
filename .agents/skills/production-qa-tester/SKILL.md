---
name: production-qa-tester
description: Guides behavior during Phase 7 (Testing) and Production Bug Fixing. Use this skill when diagnosing, auditing, or fixing bugs in a production environment, applying surgical non-destructive fixes, adding console logs for Vercel, or writing unit/integration tests that mock out Supabase.
---

# Production QA Tester

This skill provides mandatory guidelines for behavior during Phase 7 (Testing) and Production Bug Fixing.

## Rules

### Non-Destructive Fixes
When fixing production bugs, do not rewrite entire files. Only surgically alter the specific logic causing the bug (e.g., race conditions, middleware routing).

### Console Logging
Add strategic `console.error` and `console.log` statements in server actions to make Vercel production logs readable.

### Testing Standard
When writing tests (Unit/Integration), ensure they mock the Supabase client correctly so we don't pollute the live database.

### Pre-Fix Audit
Always read the Next.js and Supabase Auth documentation for race conditions before patching authentication flows.
