# Velmère Vercel Environment Security Checklist

## Required production envs

| Env | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Distributed rate-limit and event append provider URL |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only Upstash token |
| `VELMERE_SECURITY_ADMIN_ENABLED=true` | Enables security admin API gate |
| `VELMERE_SECURITY_ADMIN_TOKEN_SHA256` | SHA-256 hash of admin token |
| `VELMERE_SECURITY_ADMIN_CONSOLE_ENABLED=false` | Keep console hidden until browser QA is done |
| `VELMERE_SECURITY_ADMIN_SCOPES` | Optional scope list |
| `VELMERE_SECURITY_EVENT_UPSTASH_KEY` | Namespaced security event list key |
| `VELMERE_SECURITY_EVENT_UPSTASH_MAX` | Retained event count |
| `VELMERE_SECURITY_EVENT_APPEND_TIMEOUT_MS` | Append timeout budget |

## Validation
- `node scripts/vercel-preflight.mjs`
- `npm run verify:shield-all`
- GET /api/security/readiness
- GET `/api/security/operations-checklist`
- GET `/api/security/events` with admin token
