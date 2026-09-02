# 09 — PAYMENTS AND COMMERCE

UPDATED: 2026-09-02 | CLASSIFICATION: HISTORICAL_UNTRUSTED until revalidated

## State machine (master mission §23, M2)

```
FREE
→ PREVIEW
→ CHECKOUT_READY
→ PAID
→ ENTITLED
→ DELIVERED
→ EXPIRED
→ REFUNDED
→ REVOKED
```

Each transition needs a real test. Current state: most transitions
UNVERIFIED.

## Current status

| Field | Value | Source |
|---|---|---|
| Stop-sell active | YES | Pas 0 review + provider-rights registry |
| Stripe keys in .env.local | MISSING | Pas 1 audit |
| STRIPE_SECRET_KEY | EXTERNAL_BLOCKER | B-003 |
| STRIPE_WEBHOOK_SECRET | EXTERNAL_BLOCKER | B-003 |
| Webhook handler | UNVERIFIED | needs inspection in Pas 16 |
| Signature verification | UNVERIFIED | needs inspection in Pas 16 |
| Idempotency | UNVERIFIED | needs inspection in Pas 16 |
| Atomic persistence | UNVERIFIED | needs inspection in Pas 16 |
| Entitlement enforcement | UNVERIFIED | Pas 4 + Pas 16 |

## Payment modules (directory scan)

| Path | Purpose |
|---|---|
| lib/payments/ | Payment logic |
| lib/checkout/ | Checkout flow |
| lib/stripe/ | Stripe-specific helpers |
| lib/square/ | Square POS |
| lib/printful/ | Printful fulfilment |
| lib/commerce/ | Commerce helpers |
| lib/orders/ | Order management |
| lib/account/ | User account |

(All observed; contents not inspected in Pas 1.)

## Routes

| Route | Purpose |
|---|---|
| /checkout | Checkout page |
| /checkout/success | Post-checkout success |
| /checkout/cancel | Post-checkout cancel |
| /cart | Cart |
| /account | Account |
| /admin/orders | Admin orders |

## Tests required (master mission §23)

- direct API bypass
- invalid entitlement
- revoked entitlement
- expired entitlement
- duplicate payment
- duplicate webhook
- out-of-order webhook
- replay
- cancellation
- refund
- chargeback
- upgrade
- downgrade
- race conditions
- two-account isolation

## Sandbox vs production

Use real Stripe TEST mode only where credentials/infrastructure are
legitimately available. Do not claim production Stripe proof from mocks.

## Stop-sell state (per Pas 0 review)

ACTIVE for Pro/Advanced across all products. This is HONEST because
the corresponding capabilities are not actually deliverable yet.

## What Pas 16 will add

- Full state machine test
- Each transition evidence
- Race condition detection
- Stripe webhook test (or honest EXTERNAL_BLOCKER)
- Entitlement bypass test
- Refund / revoke flow test

## What will NEVER be claimed

- "Payment validation passed" when only stop-sell was verified
- "Paid value 10/10" without actual paid customer flow
- "Stripe production proof" from mocks

Per master mission §102:

> Better: "Stop-sell boundary verified; live payment settlement remains
> externally unavailable."