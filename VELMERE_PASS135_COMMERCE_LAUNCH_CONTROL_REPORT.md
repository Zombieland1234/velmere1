# VELMERE PASS 135 — Commerce Launch Control

## Base
Built on PASS 134.

## Why this pass
The biggest business blocker after Square/VLM was commerce readiness. A luxury store cannot look ready to take money unless provider, tax, shipping, returns and order-state flows are production verified. PASS135 adds a launch-control layer for shop, product, cart, checkout and admin import.

## Implemented

### 1. Commerce launch-control model
Added:
- `lib/launch/commerce-launch-control.ts`

Covered:
- Shop catalogue
- Product detail pages
- Cart
- Checkout
- Fulfillment provider truth
- Admin import products

Each item has:
- route
- progress
- status
- customer promise
- safety boundary
- launch blockers
- next build step

### 2. Commerce launch-control UI
Added:
- `components/launch/CommerceLaunchControl.tsx`

Rendered on:
- `app/[locale]/shop/page.tsx`
- `app/[locale]/clothing/page.tsx`
- `app/[locale]/shop/[id]/page.tsx`
- `app/[locale]/cart/page.tsx`
- `app/[locale]/checkout/page.tsx`
- `app/[locale]/admin/import-products/page.tsx`

### 3. Checkout route
Added:
- `app/[locale]/checkout/page.tsx`

The checkout route is deliberately blocked and explains in PL/DE/EN that payment stays disabled until provider, tax, shipping, order confirmation and returns are production verified.

### 4. Audit/progress updates
Updated:
- `lib/launch/site-page-audit.ts`
- `lib/launch/project-progress.ts`
- `docs/progress/PROJECT_PROGRESS_LEDGER.md`

### 5. Guard
Added:
- `scripts/verify-commerce-launch-control-safety.mjs`

Updated:
- `scripts/verify-site-page-audit-safety.mjs`
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:commerce-launch-control`

## Validation
Passed:
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

## Progress after PASS 135

| Area | Previous | After PASS 135 | Change |
|---|---:|---:|---:|
| UI shell / layout | 65–67% | 66–68% | +1% |
| Shield terminal | 66–68% | 66–68% | 0% |
| VLM AI risk brain | 49–52% | 49–52% | 0% |
| VLM visual brain / motion | 59–62% | 59–62% | 0% |
| Data / API spine | 41–42% | 42–43% | +1% |
| Legal / launch safety | 70–72% | 71–73% | +1% |
| Mobile polish | 44–47% | 44–47% | 0% |
| Full translations | 52–54% | 53–55% | +1% |
| Clothing commerce readiness | 61–64% | 64–66% | +3% |
| Checkout / fulfillment readiness | 30–36% | 36–39% | +3–6% |
| Square/community readiness | 48–50% | 48–50% | 0% |
| VLM access layer | 57–59% | 57–59% | 0% |
| Vercel/static build safety | 72–75% | 74–77% | +2% |
| Whole brand/site launch readiness | 69–71% | 70–72% | +1% |

## Detailed commerce state

| Route/system | Progress | Status |
|---|---:|---|
| `/[locale]/shop` | 67% | partial |
| `/[locale]/clothing` | 68% | solid |
| `/[locale]/shop/[id]` | 68% | partial |
| `/[locale]/cart` | 36% | launch_control |
| `/[locale]/checkout` | 26% | blocked |
| Provider SKU/fulfillment truth | 34% | blocked |
| `/[locale]/admin/import-products` | 38% | blocked |

## Biggest blockers
- payment provider,
- tax/shipping rates,
- provider SKU ledger,
- return/refund flow,
- order state and confirmation,
- admin route auth/environment gate,
- real Vercel `npm run build` confirmation.
