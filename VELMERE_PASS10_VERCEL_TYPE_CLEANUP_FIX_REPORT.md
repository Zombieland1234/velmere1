# Velmère Pass 10 — Vercel type cleanup fix

## Build error fixed

Vercel failed after successful compilation during the type/lint phase:

- `components/shop/ProductDetailClient.tsx:99:13`
- `Type error: Argument of type '() => () => boolean' is not assignable to parameter of type 'EffectCallback'.`

The reason was a React `useEffect` cleanup returning the result of `window.dispatchEvent(...)`. `dispatchEvent` returns a boolean, but React cleanup functions must return `void`.

## Changes

### `components/shop/ProductDetailClient.tsx`

Changed the cleanup from an implicit return:

```tsx
return () =>
  window.dispatchEvent(...);
```

to an explicit void cleanup:

```tsx
return () => {
  window.dispatchEvent(...);
};
```

### `components/square/VelmereSquareClient.tsx`

Applied the same explicit cleanup pattern to the Square Angel visibility effect, so Vercel does not catch the same error later on another route.

Also normalized the close-panels cleanup to a block body for consistency.

## Verified locally

- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK
- Static scan: no `return () => window.dispatchEvent(...)` or multiline implicit cleanup remains.

## Notes

Full `next build` could not be completed inside this sandbox because `npm install` repeatedly exceeded the available execution time. The exact Vercel-reported TypeScript error was fixed directly in the affected file and the same pattern was patched in Square as a preventive fix.
