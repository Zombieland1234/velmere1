# VELMERE PASS 138 — Shipping + Returns Truth Matrix

## Base
Built on PASS 137.

## Why this pass
After provider/SKU truth, the next real commerce blocker is shipping and returns. A store cannot ask for payment if delivery regions, cost, tax, return rights, refund route and provider exceptions are unclear.

## Implemented

### 1. Shipping/returns truth matrix
Added:
- `lib/launch/shipping-returns-truth.ts`

Tracks:
- shipping regions,
- shipping costs,
- return rights,
- refund flow,
- provider exceptions.

### 2. ShippingReturnsTruthPanel
Added:
- `components/launch/ShippingReturnsTruthPanel.tsx`

Rendered on:
- `app/[locale]/checkout/page.tsx`
- `app/[locale]/shop/page.tsx`
- `app/[locale]/clothing/page.tsx`
- `app/[locale]/shop/[id]/page.tsx`
- `app/[locale]/legal/shipping/page.tsx`
- `app/[locale]/legal/returns/page.tsx`

### 3. Returns legal route
Added:
- `app/[locale]/legal/returns/page.tsx`

Added translations:
- `messages/pl.json`
- `messages/en.json`
- `messages/de.json`

### 4. Progress/audit updates
Updated:
- `lib/launch/project-progress.ts`
- `lib/launch/site-page-audit.ts`
- `lib/launch/commerce-launch-control.ts`

### 5. Guard
Added:
- `scripts/verify-shipping-returns-truth-safety.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:shipping-returns-truth`

## Validation
Passed:
- `node scripts/verify-shipping-returns-truth-safety.mjs` → exit 0
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

## Progress after PASS 138

| Area | Previous | After PASS 138 | Change |
|---|---:|---:|---:|
| UI shell / layout | 68–70% | 69–71% | +1% |
| Shield terminal | 66–68% | 66–68% | 0% |
| VLM AI risk brain | 49–52% | 49–52% | 0% |
| VLM visual brain / motion | 59–62% | 59–62% | 0% |
| Data / API spine | 44–45% | 45–46% | +1% |
| Legal / launch safety | 73–75% | 75–77% | +2% |
| Mobile polish | 45–48% | 45–48% | 0% |
| Full translations | 55–57% | 57–59% | +2% |
| Clothing commerce readiness | 68–70% | 69–71% | +1% |
| Product card system | 73–75% | 73–75% | 0% |
| Product detail pages | 73–75% | 74–76% | +1% |
| Checkout / fulfillment readiness | 42–44% | 45–47% | +3% |
| Provider truth readiness | 42–46% | 43–47% | +1% |
| Shipping / returns truth | 0% | 40–45% | new module |
| Square/community readiness | 48–50% | 48–50% | 0% |
| VLM access layer | 57–59% | 57–59% | 0% |
| Vercel/static build safety | 77–79% | 78–80% | +1% |
| Whole brand/site launch readiness | 72–74% | 73–75% | +1% |

## Biggest blockers
- production shipping-rate engine,
- tax calculation,
- order/refund state,
- provider exception appendix per SKU,
- final legal review,
- real Vercel `npm run build` confirmation.
