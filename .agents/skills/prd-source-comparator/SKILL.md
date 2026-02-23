---
name: prd-source-comparator
description: Compare PRD.md against all files in the /src folder to find missing implementations, discrepancies, or deviations from the requirements. Use this skill when the user asks to verify implementation status against the PRD.
---

# PRD Source Comparator

This skill guides you through the process of systematically comparing the `PRD.md` document with the contents of the `src/` directory to identify what has been implemented, what is missing, and what deviates from the defined requirements.

## Workflow

To perform a comprehensive comparison, follow these steps:

### 1. Read the PRD.md
Use the `view_file` tool to fully read and analyze `PRD.md`. Extract a mental checklist or use `task.md` to list the core features, functional requirements, and workflows required by the PRD.

### 2. Search Source Code Iteratively
Instead of attempting to read every single file manually (which would exceed context limits), map each PRD requirement to expected file names, API routes, components, or database models. 
Use the following tools to verify implementations:
- `find_by_name`: Locate relevant files (e.g., `*Actions.ts`, `*Dialog.tsx`).
- `grep_search`: Look for specific keywords, function names, or business logic defined in the PRD across the `src/` directory.

### 3. Cross-Reference and Verify
For each PRD requirement:
- Check if the corresponding files/functions exist.
- Use `view_file` on the key files to ensure the business logic inside matches the PRD requirements (e.g., verifying roles, permissions, API responses).
- Note down any discrepancies, missing files, or incomplete logic.

### 4. Generate the Comparison Report
Compile your findings into an artifact (like `PRD_COMPARISON.md`). The report should include:
- **Missing Features**: Requirements defined in PRD but absent in `/src`.
- **Discrepancies**: Logic that exists but differs from the PRD specifications.
- **Implemented Features**: Mention key components that align well with the PRD.

## Tips
- Do not use `cat` or `Get-Content` to print the entire `/src` folder contents. Rely on `grep_search` and targeted file viewing.
- Break down the PRD into logical domains (e.g., Auth, Inventory, Billing) and tackle them one by one.
