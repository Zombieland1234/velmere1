# Velmère PASS587–591 — chart identity, evidence depth and continuity release

Date: 2026-06-08
Baseline: PASS586
Release target: PASS591

## Executive result

This batch strengthens the shared market chart used by Velmère Shield, Real Markets and the VLM market panel. The chart no longer treats zoom state, source freshness, candle order and provider comparison as unrelated UI concerns. They now share one source-bound runtime contract.

The public surface remains compact: detailed evidence is hidden inside a single disclosure panel rather than a permanent operator dashboard. Basic, Pro and Advanced expose distinct evidence budgets of 10, 14 and 20 fields.

## PASS587 — provider-route viewport identity

- Added a canonical chart identity composed of instrument, interval, primary source, secondary source and provider-route fingerprint.
- Zoom and pan are persisted in session storage only for the matching identity.
- A provider route change receives a separate viewport key, preventing stale state from one source route from being reused by another.
- Cached viewport state is validated, bounded and expires after 12 hours.

Primary module:
- `lib/market-integrity/pass587-chart-viewport-identity.ts`

## PASS588 — tier-bound chart evidence manifest

- Added deterministic evidence budgets:
  - Basic: 10 distinct fields
  - Pro: 14 distinct fields
  - Advanced: 20 distinct fields
- Every field has a unique ID, state and evidence lane: primary, secondary, runtime, continuity or comparison.
- Missing facts remain visibly missing rather than being replaced by repeated narrative.
- Replaced several always-visible diagnostic strips with one compact, expandable public evidence drawer.
- Localized public labels and state names for Polish, German and English.

Primary module:
- `lib/market-integrity/pass588-chart-evidence-manifest.ts`

## PASS589 — source freshness scheduler

- Added freshness-aware scheduling for live, stale, partial and offline source states.
- Refresh cadence is constrained by the requested candle interval and runtime age.
- Confirmed values remain on screen during refresh and retry cycles.
- Real Markets and the VLM panel now provide stable refresh callbacks to the chart.
- Scheduler explanations are localized in PL/DE/EN.

Primary module:
- `lib/market-integrity/pass589-source-freshness-scheduler.ts`

## PASS590 — candle continuity ledger

- Validates finite and internally consistent OHLC values before render.
- Sorts reversed provider history into timestamp order.
- Collapses duplicate open times while retaining the latest provider observation.
- Detects gaps, estimated missing candles and cadence shifts.
- Produces a continuity score and explicit healthy/watch/blocked state.
- Never interpolates missing candles.

Primary module:
- `lib/market-integrity/pass590-candle-continuity-ledger.ts`

## PASS591 — exact-timestamp comparison lens

- Added normalized index-100 comparison for primary and secondary source paths.
- Only candles with exact timestamp matches are included.
- Requires at least two matched candles before exposing a comparison path.
- Separates normalized directional comparison from direct raw-price comparability.
- Localizes comparison headlines and boundaries.

Primary module:
- `lib/market-integrity/pass591-chart-comparison-lens.ts`

## UI and interaction changes

- One compact evidence drawer replaces the large public diagnostic stack.
- Evidence cards display confirmed, limited and missing states without visual overload.
- Mobile controls preserve 44 px interaction targets.
- The chart keeps `pan-y` behavior so vertical page scrolling is not stolen by horizontal chart gestures.
- Reduced-motion rules cover the new evidence and freshness surfaces.
- Route, continuity, comparison and refresh summaries are presented as user-facing evidence rather than operator telemetry.

## Integration changes

- `AdvancedMarketChart.tsx` consumes all five PASS587–591 contracts.
- `CrossAssetCollapseRadarPanel.tsx` passes the selected Basic/Pro/Advanced depth, confidence cap and route identity, then performs source refreshes through a stable callback.
- `VlmSourceBoundMarketPanel.tsx` passes Basic/Pro depth, confidence cap and a stable VLM route ID, and reuses the same refresh function for manual and scheduled checks.
- `app/globals.css` includes containment, mobile layout and reduced-motion rules for the new evidence drawer.

## Validation executed

- PASS587–591 dedicated gate: PASS.
- PASS580–586 regression gate: PASS.
- PASS573–579 regression gate: PASS.
- i18n PL/DE/EN check: PASS.
- Vercel preflight: PASS, 867 files scanned before release documents were copied.
- TypeScript parser sweep: PASS, 874 TS/TSX files, 0 syntax errors.
- Strict semantic TypeScript check for the five new pure modules: PASS.
- Runtime contract tests cover route isolation, 10/14/20 field budgets, scheduler states, invalid/duplicate/gap handling and normalized exact-timestamp comparison.

## Explicit limitations

- A complete `next build` was not executed because the supplied archive has no `node_modules`, the sandbox runs Node.js 22.16.0, and the production contract requires Node.js 20.x.
- The older PASS559–565 regression script imports TypeScript as a local package and could not run without installed dependencies. The newer gates, i18n check and preflight completed.
- Secondary candle comparison is shown only when the calling provider supplies an actual secondary candle series. A point-in-time secondary quote is not converted into a fabricated path.

## Production validation command

```bash
nvm use 20
npm ci
npm run verify:pass587-591-chart-identity-continuity-release
npm run typecheck:pass591
npm run build
```
