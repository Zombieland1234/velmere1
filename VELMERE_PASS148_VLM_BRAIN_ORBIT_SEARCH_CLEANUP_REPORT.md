# VELMERE PASS 148 — VLM Brain Orbit Cleanup + Search Logo Suggestions

## Base
Built on PASS 147.

## What was fixed from screenshots

### 1. Lite removed
Visible motion governor no longer shows Lite.
The UI now exposes:
- Orbit 360
- Static

### 2. Advanced owns Orbit 360
Basic/Pro start with static evidence cards.
Advanced starts with Orbit 360.

### 3. Slower, less aggressive motion
Changed:
- slower token core fly-in,
- slower tile reveal,
- slower auto orbit,
- fewer heavy packets,
- reduced React orbit update churn,
- stronger frame budget for high mode.

### 4. Selected tile panel improved
Selected card detail now:
- has darker opaque background,
- shows source state,
- explains why that tile matters,
- gives a tile-specific next operator step,
- keeps confidence/source/mode data readable.

### 5. Right popup panel cleaned
The extra mode guide under the four metric cards was removed.

### 6. Search suggestions improved
Search suggestions now:
- use stronger token avatar fallback,
- merge local metadata into remote suggestions,
- show symbol/name/rank clearly,
- use stronger z-index/layering.

## Key changed files
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `app/globals.css`
- `lib/launch/project-progress.ts`
- `lib/launch/site-page-audit.ts`
- `scripts/verify-vlm-brain-orbit-cleanup-safety.mjs`
- `scripts/verify-vlm-motion-governor-safety.mjs`
- `scripts/verify-orbit-layout-cleanup-safety.mjs`
- `scripts/verify-operator-copy-progress-safety.mjs`
- `scripts/vercel-preflight.mjs`
- `package.json`

## Validation
Passed:
- `node scripts/verify-vlm-brain-orbit-cleanup-safety.mjs` → exit 0
- `node scripts/verify-vlm-motion-governor-safety.mjs` → exit 0
- `node scripts/verify-vlm-brain-performance.mjs` → exit 0
- `node scripts/verify-orbit-layout-cleanup-safety.mjs` → exit 0
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
- `node scripts/verify-admin-auth-session-idempotency-safety.mjs` → exit 0
- `node scripts/verify-admin-audit-write-api-safety.mjs` → exit 0
- `node scripts/verify-admin-audit-persistence-safety.mjs` → exit 0
- `node scripts/verify-admin-mutation-audit-safety.mjs` → exit 0
- `node scripts/verify-admin-auth-publish-secret-safety.mjs` → exit 0
- `node scripts/verify-secret-redaction-static-safety.mjs` → exit 0
- `node scripts/verify-admin-environment-gate-safety.mjs` → exit 0
- `node scripts/verify-admin-route-gate-safety.mjs` → exit 0
- `node scripts/verify-order-event-ledger-safety.mjs` → exit 0
- `node scripts/verify-payment-order-readiness-safety.mjs` → exit 0
- `node scripts/verify-shipping-returns-truth-safety.mjs` → exit 0
- `node scripts/verify-product-provider-snapshot-safety.mjs` → exit 0
- `node scripts/verify-provider-truth-admin-gate-safety.mjs` → exit 0
- `node scripts/verify-commerce-launch-control-safety.mjs` → exit 0
- `node scripts/verify-square-vlm-launch-control-safety.mjs` → exit 0
- `node scripts/verify-site-page-audit-safety.mjs` → exit 0
- `node scripts/verify-vercel-static-safety.mjs` → exit 0
- `node scripts/verify-operator-copy-progress-safety.mjs` → exit 0
- `node scripts/verify-evidence-report-safety.mjs` → exit 0
- `node scripts/verify-evidence-export-manifest-safety.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct runtime MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX source artifacts: 0
- old bad terms: 0

## Progress after PASS 148

| Area | Previous | After PASS 148 | Change |
|---|---:|---:|---:|
| UI shell / layout | 78–80% | 79–81% | +1% |
| Shield terminal | 66–68% | 69–72% | +3% |
| VLM AI risk brain | 49–52% | 52–55% | +3% |
| VLM visual brain / motion | 59–62% | 68–70% | +8% |
| Data / API spine | 54–56% | 54–56% | 0% |
| Legal / launch safety | 84–86% | 84–86% | 0% |
| Mobile polish | 45–48% | 46–49% | +1% |
| Full translations | 65–67% | 66–68% | +1% |
| Search suggestions UX | 50–55% | 70–74% | +19% |
| Vercel/static build safety | 87–89% | 88–90% | +1% |
| Whole brand/site launch readiness | 82–84% | 83–85% | +1% |

## Remaining blockers
- Confirm real local `npm run build` / Vercel deploy.
- Future WebGL/Three.js may be needed for truly premium 144fps advanced brain.
- Search logos still depend on provider image/proxy.
- AI risk brain still needs live OSINT and real source scoring.
