## 5. Master Alignment Rules (MANDATORY)
1. **The Atomic Documentation Rule:** No task is "Complete" until all 4 files (@PRD.md, @GAP_ANALYSIS.md, @EXECUTION_PLAN.md, @DATABASE_SCHEMA.md) are updated.
2. **Skill Trigger:** Use the `progress-auto-sync` skill IMMEDIATELY after any successful code or database change.
3. **Reality Verification:** Before ticking a task as [x] in EXECUTION_PLAN.md, you MUST verify the code exists in `/src` and the schema exists in Supabase via MCP.
4. **No Hallucination:** You are strictly forbidden from creating tasks that do not exist in the current EXECUTION_PLAN.md.
## 4. Current Mission (PHASE 7: QA & Production Polish)
- **Objective:** Fix critical Vercel deployment bugs (Auth Race Conditions, Routing) and initiate automated testing.
- **Active Skill Constraint:** You MUST use the `production-qa-tester` skill for all bug fixes today to prevent regressions.
- **Immediate Task:** Fix the 'Unable to retrieve user profile' race condition and the broken `/admin` vs `/superadmin` routing logic in `middleware.ts`.
- **Next Task:** Outline the Testing Strategy (Jest/Playwright) as per Phase 7 in EXECUTION_PLAN.md.