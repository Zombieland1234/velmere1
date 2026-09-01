# Velmère Security Runtime QA Checklist

## Public pages
- `/security` loads in PL/EN/DE.
- Copy avoids overclaim language: no unhackable, guaranteed secure, best-in-world.
- Footer and nav security links work.

## Admin/security gate
- `/admin/security` shows locked state without env.
- `/api/security/events` returns 401/503 without token.
- `/api/security/export` returns 401/503 without token.
- With valid token, scoped routes return safe JSON.

## Abuse/security APIs
- `/api/security/trust` returns safe public snapshot.
- `/api/security/operations-checklist` returns operator checklist.
- `/api/security/readiness` includes admin gate, append adapter and event store.
- `/api/market-integrity/search?query=b` stays local-first/short-query safe.

## Export safety
- No raw IP.
- No raw query payload.
- No secrets.
- No authorization headers.
