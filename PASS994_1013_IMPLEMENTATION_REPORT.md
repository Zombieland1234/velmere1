# PASS994–1013 — Production Typecheck Scope & Runtime Build Gate Cleanup

## Scope
This pass targets the next production blocker after Vercel preflight: the project typecheck was scanning non-runtime lanes such as Playwright tests, old scripts, docs and handoff copies. That made the production build surface errors that do not belong to the shipped Next.js runtime.

## Implemented
- Scoped `tsconfig.json` to production runtime surfaces: `app`, `components`, `lib`, `store`, routing/i18n/proxy and Next generated types.
- Excluded Playwright specs, scripts, docs, Codex handoff text copies, legacy editing maps and release-proof artifacts from production `tsc`.
- Added explicit selector/state typing for cart and audio Zustand stores.
- Typed CartProvider reducers and selectors to avoid implicit-any drift.
- Typed VLM claim firewall callback maps and source id filters.
- Typed Zod transform callbacks and schema issue mappers in runtime data backbone and VLM brain paths.
- Hardened API route `catch (error: unknown)` branches with safe flatten casts.
- Switched Stripe browser client from fragile named `Stripe` import to `Awaited<ReturnType<typeof loadStripe>>`.
- Added PASS994–1013 verifier covering scope, runtime typing guardrails and Vercel preflight.

## Verified
- `npm run verify:pass994-1013-typecheck-scope` — PASS 25/25.
- `npm run vercel:preflight` — PASS, scanned 949 files.
- `npm run check:i18n` — PASS.
- PASS824 through PASS993 targeted verifiers — PASS after regenerating the local Gemini slim handoff.
- Node 24.16.0 + npm 11.16.0 `npm ci --ignore-scripts --dry-run --no-audit --no-fund` — PASS, no ERESOLVE.

## Not yet fully verified
- Full `npm ci` still times out in the sandbox before completion, even though the npm 11 dependency matrix dry-run passes.
- Full `npm run typecheck` cannot be honestly marked passed in this sandbox because `node_modules` is partial after timeout; remaining module/Three errors are consistent with incomplete package extraction.
- Full `npm run build`, browser click QA and Vercel smoke QA remain unconfirmed.
