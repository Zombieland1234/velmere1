# Velmère Pass 28 — Market Integrity Deep Repair

## Scope
This pass upgrades `/[locale]/market-integrity` from a basic market sweep into a cleaner market-integrity terminal with deeper risk logic, improved token discovery, icon proxying, modal scroll lock, chart/volume split, and microstructure panels.

## Key changes
- Added CoinGecko search autocomplete suggestions for partial tickers/names.
- Added server-side token icon proxy to avoid broken external token logos.
- Added Binance Spot order book module for USDT pairs with depth, spread, imbalance, and $10k slippage simulation.
- Added optional GoPlus Token Security integration for DEX/EVM contract scans through DEX Screener fallback.
- Expanded risk engine with pump detection:
  - parabolic 24h / 7d / 30d growth,
  - multi-timeframe pump,
  - near-ATH repricing,
  - wash-trading style volume/market-cap stress,
  - FDV/market-cap gap,
  - order-book slippage and imbalance,
  - honeypot/tax/mint/blacklist contract risks.
- Rebuilt popup overlay with z-index above the header and body scroll lock.
- Added chart intervals: 1m / 15m / 1h / 4h / 1d / 7d.
- Added separate volume bars beside the price chart.
- Added risk scale table and clearer explanation of why a risk score is assigned.
- Reduced roadmap clutter on the page.

## Notes
The terminal uses live public market APIs, but full institutional coverage requires cache/database/cron and paid or authenticated data sources for: all-token sweeps, historical order books, CEX cancellations, holders on non-EVM chains, social NLP, and cross-chain clustering.

## Verification
- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅
- Full `next build` not executed in the sandbox because `node_modules` is not installed here.
