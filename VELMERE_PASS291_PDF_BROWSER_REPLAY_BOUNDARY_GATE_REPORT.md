# Velmère PASS291 — PDF Browser Replay Boundary Gate

## Scope

PASS291 moves to the next Velmère map ID after the operator-only report field separation work: **M08 PDF/browser replay boundary**. It also touches M06, D07, D20, J03/J04 and M05 because PDF preview cannot be trusted unless the browser layout and right-edge Orbit detail drawer behave correctly.

## Implemented

- Added `lib/market-integrity/pdf-browser-replay-boundary-gate.ts`.
- Added `buildPdfBrowserReplayBoundaryGate` and `serializePdfBrowserReplayBoundaryPacket`.
- Added a new token modal rail: **Ghost Replay Seal**.
- Added replay stages for right-edge drawer, scroll container, mobile safe-area, PDF blob, download callback, source appendix, operator fields and signature boundary.
- Added a replay packet JSON download button that uses a defined callback and Blob flow.
- Kept `downloadEvidenceManifest` and `downloadVelmereCybersecurityPdf` runtime handlers guarded.
- Added CSS for the Ghost Replay Seal rail with compact responsive layout.
- Added `scripts/verify-pass291-pdf-browser-replay-boundary-gate-safety.mjs` and `verify:pass291-pdf-browser-replay-boundary-gate`.
- Appended PASS291 to `verify:shield-all`.

## Anti-FOMO / luxury psychology boundary

- Elite status is represented as a replay/proof seal, not countdown pressure.
- No buy/sell prompts, ROI language, certainty language or safety-certificate wording.
- Velmère Cybersecurity appears as a bounded preview signature, not a legal/security certificate.

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| M08 | PDF/browser replay boundary | 39 | 48 | +9 |
| M06 | Report download route | 54 | 58 | +4 |
| D07 | Tile detail popup | 99 | 100 | +1 |
| D20 | Brain portal layering / scroll lock | 99 | 100 | +1 |
| J03 | Responsive layout | 79 | 81 | +2 |
| J04 | Scroll lock / z-index layers | 100 | 100 | +0 |
| M05 | Redacted payload export | 96 | 97 | +1 |

PASS291 total: +18 points.

## Validation

- `verify:pass291-pdf-browser-replay-boundary-gate` — PASS
- `verify:pass290-operator-only-report-field-gate` — PASS
- `verify:pass289-layout-stability-sentinel-gate` — PASS
- `check:i18n` — PASS
- `vercel:preflight` — PASS
- Full `typecheck` is still not green in this ZIP because the package has no `node_modules` and the project still reports missing Next/React/Node types and older inherited type errors.
