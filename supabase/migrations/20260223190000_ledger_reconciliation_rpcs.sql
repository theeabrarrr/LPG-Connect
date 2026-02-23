-- Migration to add robust double-entry accounting RPCs

CREATE OR REPLACE FUNCTION create_order_with_ledger(
  p_tenant_id UUID,
  p_customer_id UUID,
  p_driver_id UUID,
  p_cylinders_count INT,
  p_total_amount NUMERIC,
  p_status TEXT,
  p_created_by UUID,
  p_product_name TEXT,
  p_price NUMERIC,
  p_cylinder_ids UUID[],
  p_is_unassigned BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- 1. Insert Order
  INSERT INTO orders (
    tenant_id, customer_id, driver_id, cylinders_count,
    total_amount, status, payment_method, created_by, updated_at
  ) VALUES (
    p_tenant_id, p_customer_id, p_driver_id, p_cylinders_count,
    p_total_amount, p_status, 'pending', p_created_by, timezone('utc'::text, now())
  ) RETURNING id INTO v_order_id;

  -- 2. Insert Order Items
  INSERT INTO order_items (
    order_id, product_name, quantity, price
  ) VALUES (
    v_order_id, p_product_name, p_cylinders_count, p_price
  );

  -- 3. Update Cylinders
  IF p_is_unassigned THEN
    UPDATE cylinders
    SET status = 'reserved',
        current_location_type = 'warehouse',
        current_holder_id = NULL,
        last_order_id = v_order_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = ANY(p_cylinder_ids) AND tenant_id = p_tenant_id;
  ELSE
    UPDATE cylinders
    SET status = 'full',
        current_location_type = 'driver',
        current_holder_id = p_driver_id,
        last_order_id = v_order_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = ANY(p_cylinder_ids) AND tenant_id = p_tenant_id;
  END IF;

  -- 4. Get Current Balance & Calculate New Balance
  SELECT current_balance INTO v_current_balance
  FROM customers
  WHERE id = p_customer_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  v_new_balance := v_current_balance + p_total_amount;

  -- 5. Update Customer Balance
  UPDATE customers
  SET current_balance = v_new_balance
  WHERE id = p_customer_id AND tenant_id = p_tenant_id;

  -- 6. Insert Ledger Entry
  INSERT INTO customer_ledgers (
    tenant_id, customer_id, order_id, transaction_type, amount, balance_after, description, category, created_by
  ) VALUES (
    p_tenant_id, p_customer_id, v_order_id, 'debit', p_total_amount, v_new_balance, 'Debit for Order ' || v_order_id, 'order', p_created_by
  );

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION collect_payment_with_ledger(
  p_tenant_id UUID,
  p_customer_id UUID,
  p_amount NUMERIC,
  p_payment_mode TEXT,
  p_description TEXT,
  p_proof_url TEXT,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_wallet_balance NUMERIC;
BEGIN
  -- 1. Deduct from Customer Balance & Get New Balance
  SELECT current_balance INTO v_current_balance
  FROM customers
  WHERE id = p_customer_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;
  
  v_new_balance := v_current_balance - p_amount;
  
  UPDATE customers
  SET current_balance = v_new_balance
  WHERE id = p_customer_id AND tenant_id = p_tenant_id;

  -- 2. Insert Ledger Credit Entry
  INSERT INTO customer_ledgers (
    tenant_id, customer_id, transaction_type, amount, balance_after, description, category, created_by
  ) VALUES (
    p_tenant_id, p_customer_id, 'credit', p_amount, v_new_balance, COALESCE(p_description, 'Cash Collection'), 'payment', p_user_id
  );

  -- 3. Increase Agent Liability Wallet
  SELECT balance INTO v_wallet_balance
  FROM employee_wallets
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF v_wallet_balance IS NULL THEN
    INSERT INTO employee_wallets (user_id, tenant_id, balance, updated_at)
    VALUES (p_user_id, p_tenant_id, p_amount, timezone('utc'::text, now()));
  ELSE
    UPDATE employee_wallets
    SET balance = v_wallet_balance + p_amount,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
  END IF;

  -- 4. Log Transaction in Cash Book
  INSERT INTO cash_book_entries (
    tenant_id, created_by, customer_id, transaction_type, category, 
    status, amount, payment_method, description, proof_url, created_at
  ) VALUES (
    p_tenant_id, p_user_id, p_customer_id, 'cash_in', 'collection',
    'completed', p_amount, p_payment_mode, COALESCE(p_description, 'Cash Collection'), p_proof_url, timezone('utc'::text, now())
  );
END;
$$;

CREATE OR REPLACE FUNCTION auto_fix_ledger_discrepancy(
  p_tenant_id UUID,
  p_customer_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_system_balance NUMERIC;
  v_ledger_balance NUMERIC := 0;
  v_variance NUMERIC;
  v_type TEXT;
  v_new_balance NUMERIC;
BEGIN
  -- Get system balance
  SELECT current_balance INTO v_system_balance
  FROM customers
  WHERE id = p_customer_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF v_system_balance IS NULL THEN
    v_system_balance := 0;
  END IF;
  
  -- Calculate true ledger sum
  SELECT COALESCE(SUM(CASE WHEN transaction_type IN ('debit', 'opening_balance') THEN amount ELSE -amount END), 0)
  INTO v_ledger_balance
  FROM customer_ledgers
  WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;
  
  v_variance := v_system_balance - v_ledger_balance;
  
  IF ABS(v_variance) > 0.01 THEN
    IF v_variance > 0 THEN
       v_type := 'debit';
    ELSE
       v_type := 'credit';
       v_variance := ABS(v_variance);
    END IF;
    
    v_new_balance := v_system_balance;
    
    INSERT INTO customer_ledgers (
      tenant_id, customer_id, transaction_type, amount, balance_after, description, category, created_by
    ) VALUES (
      p_tenant_id, p_customer_id, v_type, v_variance, v_new_balance, 'System Auto-Reconciliation Adjustment', 'adjustment', p_user_id
    );
  END IF;
END;
$$;
