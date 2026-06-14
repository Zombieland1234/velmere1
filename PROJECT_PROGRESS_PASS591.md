# Velmère progress — PASS587–591

## Completed batch

| Pass | Area | Delivered | Delta |
|---|---|---|---:|
| PASS587 | Chart identity | Instrument/range/provider-route fingerprint and isolated session viewport | +11 |
| PASS588 | Evidence depth | Exact Basic 10 / Pro 14 / Advanced 20 field manifests and compact public drawer | +16 |
| PASS589 | Freshness | Live/stale/partial/offline scheduler with confirmed-value preservation | +12 |
| PASS590 | Candle integrity | OHLC validation, sorting, duplicate collapse, gaps and cadence audit | +15 |
| PASS591 | Provider comparison | Exact-timestamp normalized comparison with comparability boundary | +14 |
| **Total** |  |  | **+68** |

## Current product impact

- Shield chart state is now tied to the real provider route instead of only the symbol and interval.
- Basic, Pro and Advanced no longer differ only through UI copy; their chart evidence budgets are enforced by code.
- Refresh cycles do not blank confirmed values.
- Invalid and discontinuous candle history is checked before SVG rendering.
- Cross-provider comparison cannot imply a candle path from a single quote.
- Public UI is cleaner because operator-like strips were consolidated into one evidence disclosure.

## Regression state

- PASS587–591: PASS
- PASS580–586: PASS
- PASS573–579: PASS
- PL/DE/EN: PASS
- Parser: 874 TS/TSX, 0 syntax errors
- Vercel preflight: PASS
- Full dependency-backed Next.js build: not executed in this sandbox
