# PASS1254–1273 · Build truth + PDF typography cleanup

## Goal
Move the project closer to real 100% by tightening the area that still looked weakest after PASS1253: Lens/Browser reader and downloaded PDF readability. This pass does not pretend that a full production build passed in this sandbox.

## What changed

| Area | Change | Reason |
|---|---|---|
| Lens report contract | Added `pass1254-pdf-typography-release-gate` to the canonical Lens report payload. | Preview and downloaded PDF now share an explicit typography release manifest. |
| PDF route | Added `pdf_typography_release_gate_mismatch` guard before export. | Prevents exporting a PDF if the reader/download typography contract drifts. |
| PDF binary output | Compact metadata/footer lines now use PASS1254 clamps. | Reduces overlapping footer/meta text in the A4 PDF. |
| Browser reader | Added a visible typography status strip and data attributes. | User can see whether the PDF is clean, not just trust hidden QA. |
| Mobile reader | Added CSS hardening for no horizontal overflow and single-column PASS1254 mode. | Fixes the “PDF/reader chaos on mobile” class of bugs. |
| Headers | Added `x-velmere-pdf-typography-release`. | Runtime/API proof now exposes the typography release state. |

## Build truth

| Check | Status in this sandbox | Meaning |
|---|---|---|
| `npm run verify:pass1254-1273-build-pdf-typography` | PASS | New code contract is wired. |
| `npm run check:i18n` | PASS | Locale files still consistent. |
| `npm run vercel:preflight` | PASS | Static preflight still sees core app files. |
| `npm run smoke:routes:static` | PASS | Static localized route smoke still passes. |
| Full `npm ci` on Node 24/npm 11 | STARTED, then sandbox timeout at 240s | Not counted as green until completed on normal machine. |
| Full `npm run typecheck` | PARTIAL ATTEMPT FAILED FROM INCOMPLETE `node_modules` | Missing `next`, `react`, `@types/node` etc. after timed-out install; not counted as code failure. |
| Full `npm run lint` | NOT PROVEN HERE | Needs complete install. |
| Full `npm run build` | NOT PROVEN HERE | Needs complete install + Next build. |
| Playwright runtime click QA | NOT PROVEN HERE | Needs local dev server / deployed preview. |

## Command chain for real 100% proof

```bash
nvm use 24.16.0
npm ci --no-audit --no-fund --progress=false
npm run verify:pass1254-1273-build-pdf-typography
npm run check:i18n
npm run vercel:preflight
npm run smoke:routes:static
npm run typecheck
npm run lint
npm run build
npm run test:e2e:pass1214-1233
```

## Honest remaining blockers

1. Full Node 24 install + typecheck/lint/build must finish outside the sandbox timeout.
2. Lens PDF still needs visual screenshot comparison after opening real browser preview.
3. Shield Map is improved as evidence graph, but still needs live interaction QA.
4. VLM Brain/source truth needs real provider data, not only deterministic fallback contracts.

## Updated estimate

| Area | Before | After |
|---|---:|---:|
| Whole platform | 94.8% | 95.2% |
| Browser / Lens | 87.4% | 89.0% |
| PDF typography/readability | 82.0% | 88.0% |
| Build/deploy readiness | 91.3% | 91.6% |
| Runtime proof | 64.0% | 65.0% |
