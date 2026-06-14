# Velmère PASS 147 — Admin Auth Session Guard + Role Scope + Idempotency Store

## Purpose
PASS147 adds admin session/permission contracts and idempotency store architecture after the locked audit write API.

## Added files
- `lib/launch/admin-auth-session-guard.ts`
- `lib/launch/admin-idempotency-store.ts`
- `components/launch/AdminAuthSessionGuardPanel.tsx`
- `components/launch/AdminIdempotencyStorePanel.tsx`
- `scripts/verify-admin-auth-session-idempotency-safety.mjs`

## Updated files
- `lib/launch/admin-audit-write-contract.ts`
- `app/api/admin/audit-events/route.ts`
- `app/[locale]/admin/import-products/page.tsx`
- `lib/launch/admin-server-auth-contract.ts`
- `lib/launch/project-progress.ts`
- `lib/launch/site-page-audit.ts`
- `package.json`
- `scripts/vercel-preflight.mjs`

## Admin auth session guard tracks
- server session reader,
- role and scope map,
- fresh session requirement,
- permission deny copy.

## Admin idempotency store tracks
- key normalization,
- persistent idempotency storage,
- duplicate response policy,
- TTL and retention policy.

## Audit write route update
The locked audit write preview now includes:
- `sessionPreview`,
- `permissionPreview`,
- `idempotencyPreview`.

## Permission scopes introduced
- `product:import`
- `product:sync`
- `product:draft_publish`
- `product:active_publish`
- `product:overwrite`
- `audit:write`
- `support:export`

## Important boundary
This is still a contract/preview. Production still needs:
- real auth provider,
- server session reader,
- persistent idempotency store,
- auth-bound operator id,
- real storage adapter.

## Updated progress
- admin server auth contract: 17% → 36%
- admin audit write API: 34% → 48%
- admin auth session guard: new 34%
- admin idempotency store: new 31%
- admin import readiness: 81% → 85%

## Next blockers
- choose auth provider,
- implement server session middleware,
- bind role/scope permissions to authenticated users,
- create persistent idempotency store,
- connect audit write route to real storage adapter.
