# PASS954–973 — AI Risk Brain Runtime Gate

## Goal
Recover the interrupted PASS954–973 work, close the half-written risk-engine patch, and harden Velmère Shield's deterministic risk brain without adding UI noise.

## Completed
- Fixed the interrupted `risk-engine.ts` confidence-cap block that would have become a build blocker.
- Promoted Shield deterministic fusion from `v7` to `v8`.
- Added strict data-quality confidence caps:
  - `demo` / local sample: max `0.28` confidence.
  - `partial` / fallback-like provider state: max `0.39`, unless there are at least two corroborated sources, low missing data, and no consistency conflict.
  - no source ledger: max `0.28`.
  - one source only: max `0.39`.
- Added explicit limitations for demo/local sample and partial-provider states so the UI/exports cannot present fallback as live.
- Preserved existing deterministic scoring, agent assessments, meta-model limitations, stablecoin/RWA handling, and no-accusation language.
- Created the Codex one-file AI risk brain handoff set:
  - `CODEX_PROMPT_AI_RISK_BRAIN_REWRITE.md`
  - `CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine.ts`
  - `CODEX_REFERENCE_DO_NOT_EDIT_shield-investigator.ts`
  - `CODEX_REFERENCE_DO_NOT_EDIT_risk-types.ts`
- Added verifier `verify:pass954-973-ai-risk-runtime-gate`.

## Tests / checks
- `npm run verify:pass954-973-ai-risk-runtime-gate` — PASS 18/18.
- `npm run verify:pass934-953-production-hardening` — PASS.
- `npm run verify:pass904-933-production-sprint` — PASS.
- `npm run verify:pass894-903-runtime-preflight-integrity` — PASS.
- `npm run verify:pass884-893-core-a11y-data-integrity` — PASS.
- `npm run verify:pass874-883-route-surface-cleanup` — PASS.
- `npm run check:i18n` — PASS.
- TS transpile syntax check on edited runtime files — PASS.
- Node 24.16.0 / npm 11.16.0 `npm ci --ignore-scripts --dry-run` — PASS, no ERESOLVE.
- Full `npm ci` attempt — timed out in sandbox after creating partial `node_modules`; not accepted as a full install proof.
- `tsc --noEmit --skipLibCheck` attempt — blocked by partial dependency install / missing packages, not accepted as proof.

## Not claimed
- Full `npm ci` completion.
- Full `typecheck`.
- Full lint.
- Full Next build.
- Real browser click QA.
- Vercel smoke test.

## Production status
This pass improves the AI/data-integrity layer and removes a real interrupted build blocker, but the project is still not production-complete until full install/build/runtime QA is completed under Node 24/npm 11 outside the sandbox timeout.
