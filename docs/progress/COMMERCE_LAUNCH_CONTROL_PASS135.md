# Velmère PASS 135 — Commerce Launch Control

## Purpose
PASS135 attacks the biggest remaining business blocker: checkout and fulfillment readiness. The site can look premium, but commerce must not look live until provider, tax, shipping, order-state and return flows are production verified.

## Added runtime/data layer
- `lib/launch/commerce-launch-control.ts`
- `components/launch/CommerceLaunchControl.tsx`

## Pages integrated
- `/[locale]/shop`
- `/[locale]/clothing`
- `/[locale]/shop/[id]`
- `/[locale]/cart`
- `/[locale]/checkout`
- `/[locale]/admin/import-products`

## New checkout route
A blocked checkout route now exists. It explains that payment remains disabled until:
- provider checkout,
- tax,
- shipping,
- order confirmation,
- refunds/returns,
- merchant/legal review
are production ready.

## Commerce safety rules
- No fake stock.
- No hidden shipping/tax surprise.
- No checkout CTA that implies production payment is live.
- No unverified delivery promise.
- Admin import must be gated/disabled before public launch.
- Provider truth must exist per SKU before public checkout.

## Launch-control progress
| Area | Progress | Status |
|---|---:|---|
| Shop catalogue | 67% | partial |
| Product detail pages | 67% | partial |
| Cart | 36% | launch_control |
| Checkout | 26% | blocked |
| Fulfillment provider truth | 34% | blocked |
| Admin import products | 38% | blocked |

## Next blockers
- payment provider,
- tax rules,
- shipping rates,
- order state,
- return/refund flow,
- provider SKU ledger,
- admin auth/environment gate.
