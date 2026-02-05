-- FUNCTION: complete_order_transaction
-- PURPOSE: Atomically handle order completion, stock movement, and financial recording.

CREATE OR REPLACE FUNCTION public.complete_order_transaction(
    p_order_id uuid,
    p_driver_id uuid,
    p_tenant_id uuid,
    p_received_amount numeric,
    p_payment_method text,
    p_returned_serials jsonb,
    p_returned_empty_count integer,
    p_notes text,
    p_proof_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order RECORD;
    v_driver_name TEXT;
    v_customer_balance NUMERIC;
    v_required_qty INT := 0;
    v_available_stock INT;
    v_moved_ids UUID[];
    v_return_ids UUID[];
    v_remaining_balance NUMERIC;
    v_serial TEXT;
    v_order_friendly_id TEXT;
    v_customer_name TEXT;
    v_item RECORD;
BEGIN
    -- 1. VALIDATION & FETCH ORDER
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id 
      AND driver_id = p_driver_id 
      AND tenant_id = p_tenant_id
    FOR UPDATE; -- Lock order row

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found or access denied');
    END IF;

    IF v_order.status = 'delivered' OR v_order.status = 'completed' THEN
         RETURN jsonb_build_object('success', false, 'message', 'Order already completed');
    END IF;

    v_order_friendly_id := v_order.friendly_id;

    -- Get Customer Name for Description
    SELECT name INTO v_customer_name FROM public.customers WHERE id = v_order.customer_id;

    -- Calculate Required Quantity from Order Items
    -- Assuming order_items link to the order. 
    -- We need to sum quantity of LPG products.
    -- Simplified: Count all items as cylinders for now or check product type if available. 
    -- Based on prior knowledge, order_items has quantity.
    SELECT COALESCE(SUM(quantity), 0) INTO v_required_qty
    FROM public.order_items
    WHERE order_id = p_order_id;
    
    -- 2. CHECK DRIVER STOCK (Full Cylinders)
    IF v_required_qty > 0 THEN
        SELECT COUNT(*) INTO v_available_stock
        FROM public.cylinders
        WHERE current_holder_id = p_driver_id
          AND current_location_type = 'driver'
          AND status = 'full'
          AND tenant_id = p_tenant_id;

        IF v_available_stock < v_required_qty THEN
             RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock on truck. Have: ' || v_available_stock || ', Need: ' || v_required_qty);
        END IF;
    END IF;

    -- 3. FINANCIAL UPDATES
    v_remaining_balance := v_order.total_amount - p_received_amount;

    -- A. Transaction: SALE (Debit) - Increases Customer Debt
    INSERT INTO public.transactions (
        tenant_id, order_id, customer_id, user_id, 
        type, amount, payment_method, description, proof_url, created_at
    ) VALUES (
        p_tenant_id, p_order_id, v_order.customer_id, p_driver_id,
        'sale', v_order.total_amount, COALESCE(p_payment_method, 'pending'),
        'Order #' || COALESCE(v_order_friendly_id, 'Unknown') || ' - Delivered',
        p_proof_url, NOW()
    );

    -- B. Transaction: PAYMENT (Credit) - Decreases Customer Debt (If Paid)
    IF p_received_amount > 0 THEN
        INSERT INTO public.transactions (
            tenant_id, order_id, customer_id, user_id, 
            type, amount, payment_method, description, proof_url, created_at
        ) VALUES (
            p_tenant_id, p_order_id, v_order.customer_id, p_driver_id,
            'payment', -p_received_amount, COALESCE(p_payment_method, 'cash'),
            'Payment Received (Order #' || COALESCE(v_order_friendly_id, 'Unknown') || ')',
            p_proof_url, NOW() + interval '1 second' -- Ensure it appears after sale
        );

        -- C. Employee Wallet (Cash Liability)
        -- Only if cash/credit involves cash handling. 
        -- Logic: If amount > 0, driver collected money.
        INSERT INTO public.employee_wallets (user_id, balance, updated_at)
        VALUES (p_driver_id, p_received_amount, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET balance = employee_wallets.balance + EXCLUDED.balance, updated_at = NOW();
    END IF;

    -- D. Customer Balance Update
    UPDATE public.customers
    SET current_balance = current_balance + v_remaining_balance, -- Add net debt (Total - Paid). If Paid=Total, adds 0.
        updated_at = NOW()
    WHERE id = v_order.customer_id;

    -- 4. INVENTORY MOVEMENT: DRIVER -> CUSTOMER (Delivery)
    -- Move 'full' cylinders. Priority: Assigned to this order (if any logic existed) -> Random full.
    IF v_required_qty > 0 THEN
        WITH moved AS (
            UPDATE public.cylinders
            SET current_location_type = 'customer',
                current_holder_id = v_order.customer_id,
                status = 'at_customer',
                last_order_id = p_order_id,
                updated_at = NOW()
            WHERE id IN (
                SELECT id FROM public.cylinders
                WHERE current_holder_id = p_driver_id
                  AND current_location_type = 'driver'
                  AND status = 'full'
                  AND tenant_id = p_tenant_id
                LIMIT v_required_qty
            )
            RETURNING id
        )
        SELECT array_agg(id) INTO v_moved_ids FROM moved;
        
        -- Sanity Check
        IF array_length(v_moved_ids, 1) < v_required_qty THEN
            RAISE EXCEPTION 'Concurrency Error: Stock disappeared during transaction';
        END IF;
    END IF;

    -- 5. INVENTORY MOVEMENT: CUSTOMER -> DRIVER (Returns)
    IF jsonb_array_length(p_returned_serials) > 0 THEN
        -- Specific serials provided
        FOR v_serial IN SELECT * FROM jsonb_array_elements_text(p_returned_serials)
        LOOP
            UPDATE public.cylinders
            SET current_location_type = 'driver',
                current_holder_id = p_driver_id,
                status = 'empty',
                updated_at = NOW()
            WHERE serial_number = v_serial AND tenant_id = p_tenant_id;
        END LOOP;
    ELSIF p_returned_empty_count > 0 THEN
        -- Move random cylinders from customer to driver (Legacy/Fallback)
        UPDATE public.cylinders
        SET current_location_type = 'driver',
            current_holder_id = p_driver_id,
            status = 'empty',
            updated_at = NOW()
        WHERE id IN (
            SELECT id FROM public.cylinders
            WHERE current_holder_id = v_order.customer_id
              AND current_location_type = 'customer'
              AND tenant_id = p_tenant_id
            LIMIT p_returned_empty_count
        );
    END IF;

    -- 6. UPDATE ORDER STATUS
    UPDATE public.orders
    SET status = 'delivered',
        amount_received = p_received_amount,
        payment_method = p_payment_method,
        trip_completed_at = NOW(),
        notes = p_notes
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'message', 'Order completed successfully');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;
