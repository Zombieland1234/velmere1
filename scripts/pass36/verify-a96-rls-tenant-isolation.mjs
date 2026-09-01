#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { readJson, sha256 } from "./a96-rls-staging-lib.mjs";

const policy = readJson("config/pass36/a96-rls-tenant-isolation-policy.json");
const matrix = readJson(policy.matrixPath);
const sql = fs.readFileSync(policy.sqlPath, "utf8");
const route = fs.readFileSync(policy.customerArtifactBoundary.routePath, "utf8");
const store = fs.readFileSync(policy.customerArtifactBoundary.storePath, "utf8");
const boundary = fs.readFileSync(policy.customerArtifactBoundary.boundaryPath, "utf8");
const runner = fs.readFileSync("scripts/pass36/a96-rls-tenant-isolation.mjs", "utf8");
const lib = fs.readFileSync("scripts/pass36/a96-rls-staging-lib.mjs", "utf8");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

add("policy:identity", policy.revisionId === "VELMERE_PASS36_A96R0_RLS_19_CASE_EXECUTABLE_REPLAY_AND_CUSTOMER_ARTIFACT_USER_CLIENT_BOUNDARY");
add("policy:parent", policy.parentRevisionId === "VELMERE_PASS36_A95R0_STAGING_SUBJECT_REBIND_ENVIRONMENT_ISOLATION_AND_ZERO_MUTATION_PREFLIGHT");
add("matrix:denominator", matrix.cases.length === 19 && new Set(matrix.cases.map((row) => row.caseId)).size === 19);
add("matrix:split", matrix.cases.filter((row) => row.kind === "owner").length === 13 && matrix.cases.filter((row) => row.kind === "operator").length === 6);
const sqlIds = [...new Set([...sql.matchAll(/rls23_[0-9]{2}_[a-z0-9_]+/giu)].map((match) => match[0]))].sort();
add("sql:exact-cases", JSON.stringify(sqlIds) === JSON.stringify(matrix.cases.map((row) => row.caseId).sort()), { count: sqlIds.length });
add("sql:rollback-only", /begin;/iu.test(sql) && /rollback;/iu.test(sql) && !/\bcommit\s*;/iu.test(sql));
add("sql:no-real-customer-data", /fixtureContainsRealCustomerData',false/iu.test(sql));
add("sql:account-identities", /tenant_a_subject/iu.test(sql) && /tenant_b_subject/iu.test(sql) && /unbound_subject/iu.test(sql));
add("sql:dollar-quote-identity-binding", !/do \$\$[\s\S]*?:'(?:tenant|owner|operator|support|viewer|unbound)/iu.test(sql) && /current_setting\('a96\.tenant_a_subject'\)::uuid/u.test(sql));
add("sql:operator-identities", ["owner_subject", "operator_subject", "support_subject", "viewer_subject", "viewer2_subject"].every((token) => sql.includes(token)));
add("sql:secret-column-denial", /session_hash forbidden/iu.test(sql) && /has_column_privilege/iu.test(sql));
add("runner:exact-psql", /VELMERE_A96_PSQL_SHA256/.test(runner) && /regularFileIdentity/.test(runner));
add("runner:no-shell", (/shell: false/.test(runner) || /shell: process\.platform === "win32"/.test(runner)) && /--no-psqlrc/.test(runner));
add("runner:minimal-env", /buildMinimalPsqlEnvironment/.test(runner) && !/env:\s*\{\s*\.\.\.process\.env/um.test(runner));
add("runner:no-credential-args", /psql:no-credential-arguments/.test(runner));
add("runner:external-output", /a96_output_dir_must_be_outside_source_root/.test(runner));
add("runner:strict-receipt", /parseA96Receipt/.test(runner) && /parseStrictJsonCli/.test(lib));
add("runner:source-parity", (/sourceFingerprintBefore/.test(runner) || /sourceFingerprint/.test(runner)) && /sourceUnchanged/.test(runner));
add("route:user-boundary", /resolveCustomerOwnedDataBoundary/.test(route) && /client: ownerClient/.test(route));
add("route:preview-nonprod-only", /account\.sessionSource === "preview" && !productionLike/.test(route));
add("store:user-client", (store.match(/args\.client === undefined \? getSupabaseServiceRoleClient\(\) : args\.client/g) ?? []).length >= 4);
add("boundary:data-alias", /resolveCustomerOwnedDataBoundary/.test(boundary) && /CUSTOMER_DATA_AUTH_REQUIRED/.test(boundary));
add("truth:no-promotion", policy.promotion.a96PassCredit === false && policy.promotion.stagingCredit === false && policy.promotion.live === false && policy.promotion.saleEnabled === false);

const test = spawnSync(process.execPath, ["scripts/pass36/test-a96-rls-tenant-isolation.mjs"], { encoding: "utf8", timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
add("adversarial:test", test.status === 0, { status: test.status, stdoutSha256: sha256(test.stdout ?? ""), stderrSha256: sha256(test.stderr ?? ""), tail: (test.stderr || test.stdout).slice(-500) });

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  decision: failed.length ? "FAIL_A96_LOCAL_VERIFIER" : "PASS_A96_LOCAL_IMPLEMENTATION_NO_REAL_STAGING_CREDIT",
  revisionId: policy.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  realRlsCasesExecuted: 0,
  a96PassCredit: false,
  stagingCredit: false,
  liveProven: false,
  saleEnabled: false,
}, null, 2));
if (failed.length) process.exit(1);
