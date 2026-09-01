import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { runR7BoundedJsonRegression } from "./r7-browser-basic-bounded-json-regression.mjs";

const root = process.cwd();
const migrationPath = path.resolve(
  root,
  "supabase/migrations/20260824000009_r7_browser_basic_product_route_runtime_closure.sql",
);
const aclClosureMigrationPath = path.resolve(
  root,
  "supabase/migrations/20260825000010_r7_exact_service_role_table_acl_closure.sql",
);
const sequenceAclClosureMigrationPath = path.resolve(
  root,
  "supabase/migrations/20260825000011_r7_identity_sequence_acl_closure.sql",
);
const edgePath = path.resolve(
  root,
  "supabase/functions/r7-browser-basic-staging-proof/index.ts",
);
const boundedJsonPath = path.resolve(
  root,
  "supabase/functions/r7-browser-basic-staging-proof/bounded-json.mts",
);
const migration = fs.readFileSync(migrationPath, "utf8");
const aclClosureMigration = fs.readFileSync(aclClosureMigrationPath, "utf8");
const sequenceAclClosureMigration = fs.readFileSync(sequenceAclClosureMigrationPath, "utf8");
const edge = fs.readFileSync(edgePath, "utf8");
const boundedJson = fs.readFileSync(boundedJsonPath, "utf8");
const checks = [];

function check(id, condition, detail = null) {
  assert.equal(Boolean(condition), true, `${id}${detail ? `: ${JSON.stringify(detail)}` : ""}`);
  checks.push({ id, pass: true });
}

async function expectSqlState(id, action, expectedCode) {
  try {
    await action();
    assert.fail(`${id}: unexpected_success`);
  } catch (error) {
    if (error?.code === "ERR_ASSERTION") throw error;
    const code = String(error?.code ?? "");
    const message = String(error?.message ?? error);
    assert.equal(code, expectedCode, `${id}: ${code || message.slice(0, 400)}`);
    checks.push({ id, pass: true });
  }
}

