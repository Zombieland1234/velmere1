# VELMERE PASS 103 — API Guardrails + Vercel Canvas Fix + Readiness Endpoint

## Base
Built on PASS 102 `velmere_pass102_source_snapshot_ledger`.

## Critical Vercel fix
Fixed:
- `components/market-integrity/TokenRiskModal.tsx`

Vercel error:
`Type error: 'canvas' is possibly 'null'.`

Fix:
- replaced nullable canvas capture with explicit non-null `canvasNode` guard and typed `HTMLCanvasElement`.

## Implemented

### 1. API guardrails
Added:
- `lib/market-integrity/api-guardrails.ts`

Provides:
- in-memory route rate limits,
- guardrail headers,
- no-store headers,
- x-ratelimit headers,
- retry-after headers.

Protected routes:
- `/api/market-integrity/investigator`
- `/api/market-integrity/evidence-export`
- `/api/market-integrity/source-snapshots`

### 2. Readiness endpoint
Added:
- `app/api/market-integrity/readiness/route.ts`

Returns:
- readiness score,
- production checks,
- source snapshot ledger meta,
- terminal readiness when a token query can be analyzed.

Preserves existing design contract:
- includes `buildTerminalReadiness`.

### 3. Supabase SQL doc
Added:
- `docs/supabase-source-snapshots.sql`

Defines table:
- `velmere_source_snapshots`

### 4. Build safety checks
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
Tried `npm install` / local full build, but the sandbox execution was interrupted by time limit. Vercel remains the full build source of truth.

## Current real readiness estimate
~27–29% launch-ready.
