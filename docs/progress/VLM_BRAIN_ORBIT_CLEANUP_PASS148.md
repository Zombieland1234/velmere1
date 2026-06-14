# Velmère PASS 148 — VLM Brain Orbit Cleanup + Search Logo Suggestions

## Purpose
PASS148 cleans up the VLM visual brain and Shield search UX based on live browser feedback.

## Main changes
- Removed the visible Lite motion option.
- Orbit 360 stays as the Advanced scene.
- Basic and Pro start as static/light evidence cards.
- Slowed the Advanced Orbit 360 motion.
- Reduced React orbit churn and heavy animation pressure.
- Made the selected tile panel darker and more readable.
- Added stronger tile-specific explanation copy.
- Removed the extra mode-guide text under the four popup metrics.
- Improved search suggestions with stronger token avatars, local metadata merge and z-index layering.

## Updated files
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `app/globals.css`
- `lib/launch/project-progress.ts`
- `lib/launch/site-page-audit.ts`
- `scripts/verify-vlm-brain-orbit-cleanup-safety.mjs`
- `scripts/verify-vlm-motion-governor-safety.mjs`
- `scripts/verify-orbit-layout-cleanup-safety.mjs`
- `scripts/verify-operator-copy-progress-safety.mjs`
- `scripts/vercel-preflight.mjs`
- `package.json`

## Behavior after PASS148
- Motion governor shows only:
  - Orbit 360
  - Static
- Basic/Pro:
  - no heavy 3D scene by default,
  - static evidence cards,
  - lighter first paint.
- Advanced:
  - slow Orbit 360,
  - stronger selected-card explanation,
  - dark detail drawer,
  - slower tile reveal and core flight.
- Search:
  - suggestions keep logos/avatar fallback,
  - remote results are enriched with local image/rank when possible,
  - suggestion panel floats above Shield cards.

## Important boundary
This pass improves the browser UX and clarity. It does not add new financial claims and does not change the underlying risk verdict into advice.
