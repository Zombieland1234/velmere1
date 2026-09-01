# Durable Computation — staging deployment and recovery runbook

Status: prepared in PASS4749. This runbook does not claim that staging or production execution has happened.

## 1. Preconditions

1. Use Node 24.18.0 and npm 11.16.0.
2. Run a clean `npm ci`, `npm ls --all`, full TypeScript, ESLint, build and started-server smoke.
3. Apply migrations PASS4741, PASS4743 and PASS4745–PASS4749 in order.
4. Configure an HTTPS Supabase project URL and a service-role secret in the deployment secret manager.
5. Configure a dedicated cron bearer secret of at least 32 random characters.
6. Configure `VELMERE_DURABLE_PAYLOAD_KEYS_JSON` with 32-byte AES keys and set a valid active key ID.
7. Keep old decrypt keys during rotation until every job encrypted with them has completed or expired.

## 2. Safe staging defaults

- cron: every 15 minutes,
- claim limit: 8,
- concurrency: 2,
- lease: 180 seconds,
- heartbeat: 60 seconds,
- per-subject job limit: 2,
- global batch cost: 48 units,
- per-subject cost: 16 units,
- encrypted payload budget: 4 MiB,
- completed retention: 30 days,
- dead-letter retention: 90 days.

Do not raise concurrency or payload budgets before load measurements and database lock observations exist.

## 3. Deployment checks

Call the authenticated internal GET endpoint without `action=run`. Confirm:

- `deployment.stagingConfigured=true`,
- `deployment.stagingProven=false`,
- all three worker kinds are registered,
- `worker.executable=true`,
- no secret values appear in the response,
- metrics contain aggregates only.

## 4. First controlled cycle

1. Seed one synthetic VLM job, one Lens PDF job and one Audit PDF job on staging.
2. Call `POST /api/internal/workers/durable-computation-operations` with `{"action":"cycle"}`.
3. Confirm exactly three unique completions and no stale completion.
4. Confirm a row exists in `velmere_durable_computation_cycle_receipts`.
5. Confirm the receipt contains only aggregate counts and a deployment fingerprint.
6. Replay each completed result and verify that no provider or renderer is called again.

## 5. Multi-instance proof

Run two authenticated workers simultaneously against the same staging database:

- no job may execute twice,
- stale workers must be unable to complete or fail a job,
- `SKIP LOCKED` must allow forward progress,
- per-subject and global budgets must remain bounded,
- cycle receipts must remain unique by cycle ID.

This is the point at which PostgreSQL staging proof may be claimed. Local dependency-injected fixtures are not sufficient.

## 6. Circuit breaker

The cycle skips new drain work when either condition is reached:

- expired leases are at or above the configured threshold,
- oldest processing lease age is at or above the configured threshold.

Maintenance and alert recording still run. Investigate database latency, worker termination, keyring errors and provider timeouts before reopening the drain.

## 7. Dead-letter recovery drill

1. Select only synthetic staging job IDs.
2. Record an operator ID and a reason of at least eight characters.
3. Run `requeue_dead_letters` for no more than 50 jobs.
4. Verify that only hashes of operator and reason are returned and persisted.
5. Verify attempts restart from the bounded state and that raw customer data is absent.
6. Simulate one storage failure; the result must be `retryable=true`, never a false success.

## 8. Key rotation

1. Add the new 32-byte key under a new key ID.
2. Keep the old key in the keyring.
3. Set the new active key ID.
4. Run old-key recovery fixtures.
5. Inspect queue age and retained jobs before removing an old key.
6. Removing a key while jobs still reference it is a release blocker.

## 9. Incident response

Critical conditions:

- non-zero dead-letter count above policy,
- oldest lease at circuit threshold,
- repeated heartbeat failures,
- cycle receipt persistence failure,
- unexpected store failures,
- keyring invalid or missing.

Capture aggregate receipts, deployment fingerprint, migration version and build identity. Never copy sealed payloads, access tokens, cookies, account IDs or raw prompts into tickets.

## 10. Promotion gate

Production promotion requires all of the following:

- exact Node/npm dependency and build proof,
- staging migrations applied,
- real PostgreSQL two-worker race,
- dead-letter recovery drill,
- key rotation drill,
- load and timeout measurements,
- alert delivery test,
- production KMS/secret-manager custody,
- rollback and incident owner assignment.
