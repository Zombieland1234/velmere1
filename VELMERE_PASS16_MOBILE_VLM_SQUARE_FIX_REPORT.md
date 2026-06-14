# Velmère Pass 16 — Mobile VLM + Square modal repair

## Scope
This pass fixes mobile-only regressions reported from the live preview while preserving the desktop layout:

- VLM Basic/Pro switch was clipped/hidden by the Angel button on mobile.
- Square post modal could not scroll on mobile.
- Square post modal close control was not visible enough on mobile.
- Cart control in the mobile header needed clearer, always-visible treatment.
- Added extra preflight guards so these mobile regressions are easier to catch before Vercel deploy.

## Changed files

- `components/vlm/VlmModeSwitch.tsx`
- `components/square/VelmereSquareClient.tsx`
- `components/Navbar.tsx`
- `scripts/vercel-preflight.mjs`

## Key fixes

### 1. VLM Basic / Pro mobile switch

The floating VLM controls now use a centered mobile layout:

- `inset-x-4`
- `max-w-[15.5rem]`
- `justify-center`
- higher bottom offset above Angel
- desktop still uses the old right-side layout via `md:*` classes

This prevents the Basic / Pro control from being clipped on the right edge or hidden behind Angel.

### 2. Square mobile post modal scroll

The old code globally prevented `touchmove` / `wheel` while the modal was open. That stopped mobile scrolling inside the post modal. This pass removes that global touch block and lets the modal itself scroll with:

- `overflow-y-auto`
- `overscroll-contain`
- mobile full-height modal layout
- comment column with its own scroll area

### 3. Square close button on mobile

Added a fixed, safe-area aware close button inside the post modal:

- visible from the top on phones
- respects `env(safe-area-inset-top)`
- high z-index
- does not depend on scrolling down to the comments header

### 4. Mobile cart visibility

The header cart button keeps its mobile slot and is now more visually readable with stronger border/background/text contrast. This keeps the cart available on VLM pages and normal pages.

### 5. Preflight guards

`scripts/vercel-preflight.mjs` now checks:

- Square must not block `touchmove` / `wheel` globally.
- Square post modal must use `overflow-y-auto`.
- Square post modal must have a safe-area close button.
- VLM mobile Basic/Pro switch must be centered with `inset-x-4`.
- Navbar must keep a cart button with `ShoppingBag` and `Open cart`.

## Verification run

- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK

## Notes

I did not add heavy Three.js / GSAP changes in this pass. Those should stay for a later phase after mobile navigation, modals, cart, Vercel build stability, and core commerce are stable.
