-- SECURITY VULNERABILITY PATCHES

-- 1. Fix auth_users_exposed & security_definer_view
-- The view public.view_admin_approvals is historically SECURITY DEFINER and exposes users/auth bindings.
-- We recreate it as SECURITY INVOKER so it drops privileges and honors RLS logic correctly.
DROP VIEW IF EXISTS public.view_admin_approvals;

CREATE VIEW public.view_admin_approvals WITH (security_invoker = true) AS
SELECT 
    t.id AS transaction_id,
    t.created_at,
    t.amount,
    t.description,
    t.status,
    t.category AS type,
    t.tenant_id,
    t.created_by AS user_id,
    COALESCE(p.full_name, 'Unknown'::text) AS driver_name,
    p.id AS driver_id
FROM public.cash_book_entries t
JOIN public.profiles p ON t.created_by = p.id
WHERE t.status = 'pending'::text AND t.category = 'handover_request'::text;


-- 2. Fix policy_exists_rls_disabled 
-- These tables have RLS policies but the safety net was never physically enabled on the table.
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;


-- 3. Fix rls_policy_always_true
-- The public.order_items table has an overly permissive policy granting all access unconditionally.
DROP POLICY IF EXISTS "Enable all access for all users" ON public.order_items;


-- 4. Fix function_search_path_mutable
-- Execute dynamic SQL to force a secure search_path on all custom functions in the public schema.
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prokind = 'f'
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public;', func_record.func_sig);
    END LOOP;
END;
$$;
