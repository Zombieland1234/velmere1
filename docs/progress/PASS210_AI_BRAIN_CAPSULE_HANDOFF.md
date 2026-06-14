# PASS210 — AI Brain Capsule Handoff Bridge

Working pass without ZIP export.

## What changed

- Added `vlm-brain-capsule-handoff-v1-pass210` as a report bridge preview between selected AI Brain tile capsules and future Shield report/PDF routes.
- The selected tile drawer now shows handoff status, source freshness, storage mode and blocker count.
- Handoff stays `client_preview_only`, `operator_review_required` and `not_generated` for PDF until real server-side report generation is wired.
- Stale/unknown/not-live sources now block the report bridge instead of looking export-ready.

| ID | Obszar | Previous | Current | Change |
|---|---|---:|---:|---:|
| D16 | Source confidence lanes | 69% | 71% | +2% |
| D17 | Missing-data semantics | 76% | 78% | +2% |
| K02 | Source freshness registry | 42% | 47% | +5% |
| K05 | Privacy redaction envelope | 41% | 45% | +4% |
| L06 | Adapter timeouts / fallbacks | 44% | 48% | +4% |
| M01 | Velmère Shield Report | 55% | 58% | +3% |
| M05 | Redacted payload export | 49% | 52% | +3% |
| M07 | Operator-only report fields | 50% | 53% | +3% |

**PASS210 product delta:** +26% on touched rows.

<!-- PASS210 marker: AI Brain Capsule Handoff Bridge active. -->
