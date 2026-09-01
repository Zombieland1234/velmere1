# R44P32 local Stripe lifecycle truth boundary

This directory provides a disposable local protocol fixture and a real local HTTP webhook + SQLite lifecycle. It proves the Velmère control flow for twelve payment lifecycle cases, including signature validation, exact payment binding, idempotency, event reordering, replay denial, refund revocation, reconciliation, and bounded dead-letter requeue.

It does **not** prove Stripe test mode, Stripe-hosted checkout, Stripe webhook delivery, production payments, sale readiness, customer delivery, or LIVE operation. Any actual `sk_test_` admission remains optional and fail-closed; no secret is written to evidence.
