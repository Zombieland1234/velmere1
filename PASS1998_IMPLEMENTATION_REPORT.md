# PASS1998 — aesthetic logic final sweep

Scope: continue the requested per-message percent table workflow and move the latest UI bug list closer to final runtime proof.

Implemented:
- Added PASS1998 modal markers and CSS for a fixed viewport, no outer frame, five separate dark windows, tighter typography, and no desktop page-scroll chaos.
- Strengthened Shield and Real Markets sort click targets with stopPropagation and explicit data markers.
- Changed AssetLogo so fallback glyph text is not rendered under/over a real logo while an image candidate exists.
- Extended local logo fallback coverage to all currently visible Real Markets symbols found by static scan, including major crypto, luxury/EU tickers, indices, FX pairs, and commodities.
- Reduced overlay runtime durations and added PASS1998 low-lag markers for dropdown/modal/drawer surfaces.
- Added PASS1998 verifier script and package script.

Validation:
- npm run verify:pass1998-aesthetic-logic-final-sweep
- npm run verify:pass1997-syntax-visual-logic-lock
- npm run verify:pass1996-aesthetic-logic-sweep
- npm run verify:pass1995-visual-logic-lock
- npm run verify:pass1934-1973-runtime-click-proof
- npm run check:i18n
- npm run vercel:preflight

Build note: full Next build still requires installing dependencies/node_modules in a real workspace.
