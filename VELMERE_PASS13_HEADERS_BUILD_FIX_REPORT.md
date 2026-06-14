# Velmère Pass 13 — HeadersInit / Vercel TypeScript Build Fix

## Fixed Vercel error
Vercel failed during `Linting and checking validity of types` at:

`./lib/hooks/useProfile.ts:35:5`

Reason: `previewHeaders()` returned a union where `x-velmere-preview-session` could be inferred as `undefined`, and `fetch(..., { headers })` requires a valid `HeadersInit` object with string values only.

## Code changes

### `lib/hooks/useProfile.ts`
- Changed `previewHeaders()` to `previewHeaders(): HeadersInit`.
- Builds a `Record<string, string>` first.
- Adds `x-velmere-preview-session` only when the preview session is active.
- No optional `undefined` header values remain.

### `lib/hooks/useSquarePosts.ts`
- Applied the same safe `HeadersInit` pattern proactively, because it used the same header helper pattern and would likely become the next Vercel type-check error.

### `scripts/vercel-preflight.mjs`
- Added a guard that blocks old untyped `function previewHeaders()` helpers.
- Added a guard against optional/undefined `x-velmere-preview-session` header patterns.

## Verified locally
- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅
- Static scan for old untyped `previewHeaders()` ✅
- Static scan for optional undefined preview session headers ✅

## Note
Full `next build` could not be executed in the sandbox because `npm install` timed out before dependency installation completed. The Vercel log error itself was directly fixed, and the same class of bug was patched in the Square posts hook before it could become the next failure.
