# PASS297 — Depth Resilience Radar Gate

## Product move
PASS297 adds a reusable Depth Resilience Radar over VLM Browser, Shield terminal and Shield Map. It turns orderbook/depth context, source freshness and luxury-style traceability into visible proof rings before stronger customer copy or premium status language appears.

## Why this pass
- MEXC-style market depth stays near the decision surface because shallow depth can imply volatility/slower execution.
- LVMH/Aura-style traceability becomes a proof passport pattern: provenance before status.
- Psychology: FOMO becomes friction. If depth/source/traceability are weak, the UI slows the user instead of pushing action.

## Files changed
- `lib/market-integrity/depth-resilience-radar-gate.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `scripts/verify-pass297-depth-resilience-radar-gate-safety.mjs`
- `package.json`

## Delta
| ID | Area | Previous | Current | Change |
|---|---:|---:|---:|
| L02 | Orderbook feed / depth context | 27 | 31 | +4 |
| L06 | Adapter timeouts / fallbacks | 44 | 47 | +3 |
| K02 | Source freshness registry | 51 | 53 | +2 |
| D16 | Source confidence lanes | 93 | 94 | +1 |
| D17 | Missing-data semantics | 94 | 95 | +1 |
| M01 | Velmère Shield Report | 76 | 77 | +1 |
| M03 | Evidence Note | 79 | 80 | +1 |
| J03 | Responsive layout | 87 | 88 | +1 |

PASS297 total: +14 points.

## Safety boundaries
- No buy/sell command.
- No profit promise.
- No safety certificate wording.
- No fake private allocation.
- No countdown urgency.
- Premium/elite status only appears as evidence-earned proof grade.

## Validation
- `npm run verify:pass297-depth-resilience-radar-gate`
- `npm run verify:pass296-luxury-liquidity-passport-gate`
- `npm run check:i18n`
- `npm run vercel:preflight`

Full typecheck remains dependent on local `node_modules` and existing project types.
