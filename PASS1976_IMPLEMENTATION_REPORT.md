# PASS1976 — broad bug sweep

## Scope
Searched beyond the first header failures: header controls, overlay visibility, cart height/positioning, route/API type edges, PDF/Lens type edges, dashboard string safety and import integrity.

## Fixes
- Converted header actions to click-to-open semantics so menu/language/wallet/account/mail/cart cannot immediately cancel themselves in the same frame.
- Added PASS1976 markers and a real `data-testid` for the menu trigger, matching the other header buttons.
- Hardened CSS for menu, language dropdown, wallet dropdown, account dropdown, private mail drawer and full-height cart panel.
- Fixed Lens report visual QA to use the already-normalized `symbol` string instead of optional `result.symbol`.
- Fixed Real Markets API provider range typing: UI can still ask for `15m`, while the provider receives supported `1h` range.
- Fixed PDF route `tinyMeta` signature to accept optional text size/color arguments used later in the file.
- Normalized Dashboard info card values to strings to avoid unsafe optional wallet/body values.
- Normalized Shield rule watchlist parsing to string before split.

## Validation
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- `node scripts/verify-pass1976-broad-bug-sweep.mjs` — 23/23 OK
- TypeScript transpile check on changed TS/TSX files — OK
- Full `npm run typecheck` still cannot complete in this container because `node_modules` is not included. Remaining visible errors are mostly missing external types/modules (`next`, `react`, `zustand`, `@types/node`, etc.) and JSX `key` noise caused by those missing React types.
