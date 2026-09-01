import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = process.cwd();
const migrationDirectory = path.join(root, "supabase", "migrations");
const migrationNames = fs.readdirSync(migrationDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
const migrationSources = migrationNames.map((name) => ({
  name,
  path: path.join(migrationDirectory, name),
  bytes: fs.readFileSync(path.join(migrationDirectory, name)),
}));
const sourceHashes = migrationSources.map(({ name, bytes }) => ({
  name,
  sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
}));
const accountExportMigrationHash = sourceHashes.find(({ name }) =>
  name === "20260821000004_v4_account_data_export_same_blob_rls.sql");
const checks = [];
const check = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });
const db = new PGlite({ extensions: { pgcrypto } });
await db.waitReady;

const accountA = "supabase:11111111-1111-4111-8111-111111111111";
const accountB = "supabase:22222222-2222-4222-8222-222222222222";
const subjectA = "11111111-1111-4111-8111-111111111111";
const subjectB = "22222222-2222-4222-8222-222222222222";
const exportA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const exportB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const idem = "1".repeat(64);

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

async function setIdentity(subject, email) {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [subject]);
  await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: subject, role: "authenticated", email })]);
  await db.exec("set role authenticated;");
}

async function expectFailure(id, action, expected) {
  try {
    await action();
    check(id, false, "unexpected_success");
  } catch (error) {
    const message = String(error?.message ?? error);
    check(id, expected.test(message), message.slice(0, 900));
  }
}

async function createExport(id, key = idem) {
  return (await db.query(
    "select public.velmere_create_account_data_export_v1($1::uuid,$2::text) as record",
    [id, key],
  )).rows[0].record;
}

