# Velmère Shield — Pass 43

## Scope
Pass 43 continues the clean Shield direction from Pass 42.

## Changes
- Kept the main Shield page minimal: clean search on top, shield icon shortcut on the right, table below.
- Made the search area sticky with dark translucent glass background so the scanner remains available while scrolling.
- Upgraded the market table visually:
  - darker premium container,
  - sticky table header,
  - smoother row hover gradient,
  - tabular numeric rendering,
  - stronger token avatar styling,
  - watchlist star toggle directly in rows.
- Hardened crypto icon loading:
  - external icon URLs are routed through `/api/market-integrity/icon`,
  - token modal uses the same proxy.
- Hardened modal chart fallbacks:
  - candlestick mode remains default,
  - if live klines return too little data, the modal falls back to CoinGecko chart data,
  - if chart data is also sparse, it creates a safe synthetic fallback from current price and percentage changes,
  - empty candle area now shows a premium loading/fallback message instead of looking broken.

## Files changed
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`

## Checks
- TypeScript TSX smoke transpile passed for modified components.
- `node scripts/check-i18n.mjs` passed.
- `node scripts/vercel-preflight.mjs` passed.

## Next recommended pass
Pass 44 should focus on the token modal:
- better Binance/MEXC candle density,
- real crosshair tooltip box,
- resizable chart area,
- mobile modal polish,
- stronger loading skeletons for live chart/orderbook.
