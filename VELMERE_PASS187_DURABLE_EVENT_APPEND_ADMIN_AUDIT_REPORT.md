# Velmère PASS187 — Durable Security Event Append Adapter + Admin Read Audit Events

## Scope
This pass continues the security/admin lane with a larger blocker-focused pack:
- best-effort durable security event append adapter,
- Upstash list/pipeline event append lane,
- admin read/export audit trail,
- admin-audit API route,
- event-store/readiness/export/abuse diagnostics include append and audit snapshots,
- Security Console shows append mode and audit count,
- expanded Vercel/static sweep guard.

## Implemented
- `lib/security/security-event-append-adapter.ts`
- `lib/security/security-admin-audit.ts`
- `/api/security/admin-audit`
- `recordSecurityEvent()` now mirrors redacted events through `appendSecurityEventBestEffort()`
- `verifySecurityAdminToken()` now records allowed/denied/not-configured admin read/export attempts
- `/api/security/event-store`, `/api/security/export`, `/api/security/readiness` and `/api/security/abuse-shield` include append adapter + admin audit snapshots
- Security Console shows append mode and admin audit count
- PASS187 guard wired into `verify:shield-all` and `vercel-preflight`

## Boundary
The append adapter is best-effort and redacted. It does not persist raw IP addresses, raw query payloads, authorization headers or secrets. Production still needs real retention policy, alert delivery, admin session identity and Vercel/WAF configuration.
