# Velmère PASS 138 — Shipping + Returns Truth Matrix

## Purpose
PASS138 attacks the next checkout blocker: shipping and returns truth. Payment should remain blocked until delivery regions, shipping cost, tax, return rights, refund flow and provider exceptions are source-confirmed.

## Added runtime/data layer
- `lib/launch/shipping-returns-truth.ts`
- `components/launch/ShippingReturnsTruthPanel.tsx`

## Pages integrated
- `/[locale]/checkout`
- `/[locale]/shop`
- `/[locale]/clothing`
- `/[locale]/shop/[id]`
- `/[locale]/legal/shipping`
- `/[locale]/legal/returns`

## New legal route
Added:
- `app/[locale]/legal/returns/page.tsx`

Added `Legal.returns` translations in:
- `messages/pl.json`
- `messages/en.json`
- `messages/de.json`

## Matrix tracks
- shipping regions,
- shipping costs,
- return rights,
- refund flow,
- provider exceptions.

## Safety rule
No checkout/payment launch while shipping cost, tax, refund flow and provider exceptions are missing or only draft-level.

## Next blockers
- production shipping-rate engine,
- tax calculation,
- order/refund state,
- provider exception appendix per SKU,
- final legal review.
