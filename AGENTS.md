## 5. Master Alignment Rules (MANDATORY)
1. **The Atomic Documentation Rule:** No task is "Complete" until all 4 files (@PRD.md, @GAP_ANALYSIS.md, @EXECUTION_PLAN.md, @DATABASE_SCHEMA.md) are updated.
2. **Skill Trigger:** Use the `progress-auto-sync` skill IMMEDIATELY after any successful code or database change.
3. **Reality Verification:** Before ticking a task as [x] in EXECUTION_PLAN.md, you MUST verify the code exists in `/src` and the schema exists in Supabase via MCP.
4. **No Hallucination:** You are strictly forbidden from creating tasks that do not exist in the current EXECUTION_PLAN.md.
