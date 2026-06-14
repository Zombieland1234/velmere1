# PASS1993 — visual QA modal / sorting / typography polish

## Done
- Added PASS1993 modal marker and visual QA CSS layer.
- Tightened Shield + Real Markets asset modal into a stronger no-scroll desktop stage.
- Strengthened separate windows: header, price/risk/confidence strip, chart window, and three action windows.
- Removed remaining glassy/translucent feel from asset modal, wallet panel, main menu, cart and private note surfaces.
- Shortened Basic / Pro / Advanced meta copy so cards do not look cramped or broken in Polish/German/English.
- Reduced asset header logo shadow/ring clutter so BTC/Apple/Alphabet headers look cleaner.
- Strengthened Shield sort header pointer/click treatment.
- Kept Real Markets small chart column and tightened table width.
- Registered a PASS1993 verifier script in package.json.

## Verification run
- npm run verify:pass1993-visual-qa-polish — OK
- npm run check:i18n — OK
- npm run vercel:preflight — OK
- npm run verify:pass1934-1973-runtime-click-proof — OK 20/20

## Still needs live browser confirmation
- Exact perceived smoothness of menu close/open on the user's machine.
- Final visual judgement of asset modal spacing at 1920x1080 and at lower laptop heights.
- Full logo coverage for every Real Markets ticker beyond the major local SVG set.
