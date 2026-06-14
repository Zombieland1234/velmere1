# PASS296 — Luxury Liquidity Passport Gate

PASS296 adds a DPP-inspired market proof passport across VLM Browser, Shield and Shield Map. It fuses exchange depth context, source traceability, social context and evidence-earned luxury status without fake scarcity, countdowns or trading commands.

## Product move

- MEXC inspiration: orderbook/depth context must stay close to the token decision surface.
- LVMH/Aura inspiration: premium trust comes from transparency, traceability and authenticity.
- Velmère innovation: a Luxury Liquidity Passport that turns source/depth/social lanes into one visible proof seal.

## Touched IDs

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| L02 | Orderbook feed / depth context | 22 | 27 | +5 |
| K02 | Source freshness registry | 49 | 51 | +2 |
| C03 | Global token lookup | 70 | 72 | +2 |
| E02 | Lens search UX | 99 | 100 | +1 |
| D16 | Source confidence lanes | 92 | 93 | +1 |
| D17 | Missing-data semantics | 93 | 94 | +1 |
| M01 | Velmère Shield Report | 74 | 76 | +2 |
| M03 | Evidence Note | 77 | 79 | +2 |
| M05 | Redacted payload export | 97 | 98 | +1 |

PASS296 total: +17 points.

## Verification

- `npm run verify:pass296-luxury-liquidity-passport-gate`
- `npm run verify:pass295-decision-flow-orchestrator-gate`
- `npm run check:i18n`
- `npm run vercel:preflight`
