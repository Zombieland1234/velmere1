# Velmère PASS167 — Storage Adapter + Idempotency + Account Timeline

## Scope
This pass converts the backend readiness work into visible production contracts and diagnostics:
- server-only storage adapter contract
- idempotency preview
- storage preview API route
- account/order event timeline
- source freshness visible inside Shield
- storage panels across account, dashboard, checkout and Shield

## Implemented
- `lib/launch/server-storage-adapter.ts`
- `components/launch/StorageAdapterReadinessPanel.tsx`
- `components/launch/AccountOrderEventTimelinePanel.tsx`
- `app/api/ops/storage-preview/route.ts`
- Source freshness labels in `TokenRiskModal.tsx`
- Panels added to account, dashboard, checkout and market-integrity pages
- Guard script wired into `verify:shield-all`

## Still blocked
No real database write is performed. Production still needs:
1. durable database adapter
2. server auth identity
3. webhook signatures for payment/provider events
4. retention/export policy
5. source snapshot TTL enforcement
