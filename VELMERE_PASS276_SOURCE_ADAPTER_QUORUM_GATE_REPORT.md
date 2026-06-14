# PASS276 — Source Adapter Quorum Gate

## Scope
- Map ID focus: **L06 Adapter timeouts / fallbacks**.
- Supporting IDs: **K02 Source freshness registry**, **D16 Source confidence lanes**, **D17 Missing-data semantics**, **C06 Risk scoring UI**, **M04 Safe export wording**.

## Web scan notes
- MEXC trading surfaces prioritize depth/orderbook and live market data close to the decision surface. PASS276 mirrors that by keeping adapter/source health visible beside the token modal instead of hiding failures in a generic score.
- LVMH/luxury direction remains quiet trust, traceability and elevated client experience. PASS276 turns this into a quiet proof seal: status comes from fresh sources and reviewer context, not urgency.

## Product changes
- Added `lib/market-integrity/source-adapter-quorum-gate.ts`.
- Added a new token modal rail: `data-pass276-source-adapter-quorum-gate`.
- Added six visible lanes: quorum, timeout, freshness, fallback, retry and seal.
- Added anti-FOMO circuit breaker wording: adapter fallback or stale data slows the readout and blocks strong customer-facing confidence.
- Added CSS for the source quorum rail with reduced-motion handling.
- Added PASS276 progress delta and master-map markers.

## Delta
| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| L06 | Adapter timeouts / fallbacks | 64 | 72 | +8 |
| K02 | Source freshness registry | 54 | 58 | +4 |
| D16 | Source confidence lanes | 93 | 95 | +2 |
| D17 | Missing-data semantics | 96 | 98 | +2 |
| C06 | Risk scoring UI | 76 | 78 | +2 |
| M04 | Safe export wording | 92 | 93 | +1 |

**PASS276 total delta: +19 points.**

## Safety wording
The circuit breaker is a review and source-confidence feature. It is not a safety certificate, investment advice, trade signal or guarantee.
