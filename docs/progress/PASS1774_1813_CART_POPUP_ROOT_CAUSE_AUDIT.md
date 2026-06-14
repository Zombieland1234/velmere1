# PASS1774–1813 — Cart / Popup root-cause audit

## Why this pass exists
The cart and header popups were still reported as not appearing in runtime. Previous passes added visual markers, but the actual failure mode could still happen when persisted cart hydration was delayed, failed, or blocked by localStorage.

## Root cause fixed
- `CartProvider` no longer hides the cart drawer behind `hasHydrated`.
- `openCart`, `toggleCart` and `addItem` now force the cart UI into a usable state before opening.
- Persist hydration now has a catch/finally fallback, so a corrupted or unavailable localStorage cannot keep the cart invisible forever.
- `CartDrawer` now mounts after client mount even when persisted cart hydration is still pending.

## Popup / minimalism audit
- Header dropdowns keep body-portal rendering, anchor/fallback placement and a stronger z-index guarantee.
- Cart remains a bottom sheet only.
- The public Shield/Real Markets modal remains rectangular: chart + Basic / Pro / Advanced rail.
- Bubble/orbit public modal styles stay suppressed.

## Still not claimed
Full browser click proof still requires `npm ci -> build -> Playwright` on a machine without sandbox timeout.
