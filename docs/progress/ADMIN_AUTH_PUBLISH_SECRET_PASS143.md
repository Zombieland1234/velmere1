# Velmère PASS 143 — Admin Server Auth Contract + Publish Permission Gate + Secret Redaction Policy

## Purpose
PASS143 is a wider pass with three admin/ops blockers:
1. server auth contract,
2. publish permission gate,
3. secret redaction policy and static secret scan.

## Added files
- `lib/launch/admin-server-auth-contract.ts`
- `lib/launch/publish-permission-gate.ts`
- `lib/launch/secret-redaction-policy.ts`
- `components/launch/AdminServerAuthContractPanel.tsx`
- `components/launch/PublishPermissionGatePanel.tsx`
- `components/launch/SecretRedactionPolicyPanel.tsx`
- `scripts/verify-admin-auth-publish-secret-safety.mjs`
- `scripts/verify-secret-redaction-static-safety.mjs`

## Updated route
- `app/[locale]/admin/import-products/page.tsx`

Both locked and unlocked admin states now render:
- admin route gate,
- server auth contract,
- publish permission gate,
- secret redaction policy.

## Admin server auth contract tracks
- server auth provider,
- admin role contract,
- session expiry and reauth,
- mutation permission,
- server kill switch.

## Publish permission gate tracks
- draft-only import,
- provider truth required,
- shipping and returns required,
- active publish permission,
- audit before publish.

## Secret redaction policy tracks
- browser-visible secret scan,
- raw provider response redaction,
- log redaction,
- private prompt redaction.

## Important boundary
This still does not implement real server auth. It creates the explicit contract and guards so the implementation cannot be confused with final security.

## Updated progress
- admin route gate: 38% → 49%
- admin import readiness: 55% → 64%
- new admin server auth contract: 17%
- new publish permission gate: 31%
- new secret redaction policy: 34%

## Next blockers
- choose and implement auth provider,
- server-side role/session route boundary,
- server kill switch,
- persistent import/publish audit,
- publish checklist enforcement,
- response mapper/log redaction.
