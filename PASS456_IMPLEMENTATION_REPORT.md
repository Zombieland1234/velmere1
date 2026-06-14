# PASS456 — Asset-aware PDF + Real Markets Runtime

## What changed

### Velmère Browser / Lens
- One modal lifetime now covers both the four-stage V generation state and the finished preview.
- Background body/html scrolling remains locked during the generation → preview transition.
- Reader view keeps the download icon, exact PDF toggle, focus trap, Escape close and focus restoration.
- The human reader renders every tier field: Basic 10, Pro 14 and Advanced 20.

### Binary PDF
- Page 3 contains the complete Basic and Pro matrices.
- Page 4 contains the complete Advanced matrix instead of a 12-field excerpt.
- Two-column cells keep labels and values readable on A4.
- Missing fields remain explicit source requirements rather than generated substitute numbers.

### Asset-class-aware AI
- Unified audit now accepts an explicit asset class.
- Metric ordering is specialized for crypto, stocks, indices, FX, ETFs, commodities, real estate and exchange venue health.
- Token-only questions such as unlock pressure no longer crowd out stock filings, FX rate context, ETF NAV, commodity curve or REIT leverage checks.

### Real Markets
- Coinbase Venue Health was added beside Binance, MEXC, OKX, Kraken and Bybit.
- Visible rows are quoted in chunks of 18.
- “Show more” now triggers quote requests for the additional visible instruments instead of leaving later rows blank.
- Venue health remains a separate data lane and never pretends to be a listed stock price.

### Shield copy cleanup
- Customer-facing bare `unknown` text was replaced where it acted as UI copy.
- Internal `unknown` enum values remain where required for evidence/risk semantics.
- Holder language now distinguishes unclassified clusters from a safety verdict.

## Validation executed

- `npm run verify:pass456-asset-aware-pdf-realmarkets`
- `npm run verify:pass455-human-decision-pdf-forge`
- `npm run verify:pass454-evidence-dense-human-analysis`
- `npm run verify:pass453-unified-intelligence-handoff`
- `npm run verify:pass452-source-bound-depth-lab`
- `npm run verify:pass451-pdf-exact-preview`
- `npm run verify:pass450-tiered-human-analysis`
- `npm run check:i18n`
- `npm run vercel:preflight`

Result: all listed static/regression gates passed; 766 TS/TSX files parsed by PASS456 and 762 files scanned by Vercel preflight.

## External design/data basis
- CoinGecko `/coins/markets`: price, market cap, volume and related market fields for crypto.
- Binance Spot WebSocket: 24-hour connection lifecycle plus ping/pong handling.
- MEXC Spot WebSocket: no-more-than-24-hour connection lifecycle, ping keepalive and subscription limits.
- WAI-ARIA modal dialog pattern: contained tab sequence and managed focus.

## Honest remaining blockers
- Full `next build` was not run because this source package does not contain installed dependencies.
- Playwright/browser visual QA was not run because there is no running server or Chromium in the package.
- Real stock fundamentals, reserve disclosures and live order-book slippage still require production-grade source adapters.
