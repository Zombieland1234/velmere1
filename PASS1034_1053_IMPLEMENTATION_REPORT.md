# PASS1034–1053 · Final Runtime Cleanup / Dependency Diet / Public Copy Gate

## Scope
This pass focused on the final production slope after PASS1033: reduce install surface, keep Node 24/npm 11 dry-run clean, harden public legal copy, keep deploy ZIP outside the project root, and add one final static runtime verifier.

## Implemented
- Removed unused direct dependencies from `package.json` and refreshed `package-lock.json`:
  - `@hookform/resolvers`
  - `@react-native-async-storage/async-storage`
  - `ethers`
  - `pino-pretty`
  - `react-hook-form`
  - `vaul`
- Added `ci:node24-npm11-lean-dry-run` to exercise a lean npm 11 CI path with `--omit=optional`.
- Added `verify:pass1034-1053-final-runtime-cleanup`.
- Added `scripts/verify-pass1034-1053-final-runtime-cleanup.mjs`.
- Production clean ZIP now writes outside the project root by default (`../velmere-production-clean.zip`) so old preflight verifiers do not fail on a root ZIP artifact.
- Hardened public copy in Home, VLM Access, VLM Basic/Pro showcase, FAQ, Market Integrity About, Security metadata, VLM Token metadata, and selected API copy.
- Kept defensive/legal no-fake-live boundaries, but removed banned public-facing market-performance words from key visible surfaces.

## Tests run
- `npm run check:i18n` — PASS
- `npm run vercel:preflight` — PASS, scanned 949 files
- `npm run verify:pass1034-1053-final-runtime-cleanup` — PASS
- `npm run verify:pass1014-1033-final-build-gate` — PASS
- `npm run verify:pass994-1013-typecheck-scope` — PASS
- `npm run verify:pass974-993-production-preflight-clean` — PASS
- `npm run verify:pass954-973-ai-risk-runtime-gate` — PASS
- `npm run verify:pass934-953-production-hardening` — PASS
- `npm run verify:pass904-933-production-sprint` — PASS
- `npm run verify:pass894-903-runtime-preflight-integrity` — PASS
- `npm run verify:pass884-893-core-a11y-data-integrity` — PASS
- `npm run verify:pass874-883-route-surface-cleanup` — PASS
- `npm run verify:pass864-873-shield-shell-gemini-micro` — PASS
- `npm run verify:pass854-863-gemini-unified-shell` — PASS after regenerating Gemini slim handoff
- `npm run verify:pass844-853-unified-asset-modal` — PASS
- `npm run verify:pass834-843-evidence-graph` — PASS
- `npm run verify:pass824-833-runtime-cleanup` — PASS
- `npm run ci:node24-npm11-lean-dry-run` — PASS, Node 24.16.0 + npm 11.16.0, no ERESOLVE
- `npm run ci:vercel-install-dry-run` — PASS, Node 24.16.0 + npm 11.16.0, no ERESOLVE
- `npm run deploy:clean-zip` — PASS, writes `/mnt/data/velmere-production-clean.zip` in this sandbox

## Still not honestly confirmed
- Full `npm ci` still times out in the sandbox before completion.
- Full `npm run typecheck` is not confirmed because complete dependencies are not installed.
- Full `npm run lint` is not confirmed.
- Full `npm run build` is not confirmed.
- Browser click QA is not confirmed.
- Vercel smoke test is not confirmed.

## Changed files
See `PASS1034_1053_CHANGED_FILES.txt`.
