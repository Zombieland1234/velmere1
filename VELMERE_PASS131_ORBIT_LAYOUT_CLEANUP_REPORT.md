# VELMERE PASS 131 — Orbit Layout Cleanup + Smooth Motion Pass

## Base
Built on PASS 130.

## Why this pass
The screenshots showed three issues: VLM cards did not use the full height, selected-card/bottom overlays covered the last tiles, and auto-orbit looked choppy even though drag rotation felt better. The right action panel also continued rendering extra case/evidence cards under the main controls, which made the modal feel unfinished.

## Implemented

### 1. Smoother VLM auto-orbit
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

Replaced the old stepped interval motion with a `requestAnimationFrame` ticker using:
- `targetFrameMs`,
- `stepSize`,
- visibility guard,
- frame carry.

This should reduce the visible “tick tick” motion when the brain moves by itself.

### 2. Cards use more vertical viewport
Updated:
- `TokenRiskModal.tsx`

Changed sphere placement so cards can reach roughly 8–92% vertically instead of staying too close to the center. This helps the orbit fill the screen instead of leaving empty top space.

### 3. Static mode is now a full board
Updated:
- `TokenRiskModal.tsx`
- `app/globals.css`

Static mode now uses `shield-vlm-static-board` so cards fill the main work area from near the top to bottom, not just a short rail stuck at the bottom.

### 4. Selected tile inspector moved to the right
Updated:
- `app/globals.css`

Added `shield-vlm-detail-panel-side`. On desktop the selected tile panel goes to the right side, so it stops hiding bottom orbit cards. On smaller screens it still falls back to bottom layout.

### 5. Clean right action panel
Updated:
- `TokenRiskModal.tsx`
- `app/globals.css`

The deep operator/evidence stack is now hidden from the default right panel with `shield-token-review-tools-hidden`, so the panel ends cleanly after the main controls and metrics instead of showing confusing blocks like `unknown / VLM-BITCOIN...`.

### 6. Copy cleanup
Updated action-panel copy in PL/DE/EN so it reads more like product guidance and less like internal system text.

### 7. Guard
Added:
- `scripts/verify-orbit-layout-cleanup-safety.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:orbit-layout-cleanup`

## Validation
Passed:
- `node scripts/verify-orbit-layout-cleanup-safety.mjs`
- `node scripts/verify-evidence-export-manifest-safety.mjs`
- `node scripts/verify-evidence-report-safety.mjs`
- `node scripts/verify-vlm-motion-governor-safety.mjs`
- `node scripts/verify-vlm-brain-performance.mjs`
- `node scripts/verify-shield-runtime-ui-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/verify-risk-engine-safety.mjs`
- `node scripts/verify-locale-surface.mjs`
- `node scripts/verify-ai-brain-import-contract.mjs`
- `node scripts/verify-commerce-launch-safety.mjs`
- `node scripts/verify-product-truth-safety.mjs`
- `node scripts/verify-ai-risk-brain-scenarios.mjs`
- `node scripts/verify-operator-casefile-safety.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old bad terms: 1

## Progress note

| Area | Previous | After PASS 131 | Change |
|---|---:|---:|---:|
| UI shell / layout | 61–62% | 62–64% | +1–2% |
| Shield terminal | 62–65% | 64–66% | +2% |
| VLM AI risk brain | 48–51% | 48–51% | 0% |
| VLM visual brain / motion | 55–59% | 59–62% | +3–4% |
| Data / API spine | 37–39% | 37–39% | 0% |
| Legal / launch safety | 66–68% | 66–68% | 0% |
| Mobile polish | 42–45% | 44–47% | +2% |
| Full translations | 46–49% | 47–50% | +1% |
| Clothing commerce readiness | 60–63% | 60–63% | 0% |
| Evidence export / report draft | 42–48% | 42–48% | 0% |
| Whole brand/site launch readiness | 65–67% | 66–68% | +1% |

## Detailed progress

| Element | Progress |
|---|---:|
| Home / brand landing | 57–60% |
| Clothing collection page | 64–67% |
| Product card system | 67–70% |
| Product detail pages | 62–66% |
| Checkout / fulfilment | 25–30% |
| Shipping / returns / legal pages | 61–65% |
| VLM token/access page | 47–52% |
| Velmère Square/community | 36–43% |
| Shield market table | 60–63% |
| Shield token modal/chart | 64–67% |
| VLM visual brain | 59–62% |
| VLM AI risk brain | 48–51% |
| Operator AI Case File | 52–56% |
| Evidence report draft | 42–48% |
| Data/API spine | 37–39% |
| Mobile performance | 44–47% |
| Full PL/EN/DE translations | 47–50% |
| Launch safety / RegTech copy | 66–68% |

## Important limitation
This pass improves the current CSS/canvas orbit. A real “144fps game-like 3D planet” still needs a separate WebGL/Three.js scene.
