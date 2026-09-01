#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "");
if (!root || !fs.existsSync(root)) {
  console.error("evidence_root_missing");
  process.exit(1);
}
const bindings = JSON.parse(fs.readFileSync("config/pass36/r44p38-evidence-bindings.json", "utf8"));
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const compareUtf8 = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const rows = [];
const check = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });
const aggregate = crypto.createHash("sha256");
for (const bound of [...bindings.files].sort((a, b) => compareUtf8(a.path, b.path))) {
  const target = path.join(root, ...bound.path.split("/"));
  if (!fs.existsSync(target)) {
    check(`file:${bound.path}`, false, "missing");
    continue;
  }
  const stat = fs.lstatSync(target);
  const bytes = fs.readFileSync(target);
  const actual = { byteLength: bytes.length, sha256: sha256(bytes) };
  check(`file:${bound.path}`, stat.isFile() && !stat.isSymbolicLink() && actual.byteLength === bound.byteLength && actual.sha256 === bound.sha256, actual);
  aggregate.update(`${bound.path}\0${actual.byteLength}\0${actual.sha256}\n`);
}
check("aggregate", aggregate.digest("hex") === bindings.aggregateSha256);
for (const [relativePath, expectedStatus] of Object.entries(bindings.requiredStatuses)) {
  const data = JSON.parse(fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8"));
  check(`status:${relativePath}`, data.status === expectedStatus, { actual: data.status, expected: expectedStatus });
}
const ledger = JSON.parse(fs.readFileSync(path.join(root, "r44p38-generalization-24b/R44P38_COMPILER_AST_GENERALIZATION_LEDGER.json"), "utf8"));
check("denominator", ledger.denominator.casePairs === 24 && ledger.denominator.signalFamilies === 16 && ledger.denominator.transforms === 7 && ledger.denominator.targetSignalEvaluations === 336, ledger.denominator);
check("metrics-local", ledger.metrics.overall.passed === 336 && ledger.metrics.overall.failed === 0 && ledger.metrics.overall.truePositives === 168 && ledger.metrics.overall.trueNegatives === 168, ledger.metrics.overall);
check("credit-boundary", ledger.creditBoundary.independentGroundTruthCredit === false && ledger.creditBoundary.realProtocolAccuracyCredit === false && ledger.creditBoundary.customerCredit === false && ledger.creditBoundary.paidSaleCredit === false && ledger.creditBoundary.liveCredit === false && ledger.creditBoundary.worldClassCredit === false, ledger.creditBoundary);
const failed = rows.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p38.compiler-ast-evidence-verification.v1", status: failed.length ? "FAIL_R44P38_COMPILER_AST_EVIDENCE" : "PASS_R44P38_COMPILER_AST_EVIDENCE_LOCAL_ONLY", checks: rows.length, passed: rows.length - failed.length, failed: failed.length, rows, truthBoundary: "Physical evidence is exact and local. The holdout is developer-created; independent and real-protocol accuracy credit remains zero." }, null, 2));
if (failed.length) process.exit(1);
