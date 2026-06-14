# PASS1134–PASS1153 — Overlay Arbiter Runtime Gate

## Scope
This pass continues the runtime hardening after PASS1133. It targets the bugs reported around language dropdown visibility, cart/drawer collisions, asset modal overlays, Real Markets analysis visibility and Square modal stacking.

## Implemented
- Added a global `velmere:overlay-opening` event emitted by `DropdownRoot`, `ModalRoot` and `DrawerRoot`.
- Added fallback dropdown positioning when the anchor element is hidden or unavailable, covering mobile wallet/open-wallet cases.
- Cart now closes automatically when a non-cart modal/drawer opens.
- Header dropdowns now close when external modals/drawers open, but the main menu drawer is allowed to stay open while it opens itself.
- Shield custom asset modal now emits the same overlay opening event and has a stable shell id.
- Real Markets asset modal now has a stable `surfaceId` and explicit surface metadata.
- Square post modal and composer drawer now expose stable surface ids and surface metadata.
- Updated legacy modal verifier to accept the stronger fallback-positioning implementation.

## Verified
- `npm run verify:pass1134-1153-overlay-arbiter` — PASS 13/13
- `npm run check:i18n` — PASS
- `npm run vercel:preflight` — PASS, scanned 949 files
- `npm run verify:pass1114-1133-overlay-runtime-gate` — PASS
- `npm run verify:pass1094-1113-modal-header-cart-hardening` — PASS
- `npm run verify:pass1074-1093-modal-runtime-followup` — PASS
- `npm run verify:pass1054-1073-modal-bubbles-runtime` — PASS
- `npm run verify:pass1034-1053-final-runtime-cleanup` — PASS
- `npm run ci:vercel-install-dry-run` — PASS, Node 24.16.0 + npm 11.16.0, no ERESOLVE
- `npm run deploy:clean-zip` — PASS

## Still not honestly confirmed
- Full `npm ci` without sandbox timeout.
- Full `npm run typecheck`.
- Full `npm run lint`.
- Full `npm run build`.
- Real browser click QA.
- Vercel smoke test.

## Changed files
- `components/ui/OverlayPrimitives.tsx`
- `components/CartProvider.tsx`
- `components/Navbar.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `components/square/VelmereSquareClient.tsx`
- `scripts/verify-pass1074-1093-modal-runtime-followup.mjs`
- `scripts/verify-pass1134-1153-overlay-arbiter.mjs`
- `package.json`
