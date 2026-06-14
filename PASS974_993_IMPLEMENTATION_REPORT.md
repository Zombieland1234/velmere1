# PASS974–993 — Production Preflight Clean

## Scope
This pass stops deployable noise from entering the project root and makes the Vercel preflight gate real again.

## Implemented
- Moved Codex AI Risk Brain handoff source copies out of the project root.
- Converted Codex `.ts` handoff copies to non-deployable `.ts.txt` under `docs/codex-handoff/ai-risk-brain/`.
- Updated PASS954–973 verifier to validate the new non-deployable Codex handoff lane.
- Added `scripts/create-production-clean-zip.mjs`.
- Added `npm run deploy:clean-zip`.
- Added `scripts/verify-pass974-993-production-preflight-clean.mjs`.
- Added `npm run verify:pass974-993-production-preflight-clean`.
- Removed generated `tsconfig.tsbuildinfo` from the deployable root.
- Confirmed `npm run vercel:preflight` passes after cleanup.
- Generated a deploy-clean ZIP that excludes `node_modules`, `.next`, Codex handoff docs, `EDITING_MAP`, release proof folders, pass reports, ZIP artifacts and TypeScript build info.

## Verified
- `npm run verify:pass974-993-production-preflight-clean` — PASS 22/22.
- `npm run verify:pass954-973-ai-risk-runtime-gate` — PASS 18/18.
- `npm run verify:pass934-953-production-hardening` — PASS 10/10.
- `npm run verify:pass904-933-production-sprint` — PASS 32/32.
- `npm run verify:pass894-903-runtime-preflight-integrity` — PASS 17/17.
- `npm run verify:pass884-893-core-a11y-data-integrity` — PASS 24/24.
- `npm run verify:pass874-883-route-surface-cleanup` — PASS.
- `npm run check:i18n` — PASS.
- `npm run vercel:preflight` — PASS, scanned 949 files.
- `npm run ci:node24-npm11-dry-run` — PASS, Node 24.16.0 + npm 11.16.0 without ERESOLVE.

## Not yet proven
- Full `npm ci` still times out in the sandbox, although the npm 11 dry-run passes without ERESOLVE.
- Full `npm run typecheck`, `npm run lint`, `npm run build` and browser click QA still require a completed install and running app.

## Deployment note
Use the deploy-clean ZIP for Gemini/Codex/Vercel handoff when file-count or artifact noise matters. Use the full project ZIP only as a working archive.
