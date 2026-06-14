# Velmère Pass 22 — AuthGate local compile fix

## Fixed issue
Local `npm run dev` failed because `components/auth/AuthGate.tsx` declared `const locale` twice inside the same component:

- first as `const locale = useLocale();`
- then again as `const locale = useLocale() as "en" | "pl" | "de";`

This causes SWC/Next.js to stop compilation with: `the name locale is defined multiple times`.

## Changes
- Replaced the duplicate locale declarations with one safe pair:
  - `const rawLocale = useLocale();`
  - `const locale = (["en", "pl", "de"].includes(rawLocale) ? rawLocale : "pl") as "en" | "pl" | "de";`
- Kept `loginHref` locale-prefixed: `/${locale}/login`.
- Added a Vercel preflight guard to catch this exact duplicate-locale mistake in the future.

## Checks run
- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅
- Static grep for duplicate `const locale = useLocale` in `AuthGate.tsx` ✅

## Next local test
Run:

```bash
npm run dev
```

Then open:

```txt
http://localhost:3000/pl
http://localhost:3000/pl/login
http://localhost:3000/pl/account
```
