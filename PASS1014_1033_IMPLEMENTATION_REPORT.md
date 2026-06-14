# Velmère PASS1014–1033 — Final Build Gate Tightening

## Scope
This pass focused on deployment determinism and final build gate hygiene. No new feature panels were added.

## Implemented
- Changed Vercel install command from `npm install` to deterministic `npm ci --no-audit --no-fund --progress=false`.
- Added `ci:vercel-install-dry-run` so the Vercel install path can be checked under Node 24.16.0 / npm 11.16.0 without mutating `node_modules`.
- Disabled TypeScript incremental build state in `tsconfig.json` to stop `tsconfig.tsbuildinfo` from leaking into deployable state.
- Removed root `tsconfig.tsbuildinfo` artifact.
- Hardened production clean ZIP generation by excluding generated `dist-handoff` output.
- Added `verify:pass1014-1033-final-build-gate` to assert deterministic install, runtime integrity, modal A11y hooks, iOS scroll-lock, VLM confidence governors, and clean deploy exclusions.
- Recorded a successful Node 24/npm 11 dry-run log for the historical PASS904 verifier.

## Verified
- `npm run verify:pass1014-1033-final-build-gate` — PASS.
- `npm run vercel:preflight` — PASS.
- `npm run check:i18n` — PASS.
- `npm run ci:vercel-install-dry-run` — PASS, Node 24.16.0 + npm 11.16.0, no ERESOLVE.
- Recent regression verifiers PASS824 through PASS1013 were re-run after the patch, with the Gemini slim handoff regenerated for its legacy verifier.

## Not claimed
- Full `npm ci` still times out in the sandbox, although dry-run and preflight are clean.
- Full `typecheck`, `lint`, `build`, browser click QA, and Vercel smoke QA still require a non-timeout Node 24/npm 11 environment.
