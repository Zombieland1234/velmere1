# Velmère PASS182 — Security Hardening Immediate Layer

## Scope
Immediate defensive hardening for the Velmère Next.js site:
- centralized security headers,
- stricter CSP/domain policy,
- API JSON/security helper,
- soft rate-limit guard for public query endpoints,
- URL/query size guards,
- token icon proxy SSRF/content-type/size checks,
- security readiness diagnostic route.

## Implemented
- `lib/security/http-security.mjs`
- `lib/security/api-guard.ts`
- `lib/security/security-readiness.ts`
- `/api/security/readiness`
- `next.config.mjs` now uses `buildSecurityHeaders({ isDev })`
- public market search/analyze endpoints use method, URL-size, bounded-query and soft rate-limit guards
- token icon proxy now blocks non-HTTPS, unknown hosts, credentials, explicit ports, non-image content and oversized assets
- PASS182 guard wired into `verify:shield-all` and `vercel-preflight`

## Boundary
This is defensive hardening, not a claim of being unhackable. Production still needs Vercel/project settings review, secret rotation, dependency scanning, WAF/bot protection, real browser QA, payment webhook verification review and external security testing.
