---
name: prd-sync-skill
description: Comprehensive PRD Sync Skill utilizing "Parallel Thinking" agents to map existing Code and Database schema back to PRD.md to identify logic gaps.
---

# PRD Sync Skill

This skill operationalizes a parallel-thinking approach to ensure strict alignment between the Product Requirements Document (`PRD.md`), the Database Architecture, and the Source Code Logic.

## Workflow

### Phase 1: Preparation
1. Load and read `PRD.md` completely.
2. Load any existing analytical documents like `GAP_ANALYSIS.md` to establish context.
3. Understand constraint: **Do not write any new feature code.** Only update documentation and analyze logic gaps.

### Phase 2: Parallel Auditing

#### Agent A: Database-to-PRD Mapping
- **Objective:** Ensure all entities, relationships, constraints, and specifically Row-Level Security (RLS) policies defined in the PRD exist logically in the database layer.
- **Actions:**
  - View `src/types/database.types.ts` or query the DB directly to inspect the schema.
  - Map core tables (Users, Customers, Orders, Cylinders, Ledgers, etc.) to the `Data Model Summary` in PRD.
  - Check for missing columns (e.g., `proof_url` in handover logs, `payment_method` specifics).
  - Document gaps in a structured report.

#### Agent B: Code-to-PRD Mapping
- **Objective:** Ensure all workflows, business rules, and state transitions described in the PRD are covered by corresponding server actions, API routes, and components.
- **Actions:**
  - List files in `src/app/actions/` to verify existence of business logic controllers.
  - Use `grep_search` to find implementations of PRD features like "Bulk Order Assignment", "Inventory Alerts", or "Order Cancellation".
  - Read through targeted files using `view_file` to verify the logic performs atomic checks and matches PRD requirements.
  - Document missing logic functions or deviations.

### Phase 3: Synchronized Reporting
1. Combine findings from both Agent A and Agent B into a comprehensive `PRD_SYNC_REPORT.md` artifact.
2. Categorize gaps by severity (e.g., Blockers, Missing Features, Discrepancies).
3. If necessary, update the `GAP_ANALYSIS.md` or `EXECUTION_PLAN.md` to reflect the newly discovered gaps, ensuring nothing has slipped through the cracks.
