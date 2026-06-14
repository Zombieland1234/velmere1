# Velmère Pass 33 — Market Sweep Bot + Risk Memory Layer

## Scope
This pass moves Velmère Shield from a one-shot token risk scanner toward an AI-style market monitoring system.

## Added

### 1. Market memory ledger
New file:

- `lib/market-integrity/market-memory.ts`

It stores recent token risk snapshots in server memory using `globalThis`. This is safe for MVP/dev/Vercel instance runtime, and prepares the architecture for a real database later.

Tracked fields:

- score
- level
- price
- market cap
- volume
- signal count
- dominant agent
- confidence
- timestamp

Derived memory metrics:

- risk delta since previous scan
- risk delta since first seen
- price delta since previous scan
- volume delta since previous scan
- risk velocity per hour
- trend label: new / stable / rising_risk / cooling / volatile

### 2. Market sweep bot endpoint
New route:

- `app/api/market-integrity/sweep/route.ts`

It scans one or more pages of market data, records snapshots, builds ranked anomaly insights and returns bot status.

### 3. Token history endpoint
New route:

- `app/api/market-integrity/history/route.ts`

It returns the recent memory snapshots for a token id / contract / ticker.

### 4. Markets API with memory
Updated:

- `app/api/market-integrity/markets/route.ts`

Now each row can include memory metadata and the API returns global memory status + anomaly insights.

### 5. Analyze API with memory
Updated:

- `app/api/market-integrity/analyze/route.ts`

Single-token scans now also get recorded into the risk memory ledger.

### 6. UI: Shield Bot panel
Updated:

- `components/market-integrity/MarketIntegrityClient.tsx`

Added:

- Market memory agent card
- run sweep bot button
- tracked assets count
- stored snapshots count
- hottest stored risk
- AI anomaly ledger top 3 cards
- risk delta in market table

### 7. UI: Risk memory timeline in popup
Updated:

- `components/market-integrity/TokenRiskModal.tsx`

Added:

- `/history` fetch
- mini risk memory timeline
- snapshot count
- risk delta from first to latest observation

### 8. i18n
Updated:

- `messages/pl.json`
- `messages/en.json`
- `messages/de.json`

New sections:

- `MarketIntegrity.bot`
- `MarketIntegrity.history`

## Important limitation
This is not yet a production database or scheduled background cron. Server memory is per instance and can reset when the serverless function cold-starts. The next production step is Supabase/Redis/Upstash + Vercel Cron.

## Verification

- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅

Full Next.js build was not run in the sandbox because `node_modules` is not installed here.
