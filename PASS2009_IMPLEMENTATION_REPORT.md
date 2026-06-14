# PASS2009 - cart and checkout truth sweep

## Scope
- Full cart page hydration and real-item rendering.
- Cart drawer motion, scroll ownership and totals.
- Checkout success and cancel truthfulness.
- PL/DE/EN checkout copy.
- Mobile and reduced-motion behavior.

## Main changes
- The cart page now renders persisted items, quantities, sizes, line totals and subtotal.
- Added a hydration state so a populated cart does not flash as empty.
- Removed the hard-coded German 19% VAT calculation from the international cart.
- Shipping and taxes are now described as address-dependent checkout values.
- Removed random `ready to ship` claims from cart lines.
- Cart drawer now locks background scroll and uses a 280 ms entrance.
- Success receipt shows payment verification pending instead of falsely confirmed.
- Checkout references are masked instead of printed in full.
- Cancel receipt no longer guarantees that no payment was captured.
- Updated all three locales and added scoped visual/accessibility guards.

## Validation
- `npm run verify:pass2009-cart-checkout-truth-sweep`
- `npm run verify:pass2008-commerce-lookbook-archive-sweep`
- `npm run check:i18n`
- `npm run vercel:preflight`

## Visual thesis
Receipts and totals should feel factual, restrained and auditable.

## Interaction thesis
One scroll owner, short drawer motion and no empty-state flash during hydration.
