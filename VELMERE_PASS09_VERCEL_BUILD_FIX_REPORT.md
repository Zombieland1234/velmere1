# Velmère Pass 09 — Vercel build fix

## Fixed Vercel build error

Vercel failed during `next build` because ESLint treated a JSX text node containing `///` as a comment-like text node in `components/vlm/VlmBasicPolkadotLanding.tsx`.

Changed:

```tsx
{text} /// VLM ACCESS /// WALLET SAFETY /// PRIVATE DROPS ///
```

to a safe JSX string literal:

```tsx
{text}{" /// VLM ACCESS /// WALLET SAFETY /// PRIVATE DROPS ///"}
```

## Fixed warnings seen in Vercel log

- `components/account/ProfileAccountClient.tsx`: moved `lastNameChange` construction inside `useMemo` so the dependency list is stable.
- `components/vlm/VlmBuyAccessPanel.tsx`: copied `triggerRef.current` into `triggerNode` before effect cleanup to avoid stale ref cleanup warning.

## Verified

- `npm run check:i18n`
- `npm run vercel:preflight`
- source grep for known previous killers

Full `next build` still depends on installing all npm dependencies, but the exact Vercel blocking error from the log is fixed in source.
