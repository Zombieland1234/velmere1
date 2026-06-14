# PASS273 — Liquidity Exit Route Gate

## Scope

PASS273 continues the granular A–M master map without collapsing AI Brain into one bucket. It moves next into L02 orderbook/depth, C06 risk scoring, D16 source confidence, D17 missing-data semantics, L06 adapter fallback and M04 safe wording.

## Product delta

- Added `lib/market-integrity/liquidity-exit-gate.ts`.
- Added a compact `data-pass273-liquidity-exit-gate` rail inside `TokenRiskModal`.
- The rail exposes spread, bid-side exit depth, sell-route impact, buy-route context, bid/ask imbalance and source freshness.
- Missing live orderbook, bid depth, spread, route simulation, pair address or source freshness remains uncertainty and cannot become a clean safety statement.
- The innovation lane is an "exit route gate": the displayed chart price is separated from executable route depth before any public summary/export.

## Safe copy boundary

The gate is a market-integrity review cue. It is not investment advice, not a buy/sell prompt, not a liquidity guarantee and not a safety certificate.

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| L02 | Orderbook feed | 24% | 31% | +7% |
| C06 | Risk scoring UI | 76% | 79% | +3% |
| D16 | Source confidence lanes | 93% | 94% | +1% |
| D17 | Missing-data semantics | 96% | 97% | +1% |
| L06 | Adapter timeouts / fallbacks | 44% | 46% | +2% |
| M04 | Safe export wording | 89% | 90% | +1% |

**PASS273 product delta: +15% on touched rows.**

## Validation

- `verify:pass273-liquidity-exit-gate`
- `verify:pass272-holder-concentration-gate`
- `verify:pass271-contract-trap-gate`
- `verify:pass270-market-pressure-anti-fomo`
- `check:i18n`
- `vercel:preflight`
