# Shared entitlement helper — deployment and verification packet

Scope: entitlement evidence only. This packet must not create or update any
Customer FINAL or Paid Value FINAL ledger row.

## Bound live blocker

- GitHub run `33049743960` on Windows Server 2025 failed before product testing
  because `velmere-entitlement-e2e-oidc` returned `NOT_FOUND`.
- The live `velmere-product-entitlement-bridge` is active and fail-closed. It
  accepts only Browser `pro` / `advanced`, verifies a current Supabase Auth
  session and account binding, and resolves against a private capability.
- The live legacy Advanced test-grant RPC revokes every active Browser grant for
  the same run/account before inserting Advanced. That makes the existing
  `proSurvivesAdvancedRevocation` assertion physically impossible. The SQL in
  this packet adds a narrowly scoped, idempotent test RPC that preserves the
  independent Pro row and denies regrant after Advanced has been revoked.

## Source pins

| File | SHA-256 |
|---|---|
| `.github/workflows/velmere-shared-entitlement-e2e.yml` | `0492772c25588fcffc655e67110ab4ac617ef01b12abafc4c4030f6352760e15` |
| `supabase/functions/velmere-entitlement-e2e-oidc/index.ts` | `08cadc5568c0f6e6568dd1fa96fd3658feff2e38e97269f439b3cffa2cc2399b` |
| `supabase/functions/velmere-entitlement-e2e-oidc/oidc.ts` | `91f817efc6275e5afa748c46c951303fc46e1a2f8ff50c2d8d06533973857759` |
| `supabase/functions/velmere-entitlement-e2e-oidc/deno.json` | `ad42cede6312ee4b38ef6b0f3e9187b0adb8d10616e09acffa139bc14b8f342e` |
| `r7-entitlement-helper/sql/shared-entitlement-helper-prerequisites-v1.sql` | `bdf17fe44cfb87b1ab8f4ed12c673b8a050337cdb741447af709306335cbcd48` |
| `r7-entitlement-helper/tests/velmere-entitlement-e2e-oidc-negative.test.mjs` | `ddcac543cdff89766caaba5213bf89fdd0af08f7d7253953715046982f25fc2d` |
| `r7-entitlement-helper/tests/velmere-entitlement-source-contract.test.mjs` | `b30c32c49539e9a49c886a51aa8445650a4b5dae8068c637df39b7a2b90a5da5` |

Recompute every pin before deployment. Any mismatch is a stop condition.

Read-only live dependencies observed on 2026-08-28 (re-read immediately before
deployment; any drift requires review):

| Live dependency | Version / SHA-256 |
|---|---|
| Edge `velmere-product-entitlement-bridge` | `ACTIVE` v1, `ezbr_sha256=3cdd48f0cfd995045e919bfa711557a7dd390509ac40809f8d4b41e63986c6b6` |
| `velmere_current_active_session_account_id` | `96652ec8cff0ade8681d622fe55b2c305f28a4174da288a0da93ba05302beade` |
| `velmere_r7_create_browser_pro_test_entitlement_v1` | `abbeec9d29242ae9821ceae51bcc964e43ae43c51de1b15eb5528b97b24ba5b6` |
| `velmere_r7_revoke_browser_test_entitlement_v1` | `7cea828513b3528f5286a87826be1ee5f61dcf6c5ae2feb12eb76d66f91915a1` |
| `velmere_r7_cleanup_browser_test_entitlements_v1` | `b7c8f1ba4ee98c74a8f2e9a3d95c56fef4c4298df2b30db192f05fba34c61369` |
| `velmere_r7_read_product_entitlement_server_capability_for_oidc` | `a6d43b9713f5dec8bd39bae49d2ffc3680c4651437a9969b84f3042c1f1d6653` |

## Reviewed deployment order

1. Record live Customer FINAL and Paid Value FINAL counts. This is a baseline,
   not authorization to alter either ledger.
2. Apply `shared-entitlement-helper-prerequisites-v1.sql` as one reviewed
   migration named `r7_shared_entitlement_helper_prerequisites_v1`.
3. Run Supabase security advisors. Stop on any new warning attributable to this
   packet.
4. Deploy Edge Function slug `velmere-entitlement-e2e-oidc` with all three
   function files and entrypoint `index.ts`.
5. Set `verify_jwt=false` intentionally. GitHub Actions OIDC is not a Supabase
   user JWT; the function verifies GitHub's RS256 signature and exact issuer,
   audience, repository/owner IDs, actor ID, branch subject, workflow,
   `workflow_ref`, runner, event, run identity, SHA, and bounded token times in
   its own code. Do not deploy this source with platform `verify_jwt=true`.
6. Independently re-read the deployed function through the management plane and
   require `ACTIVE`, `verify_jwt=false`, an explicit deployed version, management
   `ezbr_sha256`, and byte hashes for all three returned source files matching
   this packet. Record those values outside the helper response. Do not infer
   source parity from status or the helper's self-reported `sourceVersion`.
7. Land the reviewed commit on
   `velmere-r7-successor-delta-20260825`. The path-filtered push starts the
   Windows E2E; a guarded `workflow_dispatch` is also allowed.
