# PASS1984 — list continuation: popup polish, clean charts, command screens, lag cleanup

## Scope
Continuation of the user's checklist after PASS1983. This pass focused on improving the things already mentioned but not fully finished:
- five-piece Shield / Real Markets asset popup direction,
- contained VLM Brain behavior,
- clean charts without noisy labels/text in the asset popup,
- tri-state table sort alignment,
- Browser and Shield Map command-screen look,
- slower / lighter overlay animations,
- Square modal scroll and comment surface stability,
- further cleanup of lag-prone overlay styling.

## Implemented

### 1. Unified asset popup
- Added `data-pass1984-five-piece-final` to `UnifiedAssetModalShell`.
- Added final markers for the target structure: coin/title header, price/risk/confidence strip, chart panel, three depth cards and contained VLM Brain.
- Added PASS1984 CSS shaping the asset popup closer to the user's sketch.

### 2. Shield chart clean mode
- Added `cleanChrome` support to `PopupMarketChart`.
- Shield asset popup now passes `cleanChrome`.
- Text overlays, evidence rail, toolbar and hover tooltip text are hidden in clean popup mode.
- The chart remains interactive, but the popup no longer shows debug/source text on the chart surface.

### 3. VLM Brain contained mode hardening
- Added PASS1984 contained marker to the asset analysis overlay.
- CSS keeps contained VLM Brain inside the asset modal and prevents full-screen takeover behavior.

### 4. Tables and tri-state sort
- Added explicit `data-sort-key` and `data-pass1984-tristate` markers for Shield and Real Markets.
- Centered sort headers and risk cells.
- Strengthened Real Markets grid widths for price, market cap, volume and risk alignment.

### 5. Browser + Shield Map command screen
- Shield Map quick actions reduced to 3 items: BTC / ETH / SOL.
- Browser and Shield Map receive stronger command-screen CSS: black background, centered search, title, three pills, less dense surrounding UI.

### 6. Overlay and animation lag cleanup
- Added PASS1984 overlay variables and CSS for slower, lighter menu/cart/mail/dropdown/wallet transitions.
- Removed heavy backdrop blur from major overlay surfaces via final CSS override.
- Added contain/backface/will-change hints to reduce animation jank.

### 7. Square modal and scroll polish
- Reasserted centered Square modal surface.
- Added stable scrollbar gutter and internal scroll behavior on Square and modal scroll regions.
- Comments surface is darker/cleaner, with less grey frame feel.

## Verification
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- `node scripts/verify-pass1983-list-polish-audit.mjs` — OK, 23/23
- `node scripts/verify-pass1984-list-continuation-audit.mjs` — OK, 18/18
- alias import scan — 0 missing local alias imports
- changed TSX syntax scan via global `tsc` produced only expected missing dependency/type noise because the ZIP has no `node_modules`.

## Remaining QA after browser test
- exact modal pixel feel on the user's machine,
- final animation duration taste for menu/cart/wallet,
- any remaining scroll-lock edge cases on Square and asset modals,
- deeper duplicate CSS cleanup after visual QA confirms the final selectors.
