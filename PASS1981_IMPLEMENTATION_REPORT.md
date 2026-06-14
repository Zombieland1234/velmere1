# PASS1981 — UI runtime popup + modal repair

## Scope
Focused on the bugs described from live localhost screenshots:
- Shield and Real Markets asset modal consistency.
- Basic / Pro / Advanced opening VLM Brain inside the asset popup instead of full-screen takeover.
- Chart clean mode without text overlays in the modal.
- Header wallet nested panel direction and reduced wallet list.
- Shield / Real Markets tri-state sort metadata and table alignment.
- Browser / Shield Map command-search visual direction.
- Square post modal centering, comments styling, and scroll-position restoration.
- Audit Watch no longer highlighting Security.
- Smoother, slower, lower-lag drawer/dropdown transitions.

## Main changes
1. Added `contained` mode to `VlmNeuralAuditExperience`.
   - Full page mode remains available.
   - Contained mode stops full-page scroll locking and renders inside the parent popup.

2. Embedded VLM Brain into Shield and Real Markets modal overlay slots.
   - Basic / Pro / Advanced now use the same modal space.
   - Real Markets and Shield share the same contained behavior.

3. Added clean chart chrome for Real Markets.
   - `AdvancedMarketChart` now supports `cleanChrome`.
   - Popup chart hides noisy chart text and source/evidence strips when clean mode is enabled.

4. Wallet connect cleanup.
   - Primary list remains MetaMask + Phantom.
   - `Other wallets` can open left/right depending on surface.
   - Header wallet opens Other list to the left; VLM/default surfaces open to the right.

5. Sorting and alignment.
   - Shield and Real Markets sort headers expose neutral/asc/desc state.
   - Shield table headers and numeric cells are centered/aligned better under their columns.

6. Browser command search.
   - Velmère Browser gets a centered, ChatGPT-like command shell with headline and quick pills.
   - Shield Map search is visually constrained/centered by shared CSS.

7. Square post modal.
   - Modal gets centered surface class.
   - Open/close remembers scroll position and restores it after closing.
   - Comments got dedicated styling hooks and cleaner dark/gold surface treatment.

8. Header active state.
   - `/security/audits` no longer also activates `/security` in desktop nav.

## Verification
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- `node scripts/verify-pass1981-ui-runtime-repair.mjs` — 18/18 OK
- alias import scan — OK
- changed TSX parse check via global `tsc` — no syntax errors found; only expected missing dependency/type errors because `node_modules` is not included in the ZIP.

## Remaining live QA
Requires browser click testing after install:
- exact animation feel of menu/cart/wallet on the user machine
- exact Shield Map search layout because that page has older dense layout layers
- final pixel polish of the five-piece asset modal layout
