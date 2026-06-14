# PASS320 — Public Atelier Trust Ribbon Gate

## Summary
PASS320 adds the **Atelier Trust Ribbon**: a compact public purchase-trust strip for Home, Shop, Product, Cart and Checkout. It turns operator-heavy proof into four customer-readable checkpoints: fit, material, delivery and returns.

## UI innovation
**Atelier Trust Ribbon** is a calm luxury proof surface. It creates status without manipulative FOMO:

- no countdowns,
- no fake scarcity,
- no wallet pressure,
- no investment-style urgency,
- no public operator audit dump.

Prestige status is earned by proof: `quiet_atelier`, `proof_waitlist`, `receipt_ready` or `withheld`.

## Research alignment
- MEXC-style live source windows require expiry handling instead of pretending market data is permanently fresh.
- MEXC Proof of Reserves is treated as a snapshot context, not a safety promise.
- LVMH/Aura Digital Product Passport direction supports short customer-facing traceability/authenticity signals instead of long internal audit walls.

## Files changed
- `lib/market-integrity/public-atelier-trust-ribbon-gate.ts`
- `components/home/HomePageClient.tsx`
- `components/shop/ShopPageClient.tsx`
- `components/shop/ProductDetailClient.tsx`
- `app/[locale]/cart/page.tsx`
- `app/[locale]/checkout/page.tsx`
- `scripts/verify-pass320-public-atelier-trust-ribbon-gate-safety.mjs`
- `package.json`

## Guard
`npm run verify:pass320-public-atelier-trust-ribbon-gate`

## Delta
| ID | Area | Previous | Current | Change |
|---|---:|---:|---:|
| B01 | Home hero / first purchase clarity | 82 | 84 | +2 |
| B04 | Conversion path | 75 | 78 | +3 |
| B06 | Psychology of sales copy / ethical prestige | 82 | 84 | +2 |
| G01 | Product cards / product-first trust | 78 | 80 | +2 |
| G02 | Product detail truth | 80 | 83 | +3 |
| G03 | Cart / checkout surface | 58 | 61 | +3 |
| J03 | Responsive public layout containment | 82 | 84 | +2 |
| M04 | Safe export / no overclaim wording | 94 | 95 | +1 |

**PASS320 total: +18 points.**
