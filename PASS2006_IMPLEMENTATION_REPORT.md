# PASS2006 — broad home / dashboard / footer / cookie aesthetic logic sweep

## Scope
- Home/public storefront polish.
- Member dashboard polish.
- Footer link/card cleanup.
- Cookie consent low-lag / solid surface cleanup.
- CSS scoped QA lock and verifier.

## Main changes
- Added PASS2006 markers to Home, Dashboard, Footer and CookieConsent.
- Home page cards/sections now have pass-scoped premium window markers for solid surfaces, calmer hover and lower visual noise.
- Dashboard active states moved away from heavy gold blocks into cyan readout surfaces.
- Dashboard tabs keep `aria-current`, `aria-controls` and controlled region semantics.
- Footer link groups remain cards/pills instead of row-line lists; English nav now includes the Security link for parity with PL/DE.
- Cookie consent animation shortened, settings drawer shortened, focus/accent moved to cyan, top accent and icon moved away from gold block vibe.
- Added PASS2006 CSS for no-blur solid surfaces, no-row footer guards, cyan focus and reduced-motion guard.

## Validation
- `npm run verify:pass2006-broad-home-dashboard-footer-cookie-sweep` — OK 18/18
- `npm run verify:pass2005-broad-account-auth-checkout-mail-sweep` — OK 18/18
- `npm run verify:pass2004-broad-vlm-access-sweep` — OK 20/20
- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK

## Notes
- Full `next build` was not run because this zip workspace has no `node_modules` installed.
- Final visual 100% still needs live browser/screenshot confirmation.
