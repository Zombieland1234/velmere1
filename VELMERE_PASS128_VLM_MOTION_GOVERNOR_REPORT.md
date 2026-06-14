# VELMERE PASS 128 — VLM Motion Governor + Detailed Progress Matrix

## Base
Built on PASS 127.

## Why this pass
The VLM brain still felt too heavy/laggy, and the user should not be forced into the heaviest animation mode. PASS128 adds a motion governor so the terminal can stay premium without killing performance.

## Implemented

### 1. VLM motion governor
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

Added modes:
- Orbit 360
- Lite
- Static

Default is now Lite.

### 2. Heavy canvas gated
The canvas brain only renders when:
- motion mode is `Orbit 360`, and
- detected motion quality is not low.

Lite keeps tile orbit but disables heavy canvas. Static uses card layout.

### 3. Pro/Advanced connector cleanup
Pro/Advanced no longer show the huge basic SVG connector lines by default. Basic can still show them in Orbit mode.

### 4. Chart debug controls remain hidden
Drag panning remains active, but visible debug controls/labels stay hidden.

### 5. CSS polish
Updated:
- `app/globals.css`

Added:
- `.shield-vlm-motion-governor`
- `.shield-vlm-motion-lite`
- hidden `.shield-popup-chart-pan`

### 6. Guard
Added:
- `scripts/verify-vlm-motion-governor-safety.mjs`

New command:
- `npm run verify:vlm-motion-governor`

Wired into:
- `npm run verify:shield-all`
- `scripts/vercel-preflight.mjs`

### 7. Detailed progress matrix
Added:
- `docs/progress/PASS128_DETAILED_PROGRESS_MATRIX.md`

## Validation
Passed:
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
- `unzip -t`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old bad terms: 0

## Progress after PASS128

| Area | After PASS 128 |
|---|---:|
| UI shell / layout | 59–60% |
| Shield terminal | 58–61% |
| VLM AI risk brain | 47–50% |
| VLM visual brain / motion | 55–59% |
| Data / API spine | 35–36% |
| Legal / launch safety | 62–64% |
| Mobile polish | 42–45% |
| Full translations | 45–48% |
| Clothing commerce readiness | 60–63% |
| Whole brand/site launch-ready | 63–65% |

## Limitation
This still is not a true WebGL/Three.js 3D brain. PASS128 makes the current system controllable and safer. A true game-like 360 brain should be a separate WebGL/Three pass.
