# Velmère Pass 35 — Exchange Chart + AI Pipeline Expansion

## Scope
This pass moves Velmère Shield further from a static scanner toward an exchange-style market intelligence terminal.

## Implemented

### 1. Binance OHLC/Kline proxy
Added a server-side endpoint:

- `app/api/market-integrity/klines/route.ts`
- `lib/market-integrity/binance-klines.ts`

The endpoint fetches Binance spot OHLC/Kline data server-side and returns normalized candles. This avoids exposing future API logic on the client and lets the token modal render exchange-style candles where a Binance USDT pair exists.

Supported UI ranges:

- `1m`
- `15m`
- `1h`
- `4h`
- `1d`
- `7d`

### 2. Exchange-style candle chart
Updated:

- `components/market-integrity/TokenRiskModal.tsx`

The modal now supports three chart modes:

- `Wykres 1 / Chart 1`: original line chart
- `Świece / Candles`: OHLC candle chart with embedded volume bars
- `Słupki / Bars`: separate volume/activity histogram

If Binance candle data is unavailable, the modal falls back to CoinGecko market_chart data and synthetic candles from available price points.

### 3. Volume bars integrated into candle chart
The candle chart now renders:

- wick high/low
- open/close body
- up/down direction
- embedded volume bars below price area
- terminal-style grid background

### 4. Modal scroll restoration
Updated `MarketIntegrityClient.tsx` so opening a token modal stores the current scroll position and closing the modal restores the page to the same place instead of jumping back unexpectedly.

### 5. i18n chart labels
Added chart mode labels to:

- `messages/pl.json`
- `messages/en.json`
- `messages/de.json`

### 6. Preflight guard
Updated `scripts/vercel-preflight.mjs` to guard:

- presence of candle chart mode
- presence of `/api/market-integrity/klines`
- server-side Binance kline proxy

## Checks

- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅
- zip test ✅

## Notes
This is not yet a full institutional TradingView-grade engine. It is a strong zero-dependency SVG implementation. The next step is to add persistent candle caching, risk-on-chart overlays, event markers, and alert bands from the multi-agent risk engine.
