# PASS367 — Browser Portal, Orbit Reader Scroll, Real Markets Polish

## Scope
PASS367 continues from PASS366 and targets the current blockers reported by the user:

- Velmère Browser dropdown sometimes appears under other UI layers.
- PDF preview/download content should be closer and language-aware.
- Orbit 360 tile drawer opens from the right but scroll can still be unreliable.
- Orbit detail drawer exposes too many raw operator/debug rails.
- Real Markets must feel closer to Shield: logos, chart modal, Basic/Pro/Advanced, cleaner category separation.
- Runtime `chartStatusLabel` must never be rendered unsafely again.

## Implemented

### 1. Velmère Browser suggestion portal
File: `components/search/VelmereIntelligenceSearchClient.tsx`

- Replaced inline Lens suggestions with a fixed `document.body` portal.
- Suggestions now sit above the page/header instead of being clipped by the browser/search shell.
- Portal is anchored to the search form with a throttled `requestAnimationFrame` scroll/resize recalculation.
- Outside click now respects both the search form and the portal panel.
- Added PASS367 markers:
  - `data-pass367-browser-suggestion-portal="true"`
  - `data-pass367-browser-portal-suggestions="true"`

### 2. PDF locale and preview/download parity step
Files:
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `app/api/search/route.ts`
- `app/api/search/lens-report/route.ts`

- Browser search API now receives `locale` from the page.
- PDF download link now passes `locale` into `/api/search/lens-report`.
- CoinGecko-powered Lens copy is now localized for PL / EN / DE.
- Live token report copy is less repetitive and more asset-aware: price, market cap, move, missing evidence, second source.
- PDF forge copy is cleaner and localized at the visible modal level.

### 3. Orbit 360 right drawer scroll and clean public trim
Files:
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`

- Added PASS367 reader-scroll contract to the right drawer:
  - `data-pass367-orbit-reader-scroll="true"`
  - `data-pass367-public-detail-trim="true"`
- Drawer is fixed to the right edge, above the Orbit surface, with a slow slide-in animation.
- Inner frame is forced to native scroll with `touch-action: pan-y`, `overscroll-behavior: contain`, stable scrollbar gutter, and mobile-safe sizing.
- Raw operator rails are hidden from the public drawer:
  - report capsule
  - report handoff
  - operator action queue
  - durable snapshot plan
  - operator checklist
  - bottom source/trust/publish/confidence technical footrail
- Drawer now keeps the main readable sections and the 4 compact tiles instead of ending with a wall of internal debug language.

### 4. Runtime guard for `chartStatusLabel`
File: `components/market-integrity/TokenRiskModal.tsx`

- Guard checks that JSX renders `{safeChartStatusLabel}`, not `{chartStatusLabel}`.
- PASS367 keeps the PASS366 runtime fix protected.

### 5. Real Markets cleanup
Files:
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `app/globals.css`

- Added PASS367 Real Markets marker:
  - `data-pass367-real-market-no-crypto-copy="true"`
- Added a short human context note above the table explaining categories and that crypto stays in Shield.
- Expanded deterministic logo mapping for ETF / exchanges / real estate proxies.
- Kept modal flow aligned with Shield: click row → chart modal → Basic / Pro / Advanced.

### 6. Verification guard
File: `scripts/verify-pass367-browser-orbit-realmarkets.mjs`

New script:

```bash
npm run verify:pass367-browser-orbit-realmarkets
```

Added to `package.json` and appended to `verify:shield-all`.

## Validation run

Passed:

```bash
npm run verify:pass367-browser-orbit-realmarkets
npm run verify:pass366-runtime-scroll-lock
npm run check:i18n
npm run vercel:preflight
```

Notes:

- `next build` / full `typecheck` were not run because this exported ZIP still does not include `node_modules`.
- This pass does not claim live provider completion; it improves UI, routing, language handling and guard coverage.

## Next PASS targets

1. Full PDF parity V2: generate the downloaded PDF from the same report section model used by preview, instead of maintaining separate PDF drawing commands.
2. Orbit Brain V3: replace remaining flat node styling with a stronger 3D sphere/neuron visual and progressive scan → source match → brain build → report transform animation.
3. Real Markets provider adapter plan: add real provider contracts for FX/stocks/commodities without pretending live data before keys exist.
4. Shield search lag: apply the Browser portal architecture to the main Shield search if any remaining scroll-jump appears in production.
5. Public copy trim: reduce Launch/Square/Research/Security pages into cleaner premium landing sections and move internal readiness panels behind operator-only surfaces.
