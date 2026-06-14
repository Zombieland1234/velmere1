# PASS208 — AI Brain Report Capsule

PASS208 connects the selected VLM Brain tile drawer to the Reports / Evidence lane without pretending that the binary PDF generator or durable source ledger are complete.

## Implemented

- Added `reportCapsule` copy inside `TokenRiskModal.tsx` for the selected AI Brain tile drawer.
- The capsule splits the clicked tile into four export-safe lanes:
  - Public brief
  - Operator memo
  - Data redaction
  - Export gate
- Added PL/EN/DE wording for all new report-capsule labels.
- Added CSS containment and premium dark styling for `.shield-vlm-report-capsule`.
- Added PASS208 progress delta tracking for AI Brain and Reports / Evidence.
- Added a PASS208 guard and connected it to `verify:shield-all` plus Vercel preflight markers.

## Safety boundary

- The capsule does not say the report is a certificate.
- It does not claim guaranteed safety, profit, buy/sell calls or a final verdict.
- It explicitly keeps partial/fallback cases internal and review-gated.
- It does not expose raw PII, secrets or raw payloads.
- It does not implement the final binary PDF generator yet.

## PASS208 delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| D15 | Risk driver mapping | 62% | 68% | +6% |
| D16 | Source confidence lanes | 61% | 67% | +6% |
| D17 | Missing-data semantics | 69% | 74% | +5% |
| D24 | Brain copy localization PL/EN/DE | 82% | 84% | +2% |
| M01 | Velmère Shield Report | 49% | 52% | +3% |
| M03 | Evidence Note | 54% | 59% | +5% |
| M04 | Safe export wording | 78% | 80% | +2% |
| M07 | Operator-only report fields | 41% | 46% | +5% |

**PASS208 product delta:** +34% on touched rows.

## Remaining blockers

- Real PDF binary generator is still not implemented.
- Durable source ledger is still not wired to every tile.
- Redaction envelope still needs storage/API enforcement.
- Role-based internal/customer export mode still needs backend proof.
- Browser QA is required for the new drawer section.

<!-- PASS208 marker: AI Brain Report Capsule -->
