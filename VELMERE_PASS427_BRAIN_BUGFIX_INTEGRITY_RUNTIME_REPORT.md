# PASS427 — Brain Bugfix Integrity Runtime

Scope: bugfix sweep + Velmère AI brain hardening only. Angel provider work is paused; this pass focuses on the source-bound risk brain, PDF payload integrity and runtime self-correction.

## Implemented

- Added `lib/market-integrity/pass427-brain-bugfix-integrity-runtime.ts`.
- Added PASS427 brain sanity checks for finite scores, source quorum, missing-data duplicates, history integrity, narrative section parity, 10/14/20 field budgets and hallucination brake state.
- Added a repair queue so the brain can name what must be deduped, capped, sealed, surfaced or routed to operator review before public copy is amplified.
- Added a PDF lock with one payload, locale-bound output, deterministic section order, repeat suppression and customer-facing-only copy.
- Added memory safety: long retention can stay enabled, but adaptive influence is capped and disabled when runtime integrity is guarded or sealed.
- Added Lens preview lock so Browser PDF preview/download keeps one clean payload, 3 visible suggestions and customer-facing labels only.
- Exposed `pass427` through `buildRiskBrain`, analyze API, brain API, chat API and Angel route payloads without developing Angel further.

## Guard result expected

- PASS427 parser guard must scan all TS/TSX files.
- PASS426 guard must remain green.
- i18n and Vercel preflight must remain green.

## Product rule

Basic, Pro and Advanced differ by depth only: 10 / 14 / 20 fields. The truth source, payload and missing-data rail stay the same.
