# PASS1979 — Full bottom-up runtime overlay audit

## User-reported root problem
- After PASS1978, menu and cart could degrade into a backdrop-only state: the page dimmed, but the actual panel did not reliably appear.
- Header/menu/cart felt laggy.
- Menu/cart/mail/wallet/language surfaces needed clearer outside-click close behavior.
- Asset popup Basic / Pro / Advanced must still launch VLM Brain, not only select a tier.

## Root causes found
1. **Cart double/triple open race**
   - `CartProvider` had document-level `pointerdown`, `click`, and `keydown` capture listeners for the header cart trigger.
   - The Navbar button also called `openCart()`.
   - One user gesture could trigger multiple open requests in the same frame, making the UI lag and increasing the chance of overlay cleanup racing with the panel mount.

2. **Cart initial pathname effect could close the drawer on mount**
   - `CartDrawer` closed the cart on the first pathname effect, not only on real route changes.
   - This could contribute to a “blink / backdrop only / nothing opened” feel during hydration or first interaction.

3. **Heavy scroll lock on lightweight header panels**
   - `DrawerRoot` always used full body fixed scroll-lock.
   - For menu/cart/mail this is overkill and can feel slow, especially with blur/backdrop layers.

4. **Backdrop close was click-only**
   - Backdrop close waited for click. Pointer down is faster and more reliable for “klikam gdziekolwiek i zamyka”.

5. **Legacy CSS had many competing overlay rules**
   - Multiple old PASS layers fought over top/header offsets, z-index and backdrop blur.
   - PASS1979 adds one final deterministic layer for menu/cart/mail/dropdowns at the end of `globals.css`.

## Changes made
- `OverlayPrimitives.tsx`
  - Added `lockScroll?: boolean` to `ModalRoot` / `DrawerRoot`.
  - Added pointerdown close on modal and drawer backdrops.
- `CartProvider.tsx`
  - Removed laggy document-level header cart pointer/click capture.
  - Cart now opens through actual React CTA, `addItem`, or custom cart events only.
- `CartDrawer.tsx`
  - Skips the initial pathname close effect.
  - Uses `lockScroll={false}` for lightweight drawer behavior.
- `Navbar.tsx`
  - Header surfaces now hard-open across current frame, next animation frame and a short 80ms confirmation.
  - Menu drawer uses `lockScroll={false}`.
- `FloatingMailWidget.tsx`
  - Mail drawer uses `lockScroll={false}`.
- `globals.css`
  - Added final PASS1979 overlay rules for menu, cart, mail, language, wallet and account popups.
  - Backdrops are lighter and full-screen so outside click works everywhere.
  - Menu/cart/mail surfaces are forced visible above backdrop with a single final z-index system.

## Verified
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- `node scripts/verify-pass1979-full-surface-audit.mjs` — 13/13 OK
- `node scripts/verify-pass1978-popup-brain-runtime.mjs` — OK
- `node scripts/verify-pass1977-broad-interaction-sweep.mjs` — OK
- local alias import scan — 0 missing

## Limitation
A full production build requires the project's Node 24.16.0 / npm 11.16.0 install. The container installation timed out before all dependencies finished, so this pass used deterministic static/runtime-contract checks rather than a full `next build`.
