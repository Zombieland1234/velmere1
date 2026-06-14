# PASS435 — Live Query Test Bench

Scope: bugfix + Velmère AI brain only.

Implemented:
- Added `pass435-live-query-test-bench.ts`.
- Added provider reality rows: observed fields, missing fields, coverage, verdict and repair hint.
- Added release modes: `release_live_readout`, `release_partial_with_missing`, `facts_only_no_live_claim`, `block_pdf_until_probe`.
- Added fake-live risk and live-readiness score before PDF/chat.
- Added missing-data replay so the report shows what was attempted and what must be surfaced.
- Added Lens contract: one payload, one locale, no second copy generator, 3 suggestions max, no fake-live.
- Exposed `pass435` through analyze, brain, chat, angel and probe routes.
- Added local provider test command: `npm run probe:pass435-live-query-test-bench -- bitcoin ethereum solana NVDA EURUSD=X`.

Validation:
- `npm run verify:pass435-live-query-test-bench`
- `npm run verify:pass434-provider-crosscheck-missing-data-hunter`
- `npm run check:i18n`
- `npm run vercel:preflight`

Notes:
PASS435 does not claim a full internet research agent yet. It verifies provider payloads, exposes missing data and prevents fake live wording before PDF/chat.
