# PASS286 — Lens Report Preview Gate

## Scope
- Next map ID: M02 — Lens report preview.
- Supporting IDs: M01, M03, M05, K02, K04, K05, K07.
- This pass keeps the A–M master map granular and does not collapse AI Brain/report work into one line.

## Research synthesis
- MEXC direction: keep chart/depth/orderbook/source context close to the user decision surface.
- LVMH/Aura direction: premium trust comes from traceability, transparency, proof of authenticity and controlled disclosure.

## Implemented code
- Added `lib/market-integrity/lens-report-preview-gate.ts`.
- Added `buildLensReportPreviewGate(...)` into `TokenRiskModal.tsx`.
- Added a new UI rail: `data-pass286-lens-report-preview-gate`.
- Added PASS286 CSS for the Proof Passport Scroll, horizontal report sections and Velvet Preview Seal states.
- Added `scripts/verify-pass286-lens-report-preview-gate-safety.mjs`.
- Added `verify:pass286-lens-report-preview-gate` to `package.json` and chained it into `verify:shield-all`.

## Innovation
**Proof Passport Scroll / Velvet Preview Seal** — the report preview behaves like a luxury digital passport:
- cover card,
- customer-safe brief,
- source appendix,
- missing-data note,
- redaction boundary,
- operator boundary,
- export footer.

The seal appears only when source, privacy, storage and retention gates are aligned. Otherwise the preview stays in a calm waiting room.

## Anti-FOMO / safe copy
- No buy/sell prompts.
- No countdowns.
- No ROI/profit language.
- No guarantees.
- No certificate wording.
- Missing data is shown as uncertainty, not trust.

## Delta
| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| M02 | Lens report preview | 80 | 86 | +6 |
| M01 | Velmère Shield Report | 78 | 80 | +2 |
| M03 | Evidence Note | 62 | 65 | +3 |
| M05 | Redacted payload export | 91 | 93 | +2 |
| K02 | Source freshness registry | 71 | 73 | +2 |
| K04 | Storage adapter contract | 55 | 56 | +1 |
| K05 | Privacy redaction envelope | 93 | 94 | +1 |
| K07 | Retention policy | 36 | 38 | +2 |

PASS286 total delta: +19.
Tracker from PASS267: +338.

## Validation
- `verify:pass286-lens-report-preview-gate` — PASS.
- `verify:pass285-customer-safe-risk-brief-gate` — PASS.
- `verify:pass284-retention-policy-gate` — PASS.
- `check:i18n` — PASS.
- `vercel:preflight` — PASS.
- Targeted TypeScript check for new module — PASS.
- Full `typecheck` still fails because this ZIP does not include `node_modules` / Next / React / Node typings and old project errors remain.
