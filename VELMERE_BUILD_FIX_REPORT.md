# Velmère Build Fix Report

## Fix applied

The previous rebuild used fine-grained Tailwind color opacity modifiers such as `border-white/12`, `text-white/58`, and `bg-black/35`.

Tailwind's default opacity scale does not include all of those values, so `@apply` failed during compilation.

## Change

`tailwind.config.ts` now extends the opacity scale from `0` to `100`, allowing the existing premium design tokens to compile safely:

```ts
const opacityScale = Object.fromEntries(
  Array.from({ length: 101 }, (_, value) => [
    String(value),
    value === 100 ? "1" : String(value / 100),
  ])
) as Record<string, string>;
```

and:

```ts
theme: {
  extend: {
    opacity: opacityScale,
    ...
  }
}
```

## Verified

- `node scripts/check-i18n.mjs` passed.
- The specific compile blocker `border-white/12` is covered by the extended opacity scale.
- Similar classes such as `border-white/8`, `text-white/58`, `bg-black/35`, `hover:border-white/22`, etc. are also covered.

## Recommended local QA

Run:

```bash
npm install
npm run build
npm run dev
```

Then check:

- `/en`
- `/en/vlm-token`
- `/en/square`
- `/en/login`
- `/en/account`
- `/en/shipping`
- `/en/returns`
- `/en/terms`
- `/en/privacy`
- `/en/impressum`
- `/en/contact`
