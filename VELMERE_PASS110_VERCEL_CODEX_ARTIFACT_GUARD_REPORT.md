# VELMERE PASS 110 — Vercel Codex Artifact Guard

## Base
Built on PASS 109.

## Vercel error fixed
Vercel failed because a Codex handoff source file was included in the deployment root:

`./CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine.ts`

That file imported `./risk-types`, but because it was in the root directory, the relative import did not exist. Next/TypeScript tried to compile it and stopped the build.

## Fix
Removed from deployment root:
- `CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine.ts`
- `CODEX_REFERENCE_DO_NOT_EDIT_shield-investigator.ts`
- `CODEX_REFERENCE_DO_NOT_EDIT_risk-types.ts`
- `CODEX_PROMPT_AI_RISK_BRAIN_REWRITE.md`

Moved safe handoff copies to:
- `docs/codex-handoff/CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine.ts.txt`
- `docs/codex-handoff/CODEX_REFERENCE_DO_NOT_EDIT_shield-investigator.ts.txt`
- `docs/codex-handoff/CODEX_REFERENCE_DO_NOT_EDIT_risk-types.ts.txt`
- `docs/codex-handoff/CODEX_PROMPT_AI_RISK_BRAIN_REWRITE.md`

The source-code handoff files are now `.txt` so Next/TypeScript will not compile them.

## New regression guard
Updated:
- `scripts/vercel-preflight.mjs`

Added a Codex artifact guard that fails preflight if any `CODEX_*.ts`, `CODEX_*.tsx`, `CODEX_*.js`, or `CODEX_*.jsx` file is found inside the deployable project.

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- old critical TokenRisk/risk-engine terms: 0
- root `CODEX*` files: 0
- deployable `CODEX_*.ts/tsx/js/jsx`: 0

## Important rule going forward
Never place Codex handoff source files in the project root or any source-scanned folder with `.ts`, `.tsx`, `.js`, or `.jsx` extensions.
Use:
- `docs/codex-handoff/*.txt`
- or keep standalone Codex files outside the deployment ZIP.

## Next PASS 111
Continue real product work:
- Basic / Pro / Advanced product separation
- full PL/DE/EN Shield Map cleanup
- Velmère Square UX pass
- Research Lab navigation/footer link
- visual VLM brain polish
- integrate Codex risk-engine output when ready
