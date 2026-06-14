# PASS1988 — list continuation: toggle safety, scroll ownership and lag cleanup

## Scope
Continues the user's visual/runtime checklist after PASS1987:
- header/menu/cart/wallet surfaces should not feel stuck or backdrop-only;
- chart/modal gestures should not block normal modal scrolling;
- Shield/Real Markets asset modal must stay in the five-piece architecture;
- Basic/Pro/Advanced should remain stable three-card actions;
- Real Markets confidence readout should be clean;
- overlay CSS should reduce paint clipping and lag instead of adding heavier blur layers.

## Changes
1. Header triggers are now toggle-safe.
   - Menu/language/wallet/account/cart close when the same trigger is tapped again.
   - Still keeps surfaces exclusive.

2. Modal scroll ownership repaired.
   - Global scroll lock no longer prevents normal wheel scroll over chart/brain gesture surfaces.
   - Modifier-wheel remains reserved for zoom/safety.
   - Touch pan can scroll the nearest modal-owned scroll region.

3. Real Markets popup readout polish.
   - Confidence now displays as `%` instead of `/100`.

4. Unified asset modal markers and CSS hardening.
   - Added PASS1988 markers for five-piece modal stability, chart wheel policy and stable depth dock.
   - Relaxed active-surface `contain: paint` to `contain: layout style` to avoid clipping nested wallet panels and contained VLM Brain.
   - Kept transitions slow and cheap: transform/opacity only for heavy shells.

5. Continued Square/scroll hygiene.
   - Owned scroll regions keep native scroll behavior.
   - Comments and modal regions avoid inherited grey/browser scroll styling.

## Verification
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- `node scripts/verify-pass1987-list-continuation-audit.mjs` — OK
- `node scripts/verify-pass1988-list-continuation-audit.mjs` — 13/13 OK
- Alias import scan — 0 missing
- Changed-file TS syntax check was run; only expected missing dependency/type errors appear because `node_modules` is not included.

## Remaining QA
Needs browser click testing on the user's machine for exact animation feel and any remaining pixel-level layout fixes.
