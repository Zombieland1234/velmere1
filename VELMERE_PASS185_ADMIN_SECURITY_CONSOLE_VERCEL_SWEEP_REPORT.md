# Velmère PASS185 — Admin Security Console + Alert Rules + Vercel Sweep

## Scope
Bigger operational/security pass after PASS184:
- admin security console route,
- alert rules engine,
- safe security export route,
- security alerts route,
- readiness/abuse routes include alert snapshot,
- expanded Vercel/static guard sweep for new security console surface.

## Implemented
- `lib/security/security-alert-rules.ts`
- `components/admin/SecurityConsolePanel.tsx`
- `/[locale]/admin/security`
- `/api/security/alerts`
- `/api/security/export`
- readiness and abuse-shield diagnostics include `alertRules`
- PASS185 admin console CSS
- PASS185 guard wired into `verify:shield-all` and `vercel-preflight`

## Vercel sweep
The guard checks:
- new admin route exists and is noindex/no-follow,
- security export is safe JSON only and contains no raw IP/query/secrets,
- event ledger and alert snapshots are imported safely,
- admin console has static server component shape and no browser-only globals,
- no new public wording overclaims security,
- CSS markers exist,
- full matrix includes the larger security/admin/blocker areas.
