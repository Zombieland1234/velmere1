# PASS1094–PASS1113 · Modal / Header / Cart Runtime Hardening

## Scope
This pass continues from PASS1093 and focuses on the bug cluster reported by the user: asset popup experience, Real Markets Basic/Pro/Advanced visibility, language dropdown reliability, and cart bottom/right sheet behavior.

## Runtime changes
- Hardened `UnifiedAnalysisDepthDock` as a real keyboard toolbar for the Messenger-style Basic/Pro/Advanced bubbles.
- Added Arrow Left / Arrow Right / Arrow Up / Arrow Down / Home / End navigation across the bubble controls.
- Preserved Escape behavior so the modal/focus boundary owns close behavior and the bubble toolbar does not trap it.
- Marked the analysis overlay as an inner dialog with a live status and modal scroll region, so the VLM stage is clearly inside the active asset modal.
- Passed a close button ref from Real Markets into `UnifiedAssetModalShell`, matching Shield's focus-return behavior.
- Hardened anchored dropdown positioning with `visualViewport` tracking for mobile/browser UI movement.
- Added stable `data-velmere-overlay-trigger` anchors to language, wallet, account, and cart header buttons for focus-return resilience.
- Strengthened CSS for bubble focus, dropdown max viewport behavior, and cart bottom/right containment.

## Verified
- `npm run verify:pass1094-1113-modal-header-cart-hardening` PASS 11/11.
- `npm run check:i18n` PASS.
- `npm run vercel:preflight` PASS, scanned 949 files.
- `npm run verify:pass1074-1093-modal-runtime-followup` PASS 15/15.
- `npm run verify:pass1054-1073-modal-bubbles-runtime` PASS.
- `npm run verify:pass1034-1053-final-runtime-cleanup` PASS.
- `npm run ci:vercel-install-dry-run` PASS with Node 24.16.0 and npm 11.16.0, no ERESOLVE.

## Not yet honestly verified
- Full `npm ci` still times out in the sandbox before completion.
- Full `npm run typecheck`, `npm run lint`, `npm run build`, real browser click QA and Vercel smoke test remain unverified.

## Next
- Run full install/build on a machine without sandbox timeout.
- Manually click: language, wallet, account, cart, Shield asset, Real Markets asset, Basic/Pro/Advanced, Escape/outside click, mobile bottom sheet.
