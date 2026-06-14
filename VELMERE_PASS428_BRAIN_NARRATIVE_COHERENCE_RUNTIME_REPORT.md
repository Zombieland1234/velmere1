# PASS428 — Brain Narrative Coherence Runtime

Scope: bugfix + AI brain only.

## Implemented

- Added `pass428-brain-narrative-coherence-runtime.ts`.
- Added narrative coherence guard for duplicated PDF copy, locale leakage, long sections and public confidence caps.
- Added deterministic Lens preview/download lock with customer-facing labels only, 3 suggestions max and no technical payload copy.
- Added displayed confidence calibration: the public confidence cannot exceed source quorum, PASS427 integrity mode and hallucination brake allowance.
- Preserved field truth contract: Basic / Pro / Advanced expose 10 / 14 / 20 fields but share the same source truth.
- Exposed `pass428` through analyze, brain, chat and angel routes without reactivating Angel provider work.
- Updated `risk-brain.ts` decision path with PASS428 coherence state.

## Why

The brain should feel alive through memory, source awareness and repair plans, but the public PDF/chat copy must stay deterministic, locale-safe, source-bound and non-random.

## Validation

Run:

```bash
npm run verify:pass428-brain-narrative-coherence-runtime
npm run verify:pass427-brain-bugfix-integrity-runtime
npm run check:i18n
npm run vercel:preflight
```
