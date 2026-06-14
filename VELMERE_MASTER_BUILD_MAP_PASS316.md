# VELMERE MASTER BUILD MAP — PASS316 delta

PASS316 continues the customer-surface cleanup branch after PASS314/PASS315.

## PASS316 — Public Commerce Trim + Buyer Surface

Public shop/product routes now remove the long operator launch-control panels from customer pages. Commerce audit remains in code/admin/guard surfaces, while buyers see a product-first store: garment, price, size, material, delivery/returns boundary and a calm preview state.

## Touched IDs

| ID | Area | Previous | Current | Change | Next step |
|---|---|---:|---:|---:|---|
| G01 | Product cards / customer-first store surface | 73 | 76 | +3 | Browser QA on shop grid, filters and product card spacing. |
| G02 | Product detail truth / customer-safe copy | 73 | 77 | +4 | Add final size chart/source snapshots per SKU. |
| G03 | Cart / checkout surface boundary | 50 | 53 | +3 | Keep checkout blocked until real totals, tax, shipping and payment exist. |
| G07 | Fulfilment handoff public boundary | 26 | 29 | +3 | Connect provider SKU mapping and fulfillment truth source. |
| B04 | Conversion path clarity | 65 | 68 | +3 | Make Home → Shop → Product → Waitlist path cleaner. |
| J03 | Responsive/public layout containment | 74 | 76 | +2 | Mobile QA for shop/product pages after hidden operator panels. |
| M04 | Safe export/customer wording | 83 | 85 | +2 | Keep provider/audit debt out of public customer copy. |
| A06 | Runtime observability / public-vs-operator split | 98 | 99 | +1 | Persist operator-only evidence in admin/storage later. |

## PASS316 marker

- `PASS316_PUBLIC_COMMERCE_TRIM_GATE`
- `data-pass316-public-commerce-trim="shop"`
- `data-pass316-public-commerce-trim="product"`
- `data-pass316-store-buyer-brief="true"`
- `data-pass316-product-customer-signals="true"`

## Boundary

Do not re-add `CommerceLaunchControl`, `ProviderTruthLedgerPanel` or `ShippingReturnsTruthPanel` directly under public shop/product routes. Those surfaces belong to admin/operator launch control, not customer pages.
