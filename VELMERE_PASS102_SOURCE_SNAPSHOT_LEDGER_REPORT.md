# VELMERE PASS 102 — Source Snapshot Ledger

## Base
Built on PASS 101 `velmere_pass101_evidence_export_endpoint`.

## Main goal
Start turning evidence reports into a persisted source-snapshot system.

## Implemented

### 1. Source snapshot ledger
Added:
- `lib/market-integrity/source-snapshot-ledger.ts`

It builds and stores:
- report id
- symbol/name
- timestamp
- source state
- overall risk
- confidence
- final verdict
- missing data
- blocked-by list
- source ledger
- web OSINT queue

Storage modes:
- Supabase if configured through `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- in-memory fallback when Supabase is not configured

### 2. API integration
Updated:
- `app/api/market-integrity/investigator/route.ts`
- `app/api/market-integrity/evidence-export/route.ts`

Both now persist a source snapshot and return `sourceSnapshot`.

### 3. New history endpoint
Added:
- `app/api/market-integrity/source-snapshots/route.ts`

Usage:
- `/api/market-integrity/source-snapshots?symbol=SOL`
- returns stored snapshots and ledger meta

### 4. UI integration
Updated:
- `components/market-integrity/ShieldMapClient.tsx`

Evidence Report Draft now shows:
- snapshot storage state
- mode: memory/supabase
- stored/already stored
- report id
- `snapshots` button opening the source snapshot history endpoint

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

## Limitations
In-memory storage is not durable across server restarts. Production needs Supabase table:

`velmere_source_snapshots`

Expected columns:
- id text primary key
- report_id text
- symbol text
- name text
- timestamp timestamptz
- source_state text
- overall_risk int
- confidence text
- confidence_score int
- final_verdict text
- missing_data jsonb
- blocked_by jsonb
- source_ledger jsonb
- web_queries jsonb
