# PASS438 — Provider Execution Loop Runtime

Scope: bugfix + Velmère AI brain only.

Implemented:
- `lib/market-integrity/pass438-provider-execution-loop-runtime.ts`
- provider execution ledger with observed fields, missing fields, freshness, retry policy and confidence delta
- structured error policy for provider failures
- PDF/chat gate that keeps one payload and blocks fake-live wording
- `/api/market-integrity/probe` now returns `pass438` and `providerExecutionLoop`
- `/analyze`, `/brain`, `/chat`, `/angel` expose `pass438`
- Lens report gets `pass438-lens-provider-execution-contract`
- local probe script: `npm run probe:pass438-provider-execution-loop -- bitcoin ethereum NVDA EURUSD=X`

Research direction:
- agent tool execution should be traceable and guardrailed
- human/operator review is required when provider evidence is conflicting or too weak
- structured errors should be classified before retry or PDF/chat release
- missing data stays visible; long-term memory cannot override fresh provider gaps

Validation:
- `npm run verify:pass438-provider-execution-loop-runtime`
- `npm run check:i18n`
- `npm run vercel:preflight`
