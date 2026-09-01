# Durable computation staging promotion and rollback

This runbook is a prepared operational contract. It does not claim that staging or production execution has happened.

## Promotion gate
1. Apply migrations 4741 through 4750 in order on staging.
2. Call the protected operations endpoint with `action=probe`.
3. Require `state=ready`, matching schema `velmere.durable-computation.schema.4750`, all required tables, RLS and service-role grants.
4. Run two worker instances against a controlled fixture set and prove one completion per job.
5. Configure an HTTPS allowlisted alert destination and signing secret; verify HMAC signature and timestamp on the receiver.
6. Generate one warning and one critical fixture and require delivered outbox states.
7. Run key rotation, dead-letter requeue, circuit-breaker and retention drills.
8. Promote only after clean Node 24 install, typecheck, lint, build and started-server smoke.

## Rollback
- Stop both durable-computation crons first.
- Do not delete job, cycle, operator or alert-outbox rows during incident containment.
- Revert application traffic to the last exact checkpoint while preserving database evidence.
- If alert delivery is faulty, disable only the alert cron; durable job execution can remain enabled if its probe and race gates are green.
- If worker ownership or result integrity fails, disable worker drain and leave maintenance active.
- Database schema rollback is manual and must be reviewed; additive columns/tables are retained until evidence export and reconciliation complete.

## Privacy boundary
No runbook receipt may include account IDs, subject hashes, prompts, PDF contents, job IDs, lease tokens, service-role values, webhook URLs or signing secrets.
