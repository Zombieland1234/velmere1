# PASS1980 — full runtime overlay / stale-click audit

Scope: full ZIP audit for bugs similar to the reported menu/cart/dropdown problem: backdrop visible without panel, stale delayed opens, duplicated click events, heavy blur lag, panels hidden under z-index, and buttons that appear clickable but do not leave visible UI.

## Root causes found

1. Header hard-open confirmations were not guarded.
   - PASS1979 scheduled `requestAnimationFrame` + `setTimeout` to force visibility.
   - If the user clicked another surface before the delayed callback fired, the older callback could close/reopen the wrong state.
   - Symptom: menu/cart appears inconsistent, sometimes only backdrop or no panel.

2. Cart hard-open confirmations were not guarded.
   - CartProvider scheduled frame/timeout re-open confirmations.
   - If another overlay closed the cart, an older cart confirmation could reopen it immediately after menu/wallet/mail started.
   - Symptom: race between cart and menu/mail/wallet; lag and backdrop-only feeling.

3. Drawer backdrop used pointerdown + click close on the same gesture.
   - One outside click could run close twice.
   - With delayed hard-opens this made race conditions worse.

4. Header command drawers still used heavy blur on surfaces/backdrops.
   - User saw dark overlay and lag.
   - PASS1980 reduces backdrop blur and lowers surface blur to make menu/cart/wallet language popups feel lighter.

## Fixes

- Added `headerSurfaceTicketRef` in `Navbar.tsx`.
- Added `cartOpenTicketRef` in `CartProvider.tsx`.
- Delayed frame/timeout open confirmations now execute only when their ticket is still current.
- Closing the cart invalidates old cart open confirmations.
- Route changes invalidate old header surface confirmations.
- Removed manual cart `onKeyDown` double-open; native button keyboard click is enough.
- Drawer backdrop now closes once via pointerdown for command drawers.
- DrawerRoot detects light command drawers: menu, private mail, cart.
- Added PASS1980 CSS final override for lighter backdrop, lower blur, stronger surface/dropdown z-index.

## Verification

- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- alias import scan — 0 missing `@/` imports
- PASS1980 custom audit guards — OK

Full `next build` was not executed here because the uploaded ZIP does not contain `node_modules` and the container runtime is not the project-required Node/npm combo.
