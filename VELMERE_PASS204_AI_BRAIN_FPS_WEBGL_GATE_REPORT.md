# VELMERE PASS204 — AI Brain FPS Telemetry + WebGL Gate

## Summary

PASS204 improves the VLM AI Brain by adding real browser-side motion telemetry, pausing Orbit updates while a tile detail drawer is open, and formalizing a feature-gated WebGL/Three.js migration contract. The current DOM Orbit remains the production fallback.

## Changed files

- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `lib/market-integrity/vlm-brain-renderer-contract.ts`
- `lib/launch/master-build-areas.ts`
- `lib/launch/master-build-progress-delta-pass204.ts`
- `docs/progress/PASS204_AI_BRAIN_FPS_WEBGL_GATE.md`
- `docs/progress/VELMERE_MASTER_BUILD_MAP.md`
- `docs/progress/PROJECT_PROGRESS_LEDGER.md`
- `lib/launch/project-progress.ts`
- `lib/launch/site-page-audit.ts`
- `scripts/verify-pass204-ai-brain-fps-webgl-gate-safety.mjs`
- `scripts/vercel-preflight.mjs`
- `package.json`

## Validation

Run:

```bash
node scripts/verify-pass204-ai-brain-fps-webgl-gate-safety.mjs
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
npm run verify:pass204-ai-brain-fps-webgl-gate
npm run verify:shield-all
```

## Blockers

- Real browser FPS trace is still required.
- WebGL remains gated and unshipped until compared with DOM Orbit.
- Live data adapters and durable source registry remain production blockers.
