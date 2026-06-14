# VELMERE PASS 127 — Chart Clean Surface + Motion Lite

## Base
Built on PASS 126.

## Implemented

### 1. Clean chart surface
Updated:
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`

Removed visible chart debug UI:
- `drag chart · history`,
- `older`,
- `newer`,
- `latest`,
- lower duplicate history pill.

Chart drag/pan remains available, but without developer-looking labels.

### 2. Removed right-panel decorative rails
The two empty-looking rails under the right action panel were removed.

### 3. VLM motion-lite performance pass
Changed:
- default motion starts lower,
- CPU/memory/viewport detection is stricter,
- auto orbit state loop moved from high-frequency RAF to low-cadence interval,
- dragging still refreshes the orbit immediately,
- canvas node/packet counts were lowered,
- max animation lifetime was shortened.

### 4. Guard updates
Updated:
- `scripts/verify-vlm-brain-performance.mjs`
- `scripts/vercel-preflight.mjs`

Guards now require:
- no visible chart debug controls,
- motion-lite markers,
- ultra-capped packet/node counts,
- `window.setInterval`,
- `document.visibilityState`,
- `lite render`.

### 5. Detailed progress matrix
Added:
- `docs/progress/PROJECT_PROGRESS_SURFACE_MATRIX_PASS127.md`
- `docs/launch/CHART_CLEAN_MOTION_LITE_PROTOCOL_PASS127.md`

## Validation
Passed:
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
- old bad terms: 0

## Progress after PASS127

| Area | Progress |
|---|---:|
| Home / brand landing | 55–58% |
| Clothing collection page | 63–66% |
| Product card system | 66–69% |
| Product detail pages | 61–65% |
| Checkout / fulfilment | 25–30% |
| Shipping / returns / legal pages | 60–64% |
| VLM token/access page | 45–50% |
| Velmère Square/community | 35–42% |
| Shield market table | 58–61% |
| Shield token modal/chart | 59–62% |
| VLM visual brain | 53–57% |
| VLM AI risk brain | 47–50% |
| Operator AI Case File | 48–52% |
| Evidence export | 22–28% |
| Data/API spine | 35–36% |
| Mobile performance | 40–43% |
| Full PL/EN/DE translations | 45–48% |
| Launch safety / RegTech copy | 61–63% |
