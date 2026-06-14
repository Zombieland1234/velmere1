# PASS204 — AI Brain FPS Telemetry + WebGL Gate

PASS204 moves the VLM AI Brain forward on performance truth rather than visual promises.

## What changed

- Added lightweight FPS and worst-frame-delta telemetry for Orbit 360.
- Added a small motion-health chip in the VLM Brain topbar.
- Paused Orbit React updates while the user is reading a tile detail drawer.
- Added a typed WebGL/Three.js renderer gate contract that keeps DOM Orbit 360 as the production fallback.
- Kept WebGL disabled by default until real browser FPS/input-latency evidence exists.
- Updated the A–M master map with Previous → Current → Change deltas.

## PASS204 delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| D09 | Reduced motion / mobile downgrade | 79% | 81% | +2% |
| D10 | Performance governor | 93% | 95% | +2% |
| D11 | WebGL / Three.js lane | 38% | 42% | +4% |
| D21 | Brain telemetry / FPS QA | 48% | 55% | +7% |
| D22 | WebGL migration contract | 40% | 46% | +6% |
| J06 | Animation performance | 92% | 94% | +2% |

**PASS204 product delta:** +23% on touched rows.

## Validation focus

The guard verifies the FPS telemetry hook, motion-health chip, reading-pause governor, WebGL renderer contract, progress deltas, preflight wiring and safe wording.

## Remaining blockers

- Real Vercel/browser QA.
- Real FPS trace on lower-end devices.
- WebGL prototype comparison behind the gate.
- Durable source freshness registry.
- Holder/orderbook/contract/OSINT adapters.
- Real PDF generator.
- Wallet/session gating and payment/order persistence.

PASS204 product delta: +23%
DOM Orbit remains the production fallback.
