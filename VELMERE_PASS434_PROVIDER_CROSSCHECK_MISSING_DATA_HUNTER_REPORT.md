# PASS434 — Provider Crosscheck & Missing Data Hunter

Scope: bugfix + Velmère AI brain only.

## Implemented

- Added `pass434-provider-crosscheck-missing-data-hunter.ts`.
- Added provider lane scoring for crypto market, DEX liquidity, token security, real markets, exchange health and candles.
- Added answer gates: `release`, `release_with_missing_data`, `facts_only`, `operator_review`.
- Added missing-data hunter items with severity, attempted providers, next provider, PDF visibility and chat visibility.
- Extended probe route with Binance spot kline probe and Yahoo real-market chart fallback.
- Extended risk brain, Lens report, analyze, brain, chat and angel routes with PASS434 payload.
- Added local probe script: `npm run probe:pass434-provider-crosscheck -- bitcoin ethereum solana NVDA EURUSD=X`.

## Runtime rule

PASS434 does not allow fake-live language. If the second provider, live price, candles, security flags or freshness are missing, PDF/chat must surface missing data instead of filling it with generated copy.

## Validation

- `npm run verify:pass434-provider-crosscheck-missing-data-hunter`
- `npm run verify:pass433-real-internet-data-arbitration`
- `npm run check:i18n`
- `npm run vercel:preflight`

