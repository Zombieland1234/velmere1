# Velmère PASS399 — Kernel Exactness Loop

## Goal
PASS399 continues the cleanup from PASS395–PASS398 and focuses on the highest-friction blockers reported by Marcin:

- Browser / Lens search suggestions must not float during PDF forge, preview, download or modal actions.
- Velmère Shield and Shield Map search must close deterministically before token/asset modal actions.
- Real Markets / Real Stocks must behave closer to Velmère Shield: logo, candle chart, timeframe, Basic / Pro / Advanced and Orbit 360 VLM Brain.
- Browser PDF preview and downloaded PDF must use the same resolved payload and locale branch.
- Public output must be cleaner: no visible pass-history wall, no random filler, no duplicated AI text.

## Implemented

### 1. Shared runtime close controller
Added `PASS399_RUNTIME_CLOSE_EVENT` in:

- `lib/market-integrity/pass399-kernel-exactness-loop.ts`

Integrated markers across:

- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`

This reinforces the behavior that search portals are closed before PDF preview/download, modal open, tab switch and scroll-sensitive actions.

### 2. Real Markets provider-ready universe
Added PASS399 asset coverage:

- AI/semi: AVGO, AMD, MU, ARM, PLTR, ANET, GOOGL, META, SAP, ASML, TSM, BABA, TCEHY, PDD
- FX: USD/NOK, EUR/NOK, USD/SEK, EUR/SEK, USD/DKK, EUR/DKK
- Commodities: NG=F, HG=F, RB=F
- Real estate: VNQ, XLRE, SCHH

Added deterministic visual patches and pseudo-price patches so the UI does not show empty/random circles while waiting for real provider adapters.

### 3. Orbit 360 Neural Brain
Added PASS399 brain readout:

- VLM coin
- blue neural shell / core
- neural node packet animation
- timeline: close → identity → candles → provider proof → orbit brain → security → research → field morph → exact PDF mirror
- output count: 10 / 14 / 20 fields depending on Basic / Pro / Advanced

### 4. PDF parity
Added PASS399 to Lens PDF route:

- import of `buildPass399KernelExactnessReadout`
- report type fields
- resolved report object fields
- binary PDF page 25
- HTML preview section

The marker is `PASS399 KERNEL EXACTNESS LOOP`.

### 5. Guard
Added:

- `scripts/verify-pass399-kernel-exactness-loop.mjs`
- `npm run verify:pass399-kernel-exactness-loop`

The guard scans TS/TSX parser output and validates critical PASS399 markers.

## Validation

Passed:

- `npm run verify:pass399-kernel-exactness-loop`
- `npm run verify:pass398-terminal-fidelity-loop`
- `npm run verify:pass397-unified-search-pdf-brain`
- `npm run verify:pass396-terminal-parity-brain`
- `npm run verify:pass395-search-orbit-neural-brain`
- `npm run check:i18n`
- `npm run vercel:preflight`

Parser sweep scanned 694 TS/TSX files with TypeScript parser.
Vercel preflight scanned 699 files.

## Honest limitation
Full `next build` / `npm run typecheck` is still not marked as green in the export environment because the package lacks `node_modules` and project dependencies/types. PASS399 focuses on parser/build-blocker sweep and guarded runtime integration.

## Next suggested PASS400
- Replace repeated old PASS PDF sections with a single public latest terminal page.
- Make Real Markets modal visually identical to Shield modal at component level, not only contract level.
- Add a single `useVelmereSearchRuntimeLock()` hook and remove duplicated event listeners.
- Continue exact locale copy polish for PL/EN/DE PDF output.