try {
  await db.exec(bootstrap);
  for (const migration of migrationSources) await db.exec(migration.bytes.toString("utf8"));
  check("exact_current_chain_executes", true, `${migrationSources.length}/${migrationSources.length}`);
  check("exact_account_export_migration_hash_bound", Boolean(accountExportMigrationHash), accountExportMigrationHash);

  await db.exec(`
    insert into auth.users(id,email) values
      ('${subjectA}'::uuid,'owner@example.test'),
      ('${subjectB}'::uuid,'owner@example.test');
    insert into public.velmere_account_supabase_subject_bindings(
      account_id,supabase_subject,request_id,operator_fingerprint
    ) values
      ('${accountA}','${subjectA}'::uuid,'bind-account-a','operator_${"a".repeat(20)}'),
      ('${accountB}','${subjectB}'::uuid,'bind-account-b','operator_${"b".repeat(20)}');
    insert into public.velmere_profiles(id,display_name,handle,bio)
      values ('${accountA}','Owner A','owner.a','profile-private-a');
    insert into public.velmere_square_posts(
      id,slug,locale,title,body,author_name,author_handle,author_type,
      moderation_status,author_account_id
    ) values (
      'aaaaaaaa-1111-4111-8111-111111111111'::uuid,'owner-a-post','en',
      'Owner A post','community-private-a','Owner A','owner.a','community','pending','${accountA}'
    );
    insert into public.velmere_audit_account_messages(
      id,message_id,request_id,account_id,contact_email,package_label,
      operator_note,admin_route,message
    ) values
      ('message-a','message-a','request-a','${accountA}','owner@example.test','Audit Basic',
       'RAW_OPERATOR_NOTE_MUST_NOT_EXPORT','/admin/private-a','{"title":"Customer A"}'::jsonb),
      ('message-b','message-b','request-b','${accountB}','owner@example.test','Audit Basic',
       'CROSS_ACCOUNT_EMAIL_COLLISION','/admin/private-b','{"title":"Customer B"}'::jsonb);
  `);

  const acl = await db.query(`
    select p.proname,
      has_function_privilege('authenticated',p.oid,'EXECUTE') as auth_execute,
      has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
      has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'velmere_create_account_data_export_v1',
      'velmere_purge_expired_account_data_exports_v1'
    ) order by p.proname`);
  const createAcl = acl.rows.find((row) => row.proname === "velmere_create_account_data_export_v1");
  const purgeAcl = acl.rows.find((row) => row.proname === "velmere_purge_expired_account_data_exports_v1");
  check("create_rpc_authenticated_only", createAcl?.auth_execute && !createAcl?.anon_execute && !createAcl?.service_execute, createAcl);
  check("purge_rpc_service_role_only", purgeAcl?.service_execute && !purgeAcl?.anon_execute && !purgeAcl?.auth_execute, purgeAcl);

  await setIdentity(subjectA, "owner@example.test");
  const first = await createExport(exportA);
  check("owner_a_export_created", first.export_id === exportA && first.account_id === accountA, first);
  check("payload_digest_and_length_bound", first.payload_sha256 === `sha256:${crypto.createHash("sha256").update(first.payload_text).digest("hex")}`
    && Buffer.byteLength(first.payload_text, "utf8") === first.payload_byte_length, {
      digest: first.payload_sha256, bytes: first.payload_byte_length,
    });
  const payloadA = JSON.parse(first.payload_text);
  check("technical_not_legal_scope", payloadA.scope.technicalScopeComplete === true
    && payloadA.scope.legalDsrCompleteness === false
    && payloadA.scope.retentionDecision === "OWNER_LEGAL_REVIEW_REQUIRED", payloadA.scope);
  check("owner_profile_and_post_exported", payloadA.data.profile.display_name === "Owner A"
    && payloadA.data.community.posts.length === 1
    && payloadA.data.community.posts[0].body === "community-private-a", payloadA.data.community);
  check("mutable_email_collision_not_exported", payloadA.data.audit.messages.length === 1
    && payloadA.data.audit.messages[0].id === "message-a", payloadA.data.audit.messages);
  check("private_internal_fields_excluded", !first.payload_text.includes("RAW_OPERATOR_NOTE_MUST_NOT_EXPORT")
    && !first.payload_text.includes("CROSS_ACCOUNT_EMAIL_COLLISION")
    && !first.payload_text.includes("/admin/private-a"), null);

  const replay = await createExport("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  const replayCount = Number((await db.query(
    "select count(*)::integer as count from public.velmere_account_data_exports",
  )).rows[0].count);
  check("idempotent_replay_returns_original_same_blob", replay.export_id === exportA
    && replay.payload_sha256 === first.payload_sha256
    && replay.payload_text === first.payload_text
    && replayCount === 1, { exportId: replay.export_id, replayCount });

  await expectFailure("direct_insert_denied", () => db.exec(`
    insert into public.velmere_account_data_exports(
      export_id,account_id,account_id_hash,idempotency_key_hash,payload_text,
      payload_sha256,payload_byte_length,generated_at,expires_at
    ) values (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd','${accountA}','${"d".repeat(64)}',
      '${"e".repeat(64)}','{}','sha256:${"f".repeat(64)}',2,now(),now()+interval '24 hours'
    )`), /permission denied/u);
  await expectFailure("direct_update_denied", () => db.exec(
    `update public.velmere_account_data_exports set payload_text='{}' where export_id='${exportA}'`,
  ), /permission denied|account_data_export_immutable/u);
  await expectFailure("authenticated_purge_denied", () => db.query(
    "select public.velmere_purge_expired_account_data_exports_v1(10)",
  ), /permission denied/u);

  await createExport("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "2".repeat(64));
  await createExport("ffffffff-ffff-4fff-8fff-ffffffffffff", "3".repeat(64));
  await expectFailure("durable_three_per_hour_limit", () => createExport(
    "99999999-9999-4999-8999-999999999999", "4".repeat(64),
  ), /account_data_export_rate_limited/u);

  await setIdentity(subjectB, "owner@example.test");
  const aVisibleToB = Number((await db.query(
    "select count(*)::integer as count from public.velmere_account_data_exports where export_id=$1::uuid",
    [exportA],
  )).rows[0].count);
  check("cross_account_export_is_non_enumerable", aVisibleToB === 0, aVisibleToB);
  const second = await createExport(exportB, idem);
  check("idempotency_scope_is_per_account", second.export_id === exportB && second.account_id === accountB, second);
  const bVisible = Number((await db.query(
    "select count(*)::integer as count from public.velmere_account_data_exports",
  )).rows[0].count);
  check("owner_b_sees_only_owner_b_rows", bVisible === 1, bVisible);

  await setIdentity(subjectA, "owner@example.test");
  const aVisible = Number((await db.query(
    "select count(*)::integer as count from public.velmere_account_data_exports",
  )).rows[0].count);
  check("owner_a_sees_only_owner_a_rows", aVisible === 3, aVisible);

  await db.exec("reset role;");
  const policies = await db.query(`
    select policyname,cmd,roles from pg_policies
    where schemaname='public' and tablename='velmere_account_data_exports'`);
  check("single_owner_select_policy", policies.rows.length === 1
    && policies.rows[0].policyname === "v4_account_data_export_owner_select"
    && policies.rows[0].cmd === "SELECT", policies.rows);
  const legacyEmailFallback = Number((await db.query(`
    select count(*)::integer as count from pg_policies
    where schemaname='public' and tablename='velmere_audit_account_messages'
      and qual ilike '%contact_email%'
  `)).rows[0].count);
  check("audit_message_email_fallback_removed", legacyEmailFallback === 0, legacyEmailFallback);

  const stable = migrationSources.every(({ path: filePath }, index) =>
    crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex") === sourceHashes[index].sha256);
  check("migration_sources_stable_during_execution", stable, sourceHashes.at(-1));
} catch (error) {
  check("pglite_account_export_execution_completed", false, String(error?.stack ?? error).slice(0, 5000));
} finally {
  await db.close();
}

const failed = checks.filter((row) => !row.pass);
console.log(JSON.stringify({
  schemaVersion: "velmere.v4.account-data-export-pglite-execution.v1",
  status: failed.length ? "FAIL_LOCAL_SEMANTICS_PRESERVED" : "PASS_LOCAL_SEMANTICS_ONLY",
  migrationCount: migrationSources.length,
  accountExportMigrationSha256: accountExportMigrationHash?.sha256,
  assertions: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  truthBoundary: "Current ordered migration chain plus authenticated two-subject account-export execution in disposable PGlite PostgreSQL with real bundled pgcrypto. No native Supabase staging, deployed JWT/RLS, restore, legal DSAR, customer, FINAL, LIVE or sale credit.",
  credits: { localSemanticsOnly: true, twoSubjectFixtureOnly: true, supabaseStaging: false, legalDsr: false, customerFinal: 0 },
}, null, 2));
if (failed.length) process.exitCode = 1;
