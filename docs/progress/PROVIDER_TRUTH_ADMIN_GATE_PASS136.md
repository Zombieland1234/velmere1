# Velmère PASS 136 — Provider Truth Ledger + Admin Gate

## Purpose
PASS136 attacks the next commerce blocker: provider proof. A product should not reach checkout unless provider, SKU, variants, delivery limits and return rules are proven.

## Added runtime/data layer
- `lib/launch/provider-truth-ledger.ts`
- `components/launch/ProviderTruthLedgerPanel.tsx`

## Pages integrated
- `/[locale]/shop`
- `/[locale]/clothing`
- `/[locale]/shop/[id]`
- `/[locale]/checkout`
- `/[locale]/admin/import-products`

## New provider truth model
The ledger tracks:
- Printful provider truth,
- Tapstitch provider truth,
- Contrado/external provider truth,
- manual product truth,
- all-SKU readiness.

## Product snapshot helper
Added `buildProductProviderTruthSnapshot(product)` for later per-product source labels:
- provider mode,
- score,
- missing fields,
- source mode,
- blocked/manual-review state.

## Admin gate
Admin import now has a visible launch-control warning in PL/DE/EN:
- admin import is private,
- must have auth,
- environment gate,
- audit log,
- publish permission,
- cannot look like a customer feature.

## Next blockers
- Product-level SKU truth cards,
- provider source snapshots,
- shipping region proof,
- return exception proof,
- real auth/environment gate for admin.
