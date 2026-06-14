# PASS1985 — list continuation: lag/runtime cleanup + popup reliability

## Scope
Continued the user's list after PASS1984, focusing on issues that can make the UI feel broken even when buttons technically work:
- stale delayed cart/menu operations,
- dropdown scroll lag,
- VLM Brain replay/contained modal reliability,
- Real Markets search clutter,
- five-piece modal polish,
- Square comments and scroll surface cleanup.

## Changes
1. **Cart runtime lag cleanup**
   - Removed delayed `requestAnimationFrame` and `setTimeout` confirmation writes from `CartProvider`.
   - Cart open is now single-phase: one forced state + one store write.
   - This avoids stale delayed events reopening or shifting the drawer after a user clicks menu/wallet/backdrop.

2. **Dropdown lag cleanup**
   - `DropdownRoot` no longer recalculates geometry directly on every captured scroll event.
   - Position updates are now requestAnimationFrame-throttled.
   - This targets language/wallet/account dropdown lag during scroll/animation.

3. **Contained VLM Brain reliability**
   - VLM analysis now resets elapsed/complete state when `symbol`, `name`, or `mode` changes.
   - Completion timeout is cleared on cleanup to avoid stale state writes.
   - Shield and Real Markets contained VLM instances now have symbol/mode keys so Basic → Pro → Advanced replay cannot reuse stale completed UI.

4. **Real Markets search cleanup**
   - Result list capped to 3 suggestions to match the user’s Browser/Shield command-surface rule.

5. **CSS polish**
   - Added PASS1985 surface hardening for menu/cart/mail/dropdowns/wallet nested panels.
   - Added five-piece modal separation: header/readouts/chart/depth/details feel like intentional cards.
   - Tightened contained VLM Brain inside the modal.
   - Square comments styled as dark premium cards instead of grey boxes.

## Verification
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- changed TSX syntax check via TypeScript transpile — OK
- alias import scan — 0 missing
- `node scripts/verify-pass1985-list-continuation-audit.mjs` — 10/10 OK

## Remaining QA
Needs browser testing on the user machine:
- exact animation feel of cart/menu after delayed timers were removed,
- Shield and Real Markets popup spacing at desktop/mobile widths,
- Square scroll restore in the live feed,
- final command-screen polish for Browser/Shield Map.
