# VELMERE PASS 100 — Evidence Report Draft + Source Ledger

## Base
Built on PASS 99 `velmere_pass99_loss_prevention_shield_bot`.

## Main goal
Milestone PASS 100: move VLM Shield Investigator closer to a real product by adding evidence report drafts and source ledger output.

## Implemented

### 1. Evidence report builder
Added:
- `lib/market-integrity/evidence-report.ts`

It builds:
- report id
- report title/subtitle
- warning
- blocked-by list
- source ledger
- evidence sections
- markdown draft

This is not final public export yet. It is a structured draft layer for future PDF/JSON evidence export.

### 2. API integration
Updated:
- `app/api/market-integrity/investigator/route.ts`
- `app/api/market-integrity/assistant/route.ts`
- `app/api/market-integrity/chat/route.ts`

These endpoints now return:
- `investigator`
- `evidenceReport`

### 3. Shield Map live result UI
Updated:
- `components/market-integrity/ShieldMapClient.tsx`

Live Investigator Console now shows:
- Evidence Report Draft
- report id
- warning
- evidence sections
- source ledger modes:
  - live
  - partial
  - fallback
  - required
  - blocked

### 4. Styling
Updated:
- `app/globals.css`

Added styles for:
- evidence report draft
- evidence section cards
- source ledger chips

## Why it matters
The bot now moves beyond “risk score” into an auditable thinking structure:
- what is known,
- what is missing,
- what source mode exists,
- what is blocked,
- what needs web OSINT,
- why the verdict is not final.

This is the foundation for future evidence export and public-grade reports.

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

## Remaining
Still needed:
- real web OSINT adapter,
- persistent source snapshots,
- PDF/JSON export route,
- wallet/VLM access gating,
- report redaction policy,
- full production Vercel build loop.
