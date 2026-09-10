# PASS_01 STRIPE & ENTITLEMENT SECURITY AUDIT

## 1. Threat Scenarios Tested
- **Client-Side Flag Tampering**: Setting `window.__USER__.isPro = true` in devtools does NOT permit access to `/api/audit/report` or pro features. Server rejects requests with 403 Forbidden.
- **Webhook Replay**: Idempotency ledger in Supabase / memory drops duplicate `checkout.session.completed` events.
- **Signature Verification**: Stripe webhook signing secret strictly validated; unsigned payloads rejected with 400.
