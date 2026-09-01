#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(scriptDirectory, "..", "..", "..");
const migrationDirectory = path.join(sourceRoot, "supabase", "migrations");
const outputArgumentIndex = process.argv.indexOf("--output");
const outputPath =
  outputArgumentIndex >= 0 && process.argv[outputArgumentIndex + 1]
    ? path.resolve(process.argv[outputArgumentIndex + 1])
    : null;

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const expectedMigrationCount = 135;
const serializeError = (error) => ({
  name: error?.name ?? error?.constructor?.name ?? "UnknownError",
  message: String(error?.message ?? error).slice(0, 8000),
  code: error?.code ? String(error.code) : null,
  severity: error?.severity ? String(error.severity) : null,
  detail: error?.detail ? String(error.detail).slice(0, 8000) : null,
  hint: error?.hint ? String(error.hint).slice(0, 8000) : null,
  position: error?.position ? String(error.position) : null,
  file: error?.file ? String(error.file) : null,
  line: error?.line ? String(error.line) : null,
  routine: error?.routine ? String(error.routine) : null,
});

const migrations = fs
  .readdirSync(migrationDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
  .map((name, index) => {
    const absolutePath = path.join(migrationDirectory, name);
    const bytes = fs.readFileSync(absolutePath);
    return {
      ordinal: index + 1,
      name,
      absolutePath,
      byteLength: bytes.length,
      sha256: sha256(bytes),
      sql: bytes.toString("utf8"),
    };
  });

if (migrations.length !== expectedMigrationCount) {
  throw new Error(`Current migration denominator mismatch: expected ${expectedMigrationCount}, received ${migrations.length}`);
}

const byOrdinal = new Map(migrations.map((migration) => [migration.ordinal, migration]));
const staticChecks = [
  {
    id: "4763_status_signature_matches_definition",
    ordinal: 62,
    expected:
      "velmere_get_provider_recovery_release_certificate_status(text,text,text,text,text,text,text,integer,text,text,text,timestamptz)",
    expectedCount: 2,
    forbidden:
      "velmere_get_provider_recovery_release_certificate_status(text,text,text,text,text,text,text,text,integer,text,text,text,timestamptz)",
  },
  {
    id: "4764_verify_signature_matches_definition",
    ordinal: 63,
    expected:
      "velmere_verify_provider_recovery_release_bundle(text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,timestamptz)",
    expectedCount: 2,
    forbidden:
      "velmere_verify_provider_recovery_release_bundle(text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,text,timestamptz)",
  },
  {
    id: "4769_trust_epoch_case_parenthesized",
    ordinal: 68,
    expected:
      "p_trust_epoch<>(case when v_registry_changed then v_previous.trust_epoch+1 else v_previous.trust_epoch end)",
    expectedCount: 1,
    forbidden:
      "p_trust_epoch<>case when v_registry_changed then v_previous.trust_epoch+1 else v_previous.trust_epoch end",
  },
  {
    id: "4994_is_distinct_from_case_parenthesized",
    ordinal: 92,
    expected:
      "p_execution_receipt->>'result' is distinct from\n    (case when v_dead_letter then 'dead_letter' else 'retryable_failed' end)",
    expectedCount: 1,
    forbidden:
      "p_execution_receipt->>'result' is distinct from\n    case when v_dead_letter then 'dead_letter' else 'retryable_failed' end",
  },
  {
    id: "audit_basic_boolean_case_parenthesized",
    ordinal: 117,
    expected:
      "or (case\n       when coalesce(p_snapshot_json#>>'{renderContract,pdfByteLength}', '')",
    expectedCount: 1,
    forbidden:
      "or case\n       when coalesce(p_snapshot_json#>>'{renderContract,pdfByteLength}', '')",
  },
].map((check) => {
  const sql = byOrdinal.get(check.ordinal).sql.replaceAll("\r\n", "\n");
  const expectedCount = sql.split(check.expected).length - 1;
  const forbiddenCount = sql.split(check.forbidden).length - 1;
  return {
    id: check.id,
    ordinal: check.ordinal,
    name: byOrdinal.get(check.ordinal).name,
    passed: expectedCount === check.expectedCount && forbiddenCount === 0,
    expectedCount,
    requiredExpectedCount: check.expectedCount,
    forbiddenCount,
  };
});

const schemaSql = fs.readFileSync(path.join(sourceRoot, "lib", "db", "schema.sql"), "utf8");
const commerceSchemaBlock = schemaSql.match(
  /-- PASS4994 COMMERCE FULFILMENT OUTBOX WORKER BEGIN[\s\S]*?-- PASS4994 COMMERCE FULFILMENT OUTBOX WORKER END/u,
);
staticChecks.push({
  id: "4994_schema_mirror_matches_migration",
  ordinal: 92,
  name: byOrdinal.get(92).name,
  passed:
    commerceSchemaBlock !== null &&
    `${commerceSchemaBlock[0]}\n`.replaceAll("\r\n", "\n") ===
      byOrdinal.get(92).sql.replaceAll("\r\n", "\n"),
  expectedCount: commerceSchemaBlock === null ? 0 : 1,
  requiredExpectedCount: 1,
  forbiddenCount: 0,
});

if (staticChecks.some((check) => !check.passed)) {
  const error = new Error("targeted migration source regression failed");
  error.staticChecks = staticChecks;
  throw error;
}

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
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create or replace function auth.email() returns text language sql stable as $$ select null::text $$;
create or replace function public.digest(data bytea, algorithm text) returns bytea
language sql immutable as $$
  select convert_to('PGLITE_NON_CRYPTO_STUB:' || coalesce(encode(data, 'hex'), '') || ':' || coalesce(algorithm, ''), 'UTF8')
$$;
create or replace function public.digest(data text, algorithm text) returns bytea
language sql immutable as $$
  select public.digest(convert_to(coalesce(data, ''), 'UTF8'), algorithm)
$$;
create or replace function extensions.digest(data bytea, algorithm text) returns bytea
language sql immutable as $$
  select public.digest(data, algorithm)
$$;
create or replace function extensions.digest(data text, algorithm text) returns bytea
language sql immutable as $$
  select public.digest(data, algorithm)
$$;
create or replace function extensions.gen_random_bytes(count integer) returns bytea
language sql volatile as $$
  select decode(lpad(to_hex(floor(random()*power(2,32))::bigint), 8, '0'), 'hex')
$$;
create or replace function extensions.gen_random_uuid() returns uuid
language sql volatile as $$
  select gen_random_uuid()
$$;
create or replace function extensions.hmac(data bytea, key bytea, algorithm text) returns bytea
language sql immutable as $$
  select public.digest(data || key, algorithm)
$$;
create or replace function extensions.hmac(data text, key text, algorithm text) returns bytea
language sql immutable as $$
  select public.digest(convert_to(coalesce(data,''),'UTF8') || convert_to(coalesce(key,''),'UTF8'), algorithm)
$$;
grant usage on schema auth, storage, realtime, vault, extensions to anon, authenticated, service_role;
`;
const pgcryptoExtension = /^\s*create\s+extension\s+if\s+not\s+exists\s+pgcrypto(?:\s+with\s+schema\s+\w+)?\s*;\s*$/gimu;
const sourceBefore = migrations.map(({ ordinal, name, byteLength, sha256: hash }) => ({
  ordinal,
  name,
  byteLength,
  sha256: hash,
}));
const db = new PGlite();
await db.waitReady;
await db.exec(bootstrap);
const runtime = (await db.query("select version(),current_user,current_database()" )).rows[0];
const results = [];
let firstFailure = null;

for (const migration of migrations) {
  pgcryptoExtension.lastIndex = 0;
  const extensionCount = [...migration.sql.matchAll(pgcryptoExtension)].length;
  pgcryptoExtension.lastIndex = 0;
  const executionSql = migration.sql.replace(
    pgcryptoExtension,
    () => "\n-- PGlite pgcrypto compatibility only: unavailable extension declaration elided\n",
  );
  const started = performance.now();
  try {
    await db.exec(executionSql);
    if (db.isInTransaction()) {
      await db.exec("rollback;");
      throw Object.assign(new Error("migration left an open transaction"), { code: "VLM01" });
    }
    results.push({
      ordinal: migration.ordinal,
      name: migration.name,
      sourceSha256: migration.sha256,
      executionSha256: sha256(Buffer.from(executionSql, "utf8")),
      pgcryptoCompatibilityStatementCount: extensionCount,
      status: "PASS_LOCAL_SEMANTICS_ONLY",
      durationMs: Number((performance.now() - started).toFixed(3)),
    });
  } catch (error) {
    if (db.isInTransaction()) {
      try {
        await db.exec("rollback;");
      } catch {
        // The disposable database is closed below even if rollback is unavailable.
      }
    }
    firstFailure = {
      ordinal: migration.ordinal,
      name: migration.name,
      sourceSha256: migration.sha256,
      executionSha256: sha256(Buffer.from(executionSql, "utf8")),
      pgcryptoCompatibilityStatementCount: extensionCount,
      status: "FAIL_PRESERVED",
      error: serializeError(error),
      durationMs: Number((performance.now() - started).toFixed(3)),
    };
    results.push(firstFailure);
    break;
  }
  if (migration.ordinal % 20 === 0 || migration.ordinal === expectedMigrationCount) {
    process.stderr.write(`Current patched PGlite chain: ${migration.ordinal}/${expectedMigrationCount}\n`);
  }
}

const inventory = {
  relations: (
    await db.query(
      "select n.nspname as schema_name,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and c.relkind in ('r','p','v','m') order by n.nspname,c.relname",
    )
  ).rows,
  policies: (
    await db.query(
      "select schemaname,tablename,policyname,permissive,roles,cmd from pg_policies order by schemaname,tablename,policyname",
    )
  ).rows,
  functions: (
    await db.query(
      "select n.nspname as schema_name,p.proname,p.prosecdef,pg_get_function_identity_arguments(p.oid) as arguments from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' order by n.nspname,p.proname,p.oid",
    )
  ).rows,
  triggers: (
    await db.query(
      "select event_object_schema,event_object_table,trigger_name,event_manipulation from information_schema.triggers order by event_object_schema,event_object_table,trigger_name,event_manipulation",
    )
  ).rows,
};
await db.close();

const sourceAfter = migrations.map((migration) => {
  const bytes = fs.readFileSync(migration.absolutePath);
  return {
    ordinal: migration.ordinal,
    name: migration.name,
    byteLength: bytes.length,
    sha256: sha256(bytes),
  };
});
const sourceStable = sourceBefore.every(
  (before, index) =>
    before.ordinal === sourceAfter[index].ordinal &&
    before.name === sourceAfter[index].name &&
    before.byteLength === sourceAfter[index].byteLength &&
    before.sha256 === sourceAfter[index].sha256,
);
const passed = results.filter((result) => result.status.startsWith("PASS")).length;
const report = {
  schemaVersion: "velmere.p101r1.v4.patched-pglite-migration-regression.v1",
  generatedAt: new Date().toISOString(),
  status:
    results.length === expectedMigrationCount && passed === expectedMigrationCount && firstFailure === null && sourceStable
      ? `PASS_LOCAL_SEMANTICS_ONLY_${expectedMigrationCount}_OF_${expectedMigrationCount}_SOURCE_STABLE`
      : "FAIL_LOCAL_SEMANTICS_PRESERVED",
  sourceRoot,
  runtime,
  denominator: expectedMigrationCount,
  checked: results.length,
  passed,
  failed: results.length - passed,
  firstFailure,
  staticChecks,
  pgcryptoCompatibility: {
    extensionStatementsElided: results.reduce(
      (total, result) => total + result.pgcryptoCompatibilityStatementCount,
      0,
    ),
    digestImplementation: "NON_CRYPTOGRAPHIC_PGLITE_TEST_STUB",
    sourceSqlRepairsAppliedAtRuntime: false,
  },
  sourceStable,
  migrationOrderSha256: sha256(
    Buffer.from(migrations.map((item) => `supabase/migrations/${item.name}\n`).join(""), "utf8"),
  ),
  migrationContentAggregateSha256: sha256(
    Buffer.from(
      migrations
        .map(
          (item) =>
            `supabase/migrations/${item.name}\0${item.byteLength}\0${item.sha256}\n`,
        )
        .join(""),
      "utf8",
    ),
  ),
  inventory,
  results,
  credits: {
    localSemanticsOnly: true,
    nativePostgreSQL: false,
    supabaseStaging: false,
    auth: false,
    storage: false,
    rlsMultiAccount: false,
    customerFinal: 0,
  },
  truthBoundary:
    "Fresh disposable PGlite PostgreSQL semantics with Supabase name/role and pgcrypto compatibility only. No in-memory source SQL repairs. This earns no native PostgreSQL, Supabase/Auth/Storage, RLS multi-account, staging or Customer FINAL credit.",
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized, "utf8");
}
process.stdout.write(serialized);
process.exitCode = report.status.startsWith("PASS") ? 0 : 1;
