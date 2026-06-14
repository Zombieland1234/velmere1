# PASS209 — AI Brain Capsule Envelope

## Scope
PASS209 converts the selected VLM Brain tile report capsule from UI-only copy into a typed, redacted preview envelope.

## Product changes
- Added `lib/market-integrity/vlm-brain-report-capsule.ts`.
- The selected tile drawer now builds a `vlm-brain-report-capsule-v1-pass209` envelope.
- The drawer shows capsule id, schema version and export readiness without exposing raw payloads.
- The capsule builder redacts obvious PII/long hex/seed-like strings and replaces forbidden trading/safety overclaim wording.
- Export readiness reacts to missing/fallback/internal-review source state.

## Delta
| Area | Previous | Current | Change |
|---|---:|---:|---:|
| D15 Risk driver mapping | 68% | 70% | +2% |
| D16 Source confidence lanes | 67% | 69% | +2% |
| D17 Missing-data semantics | 74% | 76% | +2% |
| M01 Velmère Shield Report | 52% | 55% | +3% |
| M03 Evidence Note | 59% | 62% | +3% |
| M04 Safe export wording | 80% | 83% | +3% |
| M05 Redacted payload export | 41% | 49% | +8% |
| M07 Operator-only report fields | 46% | 50% | +4% |

Product delta: +27% across touched areas.

## Still blocked
- No binary PDF renderer yet.
- Capsule envelope is client-side preview; production export still needs server-side role gate and durable source ledger.
- Real browser QA still required.
