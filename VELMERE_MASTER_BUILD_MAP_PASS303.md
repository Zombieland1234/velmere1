# Velmère Master Build Map — PASS303

PASS303 continues the A–M granular build map and keeps the AI Brain / Shield / Lens lines separate.

## PASS303 — Live Adapter Circuit Breaker Gate

Added a live-source circuit breaker before proof copy, report copy and premium status can move forward.

### New tracked module

- `lib/market-integrity/live-adapter-circuit-breaker-gate.ts`
- `scripts/verify-pass303-live-adapter-circuit-breaker-gate-safety.mjs`

### Product areas moved

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| L06 | Adapter timeouts / fallbacks | 56% | 60% | +4% |
| L02 | Orderbook feed / depth context | 36% | 38% | +2% |
| K02 | Source freshness registry | 60% | 62% | +2% |
| K04 | Storage/source adapter contract | 63% | 65% | +2% |
| A06 | Runtime observability | 86% | 88% | +2% |
| D16 | Source confidence lanes | 98% | 99% | +1% |
| M08 | PDF/browser replay boundary | 55% | 57% | +2% |
| J04 | Scroll lock / z-index layers | 100% | 100% | +0% |

**PASS303 product delta:** +15% on touched rows.

## PASS303 markers

- Lens/VLM Browser: `data-pass303-live-adapter-circuit-breaker="vlm-browser"`
- Shield terminal: `data-pass303-live-adapter-circuit-breaker="shield-terminal"`
- Shield Map: `data-pass303-live-adapter-circuit-breaker="shield-map"`

<!-- PASS303 marker: Live Adapter Circuit Breaker active. -->
