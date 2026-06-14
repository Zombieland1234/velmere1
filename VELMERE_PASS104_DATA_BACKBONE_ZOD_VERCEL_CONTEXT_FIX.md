# VELMERE PASS 104 — Data Backbone + Zod Validation + Vercel Context Fix

## Base
Built on PASS 103 `velmere_pass103_api_guardrails_vercel_canvas_fix`.

## Critical Vercel fix
Fixed:
- `components/market-integrity/TokenRiskModal.tsx`

Vercel error:
`Type error: 'ctx' is possibly 'null'.`

Fix:
- replaced nullable `ctx` with guarded `contextNode`
- created explicit `const ctx: CanvasRenderingContext2D = contextNode;`
- this follows the same closure-safe pattern used for `canvas`.

## Gemini plan implemented
Gemini recommended PASS 104 as Data Backbone & Zod Strict Typing:
- strict data structures,
- Zod schemas,
- env example,
- hard runtime env typing,
- fewer mock-like assumptions.

## Implemented

### 1. Data backbone schema
Added:
- `lib/market-integrity/data-backbone.ts`

Includes:
- `tokenRiskInputSchema`
- `sanitizeTokenRiskInput`
- `validateTokenRiskInput`
- `assertTokenRiskInput`
- `envSchema`
- `validateRuntimeEnv`

### 2. Risk engine integration
Updated:
- `lib/market-integrity/risk-engine.ts`

Now:
- validates TokenRiskInput before scoring,
- normalizes numeric strings,
- adds insufficient_data signal when validation fails,
- adds warning-based insufficient-data signal when core fields are missing.

### 3. Environment template
Updated:
- `.env.example`

Added placeholders:
- COINGECKO_API_KEY
- ETHERSCAN_API_KEY
- ALCHEMY_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- QSTASH_TOKEN
- NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
- OPENAI_API_KEY

### 4. Documentation
Added:
- `docs/data-backbone-pass104.md`

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- likely unescaped JSX apostrophes: 0

## Not fully run
Full `npm run build` was not completed in sandbox because dependency installation/build exceeds the session execution limit. Vercel remains the final build source.

## Current real launch readiness
~29–31%.
