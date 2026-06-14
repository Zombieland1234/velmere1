# Velmère PASS397 — Unified Search / PDF / Brain

## Focus
PASS397 continues after PASS396 and focuses on the live blockers repeated by the operator:

- Velmère Browser / Lens search suggestions must not float during PDF forge, preview or download.
- Velmère Shield search must hard-close before token modal open.
- Shield Map search portal must stay anchored and close through the same runtime event.
- Real Markets / Real Stocks must behave closer to Shield: wide rows, icons, candle modal, Basic / Pro / Advanced and Orbit 360 VLM Brain.
- Browser PDF preview and downloaded PDF must stay attached to one resolved payload, one locale and one field order.

## Implemented

### 1. PASS397 shared runtime close event
Added `PASS397_SEARCH_RUNTIME_CLOSE_EVENT = "velmere:search-runtime-close"` in:

- `lib/market-integrity/pass397-unified-search-pdf-brain.ts`

Integrated across:

- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`

This closes stale suggestion portals before:

- PDF forge
- PDF preview
- PDF download click
- modal open
- row click
- tab/asset switch
- scroll-anchor loss

### 2. Real Markets / Real Stocks expansion
Added `buildPass397MarketCoverageUniverse()` with additional provider-ready coverage:

- finance/institutional: JPM, MS, BLK, BX
- AI/cyber/semi: PLTR, ARM, ASML, TSM
- Asia proxies: BABA, TCEHY
- EU/luxury/health: SAP, Novo Nordisk, Nestle, Roche, Novartis, AB InBev, Ferrari, Moncler
- ETF/index/rates: SPY, DIA, IWM, EEM, FXI, TLT, HYG, UUP
- FX: EUR/NOK, USD/NOK, EUR/SEK, USD/SEK, USD/DKK, EUR/DKK
- commodities: natural gas, copper, coffee, cocoa, cotton
- thematic/real assets: lithium, uranium, timber, global REIT, international real estate

This is provider-ready coverage, not fake live global coverage.

### 3. Real Markets icons / deterministic visual patch
Added `pass397AssetVisualPatch` and `pass397PseudoPricePatch` so new rows do not render as empty circles.

### 4. Orbit 360 VLM Brain upgrade
Added `buildPass397UnifiedTerminalReadout()` and `pass397BrainTimeline`.

The visible Real Markets brain now shows one latest public surface:

- VLM coin
- blue neural shell
- 44 neural nodes
- collection phases
- Basic / Pro / Advanced output count logic: 10 / 14 / 20 fields
- one clean field grid instead of visible pass-history walls

### 5. Browser PDF parity
The PDF route now includes:

- `pass397Readout`
- `pass397BrainTimeline`
- `pass397UnifiedTerminalContract`
- visible `pass397-unified-terminal-brain` section in generated HTML/PDF

Old pass-history PDF sections are hidden more aggressively; PASS397 becomes the clean visible current parity layer.

### 6. Real Markets catalog API
Updated:

- `app/api/market-integrity/real-markets/catalog/route.ts`

Now returns PASS397 rows and PASS397 contract metadata.

## Validation

Passed:

- `npm run verify:pass397-unified-search-pdf-brain`
- `npm run verify:pass396-terminal-parity-brain`
- `npm run verify:pass395-search-orbit-neural-brain`
- `npm run verify:pass394-build-runtime-cleanup`
- `npm run verify:pass393-build-key-syntax-hotfix`
- `npm run verify:pass392-public-fidelity-core`
- `npm run check:i18n`
- `npm run vercel:preflight`

Parser sweep result:

- 692 TS/TSX files scanned with TypeScript parser in PASS397 guard.
- Vercel preflight scanned 697 files.

## Not claimed as complete

- This does not make every stock/currency/commodity in the world live. It expands provider-ready registry and UI parity.
- Full live coverage still needs provider keys, OHLCV adapters, session calendars, cache age, fallback flags and second-source diff.
- Full `next build` / `typecheck` is not marked green here because the exported ZIP does not include `node_modules` and historically misses external packages/types.
