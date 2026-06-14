# Velmère PASS168 — VLM Brain Static + Advanced Polish

## Scope
Deep VLM Brain / Shield terminal pass focused on premium brain UX, static board, Advanced Orbit 360 and click stability.

## Implemented
- Removed noisy top-left debug/HUD copy from the VLM brain and replaced it with a small premium chip.
- Rebuilt Static/Basic/Pro readout into a centered `shield-vlm-static-evidence-board` instead of a broken right-column rail.
- Advanced uses Orbit 360 cards again around the VLM core while Static uses a clean evidence board.
- Heavy canvas is disabled in the public Shield brain; WebGL/Three.js should stay a separate prototype lane if needed.
- Advanced orbit is slower: lower update cadence, smaller step size, calmer transform depth and scale.
- Removed Performance/Cinematic runtime UI from the public brain; only a compact Orbit/Evidence Board toggle remains for Advanced.
- Detail drawer keeps selected tile detail, driver, score read, evidence need, next operator action and source/confidence/mode.
- Search suggestions retain token avatars, source badges and a high z-index dropdown.
- Guard `verify:vlm-brain-static-advanced-polish` added to `verify:shield-all` and `vercel-preflight`.

## Files changed
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx` indirectly guarded, no large rewrite required
- `app/globals.css`
- `scripts/verify-vlm-brain-static-advanced-polish-safety.mjs`
- `scripts/vercel-preflight.mjs`
- `scripts/verify-vlm-brain-performance-runtime-safety.mjs`
- `scripts/verify-vlm-brain-explainer-advanced-guard-safety.mjs`
- `scripts/verify-vlm-motion-governor-safety.mjs`
- `scripts/verify-vlm-brain-performance.mjs`
- `scripts/verify-pass157-large-ui-safety.mjs`
- `package.json`
- `lib/launch/project-progress.ts`
- `lib/launch/site-page-audit.ts`
- `docs/progress/PROJECT_PROGRESS_LEDGER.md`

## Remaining blockers
- Real browser FPS still needs Vercel/device testing.
- Real holder/orderbook/contract/OSINT adapters remain production blockers.
- Durable DB/storage adapter and audit persistence remain P0.
- WebGL/Three.js lane is still only architectural next step, not implemented in public UI.
