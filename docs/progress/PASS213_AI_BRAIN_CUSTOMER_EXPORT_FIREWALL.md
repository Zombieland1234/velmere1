# PASS213 — AI Brain Customer Export Firewall

Roboczy pass bez ZIP. Selected VLM Brain tile now builds `vlm-brain-customer-export-firewall-v1-pass213` before any future customer report/PDF route.

## Scope

- Added typed customer export firewall contract.
- Added source debt matrix with customer impact: blocks download, requires operator review, documents context.
- Added evidence coverage score and redaction score.
- Added PDF route gate visibility without enabling binary PDF.
- Kept customer export blocked until durable case storage, source freshness and redaction review are resolved.

## Delta

| Area | Previous | Current | Change |
|---|---:|---:|---:|
| D15 Risk driver mapping | 74% | 77% | +3% |
| D16 Source confidence lanes | 76% | 79% | +3% |
| D17 Missing-data semantics | 80% | 83% | +3% |
| K02 Source freshness registry | 52% | 55% | +3% |
| K05 Privacy redaction envelope | 52% | 57% | +5% |
| K06 Operator cases | 54% | 59% | +5% |
| M01 Velmère Shield Report | 62% | 65% | +3% |
| M05 Redacted payload export | 59% | 66% | +7% |
| M06 Report download route | 30% | 32% | +2% |
| M07 Operator-only report fields | 64% | 69% | +5% |

**PASS213 product delta:** +39% on touched rows.

<!-- PASS213 marker: AI Brain Customer Export Firewall -->
