# Velmère Shield — Pass 53

## Focus
Chart overhaul, Binance/MEXC-style candle density, volume profile, chart regime brain, and no-overlap terminal polish.

## Added
- `lib/market-integrity/chart-regime.ts`
  - classifies chart state as dense terminal, thin feed, volatile breakout, high drawdown, compressed range, or liquidity uncertain
  - produces score, confidence, density, checks, and next actions
- `app/api/market-integrity/chart-regime/route.ts`
  - `/api/market-integrity/chart-regime?query=BTC&range=1h`
  - fetches market result, tries Binance klines, then falls back to metrics
- report route now includes `chartRegime`

## Token modal upgrades
- candlestick SVG now includes a volume profile overlay inside the chart area
- point of control line is rendered on the chart
- added `Chart regime brain` block below the chart
- added `Volume profile` panel with price-band volume distribution
- added terminal chart rules panel explaining that candles are interpreted with liquidity, holders, volume, and uncertainty

## Safety and layout
- kept `shield-no-overlap`, `shield-copy-safe`, `min-w-0`, and dense copy patterns
- added chart CSS helpers for stable spacing and terminal panels
- no truncation guard now checks chart regime engine and endpoint

## Verification
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
