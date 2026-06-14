# PASS441 — Brain Eval Harness Runtime

## Scope
Bugfix + Velmère AI brain only. PASS441 adds an evaluation gate before PDF/chat narration so the system checks evidence, provider coverage, missing data, fake-live risk, truth replay and semantic drift before exposing customer-facing output.

## Implemented
- Added `lib/market-integrity/pass441-brain-eval-harness-runtime.ts`.
- Added eval cases for price evidence, second provider, core market fields, truth replay, semantic drift, fake-live budget, PDF payload invariant, memory boundary and live readiness.
- Added eval modes: `eval_green`, `eval_guarded`, `eval_sealed`, `operator_eval_review`.
- Added tripwires for missing price, missing second provider, high fake-live risk, truth replay failure and semantic drift.
- Integrated PASS441 into `risk-brain.ts`, `/analyze`, `/brain`, `/chat`, `/angel`, `/probe` and Lens report payloads.
- Added local probe script `npm run probe:pass441-brain-eval-harness -- bitcoin ethereum solana NVDA EURUSD=X GC=F`.
- Added guard script `npm run verify:pass441-brain-eval-harness-runtime`.

## Product impact
Velmère Brain now behaves closer to an eval-driven system: every strong answer must pass an internal harness before it reaches PDF/chat. If evidence is weak, the brain switches to guarded/facts-only output or operator review.

## Customer-facing rule
No technical eval text is shown as marketing copy. The eval harness stays internal; users see clear missing-data and confidence-safe wording.

## PASS441 invariant
Eval before narration. No answer without evidence. Memory cannot become a provider. Missing data remains visible. PDF preview/download/chat share one resolved payload.
