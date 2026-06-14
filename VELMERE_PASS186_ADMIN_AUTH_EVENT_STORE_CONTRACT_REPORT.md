# Velmère PASS186 — Security Admin Gate + Event Store Contract + Vercel Sweep

## Scope
This pass closes the biggest blocker from PASS185:
- admin security APIs are now server-token gated,
- `/[locale]/admin/security` locks by default,
- security console only renders when the server-side console gate is explicitly enabled,
- security event store contract is defined,
- readiness/abuse endpoints report admin gate and event-store state,
- Vercel/static guard checks the new gating and export safety.

## Implemented
- `lib/security/security-admin-auth.ts`
- `lib/security/security-event-store-contract.ts`
- `components/admin/SecurityConsoleLockedPanel.tsx`
- `/api/security/event-store`
- `/api/security/events` now requires `security:events`
- `/api/security/alerts` now requires `security:alerts`
- `/api/security/export` now requires `security:export`
- `/[locale]/admin/security` is locked by default unless `VELMERE_SECURITY_ADMIN_CONSOLE_ENABLED=true` and token config is ready
- `/api/security/readiness` and `/api/security/abuse-shield` include admin gate + event-store snapshots
- PASS186 guard wired into `verify:shield-all` and `vercel-preflight`

## Boundary
This is not a final identity provider. It is a deny-by-default server token gate and event-store architecture contract. Production should still add real session auth, role identity, durable event append, retention policy, WAF and alert delivery.
