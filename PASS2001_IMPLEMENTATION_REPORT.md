# PASS2001 — broad visual logic Square sweep

## Focus
- Continue the requested whole-file sweep beyond Shield / Real Markets.
- Fix Square post modal visual logic: centered solid modal, two owned scroll regions, no page jump on close.
- Reduce blur/glass/lags in Square comment and composer surfaces.
- Add outside-click and Escape close behavior for comment menus.
- Add image upload size guard to avoid huge base64 previews causing UI lag.
- Keep warning toasts centered and red/solid.

## Changed files
- `components/square/VelmereSquareClient.tsx`
- `components/community/CommentThread.tsx`
- `app/globals.css`
- `scripts/verify-pass2001-broad-visual-logic-square-sweep.mjs`
- `package.json`

## Verification
- `npm run verify:pass2001-broad-visual-logic-square-sweep` — OK 10/10
- `npm run verify:pass2000-aesthetic-logic-final-live-lock` — OK 12/12
- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK
- CSS brace check — OK

## Notes
Full `next build` was not run in this ZIP workspace because `node_modules` is not included.
