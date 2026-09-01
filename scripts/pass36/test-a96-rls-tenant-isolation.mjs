#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  classifyDatabaseUrl,
  parseA96Receipt,
  readJson,
  regularFileIdentity,
} from "./a96-rls-staging-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const root = process.cwd();
const policy = readJson("config/pass36/a96-rls-tenant-isolation-policy.json");
const matrix = readJson(policy.matrixPath);
const sql = fs.readFileSync(policy.sqlPath, "utf8");
const route = fs.readFileSync("lib/server/lazy-route-modules/account--customer-artifact.ts", "utf8");
const store = fs.readFileSync("lib/reporting/account-customer-artifact-store.ts", "utf8");
const boundary = fs.readFileSync("lib/db/customer-owned-write-boundary.ts", "utf8");
const results = [];
const check = (id, fn) => {
  try { fn(); results.push({ id, passed: true }); }
  catch (error) { results.push({ id, passed: false, error: error instanceof Error ? error.message : String(error) }); }
};

check("matrix_exact_19_unique", () => {
  assert.equal(matrix.cases.length, 19);
  assert.equal(new Set(matrix.cases.map((row) => row.caseId)).size, 19);
  assert.equal(matrix.cases.filter((row) => row.kind === "owner").length, 13);
  assert.equal(matrix.cases.filter((row) => row.kind === "operator").length, 6);
});
check("sql_covers_exact_case_ids", () => {
  const ids = [...new Set([...sql.matchAll(/rls23_[0-9]{2}_[a-z0-9_]+/giu)].map((match) => match[0]))].sort();
  assert.deepEqual(ids, matrix.cases.map((row) => row.caseId).sort());
});
check("sql_rollback_and_no_commit", () => {
  assert.match(sql, /begin;/iu);
  assert.match(sql, /rollback;/iu);
  assert.doesNotMatch(sql, /\bcommit\s*;/iu);
  assert.match(sql, /transactionRolledBack',true/iu);
});
check("sql_exact_19_terminal_assertions", () => {
  assert.match(sql, /count\(\*\)=19 from a96_case_results/iu);
  assert.match(sql, /casesExecuted/iu);
  assert.match(sql, /casesPassed/iu);
  assert.match(sql, /A96_RLS_RECEIPT=/u);
});
check("sql_dollar_quoted_identity_binding_uses_guc", () => {
  const blocks = [...sql.matchAll(/do \$\$([\s\S]*?)end \$\$;/giu)].map((match) => match[1]);
  assert.ok(blocks.length >= 19, `expected at least 19 PL/pgSQL blocks, got ${blocks.length}`);
  for (const body of blocks) assert.doesNotMatch(body, /:'(?:tenant|owner|operator|support|viewer|unbound)/u);
  assert.match(sql, /set_config\('a96\.tenant_a_subject', :'tenant_a_subject', true\)/u);
  assert.match(sql, /current_setting\('a96\.tenant_a_subject'\)::uuid/u);
});
check("production_route_requires_user_data_boundary", () => {
  assert.match(route, /resolveCustomerOwnedDataBoundary/);
  assert.match(route, /customerOwnedDataErrorPayload/);
  assert.match(route, /client: ownerClient/);
  assert.match(route, /account\.sessionSource === "preview" && !productionLike/);
});
check("store_supports_user_client_for_all_reads", () => {
  for (const signature of [
    /getPass4822AccountCustomerArtifactSnapshot\(args: \{ accountId: string; snapshotId: string; client\?: SupabaseClient \| null \}/,
    /listPass4822AccountCustomerArtifactSnapshots\(args: \{ accountId: string; limit\?: number; client\?: SupabaseClient \| null \}/,
  ]) assert.match(store, signature);
  assert.ok((store.match(/args\.client === undefined \? getSupabaseServiceRoleClient\(\) : args\.client/g) ?? []).length >= 4);
});
check("generic_data_boundary_alias_is_fail_closed", () => {
  assert.match(boundary, /resolveCustomerOwnedDataBoundary/);
  assert.match(boundary, /return resolveCustomerOwnedWriteBoundary\(input, dependencies\)/);
  assert.match(boundary, /CUSTOMER_DATA_AUTH_REQUIRED/);
});

check("database_url_accepts_fixture_localhost", () => {
  const result = classifyDatabaseUrl("postgresql://fixture:secret@localhost/a96_fixture?sslmode=disable", policy, { fixtureMode: true });
  assert.equal(result.ok, true);
  assert.equal(result.publicIdentity.local, true);
});
check("database_url_rejects_production_host", () => {
  const result = classifyDatabaseUrl("postgresql://fixture:secret@prod-db.example/a96_fixture?sslmode=verify-full", policy);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "production_like_database_host");
});
check("database_url_rejects_production_database", () => {
  const result = classifyDatabaseUrl("postgresql://fixture:secret@staging-db.example/velmere_production?sslmode=verify-full", policy);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "production_like_database_name");
});
check("database_url_rejects_weak_tls", () => {
  const result = classifyDatabaseUrl("postgresql://fixture:secret@staging-db.example/a96_fixture?sslmode=disable", policy);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "database_tls_mode_insufficient");
});
check("database_url_rejects_unknown_query", () => {
  const result = classifyDatabaseUrl("postgresql://fixture:secret@staging-db.example/a96_fixture?sslmode=verify-full&target_session_attrs=read-write", policy);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown_database_query_parameter");
});
check("strict_json_rejects_duplicate_keys", () => {
  assert.throws(() => parseStrictJsonCli('{"casesExecuted":19,"casesExecuted":18}', { requireObject: true }), /strict_json_duplicate_key/);
});
check("strict_json_rejects_dangerous_keys", () => {
  assert.throws(() => parseStrictJsonCli('{"__proto__":{}}', { requireObject: true }), /strict_json_forbidden_key/);
});

const validRows = matrix.cases.map((row) => ({ case_id: row.caseId, table_name: row.table, checks: 4, passed: true, detail: "fixture" }));
const validChild = {
  schemaVersion: "velmere.pass36.a96.rls-19-case-replay-receipt.v1",
  decision: policy.decisions.verified,
  casesPrepared: 19,
  casesExecuted: 19,
  casesPassed: 19,
  checksExecuted: 76,
  transactionRolledBack: true,
  fixtureContainsRealCustomerData: false,
  results: validRows,
  liveProven: false,
  saleEnabled: false,
};
check("receipt_accepts_exact_19", () => {
  const parsed = parseA96Receipt(`noise\nA96_RLS_RECEIPT=${JSON.stringify(validChild)}\n`, policy);
  assert.equal(parsed.casesPassed, 19);
});
check("receipt_rejects_18_of_19", () => {
  assert.throws(() => parseA96Receipt(`A96_RLS_RECEIPT=${JSON.stringify({ ...validChild, casesExecuted: 18 })}\n`, policy), /semantic_mismatch/);
});
check("receipt_rejects_missing_rollback", () => {
  assert.throws(() => parseA96Receipt(`A96_RLS_RECEIPT=${JSON.stringify({ ...validChild, transactionRolledBack: false })}\n`, policy), /semantic_mismatch/);
});
check("receipt_rejects_duplicate_marker", () => {
  const row = `A96_RLS_RECEIPT=${JSON.stringify(validChild)}`;
  assert.throws(() => parseA96Receipt(`${row}\n${row}\n`, policy), /duplicate_receipt_marker/);
});

check("runner_valid_fixture_zero_secret_arguments", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a96-test-"));
  try {
    const fakePsql = path.join(temp, process.platform === "win32" ? "psql.cmd" : "psql");
    const childJson = JSON.stringify(validChild);
    if (process.platform === "win32") {
      fs.writeFileSync(fakePsql, `@echo off\necho A96_RLS_RECEIPT=${childJson}\n`, "utf8");
    } else {
      fs.writeFileSync(fakePsql, `#!/bin/sh\nprintf '%s\\n' 'A96_RLS_RECEIPT=${childJson}'\n`, { encoding: "utf8", mode: 0o700 });
      fs.chmodSync(fakePsql, 0o700);
    }
    const psql = regularFileIdentity(fakePsql);
    const outputDir = path.join(temp, "output");
    const secret = "a96_super_secret_password_should_not_leak";
    const run = spawnSync(process.execPath, ["scripts/pass36/a96-rls-tenant-isolation.mjs", "--fixture", "--execute"], {
      cwd: root,
      encoding: "utf8",
      timeout: 180000,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        VELMERE_A96_DATABASE_URL: `postgresql://fixture_user:${secret}@localhost/a96_fixture?sslmode=disable`,
        VELMERE_A96_PSQL_PATH: fakePsql,
        VELMERE_A96_PSQL_SHA256: psql.sha256,
        VELMERE_A96_OUTPUT_DIR: outputDir,
      },
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.doesNotMatch(run.stdout, new RegExp(secret));
    assert.doesNotMatch(run.stderr, new RegExp(secret));
    const receiptPath = path.join(outputDir, "PASS36_A96_RLS_19_CASE_EXECUTABLE_REPLAY.json");
    const receiptText = fs.readFileSync(receiptPath, "utf8");
    assert.doesNotMatch(receiptText, new RegExp(secret));
    const receipt = JSON.parse(receiptText);
    assert.equal(receipt.decision, policy.decisions.verified);
    assert.equal(receipt.fixtureMode, true);
    assert.equal(receipt.stagingCredit, false);
    assert.equal(receipt.rls.casesPassed, 19);
    assert.equal(receipt.sourceUnchanged, true);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

check("psql_symlink_is_rejected", () => {
  if (process.platform === "win32") return;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a96-symlink-"));
  try {
    const target = path.join(temp, "target");
    fs.writeFileSync(target, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
    const link = path.join(temp, "link");
    fs.symlinkSync(target, link);
    assert.throws(() => regularFileIdentity(link), /regular_file_required/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

const failed = results.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a96.local-adversarial-test-receipt.v1",
  revisionId: policy.revisionId,
  generatedAt: "2026-07-29T02:00:00.000Z",
  checks: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
  fixtureOnly: true,
  realRlsCasesExecuted: 0,
  a96PassCredit: false,
  liveProven: false,
  saleEnabled: false,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
