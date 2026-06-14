# PASS214 — AI Brain Source Coverage Matrix

PASS214 adds a selected-tile **Source Coverage Matrix** under the VLM Brain detail drawer.

## Scope

- Builds `VlmBrainSourceCoverageMatrix` from capsule envelope, handoff bridge, operator action queue, case-review timeline, customer export firewall and token risk result.
- Splits source coverage into six lanes: market tape, liquidity depth, holder graph, contract control, narrative/social pressure and report/export gate.
- Computes lane states: `covered`, `review`, `missing`, `blocked`.
- Computes overall coverage, review SLA, export pressure and second-source requirement.
- Keeps source matrix data operator-only and customer-safe: no raw payload, no private scoring weights, no final safety claims.

## Product rule

Missing source coverage must not become a clean customer summary. Missing/blocked lanes increase review pressure and keep export/PDF gates closed until durable source review exists.

## PASS214 delta

| Area | Previous | Current | Change |
|---|---:|---:|---:|
| D16 Source confidence lanes | 79% | 83% | +4% |
| D17 Missing-data semantics | 83% | 86% | +3% |
| K02 Source freshness registry | 55% | 59% | +4% |
| K05 Privacy redaction envelope | 57% | 61% | +4% |
| K06 Operator cases | 59% | 63% | +4% |
| L01 Holder feed | 24% | 26% | +2% |
| L02 Orderbook feed | 22% | 24% | +2% |
| L03 Contract analyzer | 32% | 35% | +3% |
| L05 OSINT feed | 30% | 33% | +3% |
| M05 Redacted payload export | 66% | 69% | +3% |
| M06 Report download route | 32% | 34% | +2% |
| M07 Operator-only report fields | 69% | 72% | +3% |

**PASS214 product delta:** +37% on touched rows.

<!-- PASS214 marker: AI Brain Source Coverage Matrix -->
