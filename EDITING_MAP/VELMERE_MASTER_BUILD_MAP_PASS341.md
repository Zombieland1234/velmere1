# VELMÈRE MASTER BUILD MAP — PASS341

## PASS341 scope
Universal Asset Matrix for Real Markets.

## Why
User wanted the Real Markets page to behave like the crypto Shield table, but for every asset class: currencies, stocks, real estate, ETF and commodities. The previous exchange table also made stability scores look like risk warnings.

## Implemented
- New library: `lib/market-integrity/universal-asset-market-matrix.ts`.
- New API payload: `universalAssetMatrix` in `/api/market-integrity/cross-asset`.
- New UI table: `Universal Asset Matrix` with crypto, exchange-token, stocks, FX, real estate/REIT, ETF and commodity rows.
- New metric contracts: price-change lanes, liquidity/depth/volume, disclosure/proof and cross-market context.
- Recalibrated exchange table: `Stability` now uses `StabilityPill` where higher score is good.
- Exchange copy changed from scary generic reserve warnings into calm adapter/freshness explanations.

## Boundaries
- Live numbers appear only after provider + timestamp + fallback flags exist.
- No buy/sell advice.
- No “next FTX”, no exchange collapse claim, no solvency certificate.
- Slow macro lanes cannot trigger fast exchange alarms.

## Next PASS342
- Add per-table route/detail pages: `/market-integrity/cross-asset/stocks`, `/fx`, `/real-estate`, `/exchanges`.
- Add sorting/filter chips for asset class and source state.
- Add real provider environment plan: Binance/MEXC first, then stock/FX provider, SEC/FRED/ECB reference lanes.
