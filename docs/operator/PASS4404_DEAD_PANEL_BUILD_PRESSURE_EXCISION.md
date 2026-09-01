# PASS4404 — no-visual dead panel build-pressure excision

PASS4404 removes non-rendered legacy terminal/SOC/VLM helper panel definitions from the active `TokenRiskModal.tsx` client component. Static grep before removal showed each removed panel function had zero call sites in the active file; the current public modal export remains intact.

## Boundary

- No CSS/UI class changes were made for rendered branches.
- No customer-facing copy changes were made.
- Historical verifier/preflight markers are preserved in a comment-only compatibility vault.
- Public topka świata LIVE remains blocked until live receipts exist.

## Why this matters

The Windows runner showed `next build` heap pressure. PASS4402 changed the build command to a larger heap and removed forced webpack from the default path. PASS4403 reduced unused chart helper pressure. PASS4404 removes an even larger dead-code island from `TokenRiskModal.tsx`, cutting it from ~759 KB / ~18.7k lines to ~127 KB / ~3.2k lines.

## Next checkpoint

Do not ask the operator to test every pass. Batch more non-visual reductions and run the Windows full-check at the next checkpoint.
