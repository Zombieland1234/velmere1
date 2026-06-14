# VELMERE PASS 129 — Evidence Report Draft / Source Ledger

## Base
Built on PASS 128.

## Why this pass
Shield already had a risk score, AI casefile and visual brain. The missing product layer was an export-safe evidence draft: source ledger, missing-data appendix, redaction rules and safe report sections.

## Implemented

### 1. Evidence report builder
Added:
- `lib/market-integrity/evidence-report.ts`

It builds:
- report id,
- source ledger,
- missing-data appendix,
- report sections,
- OSINT queue,
- redaction rules,
- legal-safe note.

### 2. Source ledger modes
The report separates sources as:
- `live`,
- `partial`,
- `fallback`,
- `missing`,
- `blocked`.

This prevents the UI from pretending missing holders/orderbook/OSINT are clean evidence.

### 3. Modal evidence draft card
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

The action panel now shows:
- evidence export status,
- draft mode,
- source count,
- missing-data count,
- report section count,
- report id,
- next blocked/review reason.

### 4. Guard
Added:
- `scripts/verify-evidence-report-safety.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:evidence-report`

### 5. Documentation
Added:
- `docs/launch/EVIDENCE_REPORT_DRAFT_PROTOCOL_PASS129.md`

## Validation
Passed:
- `node scripts/verify-evidence-report-safety.mjs`
- `node scripts/verify-vlm-motion-governor-safety.mjs`
- `node scripts/verify-vlm-brain-performance.mjs`
- `node scripts/verify-shield-runtime-ui-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/verify-risk-engine-safety.mjs`
- `node scripts/verify-locale-surface.mjs`
- `node scripts/verify-ai-brain-import-contract.mjs`
- `node scripts/verify-commerce-launch-safety.mjs`
- `node scripts/verify-product-truth-safety.mjs`
- `node scripts/verify-ai-risk-brain-scenarios.mjs`
- `node scripts/verify-operator-casefile-safety.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old bad terms: 0

## Progress note

| Area | Previous | After PASS 129 | Change |
|---|---:|---:|---:|
| UI shell / layout | 59–60% | 60–61% | +1% |
| Shield terminal | 58–61% | 60–63% | +2% |
| VLM AI risk brain | 47–50% | 48–51% | +1% |
| VLM visual brain / motion | 55–59% | 55–59% | 0% |
| Data / API spine | 35–36% | 36–38% | +1–2% |
| Legal / launch safety | 62–64% | 64–66% | +2% |
| Mobile polish | 42–45% | 42–45% | 0% |
| Full translations | 45–48% | 45–48% | 0% |
| Clothing commerce readiness | 60–63% | 60–63% | 0% |
| Evidence export / report draft | 22–28% | 32–38% | +10% |
| Whole brand/site launch readiness | 63–65% | 64–66% | +1% |

## Remaining blockers
- Still no persistent audit storage.
- Still no PDF/JSON renderer.
- Fresh web OSINT remains blocked until production fetching/source scoring is wired.
- Full Next/Vercel build must still be checked in real repo with dependencies installed.
