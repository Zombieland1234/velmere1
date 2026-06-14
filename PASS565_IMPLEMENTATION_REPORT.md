# Velmère PASS559–565 — public AI / PDF / Shield release report

## Scope

This package continues from PASS551 and closes the user-visible issues shown in the supplied screenshots: public operator diagnostics inside Shield, the website header and internal QA panel covering the PDF Reader, and the crypto tab inside Real Markets. The same pass also hardens VLM Brain and Shield Map motion containment.

## PASS559 — Shield public evidence spine

- Removed the entire public `Operator diagnostics` disclosure from `TokenRiskModal`.
- Replaced it with a compact, human-facing evidence spine: source coverage, candle count and unresolved gaps.
- Added a calm next-proof sentence; confidence is not upgraded when a second source is absent.
- Preserved internal compatibility panels outside the public visible surface.

## PASS560 — sealed PDF modal and clean Reader

- PDF preview now mounts at the maximum browser stacking layer and above the global site header.
- Added a dedicated body-portaled modal root and full dynamic-viewport height contract.
- Public internal QA overlays are hard-disabled instead of being controlled by a `NEXT_PUBLIC` flag.
- Reader navigation no longer uses a sticky overlay over the A4 document.
- Added mobile safe-area, momentum scrolling, compact radii and reduced-motion fallbacks.

## PASS561 — Real Markets without crypto tab

- Public Real Markets category list remains non-crypto.
- Added a runtime guard that redirects any stale `crypto` category state back to `all`.
- Crypto remains available through the dedicated Velmère Shield handoff.
- Search and catalog rows continue to filter crypto from the Real Markets public surface.

## PASS562 — VLM Brain presentation containment

- Neural Audit now uses the maximum modal stacking layer, so it cannot sit below the global header.
- Added a source-first presentation contract and GPU containment for ambient layers.
- Below-fold neural sections use content visibility and intrinsic sizing to reduce unnecessary paint work.
- Reduced-motion mode removes ambient transform pressure.

## PASS563 — Shield Map adaptive motion

- Added a dedicated Shield Map runtime root and adaptive-focus motion contract.
- Orbit/decision field is paint-contained and GPU-isolated.
- Motion surfaces use backface containment while reduced-motion removes forced transforms.

## PASS564 — release CSS polish

- Added concise evidence cards, readable next-step copy, modal entry motion and safe mobile spacing.
- Motion remains functional but decorative effects are disabled under reduced-motion preferences.

## PASS565 — regression gates and packaging

- Updated PASS552–558 verifier to enforce the new public-clean state.
- Added PASS559–565 verifier and targeted TypeScript configuration.
- Added the verifier to the production build chain.

## Validation

- PASS552–558 verifier: PASS.
- PASS559–565 verifier: PASS.
- ESLint on the five changed TSX surfaces: PASS, 0 errors and 0 warnings.
- PL / DE / EN i18n check: PASS.
- Vercel preflight: PASS, 850 files scanned.
- TypeScript parser: PASS, 847 TS/TSX files, 0 syntax diagnostics.
- ZIP exclusions: node_modules, .next, .git, caches, logs and local environment files excluded.

## Environment boundary

`npm run typecheck:pass565` was started twice but exceeded the available execution window. A full `next build` is therefore not claimed. The project production contract remains Node.js 20.x; run the final semantic typecheck and build in the deployment environment before publishing.
