# VELMERE PASS 114 — Clothing Commerce Layer

## Base
Built on PASS 113.

## Why this pass
The user reminded us that Velmère is also about clothing. This pass recenters the product around fashion commerce so VLM/Shield/Square remain a digital layer, not the whole brand.

## Implemented

### 1. Shop / Clothing commerce-first blocks
Updated:
- `components/shop/ShopPageClient.tsx`

Added localized commerce blocks:
- PL
- DE
- EN

New message:
- Clothing is the core of Velmère.
- Fit, material, delivery and returns must lead the buying decision.
- VLM/Shield/Square increase trust but do not replace the product.
- VLM never blocks purchase.

Added rails:
- Fit
- Material
- Delivery

### 2. Homepage clothing-first atelier section
Updated:
- `components/home/HomePageClient.tsx`

Added a clothing-first section:
- Cut
- Material
- Trust

Purpose:
- communicate that garments remain the anchor
- make the homepage feel like fashion first, digital layer second

Also updated homepage launch-reality percentages so the page does not show stale low project numbers.

### 3. Product card commerce polish
Updated:
- `components/product/ProductCard.tsx`

Added:
- localized pro-card metrics
- localized fit/delivery/returns note
- clearer material/fit trust layer in product browsing

Languages:
- PL
- DE
- EN

### 4. Safety retained
No checkout/VLM merge was introduced. Clothing purchase remains separate from token/access layer.

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old TokenRisk/risk-engine bad terms: 0

## Progress note

| Area | Previous | After PASS 114 | Change |
|---|---:|---:|---:|
| UI shell / layout | 44–45% | 46–47% | +2% |
| Shield terminal | 38–40% | 38–40% | 0% |
| VLM AI risk brain | 18–25% | 18–25% | 0% |
| Data / API spine | 30–31% | 30–31% | 0% |
| Legal / launch safety | 44–45% | 45–46% | +1% |
| Mobile polish | 23–24% | 24–25% | +1% |
| Full translations | 31–32% | 32–33% | +1% |
| Clothing commerce readiness | 34–36% | 41–43% | +6–7% |
| Whole brand/site launch readiness | 35–36% | 37–39% | +2–3% |

## Next PASS 115
Recommended:
- integrate Codex risk-engine if returned
- otherwise add real product launch checklist page/section
- improve product detail page: size, care, delivery, returns, fulfilment status
- clean old PL/EN mixed copy in message JSON
- continue VLM visual brain performance work
