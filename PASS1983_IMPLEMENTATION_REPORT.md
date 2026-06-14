# PASS1983 — user-list polish and runtime cleanup audit

## Scope
Continuation from the user's bug list, focused on the areas that were still incomplete after PASS1981/PASS1982:
- Shield / Real Markets asset popup should keep moving toward the user's 5-piece sketch.
- Basic / Pro / Advanced should keep VLM Brain contained inside the asset modal.
- Menu / drawer / wallet / dropdown animations should be calmer and less laggy.
- Wallet UI should show MetaMask + Phantom + Other Wallets first, with more original-inspired marks and predictable left/right nested panel direction.
- Browser and Shield Map should move toward a clean ChatGPT-like command screen.
- Square post modal should stay centered and restore scroll without jump.
- Repeated runtime close-event wiring and old overlay-style duplication should be reduced.

## Main changes
1. **Shield runtime close cleanup**
   - Replaced repeated `window.addEventListener` / `removeEventListener` / `dispatchEvent` blocks with one `SHIELD_RUNTIME_CLOSE_EVENTS` array.
   - Added the previously imported `PASS418_RUNTIME_CLOSE_EVENT` to the runtime close event set.
   - This removes a large repeated block and lowers the chance of missing one pass event in the future.

2. **Five-piece asset popup direction**
   - Added explicit PASS1983 markers to the unified asset modal shell.
   - Added CSS for the target layout: icon box, price/risk/confidence readout strip, large chart block, and right-side Basic/Pro/Advanced rail.
   - Basic/Pro/Advanced rail now has a clear fly-in animation marker and keyframes.

3. **Contained VLM Brain safety**
   - Added contained/fullscreen data markers to `VlmNeuralAuditExperience`.
   - Contained VLM mode now avoids acting like a top-level modal via `aria-modal={false}`.
   - CSS overrides the older high `z-index` neural-root rule when the brain is contained, so Shield/Real Markets analysis stays inside the popup.

4. **Chart scroll / lag cleanup**
   - Removed unconditional `preventDefault()` from the unified asset chart wheel capture.
   - Normal wheel movement is less likely to feel blocked; modifier-key wheel still remains available for zoom-style behavior.

5. **Wallet UI cleanup**
   - `Other Wallets` now toggles open/closed instead of only opening.
   - Added explicit PASS1983 markers for side direction.
   - MetaMask and Phantom marks were upgraded to more recognizable original-inspired SVGs.

6. **Browser and Shield Map command-screen polish**
   - Shield Map got `shield-map-command-page`, `shield-map-command-center`, `shield-map-unified-search-shell`, and `shield-map-command-pills` hooks.
   - Browser got a PASS1983 command-screen marker.
   - CSS centers the command shell and visually lowers older dense helper blocks.

7. **Square post modal and scroll stability**
   - Added a scroll-restore ticket guard to stop stale restore calls from fighting newer interactions.
   - Temporarily disables smooth scroll on `html` and `body` while restoring the exact pre-modal position.
   - Reinforced that BodyPortal already centers the Square modal, so old `left/transform` offset behavior is neutralized.

8. **Animation timing**
   - Slowed dropdowns and drawers in `OverlayPrimitives` to feel calmer instead of snapping/lagging.
   - CSS keeps overlays contained for less repaint cost.

## Verification
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- `node scripts/verify-pass1982-deep-ui-runtime-audit.mjs` — OK
- `node scripts/verify-pass1983-list-polish-audit.mjs` — 23/23 OK
- alias import scan — 0 missing local alias imports

## Remaining live QA
Needs browser click testing on the user's machine:
- exact feeling of the slower menu/cart/wallet animations
- exact pixel position of the Shield/Real Markets popup at the user's resolution
- whether the contained VLM Brain height feels right after real Basic/Pro/Advanced runs
- whether Square scroll restore is fully stable after opening/closing posts from many scroll positions
