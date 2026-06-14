# PASS272 — Holder Concentration Gate

## Scope

PASS272 moves the next map lane into **L01 Holder feed**, **C06 Risk scoring UI** and **D13 AI risk signal ontology**. The compact token modal now shows holder concentration as separate wallet-role lanes instead of hiding it behind a single generic score.

## Product changes

- Added `lib/market-integrity/holder-concentration-regime.ts`.
- Added `data-pass272-holder-concentration-gate` to the token modal action panel.
- Added six compact rails: `whales`, `labels`, `LP/depth`, `team`, `unknown`, `fresh`.
- Missing holder data, wallet labels and source freshness remain visible as uncertainty.
- Holder copy is deliberately review-focused: no accusation, no safety certificate, no investment signal.

## Psychology / UX notes

- MEXC-style direction: keep market data compact and close to the chart/action surface.
- Luxury/LVMH-style direction: trust comes from calm proof, role clarity and restraint rather than loud urgency.
- Innovation added: **wallet role split gate** — the first read is not just “holder risk,” but whether the supply picture is proven across whales, CEX/custody, LP/depth, team/treasury, unknown wallets and freshness.

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| L01 | Holder feed | 44 | 50 | +6 |
| C06 | Risk scoring UI | 72 | 76 | +4 |
| D13 | AI risk signal ontology | 72 | 74 | +2 |
| D15 | Risk driver mapping | 88 | 89 | +1 |
| D16 | Source confidence lanes | 92 | 93 | +1 |
| D17 | Missing-data semantics | 95 | 96 | +1 |
| M04 | Safe export wording | 88 | 89 | +1 |

**PASS272 product delta:** +16 points on touched rows.

## Guard

`npm run verify:pass272-holder-concentration-gate`
