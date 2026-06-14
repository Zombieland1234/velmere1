# PASS274 — Unlock / Vesting Cliff Radar Gate

## Scope

PASS274 advances the next map lane after the liquidity exit route work: **L04 Unlock / vesting feed**. It also touches C06, D13, D17, L06 and M04 because the UI now treats future supply pressure as its own source-gated risk lane.

## External design scan applied

- MEXC-style trading surfaces keep important market context near chart/orderbook/depth surfaces instead of pushing all risk into long text blocks.
- LVMH-style luxury trust relies on calm status language, craftsmanship, selectivity and proof-first experience rather than loud pressure copy.

## Innovation added

**Time-lock mirror / cliff radar gate** — a compact UI rail that compares current price pressure with future supply pressure. It shows float, FDV gap, next cliff, team/advisor lane, cooldown and source state before any stronger public summary.

## Product changes

- Added `lib/market-integrity/unlock-vesting-gate.ts`.
- Added `data-pass274-unlock-vesting-gate` to `TokenRiskModal`.
- Added premium responsive CSS for `shield-pass274-unlock-gate`.
- Missing unlock calendars now trigger source-gap wording rather than false confidence.
- Fast repricing plus supply overhang activates cooldown language, not FOMO conversion pressure.

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| L04 | Unlock / vesting feed | 22 | 31 | +9 |
| C06 | Risk scoring UI | 79 | 81 | +2 |
| D13 | AI risk signal ontology | 74 | 76 | +2 |
| D17 | Missing-data semantics | 97 | 98 | +1 |
| L06 | Adapter timeouts / fallbacks | 46 | 48 | +2 |
| M04 | Safe export wording | 90 | 91 | +1 |

**PASS274 total: +17 points.**

## Safety boundary

The gate never provides investment advice, safe-token certification, buy/sell prompts, guaranteed outcomes or ROI language. FOMO is used only as a review/cooldown control.

<!-- PASS274 marker: Unlock vesting cliff radar gate active -->
