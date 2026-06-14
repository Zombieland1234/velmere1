# Velmère PASS172 — Board Density Polish + Renderer Contract

## Scope
This pass continues VLM Brain polish after PASS171.

## Implemented
- Evidence Board now has density modes: sparse / focused / full.
- Sparse groups with 1–4 cards no longer look like a broken empty board; they use larger focused cards near the VLM core.
- Full board still uses ring layout, but card spacing is safer.
- Added `lib/launch/vlm-brain-renderer-contract.ts`.
- Renderer contract documents the active DOM Orbit 360, the DOM Evidence Board fallback and the future WebGL prototype lane.
- Added PASS172 guard and wired it into `verify:shield-all` and `vercel-preflight`.

## Important boundary
The WebGL prototype lane remains isolated and not imported into the public modal. DOM Orbit 360 remains the public runtime until measured browser QA proves a GPU renderer is needed.
