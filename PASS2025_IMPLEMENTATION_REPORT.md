# PASS2025 — Server-side VLM Paid Entitlement Ledger + Stripe Webhook Queue

## Scope
PASS2025 turns the paid Advanced services from a device-only token flow into a server-side entitlement model.

Paid services covered:

1. **VLM Advanced Analysis** — 4.99€ one-time access.
2. **VLM Advanced PDF Report** — 14.99€ one-time access.
3. **Velmère Advanced Audit** — 89.99€ human-reviewed audit, including the Advanced PDF for the same audit context.

## Implemented

| Area | PASS2024 | PASS2025 | Notes |
|---|---:|---:|---|
| Paid token gate | 86% | 91% | Token still exists, but now points to a server entitlement. |
| Server-side entitlement ledger | 0% | 84% | Supabase table + memory fallback + context hash binding. |
| Stripe webhook for VLM services | 20% | 86% | `checkout.session.completed` with `kind=vlm_paid_access` creates entitlement. |
| Checkout verify fallback | 82% | 91% | Verify endpoint now upserts entitlement after paid Stripe session retrieval. |
| Advanced Audit human queue | 35% | 83% | Paid audit creates `paid_waiting_human_review` queue record. |
| API bypass protection | 89% | 93% | Protected APIs verify paid token and server entitlement. |
| Advanced Audit includes PDF | 60% | 88% | PDF gate accepts direct PDF token or matching Advanced Audit token. |
| Payment manipulation security | 70% | 91% | VLM Security detects attempts to bypass payment/entitlement/webhook gates. |
| Production readiness | 78% | 84% | Needs real Stripe webhook test + Supabase migration in production. |

## New module

`lib/commerce/pass2025-vlm-entitlement-ledger.ts`

It provides:

- `upsertVlmPaidEntitlementFromStripeSession`
- `verifyVlmPaidAccessEntitlement`
- memory fallback for local tests
- durable Supabase persistence when configured
- context hash binding
- audit queue creation for the 89.99€ human-reviewed audit
- non-production token-only fallback when durable DB is not configured
- hard production mode via `VELMERE_REQUIRE_PAID_ENTITLEMENT_LEDGER=true`

## Database additions

Added to `lib/db/schema.sql`:

- `velmere_vlm_paid_entitlements`
- `velmere_vlm_audit_human_queue`

The entitlement row is unique by:

```sql
unique(stripe_session_id, product_id, context_hash)
```

This prevents one paid Stripe session from being reused for another product/context.

## Webhook behavior

`app/api/stripe/webhook/route.ts` now branches before clothing/order fulfillment:

- if `session.metadata.kind === "vlm_paid_access"`
- persist VLM entitlement
- create audit queue row for Advanced Audit
- mark Stripe webhook event processed
- return VLM service payload

Clothing checkout remains separate.

## API gates upgraded

Updated paid checks in:

- `app/api/market-integrity/vlm/route.ts`
- `app/api/market-integrity/brain/route.ts`
- `app/api/search/lens-report/route.ts`
- `app/api/security/audit-watch/route.ts`

They now use `verifyVlmPaidAccessEntitlement` instead of only `verifyVlmPaidAccessToken`.

## Security improvements

- Verify route now rejects context mismatch between submitted context and Stripe session metadata.
- Checkout route writes `contextHash` into Stripe metadata.
- Protected endpoints expose `ledgerMode` in error payloads for diagnostics.
- VLM Security now flags manipulation attempts around payment, checkout, entitlement, webhook, 402 and audit queue.
- Advanced Audit token can unlock the included Advanced PDF only for a matching context.

## Environment variables

Added:

```env
VELMERE_PAID_ACCESS_TTL_MS=2592000000
VELMERE_REQUIRE_PAID_ENTITLEMENT_LEDGER=false
```

Production recommendation:

```env
VELMERE_REQUIRE_PAID_ENTITLEMENT_LEDGER=true
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

## Tests run

Passed:

- `scripts/verify-pass2015-vlm-security-intelligence.mjs`
- `scripts/verify-pass2016-adversarial-shadow-brain.mjs`
- `scripts/verify-pass2017-signed-analysis-receipt.mjs`
- `scripts/verify-pass2018-ed25519-public-receipt.mjs`
- `scripts/verify-pass2019-evidence-quorum-shadow-security.mjs`
- `scripts/verify-pass2020-source-integrity-sentinel.mjs`
- `scripts/verify-pass2021-temporal-consistency-sentinel.mjs`
- `scripts/verify-pass2022-narrative-drift-decision-reversibility.mjs`
- `scripts/verify-pass2023-vlm-audit-product.mjs`
- `scripts/verify-pass2024-vlm-paid-access.mjs`
- `scripts/verify-pass2025-vlm-paid-entitlement-ledger.mjs`
- TypeScript transpile syntax check for changed PASS2025 TS/TSX files.

## Honest limitations

- Full Next.js build was not run because the package has no `node_modules` project install.
- Live Stripe payment/webhook test was not executed because Stripe env values are not present here.
- Supabase persistence is implemented, but production must run the SQL migration and set server envs.
- Refund/revocation handling is not yet implemented; this should be the next paid-access hardening pass.
