# Velmère Pass 26 — Market Integrity Live Terminal

Implemented a stronger Velmère Shield / Market Integrity Radar layer.

## Added

- Live market table at `/[locale]/market-integrity` with CoinMarketCap-style rows.
- Server-side market sweep endpoint: `/api/market-integrity/markets?perPage=100`.
- Server-side live token search route keeps DEX Screener fallback and adds CoinGecko market lookup.
- Clickable token rows open a premium modal with:
  - 7-day sparkline chart,
  - risk score,
  - price / 24h / 7d / market cap / volume,
  - anomaly signals,
  - deterministic Integrity AI summary,
  - CoinGecko/DEX source links,
  - legal disclaimer.
- Added market stats cards: market cap scan, volume scan, highest-risk detected asset, coverage.
- Added tabs: Top, Trending, Watchlist, Highest risk.
- Added new risk signals:
  - market_volume_stress,
  - supply_overhang.
- Expanded risk types with market metadata, token images, rank and sparkline data.
- Added `lib/market-integrity/coingecko.ts` adapter.
- Added translations PL/EN/DE for new market table, modal, metrics and risk signals.

## Safety/legal framing

The UI keeps the language as automated risk/anomaly signal only. It does not state that a token is a scam, does not accuse anyone, and keeps a visible disclaimer that output is not legal proof, investment advice, or a buy/sell recommendation.

## Checks

- `node scripts/check-i18n.mjs` passed.
- `node scripts/vercel-preflight.mjs` passed.
- Full `next build` was not run locally because the sandbox does not contain `node_modules` / `next`.
