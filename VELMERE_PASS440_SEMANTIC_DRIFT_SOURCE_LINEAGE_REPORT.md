# PASS440 — Semantic Drift Source Lineage Runtime

Scope: bugfix całej paczki + dalsze ulepszanie Velmère AI brain bez dokładania ciężkiego Orbit 360.

## Implemented

- Added `lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts`.
- Added source-lineage graph for price/change/volume/risk/source/missing/memory/PDF/chat.
- Added semantic drift guard that detects when PDF/chat wording is stronger than provider evidence.
- Added response modes: `normal_source_bound`, `guarded_rewrite`, `facts_only_rewrite`, `operator_lineage_review`.
- Added narrative repair contract: one payload, one locale, one section order, no unsupported live tone.
- Added Lens contract `pass440-lens-semantic-drift-contract`.
- Added PDF footer marker: `Lineage guard active`.
- Added API exposure for `pass440` in analyze, brain, chat, angel and probe routes.
- Added probe alias `npm run probe:pass440-semantic-drift-lineage`.

## Guard rules

- Memory cannot invent a provider.
- Tone cannot upgrade confidence.
- Missing price/source/freshness forces facts-only or operator review.
- Second provider missing remains visible when live wording is requested.
- Customer-facing output remains source-bound and technical lineage stays hidden.

## Validation

- `npm run verify:pass440-semantic-drift-source-lineage-runtime`
- `npm run verify:pass439-truth-replay-harness-runtime`
- `npm run check:i18n`
- `npm run vercel:preflight`

