# PASS2750 — Live Artifacts Import Contract

## Public release-board artifact fields
Allowed:
- artifactId
- passId
- createdAt
- status
- digest/hash
- tool name
- customer-safe summary
- owner role
- next action

Denied:
- raw logs
- raw screenshots
- raw traces
- raw webhook body
- raw Stripe/Supabase/provider payloads
- secrets/env values
- JWT/service role/signing secrets
- operator/private reviewer notes
- customer PII
- stack traces

## Import steps
1. Run live tests.
2. Store raw artifacts privately.
3. Generate redacted manifest.
4. Scan manifest for denied markers.
5. Import only manifest hashes/statuses.
6. Replay PASS2680 with manifest bundle.

## GO rule
Release board import is necessary but not sufficient. Production GO requires:
- clean CI artifact,
- Vercel preview smoke,
- Supabase RLS,
- Stripe replay/refund/chargeback,
- alert sink,
- Playwright/visual/a11y/performance,
- data quality freshness/quorum,
- external review,
- PASS2680 replay.
