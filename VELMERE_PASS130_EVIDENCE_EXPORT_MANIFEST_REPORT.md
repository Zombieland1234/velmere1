# VELMERE PASS 130 — Evidence Export Manifest / JSON Preview

## Base
Built on PASS 129.

## Why this pass
PASS129 created the evidence report draft. The next blocker was making that draft usable: a safe JSON preview manifest that can be downloaded or copied without pretending it is a final legal report.

## Implemented

### 1. Evidence export manifest model
Updated:
- `lib/market-integrity/evidence-report.ts`

Added:
- `ShieldEvidenceExportManifest`
- `buildShieldEvidenceExportManifest`
- `serializeShieldEvidenceExportManifest`
- `exportBlockedReason`

The manifest includes:
- schema version
- preview-only mode
- export status
- report id
- case id
- token score/confidence
- source ledger
- missing-data appendix
- sections
- OSINT queue
- operator checklist
- redaction rules
- legal note
- copy guard
- blocked reason

### 2. Evidence manifest UI in token modal
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

Added:
- Download JSON
- Copy JSON
- localized PL/DE/EN copy
- preview-only status
- blocked reason

### 3. CSS
Updated:
- `app/globals.css`

Added:
- `PASS130 — evidence JSON manifest preview`
- `.shield-evidence-export-manifest`

### 4. Guard
Added:
- `scripts/verify-evidence-export-manifest-safety.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:evidence-export-manifest`

### 5. Documentation
Added:
- `docs/launch/EVIDENCE_EXPORT_MANIFEST_PROTOCOL_PASS130.md`

## Safety boundary
The export is still a JSON preview for operator review. It is not:
- final legal proof,
- financial advice,
- a fraud/scam accusation,
- production PDF export.

## Validation
Passed:
- `node scripts/verify-evidence-export-manifest-safety.mjs` → exit 0
- `node scripts/verify-evidence-report-safety.mjs` → exit 0
- `node scripts/verify-vlm-motion-governor-safety.mjs` → exit 0
- `node scripts/verify-vlm-brain-performance.mjs` → exit 0
- `node scripts/verify-shield-runtime-ui-safety.mjs` → exit 0
- `node scripts/check-i18n.mjs` → exit 0
- `node scripts/vercel-preflight.mjs` → exit 0
- `node scripts/verify-market-integrity-no-truncation.mjs` → exit 0
- `node scripts/verify-shield-design-safety.mjs` → exit 0
- `node scripts/verify-risk-engine-safety.mjs` → exit 0
- `node scripts/verify-locale-surface.mjs` → exit 0
- `node scripts/verify-ai-brain-import-contract.mjs` → exit 0
- `node scripts/verify-commerce-launch-safety.mjs` → exit 0
- `node scripts/verify-product-truth-safety.mjs` → exit 0
- `node scripts/verify-ai-risk-brain-scenarios.mjs` → exit 0
- `node scripts/verify-operator-casefile-safety.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old bad terms: 1

## Progress note

| Area | Previous | After PASS 130 | Change |
|---|---:|---:|---:|
| UI shell / layout | 60–61% | 61–62% | +1% |
| Shield terminal | 60–63% | 62–65% | +2% |
| VLM AI risk brain | 48–51% | 48–51% | 0% |
| VLM visual brain / motion | 55–59% | 55–59% | 0% |
| Data / API spine | 36–38% | 37–39% | +1% |
| Legal / launch safety | 64–66% | 66–68% | +2% |
| Mobile polish | 42–45% | 42–45% | 0% |
| Full translations | 45–48% | 46–49% | +1% |
| Clothing commerce readiness | 60–63% | 60–63% | 0% |
| Evidence export / report draft | 32–38% | 42–48% | +10% |
| Whole brand/site launch readiness | 64–66% | 65–67% | +1% |

## Detailed progress

| Element | Progress |
|---|---:|
| Home / brand landing | 56–59% |
| Clothing collection page | 64–67% |
| Product card system | 67–70% |
| Product detail pages | 62–66% |
| Checkout / fulfilment | 25–30% |
| Shipping / returns / legal pages | 61–65% |
| VLM token/access page | 46–51% |
| Velmère Square/community | 36–43% |
| Shield market table | 59–62% |
| Shield token modal/chart | 63–66% |
| VLM visual brain | 55–59% |
| VLM AI risk brain | 48–51% |
| Operator AI Case File | 52–56% |
| Evidence report draft | 42–48% |
| Data/API spine | 37–39% |
| Mobile performance | 42–45% |
| Full PL/EN/DE translations | 46–49% |
| Launch safety / RegTech copy | 66–68% |
