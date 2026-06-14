# PASS1975 — wide bug sweep: header surfaces, mail drawer, routes, overlay visibility

## Scope
Szeroki sweep po błędach typu: klik i nic, overlay przyciemnia ale panel znika, dropdown ukryty pod headerem, koszyk/warstwa źle pozycjonowana, brakujące importy i martwe linki.

## Fixed
- Hardened header mail action: real `CustomEvent("velmere:open-mail")`, visible trigger metadata and `data-testid`.
- Added private mail drawer `surfaceId="velmere-private-mail-drawer"` and stronger open confirmation on the next animation frame.
- Added PASS1975 CSS hardening for header triggers, language/wallet/account dropdowns, main menu drawer, private mail drawer and cart full-height sheet.
- Fixed broken Research Lab back link from `/vlm` to existing `/vlm-token` route.
- Re-ran import and route static sweeps: no unresolved local imports and no missing local route hrefs.

## Verification
- `node scripts/check-i18n.mjs` — PASS
- `node scripts/vercel-preflight.mjs` — PASS
- `node scripts/verify-pass1934-1973-runtime-click-proof.mjs` — PASS
- TypeScript syntax transpile check for modified TSX files — PASS
- PASS1975 custom verifier — PASS

## Notes
Full `npm run build` was not executed in this container because dependencies are not installed here and the project expects Node/npm versions from `.nvmrc`/`package.json`.
