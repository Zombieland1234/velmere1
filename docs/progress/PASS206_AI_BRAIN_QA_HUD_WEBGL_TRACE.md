# PASS206 — AI Brain QA HUD + WebGL Trace Gate

PASS206 separates the public VLM Brain experience from internal QA diagnostics.

## What changed

- Public Orbit 360 no longer shows FPS, input-latency, zoom controls or WebGL watermark by default.
- The QA HUD can be enabled only with `NEXT_PUBLIC_VLM_BRAIN_QA_HUD=1` or by running the gated WebGL prototype.
- The WebGL prototype now emits per-second trace telemetry: FPS, worst frame, node count, paused state and quality level.
- DOM Orbit remains the production fallback; WebGL remains a QA comparison lane.
- The renderer contract now explicitly forbids public performance guarantees and keeps telemetry as internal QA evidence.

## PASS206 delta

| ID | Area | Previous | Current | Change | Status |
|---|---|---:|---:|---:|---|
| A06 | Runtime observability | 68% | 70% | +2% | improved |
| D10 | Performance governor | 96% | 97% | +1% | improved |
| D11 | WebGL / Three.js lane | 49% | 54% | +5% | improved |
| D21 | Brain telemetry / FPS QA | 58% | 64% | +6% | improved |
| D22 | WebGL migration contract | 54% | 58% | +4% | improved |
| J04 | Scroll lock / z-index layers | 93% | 94% | +1% | improved |
| J06 | Animation performance | 95% | 96% | +1% | improved |

**PASS206 product delta:** +20% on touched rows.

## Remaining blockers

- Real browser FPS traces must be captured on Vercel and on weaker hardware.
- WebGL is still not a production replacement for DOM Orbit.
- Live holder/orderbook/contract/OSINT adapters and durable source freshness registry remain blocked.
- Real PDF generator, wallet/session gating and payment/order persistence remain separate launch blockers.

<!-- PASS206 marker: AI Brain QA HUD and WebGL trace gate active. -->

PASS206 product delta: +20%
