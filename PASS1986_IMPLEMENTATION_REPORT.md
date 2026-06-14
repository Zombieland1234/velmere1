# PASS1986 — list continuation: nested wallet clipping + dropdown lag audit

## Scope
Continues the user's QA list after PASS1985. This pass focuses on issues that can still create the feeling of lag or "button works but panel is not visible":
- Wallet `Other Wallets` flyout being clipped by the header wallet dropdown frame.
- Dropdown position recalculation listening to every nested scroll container in capture phase.
- Old global `contain: paint` / `overflow-hidden` rules hiding nested panels that are supposed to fly left/right.
- Native scroll feel around modals, Square, cart, and command surfaces.

## Main changes
1. Header wallet nested panel is no longer clipped.
   - `#velmere-header-wallet-menu` uses `velmere-wallet-dropdown-surface` and `overflow-visible`.
   - The wallet body uses `velmere-wallet-dropdown-body` and keeps the nested panel visible.
   - Header wallet still opens `Other Wallets` to the left.

2. Wallet option root now has explicit runtime markers.
   - `wallet-connect-options-root`
   - `data-pass1986-wallet-options-root="safe-nested-other-panel"`
   - `data-pass1986-wallet-other-panel="unclipped-nested-directional"`

3. Dropdown scroll listener micro-lag reduced.
   - `DropdownRoot` no longer registers `window.addEventListener("scroll", ..., true)`.
   - It uses passive window/visualViewport listeners instead of capture-phase nested scroll listeners.
   - This avoids recalculating language/wallet/account dropdown positions during unrelated modal/Square/cart scrolling.

4. CSS final override for nested wallet panels.
   - Removes clipping from header wallet dropdown.
   - Keeps left/right panel direction.
   - Adds mobile fallback so the nested panel drops below the wallet frame instead of leaving the viewport.

5. Scroll hygiene.
   - Restores native `scroll-behavior:auto` and touch momentum for modal scroll regions, cart, Square comments and luxury scrollbars.
   - Adds a chart pointer-hygiene marker for asset modal chart panels.

## Verification
- `node scripts/verify-pass1986-list-continuation-audit.mjs` — OK, 12/12
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- alias import scan — OK
- TSX syntax grep on changed files — no syntax-only TS errors found; remaining errors are expected missing dependency/type errors without `node_modules`.
