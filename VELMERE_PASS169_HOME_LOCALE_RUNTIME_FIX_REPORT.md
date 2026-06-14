# Velmère PASS169 — Home Locale Runtime Fix

## Scope
Fix the runtime error reported in local `npm run dev`:

`ReferenceError: locale is not defined` at `components/home/HomePageClient.tsx`.

## Root cause
PASS165 added `<FullSurfaceReadinessIndex locale={locale} surface="home" />`, but `HomePageClient` only called `homeCopy(useLocale())` inline. That meant the `locale` variable did not exist in the component scope.

## Fix
- Add `const locale = useLocale();`
- Use `const copy = homeCopy(locale);`
- Keep `<FullSurfaceReadinessIndex locale={locale} surface="home" />`
- Add guard `verify:pass169-home-locale-runtime`
- Wire guard into `verify:shield-all` and `vercel-preflight`

## Validation boundary
This is a runtime-scope fix. It does not change VLM brain motion, search, evidence, storage or live feed behavior.
