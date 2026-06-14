# VELMERE PASS 101 — Evidence Export Endpoint + Copy/Download UI

## Base
Built on PASS 100 `velmere_pass100_evidence_report_source_ledger`.

## Main goal
Turn the Evidence Report Draft into an actual exportable artifact layer.

## Implemented

### 1. Evidence export route
Added:
- `app/api/market-integrity/evidence-export/route.ts`

Supports:
- `/api/market-integrity/evidence-export?query=SOL&format=markdown`
- `/api/market-integrity/evidence-export?query=SOL&format=json`

Markdown export:
- returns `text/markdown`
- attachment filename
- no-store cache

JSON export:
- returns structured JSON with:
  - result
  - investigator
  - evidenceReport
  - terminalEvidenceExport

Also includes `buildTerminalEvidenceExport` to preserve PASS73 verification/design contracts.

### 2. Shield Map export UI
Updated:
- `components/market-integrity/ShieldMapClient.tsx`

Evidence Report Draft now has buttons:
- copy md
- download markdown
- download json

Copy uses `navigator.clipboard` and shows a temporary `copied` state.

### 3. Styling
Updated:
- `app/globals.css`

Added:
- `.shield-evidence-export-button`

### 4. Validation
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
This is still draft export. Public-grade reporting still needs:
- persistent source snapshots,
- web OSINT sources,
- redaction policy,
- wallet/VLM gating,
- rate limiting,
- audit log,
- PDF renderer.
