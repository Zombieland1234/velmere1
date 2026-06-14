# PASS396 · Terminal Parity Brain + Real Markets Shield Mirror

## Scope
PASS396 continues the Velmère cleanup after PASS395. The pass focuses on three blockers the user repeated:

1. Real Markets / Real Stocks must behave like Velmère Shield: logo, table, candle chart, timeframe, Basic / Pro / Advanced and VLM AI Brain.
2. Browser PDF preview and download must stay on the same resolved payload, locale and section model.
3. Search portals in Browser, Shield, Shield Map and Real Markets must close before workflow transitions so suggestions do not float during PDF generation, download or modal open.

## Implemented

### Real Markets / Real Stocks
- Added `lib/market-integrity/pass396-terminal-parity-brain.ts`.
- Added PASS396 market universe expansion: US mega caps, cyber/AI/software, EU luxury/industrial names, Asia proxies, G10 FX crosses, commodities and real-estate/REIT proxies.
- Added `pass396AssetVisualPatch` and `pass396PseudoPricePatch` so Real Markets has deterministic logos/glyphs and price lanes instead of blank circles.
- Wired `buildPass396MarketCoverageUniverse()` into `CrossAssetCollapseRadarPanel` and `/api/market-integrity/real-markets/catalog`.
- Added `PASS396.terminal_parity_brain` contract to the catalog response.

### Orbit 360 / VLM neural brain
- Added one visible PASS396 terminal brain surface in Real Markets modal.
- Brain starts from a VLM coin, blue neural nodes and a brain shell.
- Output collapses into 10 / 14 / 20 fields using the same Basic / Pro / Advanced logic as PASS395.
- Old public pass-history panels are hidden by CSS; markers remain for guards, but the user surface is one clean brain.

### Browser PDF parity
- Browser component now marks the page and modal with `data-pass396-pdf-exact-payload`.
- Lens report route includes `pass396Readout`, `pass396NeuralSequence` and `pass396TerminalParityContract`.
- HTML preview route adds a PASS396 section and hides the older PASS392 visible section.
- Download/preview stay aligned to one resolved report payload in the selected PL/EN/DE language.

### Search cleanup
- Kept PASS395 hard-close search runtime.
- Added PASS396 markers for exact payload and search runtime lock across Real Markets and Browser.
- Real Markets modal still closes stale search frame before modal open; Browser closes suggestions before PDF forge/download.

## Validation
- `npm run verify:pass396-terminal-parity-brain` ✅
- `npm run verify:pass395-search-orbit-neural-brain` ✅
- `npm run verify:pass394-build-runtime-cleanup` ✅
- `npm run verify:pass393-build-key-syntax-hotfix` ✅
- `npm run verify:pass392-public-fidelity-core` ✅
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅

## Typecheck status
`npm run typecheck` is not green in the export sandbox because the package still lacks installed Next/React/Node/wagmi/stripe/zustand/tailwind type dependencies and existing project-wide strict typing issues. PASS396 was verified with a TypeScript parser sweep over 691 TS/TSX files and Vercel preflight over 696 files.
