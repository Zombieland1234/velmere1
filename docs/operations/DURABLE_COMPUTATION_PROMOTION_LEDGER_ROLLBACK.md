# Durable computation promotion, rollback and alert reconciliation

## Truth boundary

This runbook does not authorize promotion from configuration alone. Promotion is allowed only when all of the following are true:

1. Static deployment contract has no staging blockers.
2. The live staging capability probe reports schema `velmere.durable-computation.schema.4751`.
3. Six required tables have RLS and service-role grants.
4. Nineteen required RPCs exist and have service-role execute grants.
5. Exact source SHA-256, build SHA-256, BUILD_ID and exact checkpoint are supplied from the release system.
6. The request matches the live deployment fingerprint and capability digest.
7. The approval timestamp is no older than five minutes.
8. The approval is signed with the dedicated promotion HMAC secret.
9. The deployment ledger accepts the idempotency key under its advisory lock.

## Promotion procedure

1. Run the Node 24 exact pipeline and collect source SHA, build SHA, BUILD_ID and checkpoint.
2. Apply migrations through PASS4751 on staging.
3. Call the protected promotion route with `GET ?action=readiness`.
4. Confirm `ready=true` and independently compare all reported hashes with the release system.
5. Create a unique nonce and a reason describing the approved release.
6. Sign the canonical promotion payload outside the application runtime.
7. Submit the protected POST action `promote`.
8. Store the response request digest and deployment ID hash in the operator ticket.
9. Run worker, alert and paid customer staging journeys.
10. Do not label production live until long-running receipts and external monitoring exist.

## Rollback procedure

1. Identify the currently active raw deployment UUID from the service-role deployment ledger.
2. Stop new customer traffic or worker admission if the incident requires it.
3. Create a fresh rollback approval no older than five minutes.
4. Submit the target UUID only to the protected internal endpoint.
5. Confirm a `rolled_back` ledger state and retain only the returned target/deployment hashes outside the database.
6. Re-run alert reconciliation and capability probe.
7. Open a new promotion; never reactivate a rolled-back row by manual SQL.

## Fail-closed conditions

Promotion or rollback must stop on any of the following:

- missing exact evidence,
- Node/build lineage mismatch,
- staging capability mismatch,
- invalid RLS or service-role grants,
- stale or malformed approval,
- HMAC mismatch,
- fingerprint or capability digest mismatch,
- invalid rollback target,
- database conflict or unavailable ledger,
- alert reconciliation critical blocker.

## Privacy boundary

The deployment ledger stores hashes of operator identity, reason and BUILD_ID. API responses omit raw operator identity, raw reason, approval secret, approval signature, raw deployment UUID, raw BUILD_ID and environment values. Alert reconciliation returns aggregate counts only.