8. Require a successful Windows workflow plus an uploaded
   `VELMERE_SHARED_ENTITLEMENT_E2E.json` whose embedded source hashes match the
   commit. Require the pinned upload action's independent 64-hex
   `artifact-digest` output and its assertion step to pass. This remains PASS
   evidence, not FINAL.
9. Re-read both FINAL ledgers and require that their counts are unchanged by
   this entitlement-only lane.

## Database verification query

Run read-only after migration and require exactly four rows, all
`prosecdef=true`, an explicit `search_path`, no `anon` or `authenticated`
execute privilege, and `service_role` execute privilege:

```sql
select
  p.proname,
  p.prosecdef,
  p.proconfig,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_execute
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'velmere_r7_grant_browser_advanced_preserving_pro_test_v1',
    'velmere_r7_verify_browser_test_entitlement_cleanup_v1',
    'velmere_r7_consume_shared_entitlement_oidc_jti_v1',
    'velmere_r7_verify_shared_entitlement_user_cleanup_v1'
  )
order by p.proname;
```

Also require the JTI table to have RLS and FORCE RLS enabled, and no direct
table privilege for `anon`, `authenticated`, or `service_role`:

```sql
select
  c.relrowsecurity,
  c.relforcerowsecurity,
  has_table_privilege('anon', c.oid, 'select,insert,update,delete') as anon_dml,
  has_table_privilege('authenticated', c.oid, 'select,insert,update,delete') as authenticated_dml,
  has_table_privilege('service_role', c.oid, 'select,insert,update,delete') as service_role_dml
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'velmere_private'
  and c.relname = 'r7_entitlement_oidc_jti_consumptions';
```

## Required E2E assertions

- missing server capability is denied;
- every helper request obtains a new OIDC JWT; atomically reusing a consumed
  JTI with the same or a different body is denied before product mutation;
- only the SHA-256 of the JTI and exact raw request body are retained, bound to
  run ID, attempt, head SHA, action, and token times; records expire from the
  replay registry after 30 days;
- Basic cannot enter the paid resolver;
- A/Pro allowed, A/Advanced denied before grant;
- B cannot use A's Pro or Advanced grant;
- Advanced covers Pro while active;
- repeated active Advanced grant is idempotent;
- Advanced revoke is immediate while Pro remains active;
- regrant after Advanced revoke is denied as terminal replay;
- Pro revoke is immediate;
- first Auth sessions are invalidated and fresh sign-ins reconnect to the exact
  bound accounts;
- test users and their account bindings are physically absent, and every
  run-scoped entitlement is inactive;
- cleanup obtains fresh short-lived OIDC authorization and remains bound to the
  same exact run attempt and commit SHA, so an expired lifecycle token cannot
  strand test users or grants;
- the service-role key and private entitlement capability never enter the
  GitHub workflow or evidence artifact;
- every HTTP client has redirects disabled and the Edge runtime accepts only
  the exact project URL plus fixed GitHub JWKS / entitlement bridge targets;
- receipt fields keep `customerFinalCredit=false` and
  `paidValueFinalCredit=false`.

## Local verifier commands

```text
node r7-entitlement-helper/tests/velmere-entitlement-e2e-oidc-negative.test.mjs
node r7-entitlement-helper/tests/velmere-entitlement-source-contract.test.mjs
node --check supabase/functions/velmere-entitlement-e2e-oidc/oidc.ts
node --check supabase/functions/velmere-entitlement-e2e-oidc/index.ts
git diff --check
```

The OIDC suite currently covers 53 signed negative cases, including GitHub JWKS
redirect/429/500/network/content-type/size/duplicate-key fail-closed behavior. The implementation
follows the current Supabase Edge authorization split (custom external OIDC is
verified inside a `verify_jwt=false` handler) and GitHub's current OIDC claim
reference. The repository was created on 2026-06-14, and the live GitHub OIDC
configuration read on 2026-08-28 returned `use_default=true` and
`use_immutable_subject=false`; the verifier therefore requires the exact legacy
branch subject plus the immutable repository/owner IDs as separate claims. It
also requires the documented string representation of `run_number` /
`run_attempt`. The live branch API returned `protected=false`; when the optional
OIDC `ref_protected` claim is present, only semantic `false` is accepted, so a
later branch-protection change fails closed pending review:

- https://supabase.com/docs/guides/functions/auth-headers
- https://supabase.com/docs/guides/functions/auth
- https://docs.github.com/actions/reference/openid-connect-reference
- https://api.github.com/repos/Zombieland1234/velmere1/actions/oidc/customization/sub
- https://api.github.com/repos/Zombieland1234/velmere1/branches/velmere-r7-successor-delta-20260825

## Stop / rollback conditions

Stop without dispatching the workflow if the SQL hashes differ, either new RPC
is callable by `anon`/`authenticated`, Edge source parity cannot be proved, the
function returns a capability/service key, or the deployed helper is not bound
to the exact workflow ref. A failed test must run cleanup; it must never be
converted into FINAL credit.

The independent deployed Edge version/digest attestation is currently OPEN
because this packet has intentionally not been deployed. Until step 6 is
physically completed, the helper is not trusted evidence. This packet never
calls a generic paid finalizer, never writes a FINAL ledger directly, and does
not authorize any Customer FINAL or Paid Value FINAL transition.
