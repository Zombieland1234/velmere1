# Velmère PASS195 — Home Locale Runtime Hotfix

## Scope
Fixes the runtime crash:

`ReferenceError: locale is not defined` in `components/home/HomePageClient.tsx`.

## Fix
- Ensures `useLocale` is imported from `next-intl`.
- Ensures `const locale = useLocale();` is defined inside `HomePageClient()` before JSX.
- Keeps `<FullSurfaceReadinessIndex locale={locale} surface="home" />`.
- Adds a guard so this regression is caught by preflight.

## Files
- `components/home/HomePageClient.tsx`
- `scripts/verify-pass195-home-locale-runtime-hotfix-safety.mjs`
- `scripts/vercel-preflight.mjs`
- `package.json`
