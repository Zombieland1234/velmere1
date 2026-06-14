# VELMERE PASS 137 — Product Provider Snapshot + SKU Truth Cards

## Base
Built on PASS 136.

## Why this pass
PASS136 created the provider truth ledger. PASS137 brings that logic directly into the product surfaces. A user/operator can now see product-level provider source state instead of only a global ledger.

## Implemented

### 1. Product card snapshot
Updated:
- `components/product/ProductCard.tsx`

Added:
- provider snapshot in basic mode,
- provider snapshot in Pro mode,
- provider score,
- source mode,
- missing fields preview,
- blocked/manual review labels.

### 2. Product detail Provider / SKU truth card
Updated:
- `components/shop/ProductDetailClient.tsx`

Added:
- provider mode,
- source mode,
- score,
- status,
- missing provider data list.

### 3. Data layer update
Updated:
- `lib/launch/provider-truth-ledger.ts`

Changed all-SKU readiness to reflect that SKU truth snapshots now surface on cards/details.

### 4. Guard
Added:
- `scripts/verify-product-provider-snapshot-safety.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`
- compatibility checks in older commerce/provider guards.

New command:
- `npm run verify:product-provider-snapshot`

## Validation
Passed:
- `node scripts/verify-product-provider-snapshot-safety.mjs` → exit 0
- `node scripts/verify-provider-truth-admin-gate-safety.mjs` → exit 0
- `node scripts/verify-commerce-launch-control-safety.mjs` → exit 0
- `node scripts/verify-square-vlm-launch-control-safety.mjs` → exit 0
- `node scripts/verify-site-page-audit-safety.mjs` → exit 0
- `node scripts/verify-vercel-static-safety.mjs` → exit 0
- `node scripts/verify-operator-copy-progress-safety.mjs` → exit 0
- `node scripts/verify-orbit-layout-cleanup-safety.mjs` → exit 0
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
- direct runtime MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX source artifacts: 0
- old bad terms: 0

## Progress after PASS 137

| Area | Previous | After PASS 137 | Change |
|---|---:|---:|---:|
| UI shell / layout | 67–69% | 68–70% | +1% |
| Shield terminal | 66–68% | 66–68% | 0% |
| VLM AI risk brain | 49–52% | 49–52% | 0% |
| VLM visual brain / motion | 59–62% | 59–62% | 0% |
| Data / API spine | 43–44% | 44–45% | +1% |
| Legal / launch safety | 72–74% | 73–75% | +1% |
| Mobile polish | 44–47% | 45–48% | +1% |
| Full translations | 54–56% | 55–57% | +1% |
| Clothing commerce readiness | 66–68% | 68–70% | +2% |
| Product card system | 70–73% | 73–75% | +3% |
| Product detail pages | 70–73% | 73–75% | +3% |
| Checkout / fulfillment readiness | 39–42% | 42–44% | +3% |
| Provider truth readiness | 35–40% | 42–46% | +6% |
| Square/community readiness | 48–50% | 48–50% | 0% |
| VLM access layer | 57–59% | 57–59% | 0% |
| Vercel/static build safety | 76–78% | 77–79% | +1% |
| Whole brand/site launch readiness | 71–73% | 72–74% | +1% |

## Biggest blockers
- real provider source snapshots per SKU,
- shipping-region proof,
- return exceptions per provider,
- payment/tax/shipping/order/refund flows,
- real Vercel `npm run build` confirmation.
