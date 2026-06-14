# Velmère PASS173 — Real Browser QA + Source Adapter Readiness

## Scope
This pass adds the missing bridge between polished VLM Brain UI and production validation:
- real browser/GPU QA checklist visible in the project,
- market-integrity source adapter contract,
- source freshness/readiness panel,
- diagnostic source-readiness API route,
- no claims that missing/partial sources are verified.

## Implemented
- `lib/market-integrity/live-source-adapter-contract.ts`
- `components/market-integrity/MarketIntegritySourceReadinessPanel.tsx`
- `components/launch/RealBrowserQaPanel.tsx`
- `app/api/market-integrity/source-readiness/route.ts`
- Added panels to `/[locale]/market-integrity`
- Added CSS containment for source/QA panels
- Added PASS173 guard wired into `verify:shield-all` and `vercel-preflight`

## Important boundary
This does not connect real third-party APIs yet. It creates the adapter/freshness contract and UI that clearly marks missing, blocked and partial lanes.
