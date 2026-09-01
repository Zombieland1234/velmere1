# PASS4815 — Chaos Recovery and Idempotency Runbook

## Purpose

This runbook describes the controlled staging procedure required to issue a
PASS4815 chaos/recovery receipt. The receipt is a production-promotion gate for
paid Pro and Advanced functionality. It does not authorize production unless
all fifteen required failure scenarios are executed against the exact release
candidate and independently verified.

The procedure is intentionally fail-closed. Missing evidence, a failed
assertion, duplicate/lost effects, an RTO/RPO breach, a mismatched build, an
expired receipt or an insufficient signature threshold must block promotion.

## Safety boundary

Run these exercises only in an isolated staging environment with:

- test Stripe accounts and non-production payment methods;
- a dedicated Supabase staging project;
- staging-only object storage and queues;
- provider test/sandbox endpoints where available;
- a tested backup and restore target that cannot overwrite production;
- documented abort controls and an operator supervising the exercise.

Never inject failure into production merely to create a receipt.

## Prerequisites

Before beginning, all of the following must exist:

1. A verified PASS4814 staging paid-E2E receipt for the same release candidate.
2. A tested deployment receipt bound to the exact:
   - build artifact digest;
   - source package digest;
   - runtime version root;
   - provider configuration root;
   - model configuration root;
   - supply-chain provenance digest.
3. A valid public trust bundle with at least the configured release-signature
   threshold and at least one active release key.
4. Production-grade external signing custody for production promotion. The
   `test-only` provider is forbidden for production.
5. Exact project runtime Node 24.18.0 and npm 11.16.0 for the release build.
6. A monotonic chaos sequence and, when applicable, the previous receipt and
   existing receipt chain.
7. Redaction rules. Evidence files must contain digests and bounded metadata,
   not customer email addresses, Stripe secrets, access tokens, database
   credentials or raw private provider payloads.
8. A written rollback and abort plan.

## Required evidence class

Every accepted scenario must use:

- `evidenceClass = staging_real_failure_injection`;
- `environment = staging`;
- one of the policy-approved chaos modes;
- the exact tested deployment and PASS4814 staging receipt;
- one complete, non-duplicated set of required assertions;
- pre-failure, failure-state and post-recovery digests;
- a durable journal root;
- measured recovery and consistency metrics.

Synthetic fixtures, local mocks and replay captures are useful for testing the
tooling, but cannot authorize production.

## Mandatory fifteen-scenario set

Exactly one result is required for each scenario.

### Stripe

1. `stripe_webhook_duplicate_delivery`
   - replay the same signed event identifier;
   - prove the idempotency key is durable;
   - prove exactly one business effect;
   - prove the ledger remains stable.

2. `stripe_webhook_out_of_order_delivery`
   - deliver an older event after a newer event;
   - prove state remains monotonic;
   - prove an entitlement cannot be resurrected;
   - prove the ledger remains stable.

3. `stripe_webhook_concurrent_race`
   - deliver concurrent copies;
   - prove a single winner under transaction isolation;
   - prove exactly one effect and no duplicate charge/grant.

### Supabase

4. `supabase_transaction_rollback`
   - fail in the middle of a transaction;
   - prove full rollback and no partial rows;
   - prove durable read-back after bounded retry.

5. `supabase_primary_failover`
   - inject connection failure/failover;
   - prove bounded retry/backoff;
   - prove durable state recovery and no split-brain state.

### Entitlement and audit lifecycle

6. `entitlement_issue_crash_recovery`
   - crash after payment but before grant;
   - prove reconciliation finds the pending state;
   - issue one entitlement only;
   - prove account/payment binding.

7. `entitlement_revoke_reconciliation`
   - fail during revoke;
   - prove stale access is found and removed;
   - prove access stays denied and cannot resurrect.

8. `audit_queue_worker_crash_retry`
   - crash the worker after it owns a lease;
   - prove lease expiry and claim by another worker;
   - prove one immutable snapshot, one customer message and no duplicate charge.

9. `advanced_review_partial_failure`
   - persist first approval and fail the second step;
   - prove release remains blocked;
   - recover with a distinct approver;
   - prove a single transition to ready.

### PDF delivery

10. `pdf_object_store_write_failure`
    - inject object-store write failure;
    - prove no download token is issued before durable storage;
    - retry and store the exact bytes;
    - prove digest equality and one published artifact.

11. `pdf_token_consume_race`
    - attempt parallel use of the same token;
    - prove exactly one consumer wins;
    - prove the loser is denied;
    - prove no query-string token and consistent audit logging.

### Providers

12. `provider_timeout_fallback`
    - inject primary timeout;
    - prove bounded timeout and independent fallback;
    - prove source identity and degraded-state disclosure;
    - prove no fabricated claim.

13. `provider_rate_limit_backoff`
    - inject rate limiting;
    - prove bounded exponential/backoff behavior;
    - prove no retry storm and no confidence inflation.

14. `provider_stale_conflict_fail_closed`
    - inject stale/conflicting evidence;
    - prove conflict surfacing and fail-closed paid claim;
    - prove stale data cannot silently authorize Pro/Advanced.

### Disaster recovery

