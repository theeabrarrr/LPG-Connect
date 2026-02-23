-- FUNCTION: get_driver_performance
-- PURPOSE: Aggregates driver performance metrics for the Analytics Dashboard.
-- SECURITY: STRICT SECURITY DEFINER with JWT tenant validation.

CREATE OR REPLACE FUNCTION public.get_driver_performance(
    p_tenant_id uuid,
    p_driver_id uuid,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_jwt_tenant_id uuid;
    
    v_total_orders int := 0;
    v_avg_delivery_seconds numeric := 0;
    v_cash_collected numeric := 0;
    v_cash_deposited numeric := 0;
    v_current_liability numeric := 0;
BEGIN
    -- 1. SECURITY VALIDATION: Ensure the calling user belongs to the requested tenant
    -- We extract the user id from 'sub' claim and lookup their exact tenant.
    SELECT tenant_id INTO v_user_jwt_tenant_id 
    FROM public.users 
    WHERE id = (current_setting('request.jwt.claim.sub', true)::uuid);

    IF v_user_jwt_tenant_id IS NULL OR v_user_jwt_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant ID mismatch. Function can only be called within your own tenant scope.';
    END IF;

    -- 2. TOTAL COMPLETED ORDERS AND AVG DELIVERY TIME
    SELECT 
        COUNT(*),
        COALESCE(AVG(EXTRACT(EPOCH FROM (trip_completed_at - trip_started_at))), 0)
    INTO 
        v_total_orders,
        v_avg_delivery_seconds
    FROM public.orders
    WHERE tenant_id = p_tenant_id
      AND driver_id = p_driver_id
      AND status = 'delivered'
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND trip_completed_at IS NOT NULL
      AND trip_started_at IS NOT NULL;

    -- 3. TOTAL CASH COLLECTED (From Orders)
    SELECT COALESCE(SUM(amount_received), 0)
    INTO v_cash_collected
    FROM public.orders
    WHERE tenant_id = p_tenant_id
      AND driver_id = p_driver_id
      AND status = 'delivered'
      AND payment_method = 'cash'
      AND created_at >= p_start_date
      AND created_at <= p_end_date;

    -- 4. TOTAL CASH DEPOSITED (From Approved Handover Requests)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_cash_deposited
    FROM public.cash_book_entries
    WHERE tenant_id = p_tenant_id
      AND created_by = p_driver_id
      AND category = 'handover_request'
      AND status = 'approved'
      AND created_at >= p_start_date
      AND created_at <= p_end_date;

    -- 5. CURRENT CASH LIABILITY (From Employee Wallet)
    SELECT COALESCE(balance, 0)
    INTO v_current_liability
    FROM public.employee_wallets
    WHERE user_id = p_driver_id;

    -- Return aggregated JSON result
    RETURN jsonb_build_object(
        'total_orders', v_total_orders,
        'avg_delivery_time_mins', ROUND(v_avg_delivery_seconds / 60.0, 2),
        'cash_collected', v_cash_collected,
        'cash_deposited', v_cash_deposited,
        'current_liability', v_current_liability
    );
END;
$$;
