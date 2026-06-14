# Velmère PASS298 — Reserve Provenance Twin Gate

## Executive delta
PASS298 adds a Reserve-Provenance Twin layer across VLM Browser/Lens, Shield terminal and Shield Map. The layer merges exchange-grade transparency, order-depth context and luxury digital-product-passport proof into one calm decision surface.

## Research basis
- MEXC market depth/order depth pattern: keep liquidity/depth context next to the decision surface because shallow depth can increase volatility or slow execution.
- MEXC Proof of Reserves pattern: reserve backing is a transparency lane and must never become a solvency guarantee in UI copy.
- LVMH/Aura digital product passport pattern: luxury status is strongest when authenticity, traceability and provenance are visible and customer-readable.

## Product innovation
**Reserve-Provenance Twin**: every query/result gets a twin receipt that compares:
- reserve/backing proof,
- depth context,
- provenance passport,
- source quorum,
- customer/public boundary.

The UI innovation is not more hype. It is a reverse-FOMO system: the more market/social pressure rises, the more the interface requires reserve, source and provenance evidence before customer-facing status appears.

## Files changed
- `lib/market-integrity/reserve-provenance-twin-gate.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `scripts/verify-pass298-reserve-provenance-twin-gate-safety.mjs`
- `package.json`
- `EDITING_MAP/VELMERE_MASTER_BUILD_MAP_PASS298.md`

## Safety / psychology rules
- Elite status is earned by reserve/provenance proof, not artificial scarcity.
- FOMO becomes friction when reserve, depth, traceability or source quorum is weak.
- No countdown urgency.
- No limited-slots pressure.
- No buy/sell command.
- No guaranteed solvency, profit or safety wording.
- No hidden engagement-only ranking.

## Delta
| ID | Area | Previous | Current | Change |
|---|---:|---:|---:|---:|
| L02 | Orderbook feed / depth context | 31 | 34 | +3 |
| K02 | Source freshness registry | 53 | 55 | +2 |
| K05 | Privacy redaction envelope | 98 | 99 | +1 |
| D16 | Source confidence lanes | 94 | 95 | +1 |
| D17 | Missing-data semantics | 95 | 96 | +1 |
| M01 | Velmère Shield Report | 77 | 79 | +2 |
| M03 | Evidence Note | 80 | 82 | +2 |
| M05 | Redacted payload export | 98 | 99 | +1 |
| M08 | PDF/browser replay boundary | 51 | 53 | +2 |

**PASS298 total: +15 points.**

## Validation
Passed:

```bash
npm run verify:pass298-reserve-provenance-twin-gate
npm run verify:pass297-depth-resilience-radar-gate
npm run check:i18n
npm run vercel:preflight
```

Vercel preflight scanned 619 files.

`npm run typecheck` remains red because this ZIP has no `node_modules` and inherited missing Next/React/Node type packages plus older project errors. PASS298-specific guard is green.
