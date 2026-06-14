# PASS1174–PASS1193 — Runtime click readiness follow-up

## Goal
Keep hardening the concrete bugs reported after the circular asset modal work: header dropdowns that look dead, wallet panels appearing from the wrong anchor, cart sheet conflicts, and Bubble/Real Markets modal regression risk.

## Implemented
- Made the header wallet trigger visible on mobile instead of relying on a hidden `md:block` anchor.
- Kept the wallet trigger icon-only on mobile and expanded to the address/connect label on desktop.
- Added `aria-label` and `title` to the wallet trigger so the mobile icon-only control remains accessible.
- Hardened `DropdownRoot` outside-click close so focus returns to the visible trigger if the anchor is usable.
- Added `data-velmere-surface-id` to dropdown surfaces for runtime QA and overlay arbitration debugging.
- Added `verify:pass1174-1193-runtime-click-readiness`.

## Tests run
- `npm run verify:pass1174-1193-runtime-click-readiness` — PASS 15/15
- `npm run check:i18n` — PASS
- `npm run vercel:preflight` — PASS, scanned 949 files
- `npm run verify:pass1154-1173-runtime-overlay-mobile` — PASS 15/15
- `npm run verify:pass1134-1153-overlay-arbiter` — PASS 13/13
- `npm run verify:pass1114-1133-overlay-runtime-gate` — PASS 14/14
- `npm run verify:pass1094-1113-modal-header-cart-hardening` — PASS 11/11
- `npm run verify:pass1074-1093-modal-runtime-followup` — PASS 15/15
- `npm run ci:vercel-install-dry-run` — PASS, Node 24.16.0 + npm 11.16.0, no ERESOLVE

## Still not claimed
- Full `npm ci` without sandbox timeout.
- Full `npm run typecheck`.
- Full `npm run lint`.
- Full `npm run build`.
- Real browser click QA.
- Vercel smoke test.
