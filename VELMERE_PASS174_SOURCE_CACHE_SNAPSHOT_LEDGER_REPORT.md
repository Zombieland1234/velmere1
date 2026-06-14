# Velmère PASS174 — Source Cache + Snapshot Ledger Preview

## Scope
This pass continues PASS173 by adding a concrete preview layer for source envelopes, cache decisions and redacted source snapshots.

## Implemented
- `lib/market-integrity/source-adapter-runtime.ts`
- `components/market-integrity/SourceSnapshotLedgerPanel.tsx`
- `app/api/market-integrity/source-snapshot/route.ts`
- Added the source snapshot ledger panel to `/[locale]/market-integrity`
- Added PASS174 CSS containment and status pills
- Added POST/GET diagnostic preview route for redacted source snapshot envelopes
- Added PASS174 guard and wired it into `verify:shield-all` and `vercel-preflight`

## Important boundary
This still does not write to a durable database and does not fetch third-party APIs. It creates the server-safe envelope/ledger preview layer that real adapters will use.
