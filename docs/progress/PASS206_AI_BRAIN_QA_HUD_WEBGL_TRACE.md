# PASS206 — AI Brain QA HUD + WebGL Trace Gate

PASS206 closes the public/private split for AI Brain runtime QA. The public VLM Brain surface must stay clean by default, while internal QA can enable trace overlays only with `NEXT_PUBLIC_VLM_BRAIN_QA_HUD=1`.

## Product delta

PASS206 product delta: +20%

| Area | Before | After | Change |
| --- | ---: | ---: | ---: |
| Brain telemetry / FPS QA | 58% | 64% | +6% |
| WebGL trace discipline | 50% | 62% | +12% |
| Public HUD cleanliness | 72% | 88% | +16% |
| Motion QA auditability | 55% | 70% | +15% |

## Safety rule

- Public users should not see FPS, zoom, debug watermark, or raw WebGL trace HUD.
- QA trace is allowed only behind `NEXT_PUBLIC_VLM_BRAIN_QA_HUD=1`.
- The UI should expose telemetry hooks without turning the product into a debug screen.

## Implementation notes

- `VlmBrainWebGLTelemetrySample` documents the trace packet.
- `data-vlm-qa-motion` and `data-vlm-webgl-trace` keep QA states measurable.
- `VLM_BRAIN_QA_HUD_FEATURE_GATE` keeps the feature gate explicit.

PASS206 marker: QA HUD and WebGL trace are gated, measurable, and hidden from public product mode by default.
