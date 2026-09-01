import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = process.cwd();
const migrationDirectory = path.join(root, "supabase", "migrations");
const migrations = fs.readdirSync(migrationDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
  .map((name) => ({
    name,
    path: path.join(migrationDirectory, name),
    bytes: fs.readFileSync(path.join(migrationDirectory, name)),
  }));
const hashes = migrations.map(({ name, bytes }) => ({
  name,
  sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
}));
const accountErasureMigrationHash = hashes.find(({ name }) =>
  name === "20260821000006_v4_account_erasure_request_policy_gate.sql");
const checks = [];
const check = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });
const db = new PGlite({ extensions: { pgcrypto } });
await db.waitReady;

const subjectA = "11111111-1111-4111-8111-111111111111";
const subjectB = "22222222-2222-4222-8222-222222222222";
const accountA = `supabase:${subjectA}`;
const accountB = `supabase:${subjectB}`;
const requestA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const requestB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const exportA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const exportB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const idempotencyHash = "1".repeat(64);
const revocationReceipt = `sha256:${"2".repeat(64)}`;

const bootstrap = String.raw`
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists realtime;
create schema if not exists vault;
create schema if not exists extensions;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
do $$ begin create role supabase_auth_admin nologin; exception when duplicate_object then null; end $$;
do $$ begin create role supabase_storage_admin nologin; exception when duplicate_object then null; end $$;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(), email text,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user)::text
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
create or replace function auth.email() returns text language sql stable as $$
  select auth.jwt()->>'email'
$$;
grant usage on schema auth, storage, realtime, vault, extensions to anon, authenticated, service_role;
`;

async function setIdentity(subject, authTime = Math.floor(Date.now() / 1000)) {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [subject]);
  await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({
    sub: subject,
    role: "authenticated",
    email: `${subject.slice(0, 4)}@example.test`,
    auth_time: authTime,
  })]);
  await db.exec("set role authenticated;");
}

async function setServiceRole() {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.query("select set_config('request.jwt.claim.role','service_role',false)");
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ role: "service_role" })]);
  await db.exec("set role service_role;");
}

async function expectFailure(id, action, expected) {
  try {
    await action();
    check(id, false, "unexpected_success");
  } catch (error) {
    const message = String(error?.message ?? error);
    check(id, expected.test(message), message.slice(0, 1000));
  }
}

async function insertExport(exportId, accountId, keyCharacter) {
  const generatedAt = new Date(Date.now() - 60_000).toISOString();
  const expiresAt = new Date(Date.parse(generatedAt) + 24 * 60 * 60_000).toISOString();
  const payload = JSON.stringify({
    schemaVersion: "velmere.account-data-export-payload.v1",
    exportId,
    generatedAt,
    availableUntil: expiresAt,
    classification: "CUSTOMER_PRIVATE",
    scope: { legalDsrCompleteness: false },
    account: { accountId },
    data: {},
  });
  const payloadSha256 = `sha256:${crypto.createHash("sha256").update(payload).digest("hex")}`;
  await db.query(`
    insert into public.velmere_account_data_exports(
      export_id,account_id,account_id_hash,idempotency_key_hash,
      payload_text,payload_sha256,payload_byte_length,generated_at,expires_at
    ) values (
      $1::uuid,$2,encode(digest('velmere-account-binding-v1:' || $2,'sha256'),'hex'),$3,
      $4,$5,$6,$7::timestamptz,$8::timestamptz
    )
  `, [exportId, accountId, keyCharacter.repeat(64), payload, payloadSha256, Buffer.byteLength(payload), generatedAt, expiresAt]);
}

async function requestErasure(requestId, key = idempotencyHash) {
  return (await db.query(
    "select public.velmere_request_account_erasure_v1($1::uuid,$2::text) as record",
    [requestId, key],
  )).rows[0].record;
}

