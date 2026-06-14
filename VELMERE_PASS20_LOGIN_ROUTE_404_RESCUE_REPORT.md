# Velmère Pass 20 — Login route false-404 rescue

## Problem
The Vercel deployment was `Ready`, most pages worked, but `/pl/login` displayed the Velmère locale 404 page. The login route exists in the source tree, so this is a false-404 route resolution/deployment safety issue rather than a missing visual component.

## Fix
- Updated `app/[locale]/[...missing]/page.tsx`.
- The catch-all fallback now rescues known auth aliases:
  - `/pl/login`
  - `/pl/sign-in`
  - `/pl/signin`
  - `/pl/logowanie`
  - and the same aliases for `/en` and `/de`.
- If Vercel, middleware, or a stale copied repository accidentally routes login into the catch-all fallback, it renders the real `LoginPage` instead of a false 404.

## Audit / prevention
- Added locale route smoke guards to `scripts/vercel-preflight.mjs`.
- Preflight now verifies critical locale route files exist, including login, account, cart, shop, clothing, Square, VLM, support and legal routes.
- Preflight also verifies the login fallback rescue remains in the catch-all route.

## Commands checked
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- zip integrity test

## Notes
This patch does not remove the global 404 page. It only prevents a known valid route like `/pl/login` from being falsely treated as missing.
