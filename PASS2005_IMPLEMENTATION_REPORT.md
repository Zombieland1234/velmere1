# PASS2005 — broad account / auth / checkout / private mail sweep

## Scope
- Account profile editor
- Auth / sign-in form
- Checkout status page and checkout readiness banner
- Floating private mail drawer
- Global CSS QA locks
- Static verifier and package script

## Implemented
1. Account profile editor is now marked with `data-pass2005-account-profile="solid-cyan-focus-no-row-lines"` and uses a solid dark surface with calmer cyan focus states instead of gold focus blocks.
2. Auth form is now marked with `data-pass2005-auth-form="solid-cyan-focus-no-heavy-blur"`; wallet choices use low-lag card hover and cyan focus, with heavy gold/glass reduced.
3. Checkout page has `data-pass2005-checkout-page="solid-cards-no-row-lines-cyan-focus"`; status and matrix items are solid cards, not row-line/table noise.
4. Checkout readiness banner now uses a solid cyan no-glass marker.
5. Private mail drawer now locks background scroll, uses `pass2005: "solid-owned-scroll-file-guard"`, fast pointerdown close, owned scroll, and 5 MB attachment guard.
6. Added PASS2005 global CSS to lock these surfaces to solid dark/cyan, remove blur/glass, stabilize scroll, and reduce motion.
7. Added `scripts/verify-pass2005-broad-account-auth-checkout-mail-sweep.mjs` and `verify:pass2005-broad-account-auth-checkout-mail-sweep` script.

## Checks run
- `npm run verify:pass2005-broad-account-auth-checkout-mail-sweep` — OK 18/18
- `npm run verify:pass2004-broad-vlm-access-sweep` — OK 20/20
- `npm run verify:pass2003-broad-lens-audit-sweep` — OK 14/14
- `npm run verify:pass2002-broad-commerce-nav-wallet-sweep` — OK 12/12
- `npm run verify:pass2001-broad-visual-logic-square-sweep` — OK 10/10
- `npm run verify:pass2000-aesthetic-logic-final-live-lock` — OK 12/12
- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK

## Build note
Full `next build` was not run in this ZIP workspace because `node_modules` are not included.
