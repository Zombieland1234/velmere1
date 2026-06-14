# PASS1995 — Visual Logic Lock + Quote/Logo Fallback Sweep

## Implemented
- Added explicit PASS1995 modal/window markers to the shared Shield/Real Markets asset modal.
- Added final CSS lock for five real popup windows: asset header, price/risk/confidence strip, timeframe strip, chart window and three right-side action windows.
- Added stricter desktop no-scroll sizing with mobile-only controlled internal scroll.
- Added quote fallback logic in Real Markets so venue/proxy assets can request native/public proxy symbols instead of showing immediate empty states.
- Added expanded manual alias matching for major equities and exchange/native token searches.
- Added API support for MX, OKB, MNT and exchange proxy ids.
- Expanded local logo fallback set for major stocks/exchanges and updated the logo resolver map.
- Added PASS1995 verifier and package script.

## Checks run
- npm run verify:pass1995-visual-logic-lock — OK 14/14
- npm run check:i18n — OK
- npm run vercel:preflight — OK
- npm run verify:pass1934-1973-runtime-click-proof — OK 20/20
- npm run verify:pass1994-final-visual-logic-sweep — OK
- npm run verify:pass1993-visual-qa-polish — OK

## Not run
- Full Next build/typecheck was not run because this ZIP workspace does not include node_modules.
