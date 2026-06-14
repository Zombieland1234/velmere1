# Velmère Pass 18 — Vercel root 404 fix

## Problem
Deployment was successful, but opening the bare Vercel domain showed a Next.js 404.

## Cause
The app has locale routes under `app/[locale]/...`, but the root deployment path `/` had no explicit App Router page. If middleware does not redirect the Vercel preview iframe/root request, Next.js shows the default 404.

## Fix
- Added `app/page.tsx` with `redirect('/pl')`.
- Added `app/not-found.tsx` as a safe global fallback with links to `/pl` and `/en`.
- Added a Vercel preflight guard so future patches cannot remove the root locale redirect.

## Result
Opening the bare deployment domain should now redirect to `/pl` instead of showing 404.
