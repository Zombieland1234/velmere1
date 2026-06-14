# Velmère PASS 140 — Order Event Ledger + Webhook Idempotency Guard

## Purpose
PASS140 attacks the next payment blocker: event traceability. A checkout system cannot be production trusted unless order/payment/refund/fulfillment events are signed, idempotent, persisted, retry-safe and support-readable.

## Added runtime/data layer
- `lib/launch/order-event-ledger.ts`
- `components/launch/OrderEventLedgerPanel.tsx`

## Pages integrated
- `/[locale]/checkout`
- `/[locale]/cart`
- `/[locale]/admin/import-products`

## Matrix tracks
- event identity,
- idempotency key,
- signed webhook verification,
- retry and failure policy,
- order timeline,
- support handoff.

## Safety rule
No order state mutation without event id, idempotency key, signed provider event, retry policy and support-visible timeline.

## Next blockers
- persistent event storage,
- idempotency key store,
- provider-specific webhook signature verification,
- retry/dead-letter queue,
- support-safe order timeline.
