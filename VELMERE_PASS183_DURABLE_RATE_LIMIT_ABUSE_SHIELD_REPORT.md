# Velmère PASS183 — Durable Rate Limit + API Abuse Shield

## Scope
This pass continues PASS182 security hardening:
- durable-rate-limit contract with memory fallback,
- API Abuse Shield helper,
- scanner/pattern scoring,
- adaptive route profiles,
- diagnostic abuse shield route,
- public market/search/analyze/icon/readiness routes moved onto the new shield helper.

## Implemented
- `lib/security/durable-rate-limit.ts`
- `lib/security/api-abuse-shield.ts`
- `/api/security/abuse-shield`
- `/api/security/readiness` now includes durable rate-limit readiness
- `/api/market-integrity/search` now uses API Abuse Shield
- `/api/market-integrity/analyze` now uses API Abuse Shield
- `/api/market-integrity/icon` now uses API Abuse Shield + existing icon proxy hardening
- PASS183 guard wired into `verify:shield-all` and `vercel-preflight`

## Boundary
The durable rate-limit provider is a contract with memory fallback. It detects Upstash env readiness but does not perform external Redis calls yet, so production still needs a distributed store before high-traffic launch.
