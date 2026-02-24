# Phase 7 Action Plan: Production Bug Triage

## 1. Bug 1: The Profile Race Condition
**Symptom:** Immediate "Unable to retrieve user profile" error on login. Works on manual page refresh.
**Root Cause:** The login action in `src/app/login/page.tsx` executes `supabase.auth.signInWithPassword` and then immediately queries the `users` table via `.from('users').select('*').eq('auth_id', user.id)`. However, there is a Next.js App Router / Supabase race condition where the authentication cookie is not immediately available to the subsequent database query, or RLS policies prevent the read before the session context is 100% propagated. When the user manually refreshes, the authentication cookies are fully set, and the Next.js middleware safely intercepts and routes them to the dashboard based on their JWT `user_metadata`.
**Surgical Fix Proposed:**
- **Remove the Database Query from Login:** Instead of querying the `users` table for the profile role immediately after `signInWithPassword`, extract the role directly from the JWT claims using `user.user_metadata?.role`.
- **Rely on Middleware:** Simply redirect the user to `/` upon successful authentication and allow the existing middleware loop to parse the JWT role and route the user to their designated dashboard.

## 2. Bug 2 & 3: Broken Role-Based Routing & Middleware Security Leaks
**Symptom:** Post-login sends everyone to `/admin`. Super Admins see Tenant Admin layout.
**Root Cause:**
1. **File Naming / Execution:** The Next.js middleware is currently contained in `src/proxy.ts`. Next.js requires it to be named `src/middleware.ts` to be executed automatically. (We will rename `proxy.ts` to `middleware.ts`).
2. **Role Fallthrough / Unhandled Empty State:** The middleware (`src/proxy.ts`) extracts the role via `const role = user.user_metadata?.role || '';`. The fallback routing logic (`// ADMIN / SHOP MANAGER`) lacks strict equality checks. If a user's role is missing or empty (`''`), it falls through all conditional role blocks and executes `return response;`, meaning the user is granted unauthorized access to restricted paths like `/admin`. 
3. **Incorrect Pathing:** The middleware currently redirects Super Admins to `/super-admin`, whereas the architecture strictly dictates `/superadmin`.

**Surgical Fix Proposed:**
- **Rename:** Rename `src/proxy.ts` to `src/middleware.ts`.
- **Strict Role Enforcement:** Modify the fallback routing logic to explicitly check `if (role === 'admin' || role === 'shop_manager')`.
- **Catch-All Unauthorized Block:** Add a final `else` condition that destroys the session or redirects to `/login?error=InvalidRole` if the role does not match any known entities preventing data leaks.
- **Route Standardization:** Update the route strings in the middleware to redirect `super_admin` clearly to `/superadmin`.

## 3. Safe Vercel Testing Strategy
To test these critical authentication and routing fixes safely on Vercel without breaking the live build:
1. **Branch Isolation:** We will create a `fix/phase-7-auth-routing` branch and deploy it as a Vercel Preview Deployment, never committing directly to `main`.
2. **Strategic Logging:** As per the `production-qa-tester` skill, we will inject surgical `console.error` and `console.log` statements inside the `/login` handler and the `updateSession` middleware execution to trace JWT extraction and `user_metadata` parsing in the Vercel Production Logs.
3. **Supabase Client Mocking:** Before merging to the live build, we will write lightweight unit/integration tests for the routing utility that explicitly *mock* `createClient` and JWT `user_metadata`. This ensures the routing logic holds up against edge cases (like `role: null`) without polluting the live database.
