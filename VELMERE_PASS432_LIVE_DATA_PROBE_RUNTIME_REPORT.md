# PASS432 — Live Data Probe Runtime

Scope: bugfix + AI brain only.

## What changed

- Added `lib/market-integrity/pass432-live-data-probe-runtime.ts`.
- Added live-data truth classification: `real_market_payload`, `partial_provider_payload`, `demo_or_fixture_payload`, `sealed_unverified_payload`.
- Added sample readout for every analyzed asset: price, 24h change, risk, source line, missing data, confidence line.
- Added provider reality checklist: live price, market cap, 24h volume, 24h change, liquidity, token address, chart sparkline, timestamp freshness.
- Added repair plan so the brain can say what is missing instead of pretending data is live.
- Added local probe script: `npm run probe:pass432-live-data -- bitcoin ethereum solana NVDA EURUSD=X`.
- Fixed Lens bug where `buildPass431LensCriticContract` received `pass431` before `pass431` existed.
- Exposed `pass432` through analyze, brain, chat and angel routes.
- Added Lens `pass432` contract so PDF preview/download remains customer-facing and same-payload.

## Why

The brain must be checked against real user queries, not only architecture. PASS432 makes BTC/ETH/SOL/exchange/stock/FX probes visible and forces the output to say whether the analyzed data is live, partial, demo, or sealed.

## Release rule

No fake live data. If price/source/freshness is missing, the PDF/chat must show the gap and cap confidence.
