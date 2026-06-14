# PASS316 — Public Commerce Trim + Buyer Surface

## Goal
Continue the public cleanup branch after PASS314/PASS315. The store and product pages should not show operator launch-control walls to customers. The customer should see product-first commerce: garment, price, size, material, delivery/returns boundary and calm preview state.

## Research context
- MEXC live-style proof patterns require expiry and reconnection discipline; a WebSocket connection is not permanent.
- MEXC proof/reserve transparency is a snapshot context, not a public guarantee.
- LVMH/Aura/DPP direction supports concise traceability and authenticity context, not a wall of internal operator audit data.

## Implemented
- Added `lib/market-integrity/public-commerce-trim-gate.ts`.
- Removed public rendering of `CommerceLaunchControl`, `ProviderTruthLedgerPanel` and `ShippingReturnsTruthPanel` from:
  - `app/[locale]/shop/page.tsx`
  - `app/[locale]/clothing/page.tsx`
  - `app/[locale]/shop/[id]/page.tsx`
- Added public shop buyer brief in `components/shop/ShopPageClient.tsx`.
- Hid the deep shop readiness block behind `pass316-commerce-operator-hidden`.
- Simplified product detail provider truth into customer-safe signals: preview drop, size first, checkout locked until ready.
- Added CSS containment and hide rules for PASS316.
- Added guard `scripts/verify-pass316-public-commerce-trim-gate-safety.mjs`.
- Added npm script `verify:pass316-public-commerce-trim-gate` and appended it to `verify:shield-all`.

## Safety boundary
PASS316 does not delete the underlying audit architecture. It removes it from customer-facing shop routes and keeps the audit debt in code/admin/guard lanes.

## Validation
Passed:
- `npm run verify:pass316-public-commerce-trim-gate`
- `npm run verify:pass315-customer-surface-trim-gate`
- `npm run verify:pass314-public-signal-diet-gate`
- `npm run check:i18n`
- `npm run vercel:preflight`

`npm run typecheck` still fails on inherited dependency/type blockers: missing `next`, `react`, `node`, `lucide-react`, `next-intl` type declarations and older props/children errors. PASS316 did not introduce a new visible typecheck class in the first error set.

## Delta
| ID | Area | Previous | Current | Change |
|---|---:|---:|---:|
| G01 | Product cards / customer-first store surface | 73 | 76 | +3 |
| G02 | Product detail truth / customer-safe copy | 73 | 77 | +4 |
| G03 | Cart / checkout surface boundary | 50 | 53 | +3 |
| G07 | Fulfilment handoff public boundary | 26 | 29 | +3 |
| B04 | Conversion path clarity | 65 | 68 | +3 |
| J03 | Responsive/public layout containment | 74 | 76 | +2 |
| M04 | Safe export/customer wording | 83 | 85 | +2 |
| A06 | Runtime observability / public-vs-operator split | 98 | 99 | +1 |

PASS316 total: +21 points.