try {
  await db.exec(bootstrap);
  for (const migration of migrations) await db.exec(migration.bytes.toString("utf8"));
  check("exact_current_chain_executes", true, `${migrations.length}/${migrations.length}`);
  check("exact_account_erasure_migration_hash_bound", Boolean(accountErasureMigrationHash), accountErasureMigrationHash);

  await db.exec(`
    insert into auth.users(id,email) values
      ('${subjectA}'::uuid,'owner-a@example.test'),
      ('${subjectB}'::uuid,'owner-b@example.test');
    insert into public.velmere_account_supabase_subject_bindings(
      account_id,supabase_subject,request_id,operator_fingerprint
    ) values
      ('${accountA}','${subjectA}'::uuid,'bind-erasure-account-a','operator_${"a".repeat(20)}'),
      ('${accountB}','${subjectB}'::uuid,'bind-erasure-account-b','operator_${"b".repeat(20)}');
  `);
  await insertExport(exportA, accountA, "a");
  await insertExport(exportB, accountB, "b");

  const acl = await db.query(`
    select p.proname,
      has_function_privilege('authenticated',p.oid,'EXECUTE') as auth_execute,
      has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
      has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'velmere_request_account_erasure_v1',
      'velmere_cancel_account_erasure_v1',
      'velmere_confirm_account_erasure_session_revocation_v1'
    ) order by p.proname`);
  const requestAcl = acl.rows.find((row) => row.proname === "velmere_request_account_erasure_v1");
  const cancelAcl = acl.rows.find((row) => row.proname === "velmere_cancel_account_erasure_v1");
  const confirmAcl = acl.rows.find((row) => row.proname === "velmere_confirm_account_erasure_session_revocation_v1");
  check("request_rpc_authenticated_only", requestAcl?.auth_execute && !requestAcl?.anon_execute && !requestAcl?.service_execute, requestAcl);
  check("cancel_rpc_authenticated_only", cancelAcl?.auth_execute && !cancelAcl?.anon_execute && !cancelAcl?.service_execute, cancelAcl);
  check("revocation_confirmation_service_role_only", confirmAcl?.service_execute && !confirmAcl?.anon_execute && !confirmAcl?.auth_execute, confirmAcl);

  await setIdentity(subjectA, Math.floor(Date.now() / 1000) - 3600);
  await expectFailure("stale_auth_time_rejected_before_request", () => requestErasure(requestA), /account_erasure_recent_auth_required/u);
  const staleCount = Number((await db.query("select count(*)::integer as count from public.velmere_account_erasure_requests")).rows[0].count);
  check("stale_auth_has_zero_durable_side_effects", staleCount === 0, staleCount);

  await setIdentity(subjectA);
  const first = await requestErasure(requestA);
  check("owner_a_request_created", first.request_id === requestA && first.account_id === accountA, first);
  check("export_dependency_exact", first.export_id === exportA && /^sha256:[a-f0-9]{64}$/.test(first.export_payload_sha256), {
    exportId: first.export_id,
    digest: first.export_payload_sha256,
  });
  check("request_starts_session_pending", first.state === "SESSION_REVOCATION_PENDING" && first.session_revocation_state === "PENDING", first);
  check("request_is_policy_blocked_by_contract", first.execution_policy_state === "OWNER_LEGAL_POLICY_REQUIRED", first.execution_policy_state);

  const replay = await requestErasure("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee");
  const countAfterReplay = Number((await db.query("select count(*)::integer as count from public.velmere_account_erasure_requests")).rows[0].count);
  check("account_scoped_idempotency_returns_original", replay.request_id === requestA && countAfterReplay === 1, { requestId: replay.request_id, countAfterReplay });
  await expectFailure("second_active_request_rejected", () => requestErasure(
    "ffffffff-ffff-4fff-8fff-ffffffffffff",
    "3".repeat(64),
  ), /account_erasure_active_request_exists/u);

  await expectFailure("authenticated_cannot_fake_revocation_confirmation", () => db.query(
    "select public.velmere_confirm_account_erasure_session_revocation_v1($1::uuid,$2,$3)",
    [requestA, first.account_id_hash, revocationReceipt],
  ), /permission denied/u);

  await setIdentity(subjectB);
  const visibleAFromB = Number((await db.query(
    "select count(*)::integer as count from public.velmere_account_erasure_requests where request_id=$1::uuid",
    [requestA],
  )).rows[0].count);
  check("cross_account_request_non_enumerable", visibleAFromB === 0, visibleAFromB);
  await expectFailure("cross_account_cancel_rejected", () => db.query(
    "select public.velmere_cancel_account_erasure_v1($1::uuid)", [requestA],
  ), /account_erasure_request_not_found/u);
  const second = await requestErasure(requestB);
  check("same_idempotency_hash_isolated_per_account", second.request_id === requestB && second.account_id === accountB, second);
  const bVisible = Number((await db.query("select count(*)::integer as count from public.velmere_account_erasure_requests")).rows[0].count);
  check("owner_b_sees_only_owner_b_request", bVisible === 1, bVisible);

  await setServiceRole();
  await expectFailure("service_confirmation_requires_exact_account_hash", () => db.query(
    "select public.velmere_confirm_account_erasure_session_revocation_v1($1::uuid,$2,$3)",
    [requestA, "f".repeat(64), revocationReceipt],
  ), /account_erasure_request_not_found/u);
  const confirmed = (await db.query(
    "select public.velmere_confirm_account_erasure_session_revocation_v1($1::uuid,$2,$3) as record",
    [requestA, first.account_id_hash, revocationReceipt],
  )).rows[0].record;
  check("server_revocation_stops_at_policy_block", confirmed.state === "POLICY_BLOCKED"
    && confirmed.session_revocation_state === "CONFIRMED"
    && confirmed.execution_policy_state === "OWNER_LEGAL_POLICY_REQUIRED", confirmed);
  const confirmReplay = (await db.query(
    "select public.velmere_confirm_account_erasure_session_revocation_v1($1::uuid,$2,$3) as record",
    [requestA, first.account_id_hash, revocationReceipt],
  )).rows[0].record;
  check("server_confirmation_is_idempotent", confirmReplay.updated_at === confirmed.updated_at, { first: confirmed.updated_at, replay: confirmReplay.updated_at });

  const executorCount = Number((await db.query(`
    select count(*)::integer as count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'velmere%execute%account%erasure%'
  `)).rows[0].count);
  check("no_destructive_executor_exists", executorCount === 0, executorCount);

  await setIdentity(subjectA);
  const aVisible = Number((await db.query("select count(*)::integer as count from public.velmere_account_erasure_requests")).rows[0].count);
  const eventCountBeforeCancel = Number((await db.query("select count(*)::integer as count from public.velmere_account_erasure_events")).rows[0].count);
  check("owner_a_sees_request_and_two_events", aVisible === 1 && eventCountBeforeCancel === 2, { aVisible, eventCountBeforeCancel });
  const cancelled = (await db.query(
    "select public.velmere_cancel_account_erasure_v1($1::uuid) as record", [requestA],
  )).rows[0].record;
  check("owner_cancel_is_reversible_state_only", cancelled.state === "CANCELLED" && cancelled.cancelled_at, cancelled);
  const cancellationReplay = (await db.query(
    "select public.velmere_cancel_account_erasure_v1($1::uuid) as record", [requestA],
  )).rows[0].record;
  const eventCountAfterReplay = Number((await db.query("select count(*)::integer as count from public.velmere_account_erasure_events")).rows[0].count);
  check("cancel_is_idempotent_and_event_append_once", cancellationReplay.cancelled_at === cancelled.cancelled_at && eventCountAfterReplay === 3, {
    cancelledAt: cancellationReplay.cancelled_at,
    eventCountAfterReplay,
  });
  await expectFailure("direct_request_mutation_denied", () => db.exec(
    `update public.velmere_account_erasure_requests set state='POLICY_BLOCKED' where request_id='${requestA}'`,
  ), /permission denied/u);
  await expectFailure("append_only_event_mutation_denied", () => db.exec(
    `update public.velmere_account_erasure_events set event_type='CANCELLED' where request_id='${requestA}'`,
  ), /permission denied|account_erasure_event_immutable/u);

  await setIdentity(subjectB);
  const aEventsVisibleToB = Number((await db.query(
    "select count(*)::integer as count from public.velmere_account_erasure_events where request_id=$1::uuid",
    [requestA],
  )).rows[0].count);
  check("cross_account_events_non_enumerable", aEventsVisibleToB === 0, aEventsVisibleToB);

  const stable = migrations.every(({ path: filePath }, index) =>
    crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex") === hashes[index].sha256);
  check("migration_sources_stable_during_execution", stable, hashes.at(-1));
} catch (error) {
  check("pglite_account_erasure_execution_completed", false, String(error?.stack ?? error).slice(0, 5000));
} finally {
  await db.close();
}

const failed = checks.filter((row) => !row.pass);
console.log(JSON.stringify({
  schemaVersion: "velmere.v4.account-erasure-pglite-execution.v1",
  status: failed.length ? "FAIL_LOCAL_SEMANTICS_PRESERVED" : "PASS_LOCAL_SEMANTICS_ONLY",
  migrationCount: migrations.length,
  accountErasureMigrationSha256: accountErasureMigrationHash?.sha256,
  assertions: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  truthBoundary: "Current ordered migration chain plus two-subject owner request/status/cancel, recent-auth, current-export, RLS, append-only event and service-role revocation-confirmation semantics in disposable PGlite PostgreSQL with real bundled pgcrypto. No customer data was deleted. No Supabase staging, owner/legal policy, retention/legal-hold topology, executor, FINAL, LIVE or sale credit.",
  credits: {
    localSemanticsOnly: true,
    twoSubjectFixtureOnly: true,
    dataDeleted: false,
    supabaseStaging: false,
    ownerLegalPolicy: false,
    customerFinal: 0,
  },
}, null, 2));
if (failed.length) process.exitCode = 1;
