# PASS2032 — Vercel Ahead Typecheck / Preflight Sweep

## Goal
Fix the Vercel build blocker from the latest log and scan forward for the next obvious build/preflight failure before packaging.

## Vercel log read
The uploaded Vercel log shows that `npm ci` now passes, Next.js 16.2.7 is detected, i18n passes, and the build stops at `tsc --noEmit`.

Main blocker groups:
- `components/market-integrity/ShieldMapClient.tsx`
  - `Pass1354Locale` strict locale mismatch
  - nullable `handoffPacket`
  - nullable `investigatorSuggestFrame`
  - nullable `investigatorResult`
  - nullable `evidenceReport`
  - nullable `sourceSnapshot`
- `components/market-integrity/TokenRiskModal.tsx`
  - `HTMLElement` ref assigned to a `HTMLDivElement` ref target
- `lib/market-integrity/data-backbone.ts`
  - zod transform callback too narrow for optional/empty URL branches

## Changes
- Removed the dead duplicated second return tree from `ShieldMapClient.tsx` that was still being typechecked and causing the nullable-state cascade.
- Kept the newer Shield Map evidence/search UI as the active return.
- Preserved Vercel preflight markers after removing the duplicate tree:
  - `shield-map-unified-search-shell`
  - `shield-map-token-suggest-panel`
  - `role="listbox"`
- Normalized `useLocale()` into strict `Pass1354Locale` before PASS1354 graph build.
- Replaced nullable investigator non-null assertions in the active memo with a narrowed local `investigatorResultView`.
- Ensured `TokenRiskModal` modal shell ref is `HTMLDivElement`.
- Widened `data-backbone.ts` URL transform callbacks to accept `string | undefined`.
- Added `scripts/verify-pass2032-vercel-ahead-sweep.mjs`.
- Added npm script `verify:pass2032-vercel-ahead-sweep`.

## Checks run in sandbox
- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK
- `npm run verify:pass2032-vercel-ahead-sweep` — OK
- TypeScript transpile syntax scan for 1568 TS/TSX/JS/JSX/MJS files excluding `.d.ts` — OK
- Focused TS/TSX syntax diagnostics for changed files — OK

## Not confirmed locally
Full `npm run typecheck` and `next build` were not fully confirmed in the sandbox because local `npm ci` could not finish within the execution window. Vercel itself installed 869 packages in ~24s in the provided log, so the next deployment is the source of truth for full dependency-backed typecheck/build.

## Expected next Vercel behavior
The build should pass the previous `tsc` blocker from PASS2031/2032 and proceed further. If another blocker appears after this, it should be a new downstream compile/runtime issue, not the same ShieldMap nullable cascade.
