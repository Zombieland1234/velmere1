# PASS864-PASS873 — Shield shared shell + Gemini micro handoff

## Scope
- Continue from PASS863 checkpoint.
- Solve Gemini file-count rejection with a micro handoff archive.
- Move Shield asset modal onto the same `UnifiedAssetModalShell` grammar already used by Real Markets.
- Keep runtime/build honesty: no claim of npm ci/typecheck/lint/build without Node 24/npm 11.

## Implemented
1. Added `scripts/create-gemini-micro-handoff.mjs`.
   - Creates a low-file-count Gemini archive.
   - ZIP contains 4 files only: README, bundled Markdown, manifest JSON, tree TXT.
   - Bundles critical source files into one `VELMERE_PROJECT_BUNDLE.md` to avoid Gemini file-count limits.

2. Added package scripts:
   - `handoff:gemini-micro`
   - `verify:pass864-873-shield-shell-gemini-micro`

3. Extended `UnifiedAssetModalShell`:
   - Supports `closeButtonRef` so the modal close button remains part of the focus-return/focus-trap flow.

4. Refactored Shield modal surface:
   - `TokenRiskModal.tsx` now renders `UnifiedAssetModalShell kind="shield"`.
   - The shell owns Shield chart, timeframe tabs and Basic/Pro/Advanced dock.
   - Old `shield-token-popup-grid` JSX was removed from the modal render path.
   - Details moved behind a single `<details>` disclosure for sources/gaps/next check.

5. Added CSS for Shield shared shell:
   - `unified-shield-token-popup-shell`
   - shared modal width/height boundaries
   - mobile-safe max-height
   - no left/chaotic panel layout

6. Updated the PASS844-853 verifier to accept the newer shell-based depth dock instead of the old desktop-only class marker.

## Tests run
- `npm run verify:pass864-873-shield-shell-gemini-micro` — PASS 10/10
- `npm run verify:pass844-853-unified-asset-modal` — PASS 10/10
- `npm run verify:pass834-843-evidence-graph` — PASS 10/10
- `npm run verify:pass824-833-runtime-cleanup` — PASS 10/10
- `npm run verify:pass854-863-gemini-unified-shell` — PASS 13/13 after handoff generation
- `npm run check:i18n` — PASS
- `npm run handoff:gemini-micro` — PASS, creates 4-file ZIP
- `npm run doctor:runtime-env` — EXPECTED FAIL in sandbox: Node v22.16.0/npm 10.9.2, project requires Node >=24.16.0 <25 and npm >=11.16.0 <12

## Not verified
- `npm ci`
- full `npm run typecheck`
- full `npm run lint`
- full `npm run build`
- real browser click QA

Reason: current sandbox runtime is intentionally rejected by the project environment doctor.