// Static guards run even before the in-memory database is exercised.
check("migration_additive_transaction", /^begin;[\s\S]*commit;\s*$/u.test(migration));
check("acl_closure_additive_transaction", /^begin;[\s\S]*commit;\s*$/u.test(aclClosureMigration));
check(
  "sequence_acl_closure_additive_transaction",
  /^begin;[\s\S]*commit;\s*$/u.test(sequenceAclClosureMigration),
);
check(
  "acl_closure_revoke_before_exact_grants",
  aclClosureMigration.includes("revoke all privileges on table")
    && aclClosureMigration.includes("from service_role;")
    && aclClosureMigration.indexOf("revoke all privileges on table")
      < aclClosureMigration.indexOf("grant select, insert, update, delete"),
);
check(
  "acl_closure_replay_ledger_select_only",
  aclClosureMigration.includes(
    "grant select\n  on table public.velmere_account_supabase_subject_binding_requests\n  to service_role;",
  ),
);
check(
  "acl_closure_identity_sequences_closed",
  aclClosureMigration.includes("revoke all privileges on sequence")
    && aclClosureMigration.includes("public.velmere_auth_security_events_id_seq")
    && aclClosureMigration.includes("public.velmere_auth_security_alerts_id_seq")
    && !/grant\s+(?:usage|select|update)[\s\S]*?on\s+sequence/iu.test(aclClosureMigration),
);
check(
  "acl_closure_removes_independent_column_acls",
  aclClosureMigration.includes("pg_catalog.pg_attribute")
    && aclClosureMigration.includes("revoke all privileges (%s) on table %s from service_role"),
);
check(
  "sequence_acl_closure_covers_all_api_roles",
  sequenceAclClosureMigration.includes("revoke all privileges on sequence")
    && sequenceAclClosureMigration.includes("from public, anon, authenticated, service_role;"),
);
check(
  "migration_digest_schema_exact",
  migration.includes("extensions.digest(") && !/(?<!extensions\.)\bdigest\s*\(/u.test(migration),
);
check(
  "migration_hardened_search_paths",
  !/set search_path\s*=\s*public(?:\s|,)/iu.test(migration),
);
check(
  "owner_restore_wrapper_service_only",
  migration.includes("velmere_r7_restore_artifact_from_backup_for_owner")
    && migration.includes("raise exception 'r7_restore_backup_not_owned' using errcode = '42501'")
    && migration.includes("from public, anon, authenticated")
    && migration.includes("to service_role"),
);
check("edge_uses_anon_key", edge.includes('Deno.env.get("SUPABASE_ANON_KEY")'));
check("edge_verifies_gotrue_user", edge.includes("caller.auth.getUser(token)"));
check("edge_resolves_active_gotrue_session_account", edge.includes('"velmere_current_active_session_account_id"'));
check(
  "active_session_rpc_derives_identity",
  migration.includes("velmere_current_active_session_account_id()")
    && migration.includes("v_subject uuid := auth.uid()")
    && migration.includes("auth.jwt() ->> 'session_id'")
    && migration.includes("from auth.sessions as sessions")
    && migration.includes("sessions.user_id = v_subject")
    && migration.includes("sessions.not_after is null or sessions.not_after > pg_catalog.now()"),
);
check(
  "edge_enforces_canonical_subject_account",
  edge.includes("const expectedAccount = `supabase:${user.id.toLowerCase()}`")
    && edge.includes("currentAccount !== expectedAccount"),
);
check(
  "edge_uses_atomic_owner_restore",
  edge.includes('"velmere_r7_restore_artifact_from_backup_for_owner"')
    && edge.includes("p_expected_account_id: currentAccount")
    && !/admin\.rpc\(\s*["']velmere_r7_restore_artifact_from_backup["']/u.test(edge),
);
check(
  "edge_dependencies_exactly_pinned",
  edge.includes('jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts')
    && edge.includes('jsr:@supabase/supabase-js@2.108.1')
    && !edge.includes('jsr:@supabase/functions-js/edge-runtime.d.ts')
    && !edge.includes('jsr:@supabase/supabase-js@2"'),
);
check(
  "edge_uses_actual_bounded_stream_reader",
  edge.includes('from "./bounded-json.mts"')
    && edge.includes("readR7BoundedJsonRequest(request)")
    && !edge.includes("request.json()")
    && boundedJson.includes("request.body.getReader()")
    && boundedJson.includes("byteLength > R7_BROWSER_BASIC_MAX_REQUEST_BYTES"),
);
check(
  "edge_exact_action_shapes",
  edge.includes("validateR7BrowserBasicRequest(requestRead.body)")
    && boundedJson.includes("Object.keys(body).sort()")
    && boundedJson.includes("request_shape_invalid"),
);
check(
  "edge_collapses_restore_existence_oracle",
  edge.includes("mapR7RestoreFailure(error?.code)")
    && boundedJson.includes('errorCode === "42501" || errorCode === "P0002"')
    && !edge.includes("restore_not_owned"),
);
check(
  "edge_resolves_caller_before_admin",
  edge.indexOf('"velmere_current_active_session_account_id"') < edge.indexOf("const admin = createClient"),
);
check("edge_never_logs", !/\bconsole\.(?:log|debug|info|warn|error)\s*\(/u.test(edge));

const boundedJsonReceipt = await runR7BoundedJsonRegression();
check(
  "bounded_json_runtime_regression",
  boundedJsonReceipt.ok === true
    && boundedJsonReceipt.checks === 15
    && boundedJsonReceipt.maxRequestBytes === 8192,
  boundedJsonReceipt,
);

const db = new PGlite({ extensions: { pgcrypto } });
await db.waitReady;

await db.exec(String.raw`
create schema extensions;
create extension pgcrypto with schema extensions;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users(id uuid primary key, deleted_at timestamptz);
create table auth.sessions(
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  not_after timestamptz
);
create or replace function auth.uid() returns uuid
language sql stable
set search_path = pg_catalog, pg_temp
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create or replace function auth.jwt() returns jsonb
language sql stable
set search_path = pg_catalog, pg_temp
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb;
$$;
grant usage on schema auth to authenticated, service_role;
grant execute on function auth.uid() to authenticated, service_role;
grant execute on function auth.jwt() to authenticated, service_role;
create schema velmere_private;
create table velmere_private.r7_artifact_backups(
  backup_id text primary key,
  account_id text not null
);
create table velmere_private.r7_restore_calls(
  backup_id text not null,
  called_at timestamptz not null default now()
);
create or replace function public.velmere_r7_restore_artifact_from_backup(p_backup_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, velmere_private, pg_temp
as $$
begin
  insert into velmere_private.r7_restore_calls(backup_id) values (p_backup_id);
  return jsonb_build_object('created', true, 'backupId', p_backup_id);
end;
$$;
insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into auth.sessions(id,user_id,not_after) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',clock_timestamp()+interval '1 hour'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111',clock_timestamp()-interval '1 hour'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','22222222-2222-4222-8222-222222222222',clock_timestamp()+interval '1 hour');
`);

await db.exec(migration);
await db.exec(migration);
checks.push({ id: "migration_idempotent_double_apply", pass: true });

// Supabase's platform CREATE TABLE hook can pre-grant the service role a broad
// ACL. Reproduce that live-staging condition so the additive closure migration
// must remove DELETE/TRUNCATE/REFERENCES/TRIGGER instead of passing only in a
// clean PGlite database.
await db.exec(`grant all privileges on table
  public.velmere_account_supabase_subject_bindings,
  public.velmere_account_supabase_subject_binding_requests,
  public.velmere_auth_security_events,
  public.velmere_auth_security_alerts,
  public.velmere_auth_session_families,
  public.velmere_durable_computation_jobs
to service_role;`);
await db.exec(`grant all privileges on sequence
  public.velmere_auth_security_events_id_seq,
  public.velmere_auth_security_alerts_id_seq
to anon, authenticated, service_role;`);
await db.exec(`grant update (operator_fingerprint), references (account_id)
on table public.velmere_account_supabase_subject_binding_requests
to service_role;`);
const broadenedReplayAcl = await db.query(`select
  has_table_privilege(
    'service_role',
    'public.velmere_account_supabase_subject_binding_requests',
    'delete'
  ) as can_delete,
  has_table_privilege(
    'service_role',
    'public.velmere_account_supabase_subject_binding_requests',
    'truncate'
  ) as can_truncate`);
check(
  "supabase_broad_acl_condition_reproduced",
  broadenedReplayAcl.rows[0].can_delete === true
    && broadenedReplayAcl.rows[0].can_truncate === true,
  broadenedReplayAcl.rows[0],
);
const broadenedSequenceAcl = await db.query(`select
  has_sequence_privilege(
    'service_role',
    'public.velmere_auth_security_events_id_seq',
    'usage,select,update'
  ) as events_broad,
  has_sequence_privilege(
    'service_role',
    'public.velmere_auth_security_alerts_id_seq',
    'usage,select,update'
  ) as alerts_broad`);
check(
  "supabase_broad_sequence_acl_condition_reproduced",
  broadenedSequenceAcl.rows[0].events_broad === true
    && broadenedSequenceAcl.rows[0].alerts_broad === true,
  broadenedSequenceAcl.rows[0],
);
const broadenedColumnAcl = await db.query(`select
  has_column_privilege(
    'service_role',
    'public.velmere_account_supabase_subject_binding_requests',
    'operator_fingerprint',
    'update'
  ) as operator_update,
  has_column_privilege(
    'service_role',
    'public.velmere_account_supabase_subject_binding_requests',
    'account_id',
    'references'
  ) as account_references`);
check(
  "independent_column_acl_condition_reproduced",
  broadenedColumnAcl.rows[0].operator_update === true
    && broadenedColumnAcl.rows[0].account_references === true,
  broadenedColumnAcl.rows[0],
);

await db.exec(aclClosureMigration);
await db.exec(aclClosureMigration);
checks.push({ id: "acl_closure_migration_idempotent_double_apply", pass: true });

const apiSequenceAclAfterTableClosure = await db.query(`select
  has_sequence_privilege(
    'anon',
    'public.velmere_auth_security_events_id_seq',
    'usage,select,update'
  ) as anon_events_any,
  has_sequence_privilege(
    'authenticated',
    'public.velmere_auth_security_alerts_id_seq',
    'usage,select,update'
  ) as authenticated_alerts_any`);
check(
  "platform_api_sequence_acl_condition_survives_table_closure",
  apiSequenceAclAfterTableClosure.rows[0].anon_events_any === true
    && apiSequenceAclAfterTableClosure.rows[0].authenticated_alerts_any === true,
  apiSequenceAclAfterTableClosure.rows[0],
);

await db.exec(sequenceAclClosureMigration);
await db.exec(sequenceAclClosureMigration);
checks.push({ id: "sequence_acl_closure_migration_idempotent_double_apply", pass: true });

const tableAclExpectations = new Map([
  ["velmere_account_supabase_subject_bindings", [true, true, true, true, false, false, false, false]],
  ["velmere_account_supabase_subject_binding_requests", [true, false, false, false, false, false, false, false]],
  ["velmere_auth_security_events", [true, true, true, false, false, false, false, false]],
  ["velmere_auth_security_alerts", [true, true, true, false, false, false, false, false]],
  ["velmere_auth_session_families", [true, true, true, false, false, false, false, false]],
  ["velmere_durable_computation_jobs", [true, true, true, true, false, false, false, false]],
]);
const tablePrivileges = [
  "select",
  "insert",
  "update",
  "delete",
  "truncate",
  "references",
  "trigger",
  "maintain",
];
for (const [tableName, expected] of tableAclExpectations) {
  const actual = [];
  for (const privilege of tablePrivileges) {
    const result = await db.query(
      `select has_table_privilege('service_role', $1, $2) as allowed`,
      [`public.${tableName}`, privilege],
    );
    actual.push(result.rows[0].allowed);
  }
  check(
    `service_role_exact_table_acl_${tableName}`,
    JSON.stringify(actual) === JSON.stringify(expected),
    { privileges: tablePrivileges, actual, expected },
  );
}

const rowSecurity = await db.query(`select relname, relrowsecurity
from pg_catalog.pg_class
where relnamespace = 'public'::regnamespace
  and relname = any($1::text[])
order by relname`, [Array.from(tableAclExpectations.keys())]);
check(
  "all_runtime_tables_rls_enabled",
  rowSecurity.rows.length === tableAclExpectations.size
    && rowSecurity.rows.every((row) => row.relrowsecurity === true),
  rowSecurity.rows,
);

const authenticatedBindingAcl = await db.query(`select
  has_table_privilege(
    'authenticated',
    'public.velmere_account_supabase_subject_bindings',
    'select'
  ) as table_select,
  has_column_privilege(
    'authenticated',
    'public.velmere_account_supabase_subject_bindings',
    'account_id',
    'select'
  ) as account_id_select,
  has_column_privilege(
    'authenticated',
    'public.velmere_account_supabase_subject_bindings',
    'supabase_subject',
    'select'
  ) as subject_select,
  has_column_privilege(
    'authenticated',
    'public.velmere_account_supabase_subject_bindings',
    'request_id',
    'select'
  ) as request_id_select,
  has_column_privilege(
    'authenticated',
    'public.velmere_account_supabase_subject_bindings',
    'operator_fingerprint',
    'select'
  ) as operator_select,
  has_column_privilege(
    'authenticated',
    'public.velmere_account_supabase_subject_bindings',
    'created_at',
    'select'
  ) as created_at_select,
  has_column_privilege(
    'authenticated',
    'public.velmere_account_supabase_subject_bindings',
    'updated_at',
    'select'
  ) as updated_at_select,
  has_table_privilege(
    'authenticated',
    'public.velmere_account_supabase_subject_binding_requests',
    'select,insert,update,delete,truncate,references,trigger,maintain'
  ) as request_ledger_any_table_privilege`);
check(
  "authenticated_binding_acl_is_column_scoped",
  authenticatedBindingAcl.rows[0].table_select === false
    && authenticatedBindingAcl.rows[0].account_id_select === true
    && authenticatedBindingAcl.rows[0].subject_select === true
    && authenticatedBindingAcl.rows[0].request_id_select === false
    && authenticatedBindingAcl.rows[0].operator_select === false
    && authenticatedBindingAcl.rows[0].created_at_select === false
    && authenticatedBindingAcl.rows[0].updated_at_select === false
    && authenticatedBindingAcl.rows[0].request_ledger_any_table_privilege === false,
  authenticatedBindingAcl.rows[0],
);

const closedSequenceAcl = await db.query(`select
  role_name,
  sequence_name,
  has_sequence_privilege(
    role_name,
    'public.' || sequence_name,
    'usage,select,update'
  ) as any_privilege
from unnest(array['anon','authenticated','service_role']) as roles(role_name)
cross join unnest(array[
  'velmere_auth_security_events_id_seq',
  'velmere_auth_security_alerts_id_seq'
]) as sequences(sequence_name)`);
check(
  "service_role_identity_sequence_acl_closed",
  closedSequenceAcl.rows.length === 6
    && closedSequenceAcl.rows.every((row) => row.any_privilege === false),
  closedSequenceAcl.rows,
);

const closedColumnAcl = await db.query(`select
  has_column_privilege(
    'service_role',
    'public.velmere_account_supabase_subject_binding_requests',
    'operator_fingerprint',
    'update'
  ) as operator_update,
  has_column_privilege(
    'service_role',
    'public.velmere_account_supabase_subject_binding_requests',
    'account_id',
    'references'
  ) as account_references`);
check(
  "service_role_independent_column_acls_closed",
  closedColumnAcl.rows[0].operator_update === false
    && closedColumnAcl.rows[0].account_references === false,
  closedColumnAcl.rows[0],
);

await db.exec(`set role service_role;
insert into public.velmere_auth_security_events(event_family, outcome, time_bucket)
values ('oauth', 'pending', '2026-08-25 12:00:00+00');
insert into public.velmere_auth_security_alerts(
  alert_key,
  event_family,
  outcome,
  severity,
  event_count,
  time_bucket
) values (
  'acl-closure-identity-proof',
  'oauth',
  'pending',
  'medium',
  1,
  '2026-08-25 12:00:00+00'
);
reset role;`);
check("identity_insert_without_sequence_acl", true);

const digestLocations = await db.query(`select
  to_regprocedure('extensions.digest(text,text)') is not null as extension_digest,
  to_regprocedure('public.digest(text,text)') is not null as public_digest`);
check(
  "pgcrypto_digest_extension_schema",
  digestLocations.rows[0].extension_digest === true
    && digestLocations.rows[0].public_digest === false,
  digestLocations.rows[0],
);

const binding = await db.query(
  `select public.velmere_bind_account_to_supabase_subject($1,$2::uuid,$3,$4) as status`,
  [
    "supabase:11111111-1111-4111-8111-111111111111",
    "11111111-1111-4111-8111-111111111111",
    "r7bindreq_1111111111111111",
    "operator_11111111111111111111",
  ],
);
check("subject_binding_created", binding.rows[0].status === "bound", binding.rows[0]);
const bindingReplay = await db.query(
  `select public.velmere_bind_account_to_supabase_subject($1,$2::uuid,$3,$4) as status`,
  [
    "supabase:11111111-1111-4111-8111-111111111111",
    "11111111-1111-4111-8111-111111111111",
    "r7bindreq_1111111111111111",
    "operator_11111111111111111111",
  ],
);
check("subject_binding_exact_replay", bindingReplay.rows[0].status === "already_bound", bindingReplay.rows[0]);

const bindingReplayOperatorConflict = await db.query(
  `select public.velmere_bind_account_to_supabase_subject($1,$2::uuid,$3,$4) as status`,
  [
    "supabase:11111111-1111-4111-8111-111111111111",
    "11111111-1111-4111-8111-111111111111",
    "r7bindreq_1111111111111111",
    "operator_22222222222222222222",
  ],
);
check(
  "subject_binding_exact_request_operator_mismatch_conflict",
  bindingReplayOperatorConflict.rows[0].status === "conflict",
  bindingReplayOperatorConflict.rows[0],
);

// Reproduce a binding created by the older owner-controlled GoTrue
// provisioner before the current operator fingerprint contract existed.
await db.query(
  `update public.velmere_account_supabase_subject_bindings
      set operator_fingerprint=$1
    where account_id=$2`,
  [
    "r7_gotrue_provisioner",
    "supabase:11111111-1111-4111-8111-111111111111",
  ],
);
await db.query(
  `update public.velmere_account_supabase_subject_binding_requests
      set operator_fingerprint=$1
    where request_id=$2`,
  ["r7_gotrue_provisioner", "r7bindreq_1111111111111111"],
);

const reloginRequestId = "r7bindreq_relogin111111111";
const reloginBinding = await db.query(
  `select public.velmere_bind_account_to_supabase_subject($1,$2::uuid,$3,$4) as status`,
  [
    "supabase:11111111-1111-4111-8111-111111111111",
    "11111111-1111-4111-8111-111111111111",
    reloginRequestId,
    "operator_11111111111111111111",
  ],
);
check(
  "subject_binding_new_request_relogin_idempotent",
  reloginBinding.rows[0].status === "already_bound",
  reloginBinding.rows[0],
);
const reloginReplay = await db.query(
  `select public.velmere_bind_account_to_supabase_subject($1,$2::uuid,$3,$4) as status`,
  [
    "supabase:11111111-1111-4111-8111-111111111111",
    "11111111-1111-4111-8111-111111111111",
    reloginRequestId,
    "operator_11111111111111111111",
  ],
);
check(
  "auth_relogin_refresh_binding_assumption",
  reloginReplay.rows[0].status === "already_bound",
  reloginReplay.rows[0],
);
const bindingHistory = await db.query(
  `select request_id,operator_fingerprint
     from public.velmere_account_supabase_subject_bindings
    where account_id=$1`,
  ["supabase:11111111-1111-4111-8111-111111111111"],
);
check(
  "subject_binding_history_immutable",
  bindingHistory.rows[0].request_id === "r7bindreq_1111111111111111"
    && bindingHistory.rows[0].operator_fingerprint === "r7_gotrue_provisioner",
  bindingHistory.rows[0],
);

const orphanRequestId = "r7bindreq_orphan2222222222";
await db.query(
  `insert into public.velmere_account_supabase_subject_binding_requests(
     request_id,account_id,supabase_subject,operator_fingerprint
   ) values ($1,$2,$3::uuid,$4)`,
  [
    orphanRequestId,
    "supabase:22222222-2222-4222-8222-222222222222",
    "22222222-2222-4222-8222-222222222222",
    "operator_22222222222222222222",
  ],
);
const orphanRequestReplay = await db.query(
  `select public.velmere_bind_account_to_supabase_subject($1,$2::uuid,$3,$4) as status`,
  [
    "supabase:22222222-2222-4222-8222-222222222222",
    "22222222-2222-4222-8222-222222222222",
    orphanRequestId,
    "operator_22222222222222222222",
  ],
);
check(
  "subject_binding_orphan_request_replay_fail_closed",
  orphanRequestReplay.rows[0].status === "conflict",
  orphanRequestReplay.rows[0],
);
await db.query(
  `delete from public.velmere_account_supabase_subject_binding_requests where request_id=$1`,
  [orphanRequestId],
);

const crossIdentityRequestReuse = await db.query(
  `select public.velmere_bind_account_to_supabase_subject($1,$2::uuid,$3,$4) as status`,
  [
    "supabase:22222222-2222-4222-8222-222222222222",
    "22222222-2222-4222-8222-222222222222",
    reloginRequestId,
    "operator_22222222222222222222",
  ],
);
check(
  "subject_binding_new_request_cross_identity_reuse_conflict",
  crossIdentityRequestReuse.rows[0].status === "conflict",
  crossIdentityRequestReuse.rows[0],
);

const sameAccountDifferentSubject = await db.query(
  `select public.velmere_bind_account_to_supabase_subject($1,$2::uuid,$3,$4) as status`,
  [
    "supabase:11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "r7bindreq_accountcollision1",
    "operator_22222222222222222222",
  ],
);
check(
  "subject_binding_same_account_different_subject_conflict",
  sameAccountDifferentSubject.rows[0].status === "conflict",
  sameAccountDifferentSubject.rows[0],
);

const sameSubjectDifferentAccount = await db.query(
  `select public.velmere_bind_account_to_supabase_subject($1,$2::uuid,$3,$4) as status`,
  [
    "supabase:alternate-account-11111111",
    "11111111-1111-4111-8111-111111111111",
    "r7bindreq_subjectcollision1",
    "operator_22222222222222222222",
  ],
);
check(
  "subject_binding_same_subject_different_account_conflict",
  sameSubjectDifferentAccount.rows[0].status === "conflict",
  sameSubjectDifferentAccount.rows[0],
);

const rejectedRequests = await db.query(
  `select count(*)::integer as count
     from public.velmere_account_supabase_subject_binding_requests
    where request_id in ($1,$2)`,
  ["r7bindreq_accountcollision1", "r7bindreq_subjectcollision1"],
);
check(
  "subject_binding_rejected_requests_not_reserved",
  rejectedRequests.rows[0].count === 0,
  rejectedRequests.rows[0],
);

await db.exec(`set role authenticated; select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  false
)`);
const currentAccount = await db.query(`select public.velmere_current_account_id() as account_id`);
await db.exec("reset role");
check(
  "current_account_rls_resolution",
  currentAccount.rows[0].account_id === "supabase:11111111-1111-4111-8111-111111111111",
  currentAccount.rows[0],
);

async function resolveActiveSessionAccount(subject, claims) {
  await db.exec("set role authenticated");
  try {
    await db.query(
      `select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`,
      [subject, JSON.stringify(claims)],
    );
    return await db.query(`select public.velmere_current_active_session_account_id() as account_id`);
  } finally {
    await db.exec("reset role");
  }
}

const activeSessionAccount = await resolveActiveSessionAccount(
  "11111111-1111-4111-8111-111111111111",
  {
    sub: "11111111-1111-4111-8111-111111111111",
    session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  },
);
check(
  "active_gotrue_session_account_resolution",
  activeSessionAccount.rows[0].account_id === "supabase:11111111-1111-4111-8111-111111111111",
  activeSessionAccount.rows[0],
);
const expiredSessionAccount = await resolveActiveSessionAccount(
  "11111111-1111-4111-8111-111111111111",
  {
    sub: "11111111-1111-4111-8111-111111111111",
    session_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  },
);
check("expired_gotrue_session_rejected", expiredSessionAccount.rows[0].account_id === null, expiredSessionAccount.rows[0]);
const crossSubjectSession = await resolveActiveSessionAccount(
  "11111111-1111-4111-8111-111111111111",
  {
    sub: "11111111-1111-4111-8111-111111111111",
    session_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  },
);
check("cross_subject_gotrue_session_rejected", crossSubjectSession.rows[0].account_id === null, crossSubjectSession.rows[0]);
const missingSessionClaim = await resolveActiveSessionAccount(
  "11111111-1111-4111-8111-111111111111",
  { sub: "11111111-1111-4111-8111-111111111111" },
);
check("missing_session_claim_rejected", missingSessionClaim.rows[0].account_id === null, missingSessionClaim.rows[0]);
await db.query(`delete from auth.sessions where id=$1::uuid`, ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
const loggedOutSessionAccount = await resolveActiveSessionAccount(
  "11111111-1111-4111-8111-111111111111",
  {
    sub: "11111111-1111-4111-8111-111111111111",
    session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  },
);
check("deleted_gotrue_session_rejected", loggedOutSessionAccount.rows[0].account_id === null, loggedOutSessionAccount.rows[0]);

const familyId = "33333333-3333-4333-8333-333333333333";
const subjectFingerprint = "a".repeat(32);
const issued = await db.query(
  `select * from public.velmere_issue_auth_session_family($1::uuid,$2,clock_timestamp()+interval '1 hour')`,
  [familyId, subjectFingerprint],
);
check("auth_family_issued", issued.rows[0].status === "issued" && issued.rows[0].generation === 1, issued.rows[0]);
const expiry = (await db.query(
  `select expires_at from public.velmere_auth_session_families where family_id=$1::uuid`,
  [familyId],
)).rows[0].expires_at;
const verified = await db.query(
  `select * from public.velmere_verify_auth_session_family($1::uuid,$2,1,$3::timestamptz)`,
  [familyId, subjectFingerprint, expiry],
);
check("auth_family_verified_active", verified.rows[0].status === "active", verified.rows[0]);
const rotated = await db.query(
  `select * from public.velmere_rotate_auth_session_family($1::uuid,1,$2::timestamptz)`,
  [familyId, expiry],
);
check("auth_family_rotated", rotated.rows[0].status === "rotated" && rotated.rows[0].generation === 2, rotated.rows[0]);
const reuse = await db.query(
  `select * from public.velmere_rotate_auth_session_family($1::uuid,7,$2::timestamptz)`,
  [familyId, expiry],
);
check("auth_family_reuse_fail_closed", reuse.rows[0].status === "reuse_detected", reuse.rows[0]);
const revoked = await db.query(
  `select * from public.velmere_revoke_auth_session_subject($1,$2)`,
  [subjectFingerprint, "logout_all"],
);
check("auth_subject_central_revocation", revoked.rows[0].status === "revoked" && revoked.rows[0].revoked_count === 1, revoked.rows[0]);

const jobId = `dcj_${"1".repeat(48)}`;
const inputHash = "2".repeat(64);
const subjectHash = "3".repeat(64);
const leaseToken = "lease-token-12345678901234567890";
const envelope = {
  schemaVersion: "velmere.durable-computation.sealed-payload.v1",
  algorithm: "A256GCM",
};
const claimed = await db.query(
  `select * from public.velmere_claim_durable_computation(
    $1,'lens_pdf_render',$2,$3,$4,60,3,$5::jsonb
  )`,
  [jobId, inputHash, subjectHash, leaseToken, JSON.stringify(envelope)],
);
check("durable_job_claimed", claimed.rows[0].state === "claimed" && claimed.rows[0].attempt_count === 1, claimed.rows[0]);
const wrongCompletion = await db.query(
  `select * from public.velmere_complete_durable_computation($1,$2,$3::jsonb)`,
  [jobId, "wrong-lease-token-123456789012345", JSON.stringify({ ok: true })],
);
check("durable_wrong_lease_rejected", wrongCompletion.rows[0].state === "conflict", wrongCompletion.rows[0]);
const completion = await db.query(
  `select * from public.velmere_complete_durable_computation($1,$2,$3::jsonb)`,
  [jobId, leaseToken, JSON.stringify({ ok: true, pdfDigest: "sha256:test" })],
);
check("durable_job_completed", completion.rows[0].state === "completed", completion.rows[0]);
const replay = await db.query(
  `select * from public.velmere_claim_durable_computation(
    $1,'lens_pdf_render',$2,$3,$4,60,3,$5::jsonb
  )`,
  [jobId, inputHash, subjectHash, leaseToken, JSON.stringify(envelope)],
);
check(
  "durable_result_exact_replay",
  replay.rows[0].state === "completed" && replay.rows[0].result_payload?.ok === true,
  replay.rows[0],
);
const identityConflict = await db.query(
  `select * from public.velmere_claim_durable_computation(
    $1,'lens_pdf_render',$2,$3,$4,60,3,$5::jsonb
  )`,
  [jobId, "4".repeat(64), subjectHash, leaseToken, JSON.stringify(envelope)],
);
check("durable_identity_conflict", identityConflict.rows[0].state === "conflict", identityConflict.rows[0]);

const backupA = `r7-backup-${"a".repeat(64)}`;
const backupB = `r7-backup-${"b".repeat(64)}`;
await db.query(
  `insert into velmere_private.r7_artifact_backups(backup_id,account_id) values ($1,$2),($3,$4)`,
  [
    backupA,
    "supabase:11111111-1111-4111-8111-111111111111",
    backupB,
    "supabase:22222222-2222-4222-8222-222222222222",
  ],
);
const ownerRestore = await db.query(
  `select public.velmere_r7_restore_artifact_from_backup_for_owner($1,$2) as receipt`,
  [backupA, "supabase:11111111-1111-4111-8111-111111111111"],
);
check("owner_restore_allowed", ownerRestore.rows[0].receipt.created === true, ownerRestore.rows[0]);
await expectSqlState(
  "cross_account_restore_denied",
  () => db.query(
    `select public.velmere_r7_restore_artifact_from_backup_for_owner($1,$2)`,
    [backupB, "supabase:11111111-1111-4111-8111-111111111111"],
  ),
  "42501",
);
const restoreCalls = await db.query(`select count(*)::integer as count from velmere_private.r7_restore_calls`);
check("denied_restore_never_reaches_base_rpc", restoreCalls.rows[0].count === 1, restoreCalls.rows[0]);

const privileges = await db.query(`select
  has_function_privilege(
    'anon',
    'public.velmere_current_active_session_account_id()',
    'execute'
  ) as anon_active_session,
  has_function_privilege(
    'authenticated',
    'public.velmere_current_active_session_account_id()',
    'execute'
  ) as authenticated_active_session,
  has_function_privilege(
    'service_role',
    'public.velmere_current_active_session_account_id()',
    'execute'
  ) as service_active_session,
  has_function_privilege(
    'authenticated',
    'public.velmere_r7_restore_artifact_from_backup_for_owner(text,text)',
    'execute'
  ) as authenticated_restore,
  has_function_privilege(
    'service_role',
    'public.velmere_r7_restore_artifact_from_backup_for_owner(text,text)',
    'execute'
  ) as service_restore,
  has_function_privilege(
    'authenticated',
    'public.velmere_claim_durable_computation(text,text,text,text,text,integer,integer,jsonb)',
    'execute'
  ) as authenticated_claim,
  has_function_privilege(
    'service_role',
    'public.velmere_claim_durable_computation(text,text,text,text,text,integer,integer,jsonb)',
    'execute'
  ) as service_claim,
  has_table_privilege(
    'authenticated',
    'public.velmere_account_supabase_subject_binding_requests',
    'select,insert,update,delete'
  ) as authenticated_binding_requests,
  has_table_privilege(
    'service_role',
    'public.velmere_account_supabase_subject_binding_requests',
    'select'
  ) as service_binding_requests_read,
  has_table_privilege(
    'service_role',
    'public.velmere_account_supabase_subject_binding_requests',
    'insert,update,delete'
  ) as service_binding_requests_write`);
check(
  "privileged_rpc_acl",
  privileges.rows[0].anon_active_session === false
    && privileges.rows[0].authenticated_active_session === true
    && privileges.rows[0].service_active_session === true
    && privileges.rows[0].authenticated_restore === false
    && privileges.rows[0].service_restore === true
    && privileges.rows[0].authenticated_claim === false
    && privileges.rows[0].service_claim === true
    && privileges.rows[0].authenticated_binding_requests === false
    && privileges.rows[0].service_binding_requests_read === true
    && privileges.rows[0].service_binding_requests_write === false,
  privileges.rows[0],
);

const serviceOnlyFunctionSignatures = [
  "public.velmere_bind_account_to_supabase_subject(text,uuid,text,text)",
  "public.velmere_record_auth_security_event(text,text)",
  "public.velmere_issue_auth_session_family(uuid,text,timestamptz)",
  "public.velmere_rotate_auth_session_family(uuid,integer,timestamptz)",
  "public.velmere_revoke_auth_session_family(uuid,text)",
  "public.velmere_verify_auth_session_family(uuid,text,integer,timestamptz)",
  "public.velmere_revoke_auth_session_subject(text,text)",
  "public.velmere_claim_durable_computation(text,text,text,text,text,integer,integer,jsonb)",
  "public.velmere_complete_durable_computation(text,text,jsonb)",
  "public.velmere_fail_durable_computation(text,text,text,integer)",
  "public.velmere_r7_restore_artifact_from_backup_for_owner(text,text)",
];
const serviceOnlyFunctionAcl = [];
for (const signature of serviceOnlyFunctionSignatures) {
  for (const role of ["anon", "authenticated", "service_role"]) {
    const result = await db.query(
      "select has_function_privilege($1, $2, 'execute') as allowed",
      [role, signature],
    );
    serviceOnlyFunctionAcl.push({ signature, role, allowed: result.rows[0].allowed });
  }
}
check(
  "all_service_only_rpc_acls_exact",
  serviceOnlyFunctionAcl.length === serviceOnlyFunctionSignatures.length * 3
    && serviceOnlyFunctionAcl.every(
      (entry) => entry.allowed === (entry.role === "service_role"),
    ),
  serviceOnlyFunctionAcl.filter(
    (entry) => entry.allowed !== (entry.role === "service_role"),
  ),
);

const ownerReadFunctionSignatures = [
  "public.velmere_current_account_id()",
  "public.velmere_current_active_session_account_id()",
];
const ownerReadFunctionAcl = [];
for (const signature of ownerReadFunctionSignatures) {
  for (const role of ["anon", "authenticated", "service_role"]) {
    const result = await db.query(
      "select has_function_privilege($1, $2, 'execute') as allowed",
      [role, signature],
    );
    ownerReadFunctionAcl.push({ signature, role, allowed: result.rows[0].allowed });
  }
}
check(
  "owner_read_rpc_acls_exact",
  ownerReadFunctionAcl.length === ownerReadFunctionSignatures.length * 3
    && ownerReadFunctionAcl.every(
      (entry) => entry.allowed === (entry.role !== "anon"),
    ),
  ownerReadFunctionAcl.filter(
    (entry) => entry.allowed !== (entry.role !== "anon"),
  ),
);

const campaignFiles = fs.readdirSync(path.resolve(root, "scripts/current-execution"))
  .filter((name) => /^(?:test|verify)-.*\.(?:mjs|mts|ts)$/u.test(name));
check("r7_denominator_preserved", campaignFiles.length === 52, { count: campaignFiles.length });

await db.close();
process.stdout.write(`${JSON.stringify({
  schemaVersion: "velmere.r7.browser-basic-product-route-runtime-closure-regression.v1",
  ok: true,
  checks: checks.length,
  campaignDenominator: campaignFiles.length,
  liveMutation: false,
  edgeDeployed: false,
})}\n`);
