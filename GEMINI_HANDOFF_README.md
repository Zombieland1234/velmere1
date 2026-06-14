# Velmère Gemini Slim Handoff — PASS863

This is a clean source-only pack for model analysis. It intentionally excludes old PASS reports, legacy editing maps, generated ZIPs, `node_modules`, `.next`, large public assets and release noise.

## Primary review goals

1. Runtime blockers: Node 24/npm 11, Next 16, hydration, server/client boundaries, `window/document/localStorage` guards.
2. UI/UX cleanup: premium minimalist flow, no duplicate dashboards, no dead buttons, no modal/header overlap.
3. Header/wallet/cart/account: anchored dropdowns, keyboard close, outside click, mobile bottom/right sheets.
4. Shield and Real Markets: one asset analysis grammar: name, price, risk/confidence, large chart, timeframe `15m/1h/4h/1d/1w`, Basic/Pro/Advanced.
5. VLM Brain: no fake live data, slow continuous motion, tier-based loading, source-bound confidence.
6. Browser/Lens: clean search → one result → PDF preview/download → Open Shield/Open Orbit.
7. Shield Map: evidence graph role only: Sources → Facts → Signals → Conflicts → Missing Data → Confidence → VLM Verdict.
8. PDF/i18n/security copy: no ROI, no guaranteed safety, no fake live, missing data lowers confidence.

## Important environment truth

The project is configured for:

- Node `>=24.16.0 <25`
- npm `>=11.16.0 <12`
- Next `16.2.7`
- React `19.2.7`

Do not treat Node 22/npm 10 failures as product failures; use Node 24 for real `npm ci`, typecheck, lint, build and runtime QA.

## What to inspect first

- `components/Navbar.tsx`
- `components/CartDrawer.tsx`
- `components/ui/OverlayPrimitives.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `components/market-integrity/UnifiedAssetAnalysisControls.tsx`
- `components/market-integrity/VlmNeuralAuditExperience.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `app/api/market-integrity/real-markets/route.ts`
- `app/api/search/lens-report/route.ts`
- `lib/market-integrity/unified-audit.ts`
- `app/globals.css`

## Model instruction for analysis

Find issues the human did not notice. Prioritize runtime/build blockers first, then UX dead ends, modal layering, mobile overflow, fake-live data, duplicate panels and copy that breaks premium trust. Give concrete file-level fixes, not abstract advice.
