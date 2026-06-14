# Velmère Security Runtime QA Result Capture

## Goal
Capture what must be verified on Vercel before calling the security layer production-ready.

## Required QA checks
- `/pl/security`, `/en/security`, `/de/security` render without layout overflow.
- `/admin/security` is locked without security admin envs.
- `/api/security/events`, `/api/security/export`, `/api/security/admin-audit` deny access without token.
- Public `/api/security/trust` and `/api/security/operations-checklist` expose only safe public data.
- Admin-token calls return scoped safe JSON.
- Security export contains no raw IP, raw query payloads, secrets, tokens or authorization headers.
- Abuse Shield blocks or scores scanner-like requests in staging.
- Upstash provider mode and event append mode are visible in `/api/security/readiness`.
- Vercel WAF/firewall logs show rules applied for scanner paths and public API rate pressure.

## Evidence to capture
- Browser screenshots.
- HTTP status / response mode.
- Vercel firewall logs.
- Redaction inspection.
- `node scripts/vercel-preflight.mjs` output.
- `npm run verify:shield-all` output.

- No raw IP in export or event snapshots.
