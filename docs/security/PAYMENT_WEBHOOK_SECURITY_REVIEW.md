# Velmère Payment/Webhook Security Review

## Scope
Payment/webhook release remains blocked until Stripe checkout, signed webhooks, idempotency, order persistence, fulfilment, refunds and support workflows are verified on Vercel.

## Controls added in PASS191
- Checkout payload content-type and size boundary.
- Stripe webhook payload/signature header boundary.
- Webhook supported-event allowlist.
- Admin-gated `/api/security/payment-webhook-review`.
- Payment/webhook snapshot integrated into release gate, runtime QA, readiness and export.
- Release gate now uses payment/webhook control progress instead of a static blocker.

## Manual Vercel QA
- Checkout stays disabled unless `CHECKOUT_MODE=stripe`, Stripe envs, site URL and store readiness flags are configured.
- `/api/checkout` rejects oversized/non-JSON payloads.
- `/api/stripe/webhook` rejects missing signature.
- `/api/stripe/webhook` rejects oversized payloads.
- Signed `checkout.session.completed` test event is accepted.
- Duplicate webhook event does not duplicate order state.
- Unsupported signed event is acknowledged without order mutation.
- Order persistence writes order and line items.
- Fulfilment failure produces visible operator state.
- Refund/support process is documented before checkout launch.

## Export boundary
Do not export card data, raw payment payloads, raw headers, raw IP addresses, raw customer PII or secrets.
