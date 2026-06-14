# Velmère PASS 149 — VLM Brain Explainer 2.0 + Advanced-only Orbit Guard

## Purpose
PASS149 continues the VLM brain cleanup after browser feedback.

## Main changes
- Orbit 360 is now hard-guarded to Advanced only.
- Basic and Pro cannot re-enable the heavy orbital scene.
- Advanced Orbit 360 is slower and smoother.
- Selected tile drawer is darker and more readable.
- Selected tile explanation now includes:
  - driver,
  - score read,
  - evidence needed,
  - next operator action,
  - operator question.
- Search suggestions now expose local/live/merged source state.
- Search suggestions show stronger token avatar/logo treatment.
- Suggestion dropdown has higher z-index and clearer action copy.

## Updated files
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `app/globals.css`
- `lib/launch/project-progress.ts`
- `lib/launch/site-page-audit.ts`
- `scripts/verify-vlm-brain-explainer-advanced-guard-safety.mjs`
- `scripts/verify-vlm-brain-orbit-cleanup-safety.mjs`
- `scripts/verify-vlm-motion-governor-safety.mjs`
- `scripts/verify-vlm-brain-performance.mjs`
- `scripts/vercel-preflight.mjs`
- `package.json`

## Behavior after PASS149
- Basic Analysis: static evidence cards, no heavy 3D load.
- Pro Review: static evidence cards, source/context view.
- Advanced Analysis: slow Orbit 360, click-to-explain tile system.
- Search: suggestions show token avatar/logo, table/live/merged source badge and scan action.

## Important boundary
This improves UX and explanation quality. It does not turn the risk score into financial advice and does not make safety promises.
