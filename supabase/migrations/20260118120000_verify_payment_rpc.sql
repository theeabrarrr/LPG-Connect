-- Function to atomically verify a payment logic
-- Handles: Transaction Status Update, Customer Balance Credit, Company Ledger Entry
create or replace function verify_payment_transaction(
  p_transaction_id uuid,
  p_admin_id uuid
)
returns json
language plpgsql
security definer
as $$
declare
  v_txn record;
  v_customer_exists boolean;
begin
  -- 1. Fetch Transaction with Lock
  select * into v_txn 
  from transactions 
  where id = p_transaction_id 
  for update;

  if not found then
    return json_build_object('success', false, 'message', 'Transaction not found');
  end if;

  if v_txn.status != 'pending_verification' then
    return json_build_object('success', false, 'message', 'Transaction is not pending verification');
  end if;

  -- 2. Update Transaction Status
  update transactions 
  set 
    status = 'verified',
    updated_at = now()
  where id = p_transaction_id;

  -- 3. Update Customer Balance (Credit/Reduce Debt)
  -- Check if customer exists first to be safe
  select exists(select 1 from customers where id = v_txn.user_id) into v_customer_exists;
  
  if v_customer_exists then
    update customers 
    set current_balance = current_balance - abs(v_txn.amount)
    where id = v_txn.user_id;
  end if;

  -- 4. Insert into Company Ledger
  insert into company_ledger (
    tenant_id,
    amount,
    transaction_type,
    category,
    description,
    admin_id,
    created_at
  ) values (
    v_txn.tenant_id,
    abs(v_txn.amount),
    'credit',
    'customer_payment_verified',
    'Verified ' || v_txn.payment_method || ' Payment (Txn #' || substring(p_transaction_id::text, 1, 8) || ')',
    p_admin_id,
    now()
  );

  return json_build_object('success', true, 'message', 'Payment verified successfully');

exception when others then
  -- Automatic Rollback happens here
  return json_build_object('success', false, 'message', 'Database Error: ' || SQLERRM);
end;
$$;
