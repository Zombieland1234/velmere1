# VELMERE PASS 122 — Product Truth / Size / Care Layer

## Base
Built on PASS 121.

## Why this pass
PASS 121 added a commerce readiness audit. The next real blocker was product truth: products need material, composition, fit, care, size guide, delivery and returns data before launch.

## Implemented

### 1. Product truth types
Updated:
- `lib/products/types.ts`

Added:
- `ProductTruthProfile`
- `ProductSizeMeasurement`
- optional `product.truth`

### 2. Product truth profiles for preview drop
Updated:
- `lib/products/catalog.generated.ts`

All four preview products now have structured:
- material
- composition
- weight
- fit
- care instructions
- size guide note
- measurements
- delivery note
- return note
- launch-control note

The copy stays honest: planned/preview values remain labelled as planned until production is confirmed.

### 3. Product cards use truth data
Updated:
- `components/product/ProductCard.tsx`

Product card metrics now use:
- product truth weight
- product truth material
- product truth fit

This removes the fake generic 450gsm style metric for every product.

### 4. Product detail page uses truth data
Updated:
- `components/shop/ProductDetailClient.tsx`

Product pages now render:
- dynamic specs from product truth
- product-specific care
- product-specific shipping/returns notes
- launch-control note
- product-specific measurement table

### 5. SEO / JSON-LD product enrichment
Updated:
- `app/[locale]/shop/[id]/page.tsx`

Product JSON-LD now includes:
- material/composition
- size list
- fit/care/launch note as additional properties when available

### 6. Launch readiness checks product truth
Updated:
- `lib/products/launch-readiness.ts`

Now audits:
- product truth missing
- material missing
- composition missing
- fit missing
- care missing
- size guide missing
- delivery note missing
- return note missing

### 7. Product truth guard
Added:
- `scripts/verify-product-truth-safety.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:product-truth`

`verify:shield-all` now includes product truth safety.

### 8. Documentation
Added:
- `docs/launch/PRODUCT_TRUTH_SIZE_CARE_PROTOCOL.md`

## Validation
Passed:
- `node scripts/check-i18n.mjs` → exit 0
- `node scripts/vercel-preflight.mjs` → exit 0
- `node scripts/verify-market-integrity-no-truncation.mjs` → exit 0
- `node scripts/verify-shield-design-safety.mjs` → exit 0
- `node scripts/verify-risk-engine-safety.mjs` → exit 0
- `node scripts/verify-vlm-brain-performance.mjs` → exit 0
- `node scripts/verify-locale-surface.mjs` → exit 0
- `node scripts/verify-ai-brain-import-contract.mjs` → exit 0
- `node scripts/verify-commerce-launch-safety.mjs` → exit 0
- `node scripts/verify-product-truth-safety.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old bad terms: 0

## Progress note

| Area | Previous | After PASS 122 | Change |
|---|---:|---:|---:|
| UI shell / layout | 52–53% | 53–54% | +1% |
| Shield terminal | 46–48% | 46–48% | 0% |
| VLM AI risk brain | 34–38% | 34–38% | 0% |
| VLM visual brain / motion | 38–42% | 38–42% | 0% |
| Data / API spine | 33–34% | 33–34% | 0% |
| Legal / launch safety | 56–58% | 58–60% | +2% |
| Mobile polish | 32–34% | 33–35% | +1% |
| Full translations | 43–46% | 44–47% | +1% |
| Clothing commerce readiness | 54–57% | 60–63% | +6% |
| Whole brand/site launch readiness | 52–54% | 54–56% | +2% |

## Remaining blockers
- Truth values still need real supplier confirmation.
- Need final SKU/variant mapping and fulfilment tests.
- Need sample QA and shrinkage/care tests before sale.
- Full Vercel build/deploy still needs confirmation.
