# PASS446 — Human Readout PDF Depth + Real Markets

Scope:
- Velmère Browser: sticky Lens capsule, visible 4-stage PDF forge, Basic/Pro/Advanced matrix.
- Lens PDF: 3-page PDF with depth matrix, human missing-data policy, same payload preview/download.
- AI readout: PASS446 contract removes unknown-spam and maps missing fields into human language.
- Unified audit: Basic = 10, Pro = 14, Advanced = 20 source-bound signals.
- Real Markets: expanded luxury/semiconductor/brokerage/EU catalog and venue-health rows for Binance/MEXC/OKX/Kraken/Bybit/Eurex/Xetra.
- Search API: CoinGecko result summary now carries price, market cap, volume, FDV, 1h/24h/7d and 24h high-low when available.

Validation:
- npm run verify:pass446-human-readout-pdf-depth-realmarkets
- npm run verify:pass445-ai-human-pdf-realmarkets
- npm run verify:pass444-browser-realmarkets-ui-ai
- npm run verify:pass443-nullish-build-hotfix
- npm run check:i18n
- npm run vercel:preflight

Notes:
- Full next build still needs the local project node_modules and real environment.
- The product remains source-bound: missing data stays visible instead of being converted into fake confidence.
