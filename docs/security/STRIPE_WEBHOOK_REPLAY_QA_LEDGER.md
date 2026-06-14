# Velmère Stripe Webhook Replay QA Ledger

## Goal
Track the exact Stripe webhook replay scenarios that must pass before production checkout is exposed.

## API
- `GET /api/security/stripe-webhook-replay-qa` — admin-gated scenario ledger.
- `POST /api/security/stripe-webhook-replay-qa` — admin-gated scenario evidence capture.

## Scenarios
- Missing signature rejection.
- Oversized webhook payload rejection.
- Signed `checkout.session.completed` acceptance.
- Duplicate webhook replay.
- Unsupported signed event.
- Fulfilment failure path.

## Evidence required
- HTTP status.
- Response mode.
- Stripe event id reference, not raw payload.
- Order count/order state proof.
- Operator warning/failure-state proof.
- Vercel logs or Stripe CLI reference.

## Boundary
The replay QA ledger must not store raw Stripe payloads, raw headers, secrets, card data or raw customer PII. It captures safe references and operator summaries only.
