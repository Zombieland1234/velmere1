# PASS473 — Vercel Type Gate + Hook/A11y Hotfix

## Fixed
- Removed the duplicate `boundary` property collision in the AI Human Copy API response.
- Kept the explicit public AI safety boundary while preserving the engine payload.
- Stabilized `AssetLogo` memo/effect dependencies.
- Replaced the complex image-candidate effect dependency with a stable key.
- Converted Real Markets search input to the correct ARIA combobox pattern.
- Replaced complex Cross Asset effect dependencies with stable provider-symbol keys.
- Removed the missing `rows` and `selected` hook dependency warnings without introducing render loops.

## Expected build impact
The blocking TypeScript error from `ai-human-copy/route.ts` is removed. The four warnings shown immediately before that error are also addressed.
