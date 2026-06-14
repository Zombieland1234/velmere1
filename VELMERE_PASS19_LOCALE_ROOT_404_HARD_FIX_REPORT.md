# Velmère Pass 19 — Locale Root 404 Hard Fix

## Problem
Vercel deployment was Ready, but opening `/pl` showed the global 404 card. That means the build was valid, but the locale-root route was not being resolved reliably at runtime.

## Fix
- Hardened `app/[locale]/layout.tsx` with explicit locale validation.
- Added `unstable_setRequestLocale(locale)` in the locale layout.
- Passed `locale={locale}` into `NextIntlClientProvider`.
- Hardened `app/[locale]/page.tsx` so `/pl`, `/en`, and `/de` explicitly render `HomePageClient`.
- Added preflight guards so `/pl` cannot silently lose its locale home route again.

## Important operational note
If a Vercel domain still shows 404 after this patch, confirm that you are opening the newest deployment URL from the **Visit** button and not an older alias/project like `velmere-store-ten.vercel.app` when the active production domain is different.
