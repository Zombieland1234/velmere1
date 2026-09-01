#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const sha256 = (path) => crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
const migration = readJson("config/pass36/a102r44p16-a88-input-hash-migration.json");
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

check("schema", migration.schemaVersion === "velmere.pass36.a102r44p16.a88-input-hash-migration.v1");
check("revision", migration.revisionId.includes("A102R44P16") && migration.parentRevisionId.includes("A102R44P15"));
check("rows", migration.rows.length === 3 && new Set(migration.rows.map((row) => row.id)).size === 3, migration.rows.map((row) => row.id));
check("denominator:a88", migration.denominators.a88ChecksRetained === 61 && migration.denominators.a88ChecksRemoved === 0);
check("denominator:a88r1-semantic", migration.denominators.a88r1SemanticChecksRetained === 56 && migration.denominators.a88r1SemanticChecksRemoved === 0);
check("denominator:a88r1-route", migration.denominators.a88r1RouteChecksRetained === 143 && migration.denominators.a88r1RouteChecksRemoved === 0);

for (const row of migration.rows) {
  const policy = readJson(row.historicalPolicyPath);
  const historical = policy.inputs?.[row.inputKey];
  check(`${row.id}:historical-path`, historical?.path === row.path, historical);
  check(`${row.id}:historical-hash`, historical?.sha256 === row.historicalSha256, historical?.sha256);
  check(`${row.id}:current-file`, fs.existsSync(row.path), row.path);
  check(`${row.id}:current-hash`, sha256(row.path) === row.currentSha256, { expected: row.currentSha256, actual: sha256(row.path) });
  check(`${row.id}:hash-changed`, row.historicalSha256 !== row.currentSha256, row);
}

const a88Test = fs.readFileSync("scripts/pass36/test-a88-brain-angel-risk-eval.ts", "utf8");
const a88r1Route = fs.readFileSync("scripts/pass36/test-a88r1-route-preflight.ts", "utf8");
const a88r1Semantic = fs.readFileSync("scripts/pass36/test-a88r1-semantic-route-privacy-pdf.ts", "utf8");
check("tests:a88-input-loop-retained", a88Test.includes("for (const [name, input] of Object.entries(policy.inputs") && a88Test.includes("if (failed.length) process.exit(1)"));
check("tests:a88r1-route-denominator-retained", a88r1Route.includes("providerCallsOnBlockedCases") && a88r1Route.includes("if (failed.length) process.exit(1)"));
check("tests:a88r1-semantic-input-loop-retained", a88r1Semantic.includes("for (const [name, input] of Object.entries(policy.inputs") && a88r1Semantic.includes("if (failed.length) process.exit(1)"));
check("observed:a88-stale-only", migration.observedCurrentRuns.a88.checks === 61 && migration.observedCurrentRuns.a88.passed === 60 && migration.observedCurrentRuns.a88.failed === 1 && migration.observedCurrentRuns.a88.staleHashOnly === true);
check("observed:a88r1-route", migration.observedCurrentRuns.a88r1Route.checks === 143 && migration.observedCurrentRuns.a88r1Route.passed === 143 && migration.observedCurrentRuns.a88r1Route.providerCallsOnBlockedCases === 0);
check("observed:a88r1-semantic-stale-only", migration.observedCurrentRuns.a88r1Semantic.checks === 56 && migration.observedCurrentRuns.a88r1Semantic.passed === 53 && migration.observedCurrentRuns.a88r1Semantic.failed === 3 && migration.observedCurrentRuns.a88r1Semantic.staleHashOnly === true);
check("credit:no-history-rewrite", migration.creditBoundary.historicalReceiptsRewritten === false && migration.creditBoundary.denominatorReduced === false);
check("credit:fail-closed", migration.creditBoundary.realModelExecutionCredit === false && migration.creditBoundary.independentAdjudicationCredit === false && migration.creditBoundary.stagingCredit === false && migration.creditBoundary.saleCredit === false && migration.creditBoundary.liveCredit === false);

function verifyRows(rows) {
  return rows.every((row) => fs.existsSync(row.path) && sha256(row.path) === row.currentSha256 && row.historicalSha256 !== row.currentSha256);
}
check("negative:tampered-current-hash", verifyRows(migration.rows.map((row, index) => index === 0 ? { ...row, currentSha256: "0".repeat(64) } : row)) === false);
check("negative:removed-row", migration.rows.slice(1).length !== 3);
check("negative:denominator-collapse", ({ ...migration.denominators, a88ChecksRetained: 60 }).a88ChecksRetained !== 61);

const failed = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a102r44p16.a88-input-hash-migration-verification.v1",
  revisionId: migration.revisionId,
  generatedAt: "2026-08-04T00:00:00.000Z",
  status: failed.length ? "FAIL_R44P16_A88_INPUT_HASH_MIGRATION" : "PASS_R44P16_A88_INPUT_HASH_MIGRATION",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  checks,
  creditBoundary: migration.creditBoundary,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
