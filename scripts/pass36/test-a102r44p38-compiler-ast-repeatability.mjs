#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; };
const solcRoot = path.resolve(arg("--solc-root", process.env.VELMERE_SOLC_ROOT ?? ""));
const output = arg("--output");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p38-repeatability-"));
const run = (name) => {
  const out = path.join(temp, name);
  const child = spawnSync(process.execPath, ["scripts/pass36/run-a102r44p38-compiler-ast-generalization.mjs", "--solc-root", solcRoot, "--out", out], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (child.status !== 0 || child.stderr.length) throw new Error(`repeatability_child_failed:${name}:${child.status}:${child.stderr.slice(0, 500)}`);
  return JSON.parse(fs.readFileSync(path.join(out, "R44P38_COMPILER_AST_GENERALIZATION_LEDGER.json"), "utf8"));
};
const first = run("run-a");
const second = run("run-b");
const rows = [];
const check = (id, ok, detail = null) => rows.push({ id, ok: Boolean(ok), detail });
check("status-a", first.status === "PASS_LOCAL_COMPILER_AST_GENERALIZATION", first.status);
check("status-b", second.status === "PASS_LOCAL_COMPILER_AST_GENERALIZATION", second.status);
check("aggregate-digest", first.aggregateDigestSha256 === second.aggregateDigestSha256, { first: first.aggregateDigestSha256, second: second.aggregateDigestSha256 });
check("metrics", JSON.stringify(first.metrics) === JSON.stringify(second.metrics));
check("denominator", JSON.stringify(first.denominator) === JSON.stringify(second.denominator));
check("case-receipts", JSON.stringify(first.caseReceipts) === JSON.stringify(second.caseReceipts));
check("all-336-pass", first.metrics.overall.passed === 336 && first.metrics.overall.failed === 0 && second.metrics.overall.passed === 336 && second.metrics.overall.failed === 0);
check("no-credit-promotion", first.creditBoundary.independentGroundTruthCredit === false && first.creditBoundary.realProtocolAccuracyCredit === false && first.creditBoundary.customerCredit === false && first.creditBoundary.paidSaleCredit === false && first.creditBoundary.liveCredit === false && first.creditBoundary.worldClassCredit === false);
const failed = rows.filter((row) => !row.ok);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p38.compiler-ast-repeatability.v1",
  status: failed.length ? "FAIL_R44P38_COMPILER_AST_REPEATABILITY" : "PASS_R44P38_COMPILER_AST_REPEATABILITY",
  checks: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
  aggregateDigestSha256: first.aggregateDigestSha256,
  compilerRuns: first.denominator.compilerRuns + second.denominator.compilerRuns,
  truthBoundary: "Two fresh local runs over the same 24 project-designed pairs and seven transforms are byte-semantically repeatable. This does not create independent ground truth or real-protocol accuracy credit.",
};
if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(path.resolve(output), `${JSON.stringify(receipt, null, 2)}\n`); }
console.log(JSON.stringify(receipt, null, 2));
fs.rmSync(temp, { recursive: true, force: true });
if (failed.length) process.exit(1);
