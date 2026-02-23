# Phase 2.3: Ledger Auto-Calculation & Reconciliation
**Implementation Plan & Discovery Report**

## 1. Discovery Report

### Current State Findings
1. **Order Creation (`orderActions.ts`)**:
   - `createOrder` correctly handles cylinder assignment and builds `orders` and `order_items` records.
   - **GAP**: It does **NOT** use a Postgres RPC to guarantee atomicity.
   - **GAP**: It does **NOT** generate a debit entry in `customer_ledgers`.
   - **GAP**: It does **NOT** increment the customer's `current_balance` (debt). 

2. **Payment Recording (`recoveryActions.ts`)**:
   - `collectPayment` correctly reduces the customer's `current_balance`, updates the agent's wallet, and creates a `cash_book_entries` record.
   - **GAP**: It does **NOT** create a credit entry in `customer_ledgers`. This violates the double-entry accounting requirement.

3. **Reconciliation Tool (`financeActions.ts` & UI)**:
   - `getReconciliationReport()` exists and intelligently aggregates actual `customer_ledgers` transactions versus the cached `current_balance` on the customer profile.
   - `admin/finance/reconciliation/page.tsx` exists and renders these discrepancies.
   - **GAP**: The current "Fix" action (`fixCustomerBalance`) blindly overwrites the customer's `current_balance` to match the ledger sum. However, if the ledger entries are missing (which they are), fixing the balance this way will actually *delete* the valid customer debt! We need an auto-fix that inserts missing ledger entries based on the variance, rather than just forcing the balance to zero.

---

## 2. Proposed Changes

### Database Layer (RPCs)
We need a migration to introduce two atomic PL/pgSQL functions that handle these multi-table operations.

#### [NEW] `create_order_with_ledger` RPC
This will wrap the final inserts of the order process:
- Receive `order`, `order_items`, and `cylinder_updates` as JSON.
- Insert into `orders`.
- Insert into `order_items`.
- Update `cylinders`.
- Update `customers.current_balance` (+ order amount).
- Insert `debit` into `customer_ledgers`.

#### [NEW] `collect_payment_with_ledger` RPC
This will replace the logic inside `collectPayment` for cash payments:
- Update `customers.current_balance` (- amount).
- Update `employee_wallets.balance`.
- Insert `cash_in` to `cash_book_entries`.
- Insert `credit` to `customer_ledgers`.

#### [NEW] `auto_fix_ledger_discrepancy` RPC
This will handle the one-click fix:
- If `system_balance` (actual debt) > `ledger_sum` (recorded debt), it means we forgot to record a debit (e.g., an order). Insert a `debit` ledger adjustment.
- If `system_balance` < `ledger_sum`, insert a `credit` adjustment.
- Recalculate and ensure harmony.

---

### Application Layer

#### [MODIFY] `src/app/actions/orderActions.ts`
- Refactor `createOrder` to prepare the stock data as usual, but dispatch the final execution to `await supabase.rpc('create_order_with_ledger', {...})`.

#### [MODIFY] `src/app/actions/recoveryActions.ts`
- Refactor `collectPayment` to dispatch cash payments to `await supabase.rpc('collect_payment_with_ledger', {...})`.

#### [MODIFY] `src/app/actions/financeActions.ts`
- Update `fixCustomerBalance` to use the new `auto_fix_ledger_discrepancy` RPC instead of just a raw update.

#### [MODIFY] `src/app/(dashboard)/admin/finance/reconciliation/page.tsx`
- Add UI feedback identifying *why* the discrepancy exists (e.g., "Missing Ledger Debits").
- Connect the "Auto-Fix" button to the new smart RPC.

---

## 3. Verification Plan

### Database & Functionality
1. Call `createOrder` via the UI. Verify that `customer_ledgers` now has a new exact `debit` match, and `customers.current_balance` increases.
2. Call `collectPayment` as a Driver. Verify that `customer_ledgers` has a new `credit` match, agent wallet increases, and `customers.current_balance` decreases.
3. Visit the Reconciliation UI. It should show $0.00 discrepancies for all properly handled new transactions.
4. Manually trigger a discrepancy via SQL, then use the "Auto-Fix" button to prove the gap is bridged with an "Adjustment" ledger entry. 
