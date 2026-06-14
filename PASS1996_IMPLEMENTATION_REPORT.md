# PASS1996 — aesthetic logic sweep

## Done
- Added PASS1996 markers to the unified asset modal so the structure is explicitly tracked as a viewport-locked five-window layout.
- Removed extra visible chrome from the outer Shield / Real Markets modal surface; the visible UI should now be the five dark cards, not a nested frame.
- Darkened modal backdrop and disabled blur on modal backdrop layers to reduce glass/lag and keep the background visually quiet.
- Hid the Real Markets desktop source-line clutter under the asset name while retaining source state in data attributes and modal details.
- Hardened fallback quote lookup by checking symbol, provider symbol, name, id and exchange keys, not just the raw display symbol.
- Reduced Shield Map gold focus-square styling in another remaining search/control location.
- Extended local logo fallback coverage with more large equities, venues, ETFs and market proxies.
- Added PASS1996 verifier and package script.

## Verified
- npm run verify:pass1996-aesthetic-logic-sweep
- npm run verify:pass1995-visual-logic-lock
- npm run verify:pass1994-final-visual-logic-sweep
- npm run verify:pass1993-visual-qa-polish
- npm run verify:pass1934-1973-runtime-click-proof
- npm run check:i18n
- npm run vercel:preflight

## Not run
- Full next build / typecheck was not run because this ZIP workspace does not include node_modules.
