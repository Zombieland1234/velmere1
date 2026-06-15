# PASS2033 — Vercel Ahead Hardening / Deploy-State Guard

## Why this pass exists
The latest Vercel log still shows the same TypeScript blocker family from the older Shield Map source tree:

- `components/market-integrity/ShieldMapClient.tsx` duplicate/old JSX tree around lines 4261–4972
- `Pass1354Locale` receiving raw `string`
- nullable `handoffPacket`, `investigatorSuggestFrame`, `investigatorResult`, `evidenceReport`, `sourceSnapshot`
- `TokenRiskModal` ref typed as `HTMLElement`
- `data-backbone.ts` optional URL transform callbacks typed too narrowly

The previous compact Shield Map file has fewer than 4300 lines, so a deploy that still reports line 4261+ is building the old tree or a commit that did not receive the compacted file.

## Implemented changes

### 1. Shield Map duplicate-tree deployment guard
- Added `scripts/verify-pass2033-vercel-ahead-hardening.mjs`.
- The verifier fails if `ShieldMapClient.tsx` is still over 4300 lines, which catches the old duplicate return tree before Vercel reaches the same TypeScript cascade again.

### 2. Shield Map locale strictness
- `buildPass1234LensShieldMapEvidenceParity` now receives `locale: pass1354Locale` instead of raw `locale`.
- Dependency list updated to use `pass1354Locale`.

### 3. data-backbone optional URL transform hardening
- Added reusable `optionalUrlString` union:
  - `z.string().url()`
  - `z.literal("")`
  - `z.undefined()`
- Removed inline optional URL transforms with narrow callback types.

### 4. TokenRiskModal ref guard
- Verifier enforces no `useRef<HTMLElement | null>` remains in `TokenRiskModal.tsx`.
- Current package uses `HTMLDivElement` refs.

### 5. Package verifier
- Added script:
  - `npm run verify:pass2033-vercel-ahead-hardening`

## Commands run

- `node scripts/verify-pass2033-vercel-ahead-hardening.mjs` — OK
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- changed-file readability scan — OK

## Important deploy note
If Vercel still reports `ShieldMapClient.tsx(4261...)` or `ShieldMapClient.tsx(4972...)` after this package is deployed, the repo is not building this ZIP/package. This PASS2033 source has the compact Shield Map file under 4300 lines, so those line numbers should not exist in the deployed source.

