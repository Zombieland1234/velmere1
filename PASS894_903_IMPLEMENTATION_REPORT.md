# PASS894–903 Runtime Preflight Integrity

## Scope
- Harden npm 11 / Vercel install policy without hiding the Node 24 requirement.
- Enforce VLM Brain no-fake-live confidence governor for fallback, provider error, low source count and missing data.
- Tighten Browser/Lens into a one-result pipeline.
- Make wallet read-only boundary visible even in compact embedded wallet surfaces.
- Remove remaining literal token-finance jargon from i18n values.

## Implemented
1. `.npmrc` now explicitly sets `strict-peer-deps=false` while retaining `legacy-peer-deps=true` and `engine-strict=true`.
2. `VlmBrainWorkspace.tsx` applies a 25% confidence penalty and hard-caps displayed confidence below 40 when fallback/provider error/low source/missing data is present.
3. Browser/Lens suggestions and detail result are capped to `LENS_SINGLE_RESULT_LIMIT = 1`.
4. Wallet connection surfaces now show a visible read-only warning before wallet choice even when `showStatus={false}`.
5. PL/EN/DE token/legal/cybersecurity copy no longer contains literal yield/dividend/guarantee strings in values.
6. Added `verify:pass894-903-runtime-preflight-integrity`.

## Passed checks
- `npm run verify:pass894-903-runtime-preflight-integrity`
- `npm run check:i18n`
- `npm run verify:pass884-893-core-a11y-data-integrity`
- `npm run verify:pass874-883-route-surface-cleanup`
- `npm run verify:pass864-873-shield-shell-gemini-micro`
- `npm run verify:pass854-863-gemini-unified-shell` after regenerating local slim handoff
- `npm run verify:pass844-853-unified-asset-modal`
- `npm run verify:pass834-843-evidence-graph`
- `npm run verify:pass824-833-runtime-cleanup`
- TSX transpile syntax check for edited runtime files using the globally available TypeScript compiler.

## Not confirmed
- Full `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build` and browser click QA remain unconfirmed in this sandbox because it runs Node 22/npm 10 while the project intentionally requires Node 24/npm 11.
