# Velmère PASS157 — Big Package: VLM Side Rail + Home Copy + Build Guards

## Scope
This pass intentionally takes a larger batch than the previous micro-passes. It focuses on the visible Shield/VLM pain points and one homepage quality issue that could ship bad placeholder text.

## Implemented

1. **VLM readout layout changed to clean side rail**
   - Basic, Pro and Advanced now use a right-side evidence rail.
   - Advanced keeps the VLM 360/core concept but no longer relies on floating DOM cards around the brain.
   - This reduces visual chaos and should reduce frame drops because the card layer is stable and scrollable.

2. **Tile category filters added**
   - Added group chips: All / Risk / Liquidity / Holders / Signals / Sources / Access.
   - Chips actually filter visible tiles.
   - If the open drawer belongs to a filtered-out group, it closes automatically.

3. **Cleaner tile drawer behavior**
   - Drawer still opens from the side.
   - Clicking outside still closes it.
   - Drawer is positioned as a stable side panel on desktop and a bottom panel on mobile.

4. **Debug/motion controls removed from visible UI**
   - Performance/Cinematic/motion stack is hidden from the user-facing interface.
   - The engine still keeps performance guards internally.

5. **Shield containment tightened again**
   - More strict clipping for Shield panels, token popup, action panel and chart card.
   - Pseudo-glows are constrained to their own card area.

6. **Homepage literal placeholder cleanup**
   - Removed shipped `{copy.*}` placeholder strings from the homepage locale copy.
   - Fixed PL/DE/EN hero, launch, Shield and drop copy where placeholders were leaking.
   - Updated homepage launch ledger Shield Map progress to reflect current state.

7. **New guard**
   - Added `scripts/verify-pass157-large-ui-safety.mjs`.
   - Added `npm run verify:pass157-large-ui`.
   - Included it in `npm run verify:shield-all`.

## Validated

- `npm run check:i18n`
- `npm run repair:codex-handoff`
- `npm run vercel:preflight`
- `npm run verify:pass157-large-ui`
- `npm run verify:shield-all`

## Known remaining blockers

- Full `next build` still needs Vercel or a local environment with dependencies installed.
- Real live feeds are still not production-connected.
- Evidence export is structurally present, but production storage/source ledger still needs backend work.
- Mobile real-device FPS must be checked in browser, not only with static guards.
