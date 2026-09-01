# PASS205 — AI Brain WebGL Prototype Isolation

## What changed

- Added `components/market-integrity/VlmBrainWebGLPrototype.tsx`, an isolated raw WebGL point-cloud renderer for the VLM AI Brain.
- The prototype is disabled by default and only mounts when `NEXT_PUBLIC_VLM_BRAIN_RENDERER=webgl-prototype`.
- DOM Orbit remains the visible fallback and still owns clickable cards, detail portals, keyboard flow and safe copy.
- Added PASS205 CSS containment for the WebGL layer, canvas and prototype watermark.
- Extended the renderer contract with PASS205 prototype rules and QA measurements.

## Why this pass matters

The current DOM Orbit can be polished, but true 144 FPS-style smoothness needs a renderer comparison path. PASS205 does not pretend the problem is solved. It creates the safe test lane: WebGL can be measured in a browser without replacing the working DOM Orbit experience.

## Progress delta

| ID | Area | Previous | Current | Change | Status |
|---|---|---:|---:|---:|---|
| D09 | Reduced motion / mobile downgrade | 81% | 83% | +2% | improved |
| D10 | Performance governor | 95% | 96% | +1% | improved |
| D11 | WebGL / Three.js lane | 42% | 49% | +7% | improved |
| D21 | Brain telemetry / FPS QA | 55% | 58% | +3% | improved |
| D22 | WebGL migration contract | 46% | 54% | +8% | improved |
| J06 | Animation performance | 94% | 95% | +1% | improved |

**PASS205 product delta:** +22% on touched rows.

PASS205 product delta: +22%

## QA still required

- Run DOM Orbit on Vercel with DevTools performance trace.
- Run gated WebGL with `NEXT_PUBLIC_VLM_BRAIN_RENDERER=webgl-prototype` and compare average FPS, worst frame delta and pointer feel.
- Test reduced-motion and mobile behavior.
- Confirm tile detail portals still appear above every renderer layer.

## Safety rule

WebGL is a visual renderer experiment, not a financial signal, not proof of safety and not a public performance guarantee.
