# Velmère PASS184 — Upstash REST Adapter + Security Event Ledger

## Scope
Bigger security pack after PASS183:
- real server-only Upstash REST rate-limit adapter with memory fallback,
- security event ledger,
- security events diagnostic route,
- readiness/abuse routes showing rate-limit provider state and recent events,
- abuse shield now records blocks, rate-limit hits, suspicious allowed traffic and provider fallback.

## Implemented
- Upstash REST `/pipeline` adapter inside `lib/security/durable-rate-limit.ts`
- fallback mode `upstash_fallback_memory`
- `lib/security/security-event-ledger.ts`
- `/api/security/events`
- `/api/security/readiness` now includes event ledger snapshot
- `/api/security/abuse-shield` now includes event ledger snapshot
- `api-abuse-shield.ts` records events for:
  - method blocked
  - URL too large
  - abuse blocked
  - rate limited
  - suspicious allowed
  - provider fallback
- PASS184 guard wired into `verify:shield-all` and `vercel-preflight`

## Boundary
This is still not a full WAF, SIEM or managed bot platform. It creates a production-ready adapter shape and event trail, but production still needs Upstash env variables, alerting, retention policy and Vercel/WAF rules.
