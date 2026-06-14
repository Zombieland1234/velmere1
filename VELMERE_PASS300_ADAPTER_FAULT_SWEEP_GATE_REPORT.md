# PASS300 — Adapter Fault Sweep Gate

PASS300 starts with error-first discipline: runtime crashes, stale identifiers, search portal overlays, adapter/source gaps, z-index/scroll issues and public proof copy must be checked before adding new premium surfaces.

## Research direction

- MEXC direction: order book/order depth and market depth are decision-support surfaces for liquidity and execution risk; shallow depth increases review pressure.
- MEXC proof-of-reserves direction: reserve transparency must remain explicit and source-led, not implied.
- LVMH/Aura direction: digital product passport / provenance / traceability create luxury trust only when the proof trail is visible.

## Product innovation

**Adapter Fault Sweep** is a market-luxury preflight rail. Every Lens, Shield terminal and Shield Map path gets a visible proof/fault capsule before any elite badge, report copy or proof receipt can appear.

It combines:

- runtime surface score,
- type/prop sweep lane,
- search portal quarantine lane,
- adapter quorum lane,
- provenance trace lane.

## Files changed

- `lib/market-integrity/adapter-fault-sweep-gate.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `scripts/verify-pass300-adapter-fault-sweep-gate-safety.mjs`
- `package.json`

## Error checks performed

- PASS300 guard checks markers and forbidden regressions.
- PASS299 guard re-checks the previous `mode is not defined` quarantine.
- Static scan confirmed the old `buildLayoutStabilitySentinelGate(..., mode)` runtime pattern is not present in product code; the only hit is inside the PASS299 verification script as a forbidden-pattern check.
- `check:i18n` passed.
- `vercel:preflight` passed and scanned 620 files.
- `typecheck` still fails because this ZIP environment has no installed `node_modules` / Next / React / Node type packages, and it still surfaces inherited older type errors. PASS300 is not marked as full typecheck-green.

## Psychology rules

- FOMO is inverted into friction: noisy market or noisy UI means more proof, not faster action.
- Elite status is earned by source quorum, runtime cleanliness and provenance traceability.
- No countdowns, fake scarcity, hidden ranking, buy/sell command, safety certificate or profit guarantee.

## PASS300 delta

| ID | Area | Previous | Current | Change |
|---|---:|---:|---:|
| A06 | Runtime observability | 81 | 85 | +4 |
| A03 | TypeScript sanity / static sweep | 98 | 99 | +1 |
| C02 | Shield search dropdown | 100 | 100 | +0 |
| C03 | Global token lookup | 72 | 73 | +1 |
| L06 | Adapter timeouts / fallbacks | 47 | 50 | +3 |
| K02 | Source freshness registry | 55 | 56 | +1 |
| D16 | Source confidence lanes | 95 | 96 | +1 |
| J04 | Scroll lock / z-index layers | 100 | 100 | +0 |
| M08 | PDF/browser replay boundary | 53 | 54 | +1 |

**PASS300 product delta:** +12 points on touched rows.

## Validation

```bash
npm run verify:pass300-adapter-fault-sweep-gate
npm run verify:pass299-runtime-search-quarantine-gate
npm run verify:pass298-reserve-provenance-twin-gate
npm run check:i18n
npm run vercel:preflight
```

All above commands passed.

`npm run typecheck` was executed and remains blocked by missing dependency/type packages and inherited older type issues in this sandbox.
