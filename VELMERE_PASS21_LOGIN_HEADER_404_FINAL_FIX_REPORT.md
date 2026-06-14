# Velmère Pass 21 — Login/Header 404 Hard Fix

## What was fixed

The remaining 404 issue was most likely caused by login/account navigation sometimes resolving as an unstable raw route or stale auth alias on Vercel. The app had `/[locale]/login`, but header/account links and preview-login redirects still relied on navigation helpers in some places. This pass makes auth routing explicit and resilient.

## Changes

- Header user icon now uses hard locale-prefixed anchors:
  - `/pl/login`, `/en/login`, `/de/login`
  - `/pl/account`, `/en/account`, `/de/account`
- Member dropdown console link now uses the same hard locale-prefixed account URL.
- Mobile menu account links do not get double-prefixed by `next-intl` when already using a hard locale URL.
- Login form preview/sign-in redirect now uses `window.location.assign("/{locale}/account")` instead of a shared router push.
- Square login CTA now uses `/{locale}/login` directly.
- AuthGate login CTA now uses `/{locale}/login` directly.
- Added root aliases:
  - `/login`, `/logowanie`, `/sign-in`, `/signin` → `/pl/login`
  - `/account`, `/konto`, `/member`, `/dashboard` → `/pl/account`
- Added locale aliases:
  - `/{locale}/logowanie`, `/{locale}/sign-in`, `/{locale}/signin` → `/{locale}/login`
  - `/{locale}/konto`, `/{locale}/member` → `/{locale}/account`
- Middleware now redirects auth aliases before handing the request to `next-intl`.
- Vercel preflight now guards against auth routes disappearing or header links falling back to raw `/login` / `/account`.

## Checked locally

- `node scripts/check-i18n.mjs` passed.
- `node scripts/vercel-preflight.mjs` passed.
- Static scan shows no raw `href="/login"`, `href="/account"`, or `router.push("/account")` remains in app/components/lib.

## Not run locally

Full `next build` was not run because this sandbox still does not have `node_modules`; Vercel will run `npm install && npm run build`.
