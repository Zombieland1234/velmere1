# PASS302 — Source Proof Escrow Gate

## Scope
- Next ID after PASS301 focuses on proof release control: K01/K02/K05, L02/L06/L07, M01/M05/M08, D16/D17.
- New UI innovation: Source Proof Escrow. Premium proof copy is held until exchange depth, reserve snapshot, contract permissions, provenance passport and redaction lanes align.

## Research basis
- MEXC order depth / market depth: depth and spread are decision context, not trading instructions.
- MEXC Proof of Reserves: reserve data is transparency evidence, not a platform-safety or solvency promise.
- LVMH / Aura DPP: luxury trust moves toward traceability, authenticity, provenance and customer-readable passports.

## Product delta
- Added lib/market-integrity/source-proof-escrow-gate.ts.
- Added PASS302 panels to VLM Browser / Lens, Shield terminal and Shield Map.
- Added Lens result receipt: data-pass302-result-escrow="source-proof-escrow-receipt".
- Added guard verify:pass302-source-proof-escrow-gate and wired it into verify:shield-all.

## Error sweep
- PASS299 undefined mode regression is explicitly guarded.
- PASS302 guard checks missing UI markers, product wording and dark-pattern regressions.
- Search dropdown quarantine remains untouched.

## Delta
| ID | Area | Previous | Current | Change |
|---|---:|---:|---:|
| K01 | Durable audit ledger / proof receipt planning | 40 | 43 | +3 |
| K02 | Source freshness registry | 58 | 60 | +2 |
| K05 | Privacy redaction envelope | 99 | 100 | +1 |
| L02 | Orderbook feed / depth context | 34 | 36 | +2 |
| L06 | Adapter timeouts / fallbacks | 54 | 56 | +2 |
| L07 | Source policy / adapter governance | 33 | 36 | +3 |
| D16 | Source confidence lanes | 97 | 98 | +1 |
| D17 | Missing-data semantics | 96 | 97 | +1 |
| M01 | Velmère Shield Report | 79 | 81 | +2 |
| M08 | PDF/browser replay boundary | 53 | 55 | +2 |

PASS302 total: +19 pkt.
