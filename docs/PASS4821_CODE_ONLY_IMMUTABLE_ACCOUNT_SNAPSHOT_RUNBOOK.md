# PASS4821 code-only runbook

## Scope

This pass is code-only. Do not execute or claim Stripe/Supabase staging, real providers, KMS/HSM, production telemetry, chaos exercises or commercial cohorts.

## Canonical flow

1. Build the evidence-bound Audit assembler report and provider-runtime report.
2. Build `buildPass4820AuditCustomerReportPipeline`.
3. Build `buildAuditAccountCustomerSnapshot` with the exact owner hash.
4. Persist the snapshot with the account message.
5. Permit `mark_ready` or delivery only after complete snapshot verification.
6. Resolve page/API access using the signed account session and owner-scoped lookup.
7. Build and verify the shared Audit/Shield/Real Markets canonical artifact commitment.
8. Render PDF from `snapshot.layoutInput` and compare all stored artifact fields before returning bytes.

## Required local verification

```bash
npm run verify:pass4821
```

The one-shot must pass:
- static gate;
- immutable snapshot matrix;
- physical PDF verification and rendering;
- five targeted semantic typechecks;
- PASS4820, PASS4819 and PASS4808 regressions;
- full TS/TSX parser gate.

## Fail-closed rules

- No saved report without an explicit account owner.
- No owner mutation for an existing message.
- No snapshot replacement after first durable write.
- No ready/delivered state without a verified snapshot.
- No legacy report fallback.
- No obsolete public Audit status page or active link to it.
- No customer-report recovery from localStorage or sample inbox records.
- No PDF if status is not ready/delivered.
- No PDF when any digest, byte length, render plan, page count or row count differs.
- No automatic Advanced manual-review claim.

## Remaining code-only work

The next pass must add append-only Advanced reviewed revisions, remove the remaining admin/demo-only legacy consumers, review Shield/Real Markets account-snapshot parity and broaden locale/tier/page edge matrices. LIVE stays frozen.
