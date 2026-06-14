# VELMÈRE PASS442 — Brain Regression Judge Runtime

PASS442 adds a regression judge on top of PASS435-PASS441. The goal is not to add more public copy, but to stop quality backslides before PDF/chat output is released.

## Implemented

- `lib/market-integrity/pass442-regression-judge-runtime.ts`
- Runtime modes:
  - `quality_stable`
  - `guarded_regression`
  - `sealed_regression`
  - `operator_regression_review`
- Regression checks:
  - core fields no backslide
  - second provider regression
  - PASS441 eval no backslide
  - truth replay no backslide
  - semantic drift no backslide
  - fake-live budget no backslide
  - PDF payload regression lock
  - memory not live provider
- Lens contract:
  - `pass442-lens-regression-judge-contract`
  - technical regression hidden from customers
  - one payload, one locale, one section order
- API exposure:
  - `/api/market-integrity/analyze`
  - `/api/market-integrity/brain`
  - `/api/market-integrity/chat`
  - `/api/market-integrity/angel`
  - `/api/market-integrity/probe`
- Local probe:
  - `npm run probe:pass442-regression-judge -- bitcoin ethereum solana NVDA EURUSD=X GC=F`

## Behavior

PASS442 compares the current payload against the previous guard layers. If core fields disappear, fake-live risk rises, semantic drift returns, or PASS441 eval gets worse, the brain switches to guarded/facts-only/operator review instead of releasing stronger PDF/chat language.

## Validation

- `npm run verify:pass442-brain-regression-judge-runtime`
- `npm run verify:pass441-brain-eval-harness-runtime`
- `npm run check:i18n`
- `npm run vercel:preflight`

