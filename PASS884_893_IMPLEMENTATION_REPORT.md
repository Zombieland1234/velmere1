# PASS884–893 — Core A11y + Data Integrity Patch

Status: implemented in source. Runtime/browser QA remains unconfirmed until the project is installed and run under Node >=24.16.0 and npm >=11.16.0.

## Implemented

1. `useDialogFocusBoundary.ts`
   - Captures the opener element with a focus snapshot.
   - Restores focus through element ref, id, stable selector, text fallback and a short `MutationObserver` window for React 19 remounts.
   - Handles Escape, Tab trap and optional outside pointer close.

2. `useModalScrollLock.ts`
   - Adds iOS Safari rubber-band protection with modal scroll-region ownership.
   - Tracks touch start region, applies mathematical edge cancellation and boundary normalization.
   - Sets body `touchAction = none` while the modal owns page scroll.

3. `VlmBrainWorkspace.tsx`
   - Replaced simple loading with a tiered state machine: `boot -> orb -> brain -> idle`.
   - Adds 800ms minimum per phase and tier minimums: Basic 2.6s, Pro 4.6s, Advanced 7.2s.
   - Applies a 25% client confidence penalty when `diagnostics.sourceCount < 2` or `output.missingData.length > 0`.
   - Shows fallback/reduced confidence state in UI.

4. Browser/Lens toolbar keyboard QA
   - Adds ArrowLeft/ArrowRight spatial navigation across preview toolbar controls.
   - Loops from end to start and start to end.
   - Keeps Escape mapped to `closePreview()`.

5. npm 11 dependency matrix
   - Adds `overrides` and `resolutions` for React 19 / Next 16 / wagmi / viem / WalletConnect matrix.
   - Regenerated `package-lock.json` with `npm install --package-lock-only --engine-strict=false --legacy-peer-deps` in this sandbox.
   - Existing `.npmrc` already contains `legacy-peer-deps=true`, `engine-strict=true`.

6. Legal/i18n copy cleanup
   - Replaced direct “secure/safe/profit promise” style copy with neutral analysis/boundary wording across PL/EN/DE.
   - Wallet pre-choice copy still clearly states read-only access and no seed/private-key request.

7. Print/PDF leakage guard
   - Added `@media print` hiding Lens preview toolbar/navigation controls from generated browser print output.

## Tests run

- `npm run verify:pass884-893-core-a11y-data-integrity` — PASS 24/24
- `npm run check:i18n` — PASS
- `npm run verify:pass874-883-route-surface-cleanup` — PASS
- `npm run verify:pass864-873-shield-shell-gemini-micro` — PASS
- `npm run verify:pass844-853-unified-asset-modal` — PASS
- `npm run verify:pass834-843-evidence-graph` — PASS
- `npm run verify:pass824-833-runtime-cleanup` — PASS
- `npm run doctor:runtime-env` — expected FAIL on sandbox Node 22/npm 10
- `npm ci --ignore-scripts --engine-strict=false --legacy-peer-deps` — attempted; no ERESOLVE observed before sandbox SIGTERM, but full install not completed in this environment.
- `npm run typecheck` — blocked because dependencies are not installed after the terminated `npm ci` cleanup.

## Not confirmed

- Full `npm ci` under Node 24/npm 11.
- Full `npm run typecheck` with installed dependencies.
- Full `npm run lint`.
- Full `npm run build`.
- Browser click QA / iOS Safari runtime gesture QA.
