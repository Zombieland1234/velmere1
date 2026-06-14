# Velmère PASS196 — Orbit 360 Final Runtime Hotfix + Home Locale Repair

## Scope
This pass fixes the runtime/UX issues reported from browser QA:
- Home page `locale is not defined` runtime crash.
- VLM overlay clipped by the token popup shell.
- Evidence Board still appearing in Basic/Pro/Advanced paths.
- Orbit 360 not behaving as the single view for Basic, Pro and Advanced.
- Mode guide popup being clipped behind the action panel/source panels.
- Source Spine / VLM disclaimer showing under mode descriptions.
- Chart drag direction reversed against the requested browser feel.
- Shield search suggestion fallback icons too weak.
- Cyan/gold glows escaping top-left corners of Shield panels.

## Implemented
- `HomePageClient.tsx` keeps a scoped `const locale = useLocale()` before JSX and passes it into `FullSurfaceReadinessIndex`.
- `TokenRiskModal.tsx` renders VLM overlay as a sibling of the popup shell, not inside the clipped shell.
- Basic, Pro and Advanced now hard-route to Orbit 360 only.
- Evidence Board is hidden/disabled from the public UI.
- Mode guide popup uses `createPortal(..., document.body)` so it stays above all panels.
- Source Spine and VLM disclaimer blocks are hidden during this modal flow.
- Chart drag uses the requested opposite direction.
- Search suggestions now include logo lookup plus glyph fallback for BTC/ETH/SOL/USDT/SOL and others.
- CSS PASS196 containment clamps the glow/pseudo elements inside Shield panels.

## Validation
- `node scripts/verify-pass196-orbit360-final-runtime-hotfix-safety.mjs` — PASS.
- `node scripts/verify-pass195-home-locale-runtime-hotfix-safety.mjs` — PASS.
- `node scripts/verify-pass194-orbit360-modal-lens-polish-safety.mjs` — PASS.
- `node scripts/vercel-preflight.mjs` — PASS.
- `node scripts/check-i18n.mjs` — PASS.

## Note about typecheck
`npm run typecheck` was attempted in the sandbox but failed because the extracted sandbox does not have the project dependency/type environment available (`next`, `react`, `node`, `stripe`, `wagmi`, etc. type modules missing). This is environment-level, not a PASS196-specific error from the patched files.
