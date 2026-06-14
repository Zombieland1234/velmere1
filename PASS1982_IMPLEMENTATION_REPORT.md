# PASS1982 — Deep UI runtime audit + lag cleanup

## Scope
Continued from PASS1981 with a stricter audit for the issues reported in live screenshots:
- laggy menu/cart/wallet drawers,
- overlay/backdrop visible while the surface feels delayed or missing,
- Square post modal not centered and scroll jumping after close,
- repeated delayed open logic,
- duplicated pointer close paths,
- heavy blur/backdrop cost,
- asset modal polish toward the 5-piece visual target.

## Root causes found
1. `Navbar` still had delayed hard-open replays (`requestAnimationFrame` + `setTimeout`) for header surfaces.
   - These protected against old invisible-dropdown bugs, but after the OverlayPrimitives repair they became stale delayed work.
   - On weaker/browser-heavy sessions this can feel like menu/cart lag or state racing.

2. `ModalRoot` backdrop used both `pointerdown` and `click` close paths.
   - One user gesture could close twice.
   - This is small, but multiplied across modals it can cause weird scroll/focus effects.

3. `.velmere-header-safe-modal` had old fixed-modal positioning rules with `transform: translate(-50%, -50%)`.
   - New `ModalRoot` already centers the surface with a portal wrapper.
   - The old transform then shifted Square and other modals away from true center.

4. Overlay surfaces and command shells still used strong blur/backdrop layers.
   - This creates GPU work during drawer enter/exit animation and can cause visible lag.

5. Square modal scroll restoration was too shallow.
   - It restored once, while scroll-lock/focus/animation could still move the page afterwards.

## Changes
- Header surface open is now one synchronous state commit: no delayed RAF/timeout replay.
- Modal backdrop now closes once from pointerdown only.
- Drawer/dropdown/modal transitions are slower but lighter.
- Added PASS1982 CSS cleanup block:
  - neutralizes legacy modal transforms inside portal modals,
  - lowers backdrop blur cost,
  - adds `contain: layout paint` to overlay surfaces,
  - keeps cart full height,
  - improves five-piece asset modal layout,
  - keeps contained VLM Brain bounded in the popup,
  - cleans chart chrome inside asset popups,
  - improves Square modal centering/comments/scroll behavior,
  - adds reduced-motion safety.
- Square close now restores scroll across multiple animation frames with smooth scrolling temporarily disabled.

## Verification
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- `node scripts/verify-pass1981-ui-runtime-repair.mjs` — OK
- `node scripts/verify-pass1982-deep-ui-runtime-audit.mjs` — OK
- Alias import scan — OK

## Remaining QA for browser
Needs live click testing on localhost/Vercel:
- exact animation feel of menu/cart/wallet on the user's machine,
- final pixel polish of the Shield/Real Markets five-piece popup,
- Shield Map search cleanup if older dense layout still fights the new command shell,
- any page-specific scroll containers still blocking middle-click/drag-scroll.
