---
name: transaction-integrity
description: Enforces atomic transactions for operations spanning multiple database tables (e.g., Orders, Ledgers, Inventory) to prevent partial updates. Use this skill when implementing financial logic, order processing, or any multi-table mutations.
---

# Transaction Integrity Skill

This skill ensures that complex database operations in the LPG Management System maintain atomicity, consistency, isolation, and durability (ACID). Because Supabase JavaScript client does not support multi-statement transactions natively over the REST API, we must use PostgreSQL Remote Procedure Calls (RPCs).

## Workflow

1. **Identify Multi-Table Operations:** Analyze the feature requirements to determine if multiple tables need updates (e.g., creating an order + debiting ledger + updating inventory).
2. **Avoid App-Level Sequences:** Do NOT perform sequential `supabase.from().insert()` then `supabase.from().update()` in Server Actions, as partial failures leave the DB in an inconsistent state.
3. **Create Postgres RPC:**
    - Write a `CREATE OR REPLACE FUNCTION` in PL/pgSQL.
    - Include all necessary `INSERT` and `UPDATE` statements within a `BEGIN ... EXCEPTION ... END;` block for atomicity.
    - Pass necessary parameters (e.g., `tenant_id`, `amount`, `user_id`).
4. **Execute the Migration:** Run the SQL to create the RPC in the Supabase database.
5. **Use `supabase.rpc()`:** Update the Next.js Server Action to call `supabase.rpc('function_name', { args })` instead of individual table operations.
