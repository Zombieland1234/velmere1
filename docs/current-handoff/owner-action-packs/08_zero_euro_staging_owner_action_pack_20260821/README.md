# Velmère V4 — zero-euro staging owner-action pack

Status: `OWNER_ACTION_REQUIRED / NOT_EXECUTED / NO_STAGING_CREDIT`

This pack contains no credentials and performs no external mutation. It is the
minimal handoff needed to resume an owner-authorized, disposable, non-production
Supabase execution after the current post-P101 source is frozen into a unique
checkpoint.

## Why owner action is required

No Supabase URL, anon key, service-role key, database connection, project ref,
Supabase CLI, Docker-compatible runtime or native `psql` is present on this
host. Creating or linking an external project accepts provider terms and must be
done by the owner. The existing PGlite PostgreSQL 18.3 campaign is useful local
SQL-semantics evidence only; it is not Supabase/Auth/Storage/staging proof.

Supabase currently documents a $0 Free plan with two active free projects,
500 MB database, 1 GB file storage, 5 GB egress and 50,000 MAU. Free projects
may pause after low activity. The owner must verify the account's actual current
quota before selecting a project. Official references checked 2026-08-21:

- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/local-development

## Owner action — zero-cost path

1. Select an existing owner-controlled Free-plan project that is disposable,
   contains no production/customer data, and can be destroyed after proof; or
   create one only after personally accepting the provider terms.
2. Keep the project on the Free plan. Do not enable a paid organization,
   add-on, custom domain, PITR, paid IPv4 or production billing.
3. Create two disposable, owner-controlled test users (`tenant A`, `tenant B`)
   with distinct emails and verified identities. Do not paste passwords, JWTs,
   access tokens, service-role keys or database URLs into chat or logs.
4. Provide the environment variable names listed in
   `required-environment-names.txt` through a local secret store or ephemeral
   process environment. Public/anon and server/service-role credentials remain
   separate. Never expose the service-role credential to browser code.
5. Provide a second, empty disposable project or isolated database as the
   restore target. The restore target must not be the source project and must
   contain no production data.
6. Wait for the agent to freeze the current post-P101 tree into a new unique
   checkpoint. Do not bind staging to P101R1 or the historical A95 manifest,
   because current source now contains material post-checkpoint fixes.

## Agent resume command

After the owner has configured the variables locally and the new checkpoint is
frozen, resume this task with exactly:

```text
Resume Velmère zero-euro staging from the latest unique checkpoint. Use the
locally configured VELMERE_STAGING_* and SUPABASE_* variables; do not print
secrets. Execute source-bound migration, Auth, Storage, two-account RLS,
same-blob, concurrency/rollback/idempotency and isolated restore proof. Do not
deploy production or enable billing.
```

The agent must then first run read-only admission, bind every receipt to the
new checkpoint source/manifest SHA-256, and only after exact preflight execute:

```powershell
npm run run:a95:staging-subject
npm run run:a96:rls
```

The current A95/A96 tools are useful controls but their historical source
authority must be rebound minimally to the new checkpoint before they can grant
current staging credit. Any nonzero preflight is preserved and blocks mutation.

## Required physical execution order

1. Read-only project/environment identity and source admission.
2. Apply all `supabase/migrations/*.sql` in ordinal filename order with
   `ON_ERROR_STOP=1`; preserve stdout/stderr/exit per migration. The already
   proven local denominator is 117 migrations, but the final count/hash must be
   recomputed from the frozen checkpoint.
3. Verify schema/migration parity and required extensions on native PostgreSQL.
4. Create/authenticate tenant A and tenant B through actual Supabase Auth.
5. Run the exact 19-case A96 RLS replay inside its rollback-only transaction.
6. Run actual API routes with both JWTs: same-account reads succeed;
   cross-account records, audit cases, entitlements and artifacts are absent.
7. Verify service-role operations are server-only and cannot be reproduced by
   anon/user credentials.
8. Execute atomicity, idempotency, concurrent claim/settle and rollback cases.
9. Store one immutable artifact and prove preview/download/account readback are
   byte-identical (SHA-256 and byte length) while tenant B receives no bytes.
10. Exercise export/delete/session-revoke and durable-delete failure paths where
    implemented; never report a durable failure as success.
11. Create a bounded application-state backup and restore it only into the
    isolated disposable restore target. Recompare rows, event counts, digests,
    permissions, RLS and artifact hashes.
12. Run post-restore two-account negatives, then generate redacted receipts.

## Expected evidence

The exact machine-readable receipt inventory is in `expected-receipts.json`.
All receipts must contain hashes/opaque account fingerprints only—never raw
emails, passwords, JWTs, service keys, database URLs or artifact private data.

## Credit boundary

This pack itself grants zero staging, customer, FINAL, GO_PAID, LIVE or restore
credit. A Free-plan hosted execution may provide narrow internal staging proof;
it cannot establish production resilience, formal legal approval, SLA/PITR or a
real external pilot.
