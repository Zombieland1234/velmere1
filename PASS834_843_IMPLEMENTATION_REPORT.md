# PASS834–PASS843 Runtime Cleanup / Evidence Graph

## Scope
- PASS834: keep the Node 24/npm 11 build gate visible; do not fake runtime success on Node 22.
- PASS835: fix Shield modal static blocker hygiene and preserve chart-first modal direction.
- PASS836: make Shield Map a distinct WHY / Evidence Graph product surface instead of a price table or PDF duplicate.
- PASS837: add Sources → Facts → Signals → Conflicts → Missing Data → Confidence → VLM Verdict as the primary Shield Map flow.
- PASS838: add node click → right drawer detail flow with overlay primitives, Escape/outside-click support and focus boundary from shared drawer system.
- PASS839: keep Shield Map search as one premium entry point, with Shield and Browser handoffs.
- PASS840: add mobile list fallback for evidence graph and reduced-motion-safe CSS.
- PASS841: preserve Real Markets unified modal contract with 15m/1h/4h/1d/1w and Basic/Pro/Advanced.
- PASS842: add verifier coverage for PASS834–843.
- PASS843: package release with honest test status.

## What changed
- `components/market-integrity/ShieldMapClient.tsx`
  - Added an early product-role return for Shield Map as a clean evidence graph.
  - Removed the public-first role conflict: Shield Map now explains why VLM reached a conclusion, not another market table.
  - Added 7-node chain: Sources, Facts, Signals, Conflicts, Missing Data, Confidence, VLM Verdict.
  - Added click node → right drawer with details.
  - Kept search and handoff actions to Shield and Browser.
- `app/globals.css`
  - Added premium graph styling, mobile list behavior and reduced-motion guard.
- `components/market-integrity/TokenRiskModal.tsx`
  - Verified duplicate JSX `className` blocker is not present in the visible metric card area.
- `scripts/verify-pass834-843-evidence-graph.mjs`
  - Added a focused verifier for the new evidence graph role and modal contracts.
- `package.json`
  - Added `verify:pass834-843-evidence-graph`.

## Tests run
- Static TSX transpile syntax check for:
  - `ShieldMapClient.tsx`
  - `TokenRiskModal.tsx`
  - `CrossAssetCollapseRadarPanel.tsx`
- `npm run verify:pass834-843-evidence-graph`
- `npm run check:i18n`

## Still not honestly confirmed
- Full `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build` and browser click QA are still not confirmed in this sandbox, because the project requires Node 24/npm 11 and the current runtime is Node 22/npm 10.
- Vercel readiness remains unconfirmed until the Node 24 path runs the full install/build/runtime smoke.

## Next
- PASS844–853 should run on Node 24, finish shared `AssetAnalysisModal` extraction for Shield + Real Markets, and then do real click QA.
