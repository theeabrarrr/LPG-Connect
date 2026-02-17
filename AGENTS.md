## MASTER ARCHITECT PROTOCOL (Source of Truth)
1. **Database-First Reality**: Always verify the Live DB schema using MCP tools before proposing any code changes. Documentation (`DATABASE_SCHEMA.md`) is the Law, but Live DB is the Reality.
2. **Multi-Tenant Integrity**: Every query MUST include `.eq('tenant_id', tenantId)`. NEVER create a bypass policy or use `USING (true)` in RLS.
3. **Financial Atomicity ( The Iron Law )**: 
    - **NEVER** write to `employee_wallets` and `cash_book_entries` in separate `await` calls.
    - **NEVER** write to `customer_ledgers` and `cash_book_entries` in separate `await` calls.
    - **MUST USE** Supabase RPC (Postgres Functions) for:
        - Handover Approvals: `execute_handover_approval`
        - Payment Recording: `process_customer_payment`
        - Order Completion: `complete_order_transaction`
4. **Accounting Isolation**:
    - `cash_book_entries` = Physical/Cash-in-Hand.
    - `customer_ledgers` = Accounts Receivable (Debt).
    - UI MUST distinguish "Cash Position" vs "Outstanding Debt".
5. **Refactoring over Replacement**: Do not re-implement existing logic. Fix the "Half-Baked" code found in `handoverActions.ts` and `financeActions.ts` instead of creating new files. 