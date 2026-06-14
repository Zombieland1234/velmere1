# PASS844-PASS853 — Unified Asset Modal Controls

## Goal
Unify the product-critical analysis controls shared by Velmère Shield and Real Markets without pretending runtime QA passed in a Node 22 sandbox.

## Implemented
- Added `UnifiedAssetAnalysisControls.tsx` as the shared control layer for asset modal timeframes and Basic/Pro/Advanced actions.
- Shield now uses the shared timeframe tabs for 15M / 1H / 4H / 1D / 1W, while keeping the CoinGecko/Binance API value `7d` behind the 1W label.
- Shield now exposes a desktop shared Basic / Pro / Advanced dock under the chart, so the chart-first modal still has the three required actions even when the legacy side panel is hidden.
- Real Markets now uses the same shared timeframe tabs and the same shared Basic / Pro / Advanced dock.
- Kept the Real Markets native `1w` API value while matching Shield's visible 1W product label.
- Added shared focus-visible, mobile and reduced-motion CSS for these controls.
- Added `verify:pass844-853-unified-asset-modal` to prevent regression.

## Verification performed in this sandbox
- `npm run verify:pass844-853-unified-asset-modal` — PASS 10/10.
- `npm run verify:pass834-843-evidence-graph` — PASS 10/10.
- `npm run verify:pass824-833-runtime-cleanup` — PASS 10/10.
- `npm run check:i18n` — PASS.
- `node --check scripts/verify-pass844-853-unified-asset-modal.mjs` — PASS.
- `node --check scripts/check-runtime-env.mjs` — PASS.
- Standalone TSX parse check for the new shared component with local React stubs — PASS.

## Still not honestly verified
- `npm ci` — blocked by sandbox Node 22/npm 10 while the project requires Node 24/npm 11.
- `npm run typecheck` — blocked without dependency install.
- `npm run lint` — blocked without dependency install.
- `npm run build` — blocked without dependency install.
- Browser click QA — blocked until app runs under Node 24/npm 11.

## Next recommended pass block
PASS854-PASS863 should move from shared controls to full shared modal shell extraction and runtime QA:
1. Introduce a shared `UnifiedAssetModalShell` wrapper for header/readouts/chart/depth actions.
2. Migrate Real Markets fully into the shell.
3. Migrate Shield into the shell while preserving its chart data and source gates.
4. Run Node 24/npm 11 install/build outside this sandbox.
5. Execute click QA for Shield row, timeframe tabs, Basic/Pro/Advanced, Real Markets row, close, Escape and chart wheel.
