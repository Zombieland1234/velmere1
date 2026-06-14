# Velmère PASS 137 — Product Provider Snapshot + SKU Truth Cards

## Purpose
PASS136 created the provider truth ledger. PASS137 makes it visible at product level: product cards and product detail pages now show provider mode, SKU/source state, snapshot score and missing data.

## Product Card UI
Updated:
- `components/product/ProductCard.tsx`

Added:
- provider snapshot in basic list mode,
- provider snapshot in Pro card mode,
- source mode,
- score,
- missing fields preview,
- blocked/manual-review wording.

## Product Detail UI
Updated:
- `components/shop/ProductDetailClient.tsx`

Added:
- Provider / SKU truth card,
- provider mode,
- source mode,
- score,
- status,
- missing data list.

## Data layer update
Updated:
- `lib/launch/provider-truth-ledger.ts`

The all-SKU readiness row now acknowledges that SKU truth snapshots surface on cards/details.

## Guard
Added:
- `scripts/verify-product-provider-snapshot-safety.mjs`

## Safety
This pass does not make checkout live. It makes the blocked/review state more visible so a customer/operator sees why a product is not production-ready.

## Next blockers
- Real provider source snapshots per SKU.
- Shipping-region proof per provider.
- Return exceptions per provider.
- Payment/tax/shipping/order state.
