# Velmère P33 — paid-scope boundary and external blocker ledger

**State:** `NO_GO_PAID / INTERNAL_PAYMENT_RAILS_ADVANCING / EXTERNAL_CLOSURE_OPEN`

## Paid release axes

| Axis | P33 state | Credit boundary |
|---|---|---|
| SKU / stop-sell truth | internal pass candidate | Pro remains invitation-only; Advanced remains not for sale |
| Server entitlement / revocation | internal pass candidate | no production tenant/staging credit |
| Checkout/auth public contract | internal pass candidate | no live charging credit |
| Webhook/replay/idempotency | local fixture candidate | no Stripe production credit |
| Refund/revoke lifecycle | local fixture candidate | no real refund/chargeback evidence |
| Customer delivery/support projection | internal pass candidate | no production delivery SLO credit |
| Tenant/privacy isolation | partial internal | disposable staging and real DSAR remain open |
| Provider/data rights | external open | 0 commercially enabled external providers |
| Merchant/legal identity and customer terms | blocked | mandatory business/consumer fields remain incomplete |
| Final tier-value holdout | blocked internal | 0 final same-input customer-value profiles |
| Clean build/staging/operations | blocked internal | exact dependency/build/staging proof open |
| Real customer WTP/refund evidence | external open | 0 real participants |

## Non-aliasing rule

A local Stripe fixture, internal entitlement test, or customer-safe API projection may advance the **internal paid infrastructure** axis. It may not advance provider rights, legal classification, real customer value, production charging, or broad sale approval.

## Current provider-rights fact

The current registry contains 22 providers, 21 code-present rows, 0 externally verified commercial-rights rows, 0 commercially enabled providers, and 0 sell-eligible provider cells. Technical availability and credentials do not grant commercial display, retention, redistribution, PDF, AI/RAG, or paid-tier rights.

## Current merchant/legal fact

The merchant/legal intake remains incomplete. Missing items include legal identity/registration/tax fields, service and return addresses, customer-support contact, approved terms/privacy/retention/returns, supervisory/dispute statements, and legal-review evidence.

## GO_PAID rule

`GO_PAID` stays false until all applicable axes are physically closed. Internal AI review cannot replace professional legal decisions, provider licences, production Stripe evidence, staging isolation, or real-customer value/WTP evidence.
