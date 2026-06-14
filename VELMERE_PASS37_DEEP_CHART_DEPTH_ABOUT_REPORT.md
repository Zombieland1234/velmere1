# Velmère Pass 37 — Deep Chart, Depth Book & Shield About Upgrade

## Goal
Continue hardening Velmère Shield into a cleaner RegTech/Web3 market-integrity terminal without pretending that future R&D modules are already production AI.

## Implemented

### 1. Exchange depth chart mode
- Added a new chart mode: `Depth` / `Głębokość` / `Tiefe`.
- The modal now has four chart modes:
  - line chart,
  - candlestick OHLC chart,
  - order-book depth chart,
  - volume bars.
- The depth chart uses Binance Spot order-book data when available.
- The backend now returns normalized bid/ask levels with cumulative USD depth.

### 2. Binance-style candlestick improvements
- Added moving-average style overlay lines to the candle chart.
- Added anomaly marker lines for sudden price/volume bursts.
- Kept OHLC header, right price scale, volume bars and crosshair/tooltip behavior.

### 3. Order book backend upgrade
- Extended `lib/market-integrity/binance-orderbook.ts` to return:
  - bid levels,
  - ask levels,
  - cumulative USD depth,
  - spread,
  - simulated $10k slippage,
  - bid/ask imbalance,
  - risk points.

### 4. About page expanded
- `/market-integrity/about` now separates:
  - modules that already run today,
  - R&D modules planned for grants / deeper implementation.
- Added a clear “live modules vs R&D roadmap” matrix.
- This keeps the pitch strong but legally/technically honest.

### 5. i18n and preflight
- Added translations for the new chart mode in PL/EN/DE.
- Extended `vercel-preflight` so the new order-book depth chart cannot silently disappear later.

## Verified
- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅
- zip packaging ✅

## Not run
- Full `next build` was not run here because this sandbox does not include `node_modules`.
- Vercel / local machine should run `npm install && npm run build`.

## Next recommended pass
Pass 38 should focus on:
- UI polish for the modal layout on mobile,
- risk markers directly tied to signal IDs,
- persistent alert feed in the main Shield page,
- cleaner sorting/filtering by risk delta,
- optional Supabase setup guide for the persistent ledger.
