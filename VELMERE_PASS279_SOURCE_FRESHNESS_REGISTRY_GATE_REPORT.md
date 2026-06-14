# PASS279 — Source Freshness Registry Gate

## Scope
- Next map ID: **K02 Source freshness registry**.
- Supporting IDs: **D16 Source confidence lanes**, **D17 Missing-data semantics**, **K01 Durable audit ledger**, **K06 Operator cases**, **M05 Redacted payload export**.

## Web scan applied
- MEXC direction: market UX keeps chart/orderbook/depth/live source state close to the trading surface. Velmère maps that into visible chart/depth TTL lanes and no silent stale data.
- LVMH direction: premium trust should feel calm, traceable and evidence-led. Velmère maps that into a private freshness seal and timestamp transparency, not loud urgency.

## Product changes
- Added `lib/market-integrity/source-freshness-registry-gate.ts`.
- Added the token-modal **freshness registry** rail with chart/depth/policy/receipt/operator lanes.
- Added the **TTL Decay Ribbon** innovation: stale or missing source lanes visibly decay into a velvet waiting room.
- Connected freshness to adapter quorum and durable audit receipts.
- Customer copy remains limited to review-pending/source-refreshed language and cannot become safety/profit/certification copy.

## Delta
| ID | Previous | Current | Change |
|---|---:|---:|---:|
| K02 | 61 | 69 | +8 |
| D16 | 97 | 98 | +1 |
| D17 | 99 | 100 | +1 |
| K01 | 48 | 50 | +2 |
| K06 | 49 | 52 | +3 |
| M05 | 78 | 80 | +2 |

**PASS279 total:** +17 points.

## Guard
- `npm run verify:pass279-source-freshness-registry-gate`