15. `backup_restore_point_in_time`
    - restore into an isolated target;
    - prove the selected restore point;
    - prove ledger, entitlement, audit snapshot and PDF reference reconciliation;
    - prove the isolated restore cannot mutate production.

## Common acceptance conditions

For every scenario:

- `duplicateEffects = 0`;
- `lostEffects = 0`;
- `inconsistentRecords = 0`;
- measured RTO is at or below the scenario policy limit;
- measured RPO is at or below the scenario policy limit;
- retry attempts do not exceed the scenario budget;
- required backoff is observed where the policy requires it;
- any allowed dead-letter entry is fully recovered;
- scenarios that forbid dead-letter output produce none;
- all required assertions are present and no unexpected assertion is added;
- scenario timestamps are chronological and within the allowed window;
- the scenario begins after the PASS4814 receipt is active;
- the final PASS4815 receipt is issued within two hours of the last observation.

## Collection procedure

1. Freeze the tested deployment and collect its deployment receipt.
2. Verify the PASS4814 staging receipt against the same release candidate.
3. Record the next monotonic chaos sequence.
4. Generate unique scenario IDs, run ID digest and nonce.
5. Execute each scenario independently in staging.
6. Capture only redacted evidence references and SHA-256 digests.
7. Record pre-state, failure-state and post-recovery digests.
8. Record exact measured metrics; never replace failed values with thresholds.
9. Confirm reconciliation from durable stores, not only API responses.
10. Store each scenario JSON with restrictive filesystem permissions.
11. Run an independent review of all fifteen scenario files.
12. Only then invoke the receipt builder.

## Builder configuration

The builder consumes a JSON config with:

- `promotionTarget`;
- `audience`;
- `chaosSequence`;
- tested/current deployment paths;
- PASS4814 staging receipt path;
- trust bundle path;
- optional previous receipt and chain paths;
- exactly fifteen scenario paths;
- issue/expiry timestamps;
- run ID digest and nonce;
- detached external signer definitions;
- receipt and chain output paths.

Production promotion requires external KMS/HSM-backed signers. A `test-only`
signer causes a hard failure before any output is written.

Example command:

```bash
npm run build:pass4815:chaos-recovery-receipt -- \
  --config ./secure/pass4815-chaos-builder.json
```

The builder:

1. loads the exact tested deployment, staging receipt and trust bundle;
2. canonicalizes and verifies the fifteen scenarios;
3. builds scenario, objective and reconciliation roots;
4. prepares the detached-signature payload;
5. invokes the configured external signers;
6. verifies the complete receipt chain;
7. writes the receipt and chain atomically only after a green verification.

Any failure must leave no production authorization artifact.

## Independent verification

Use a separate operator and environment that has only public verification
material:

```bash
npm run verify:pass4815:chaos-recovery-receipt -- \
  --config ./secure/pass4815-chaos-verifier.json
```

The verifier must confirm:

- exact schema and policy version;
- exact fifteen-scenario set;
- every scenario digest and root;
- all RTO/RPO and idempotency conditions;
- staging, deployment and release-candidate binding;
- signature threshold and active key;
- receipt lifetime;
- monotonic sequence and predecessor digest;
- nonce, run ID and scenario-root non-reuse;
- configured rollback floor;
- current PASS4814 staging receipt;
- current deployment receipt.

## Runtime configuration

Server-only variables:

```text
VELMERE_COMMERCIAL_COHORT_CHAOS_RECOVERY_RECEIPT_CHAIN_JSON=
VELMERE_COMMERCIAL_COHORT_MIN_CHAOS_RECOVERY_SEQUENCE=1
```

Do not expose these values through `NEXT_PUBLIC_*`.

Audit, Shield and Real Markets paid gates remain blocked when:

- the receipt chain is absent or malformed;
- the current sequence is below the rollback floor;
- the current staging/deployment receipt does not match;
- the receipt is expired or not yet active;
- any signature or scenario is invalid;
- any RTO/RPO or idempotency condition fails.

## Promotion decision

Promotion is allowed only when both the builder and independent verifier return
`verified = true`, and the normal PASS4809–PASS4814 commercial, checkpoint,
supply-chain, deployment and staging gates are also green.

A green PASS4815 receipt does not replace:

- the 50 Audit + 50 Shield + 50 Real Markets + 150 PDF live cohort;
- a full Node 24.18.0/npm 11.16.0 build;
- current vulnerability scanning;
- external penetration testing;
- real Advanced review by two humans;
- production monitoring and incident response.

## Abort conditions

Stop the exercise and do not issue a receipt when:

- production traffic or production credentials are observed;
- a restore could affect production;
- a duplicate charge or entitlement effect occurs;
- data loss or inconsistent durable state occurs;
- an RTO/RPO threshold is exceeded;
- evidence cannot be independently reconciled;
- a scenario must be manually edited to look successful;
- signers or operators are not independent;
- any required file or digest is missing.

## Evidence classification for PASS4815 development

The tests shipped in PASS4815 exercise the policy, signatures, builder,
verifier, atomic failure behavior and negative cases using synthetic staging
objects and `test-only` detached signers.

They do **not** prove that real Stripe, Supabase, object storage, queues,
providers or backups survived the scenarios. Production readiness remains
blocked until this runbook is executed against the actual staging stack.
