# VELMÈRE PASS439 — Truth Replay Harness Runtime

## Scope
PASS439 continues the Velmère AI brain hardening line after PASS438. The goal is not more random narrative. The goal is to force every customer-facing PDF/chat claim to replay back to provider evidence, missing-data rows, risk logic and execution state.

## Implemented
- Added `lib/market-integrity/pass439-truth-replay-harness-runtime.ts`.
- Added a truth replay harness with lanes: source, market, risk, memory, PDF, chat and operator.
- Added replay states: `replay_clean`, `replay_partial`, `replay_conflict`, `replay_sealed`.
- Added claim states: `supported`, `weakly_supported`, `missing_evidence`, `conflict_review`.
- Added a release gate for PDF/chat: one payload, no fake live, facts-only mode and operator review.
- Added Lens contract `pass439-lens-truth-replay-contract`.
- Wired PASS439 into `risk-brain.ts` decision path and returned brain object.
- Wired PASS439 into `/api/market-integrity/probe` as `truthReplayHarness`.
- Exposed `pass439` in `/analyze`, `/brain`, `/chat` and `/angel` responses.
- Added local script `npm run probe:pass439-truth-replay-harness`.
- Added guard `npm run verify:pass439-truth-replay-harness-runtime`.

## Product behavior
- If provider evidence is clean, PDF/chat can speak normally from the resolved payload.
- If provider evidence is partial, PDF/chat can answer, but missing data stays visible.
- If provider evidence conflicts, operator review is required.
- If core live fields are unsupported, live wording is sealed and the answer falls back to facts-only.

## Guardrail
PASS439 does not claim sentience, does not produce buy/sell instructions, does not invent a second provider and does not expose raw provider internals to customers.
