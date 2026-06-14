# PASS1154–PASS1173 — Runtime overlay/mobile truth gate

## Scope
This pass targets real user-facing overlay failures instead of adding new product panels:

- header language / wallet / account dropdowns,
- hidden mobile wallet anchor fallback,
- menu drawer conflicting with open dropdowns,
- cart bottom sheet not fighting header/modal overlays,
- Lens preview / Square modal / unified asset modal regression checks.

## Changes

1. `DropdownRoot` now rejects unusable anchors, not only missing anchors.
   - Hidden `md:block` wallet anchors on mobile no longer produce zero-rect anchored panels.
   - The dropdown falls back to a visualViewport-aware safe position.

2. The main menu button now closes language / wallet / account dropdowns before opening the drawer.
   - Prevents layered header dropdowns staying above the menu.

3. Added `verify:pass1154-1173-runtime-overlay-mobile`.
   - Checks hidden-anchor fallback, visualViewport tracking, keyboard loop, cart bottom/right contract, Lens focus boundary, Square scroll regions and unified asset overlay slot.

4. Restored required Codex handoff markdown docs for `vercel:preflight`.
   - The files are markdown/text only, not source extensions.
   - Clean deploy ZIP still excludes docs/codex-handoff as runtime noise.

## Tests

Passed:

- `npm run verify:pass1154-1173-runtime-overlay-mobile`
- `npm run check:i18n`
- `npm run vercel:preflight`
- `npm run verify:pass1134-1153-overlay-arbiter`
- `npm run verify:pass1114-1133-overlay-runtime-gate`
- `npm run verify:pass1094-1113-modal-header-cart-hardening`
- `npm run verify:pass1074-1093-modal-runtime-followup`
- `npm run verify:pass1054-1073-modal-bubbles-runtime`
- `npm run ci:vercel-install-dry-run`
- `npm run deploy:clean-zip`

Attempted but not accepted as passed:

- Full `npm ci` under Node 24/npm 11 timed out in sandbox.
- A partial `node_modules` was created; `tsc` then hit a corrupted partial install (`csstype/index.d.ts`).
- Removed `node_modules` before packaging.

## Not claimed

Still not claimed until run on a machine without sandbox timeouts:

- full `npm ci`,
- full `npm run typecheck`,
- full `npm run lint`,
- full `npm run build`,
- real browser click QA,
- Vercel smoke test.
