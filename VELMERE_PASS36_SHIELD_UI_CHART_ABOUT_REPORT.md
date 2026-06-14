# Velmère Pass 36 — Shield UI, Exchange Chart, About Layer

## Goal
Clean up the Market Integrity surface and continue the Shield evolution toward a premium exchange-style RegTech terminal without overloading the main page.

## Implemented

### 1. Clean Shield landing UI
- Rebuilt the `/[locale]/market-integrity` hero into a centered, calmer surface.
- Main top area now focuses on:
  - one central token/contract search input,
  - one `What is Shield` / `Czym jest Shield` CTA button.
- Removed the heavy pillar cards and bot panels from the main Shield landing surface to reduce visual chaos.
- Kept market stats and the live table below the search area.

### 2. Shield explanation page
- Added:
  - `/pl/market-integrity/about`
  - `/en/market-integrity/about`
  - `/de/market-integrity/about`
  - `/market-integrity/about` redirect to `/pl/market-integrity/about`
- The page explains:
  - what Shield is,
  - what data sources are used,
  - how the multi-agent scoring layer works,
  - how risk memory and evidence reporting fit into the architecture,
  - legal limitation: anomaly signal, not accusation or investment advice.

### 3. Better charting terminal
- Improved the exchange-style candlestick chart:
  - OHLC header,
  - price scale on the right,
  - volume embedded under candles,
  - crosshair hover line,
  - tooltip with time, close and volume,
  - stronger terminal grid and spacing.
- Kept chart modes:
  - Chart 1 / Wykres 1 — line chart,
  - Candles / Świece — exchange-style OHLC,
  - Bars / Słupki — histogram mode.

### 4. Icon reliability
- Token images are loaded directly from provider image URLs again, with fallback ticker avatar if the remote image fails.
- This avoids over-reliance on the proxy route when public image CDNs already work as `<img>` sources.

### 5. Modal behavior
- Removed forced scroll restoration on modal close.
- Closing a token popup should now simply close the modal and keep the user at the same page position.

### 6. Routing and SEO
- Added `/market-integrity/about` to sitemap.
- Added localized metadata for the about page.

## Checks
- `node scripts/check-i18n.mjs` passed.
- `node scripts/vercel-preflight.mjs` passed.
- Full `next build` was not run in this sandbox because dependencies are not installed here.

## Honest limitations
This is still not a full institutional AI system. Current production-level data sources remain live market APIs and server-side adapters. The true deep-tech roadmap still requires persistent database setup, background jobs, wallet clustering, social/NLP ingestion, mempool listeners, on-chain indexers and model training.
