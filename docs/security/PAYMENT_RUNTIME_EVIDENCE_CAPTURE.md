# Velmère Payment Runtime Evidence Capture

## Goal
Capture operator-safe runtime evidence for payment and webhook QA without storing raw payment payloads, raw headers, secrets, card data, raw IP addresses or raw customer PII.

## API
- `GET /api/security/payment-runtime-evidence` — admin-gated evidence snapshot.
- `POST /api/security/payment-runtime-evidence` — admin-gated safe evidence capture.

## Allowed areas
- checkout
- stripe_webhook
- idempotency
- order_persistence
- fulfilment
- refund_support
- release_gate

## Allowed statuses
- pass
- fail
- manual
- blocked

## Example safe POST payload
```json
{
  "area": "stripe_webhook",
  "status": "pass",
  "label": "Signed checkout.session.completed on Vercel preview",
  "summary": "Signed event was accepted and returned received true. Raw Stripe body is not included.",
  "evidenceRef": "vercel-preview-qa-2026-xx",
  "safeNotes": "Operator verified duplicate replay separately."
}
```

## Boundary
Evidence records are in-memory preview until durable operator storage is added. They are for QA capture only and must not contain raw Stripe payloads or customer sensitive data.

## Redaction marker
No raw payment data is stored in this evidence layer.
