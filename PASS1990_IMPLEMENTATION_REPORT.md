# PASS1990 — Clean Runtime UI / Separate Asset Popup Windows

Scope: user-reported visual/runtime bugs around Shield, Real Markets, Lens, Shield Map, menu/cart/mail/wallet and asset modals.

## Implemented

- Restored Shield table header interactivity by overriding the legacy `pointer-events: none` rule on tri-state sort headers.
- Reworked unified Shield / Real Markets asset modal into a clean separated layout:
  - separate asset header window,
  - separate price/risk/confidence metrics strip,
  - one large clean chart window,
  - three separate Basic / Pro / Advanced windows on the right with join animation.
- Removed the PASS1989 “all in one top row” behavior and moved analysis actions back to the right side.
- Reduced stacked ring / multi-window noise through the PASS1990 modal CSS layer.
- Made main menu, cart, wallet dropdown and private mail drawer visually more opaque and cheaper to animate by removing heavy backdrop blur from those surfaces.
- Added animated typewriter headline on Velmère Lens command search.
- Hid the Lens PDF capsule until a result exists so the empty search screen is cleaner.
- Rounded Shield Map / Lens / Real Markets suggestion panels and removed square gold focus-box feel.
- Started Real Markets on Stocks instead of All and removed All/Crypto category buttons from the public category rail.
- Mapped venue-health exchange rows to native quote symbols where useful:
  - Binance / BNB → `BNB-USD`
  - MEXC / MX → `MX-USD`
  - OKX / OKB → `OKB-USD`
  - Bybit / MNT → `MNT-USD`
- Updated venue detection so native quote symbols do not break exchange-health analysis.
- Recolored wallet SVG assets for MetaMask and Phantom so they no longer look like generic Velmère-gold placeholder icons.
- Fixed duplicate `style={pass628LayerStyle("listbox")}` typo in Real Markets search popover.

## Verified

- `node scripts/verify-pass1990-clean-runtime-ui-audit.mjs` — OK 14/14
- `node scripts/verify-pass1989-clean-asset-modal-audit.mjs` — OK 14/14
- `node scripts/verify-pass1988-list-continuation-audit.mjs` — OK 13/13
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK

Full `next build` was not run because the ZIP workspace has no `node_modules`.
