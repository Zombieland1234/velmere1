# Velmère PASS 142 — Admin Environment Kill Switch + Locked Admin Surface

## Purpose
PASS142 turns the previous Admin Route Gate into a visible locked surface. Admin import forms, publish actions and provider sync tooling are hidden unless a safe public environment preview gate is explicitly enabled.

## Added files
- `lib/launch/admin-environment-gate.ts`
- `components/launch/AdminToolsLockedPanel.tsx`
- `scripts/verify-admin-environment-gate-safety.mjs`

## Updated route
- `app/[locale]/admin/import-products/page.tsx`

## Behavior
By default, the admin import page returns a locked launch-control surface and does not render import forms or publish buttons.

To preview admin tooling locally/staging, set:
- `NEXT_PUBLIC_ADMIN_TOOLS_ENABLED=true`
- `NEXT_PUBLIC_ADMIN_TOOLS_ENV=local` or `staging` or `ops`

## Important boundary
This is a client-visible locked-surface UX guard, not final security. Production still needs:
- server auth,
- admin role/session checks,
- environment kill switch,
- import audit persistence,
- publish permission flow,
- secret redaction and static scan.

## Updated progress
- admin route gate: 27% → 38%
- admin import readiness: 48% → 55%

## Next blockers
- real server auth provider,
- admin role/session checks,
- server-side not-found/redirect policy,
- ADMIN_TOOLS_ENABLED server kill switch,
- persistent import audit trail,
- publish permission flow.
