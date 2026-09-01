#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const baselinePath = "config/pass36/a102r44p1-current-visual-freeze-baseline.json";
const baseline = JSON.parse(fs.readFileSync(path.join(root, baselinePath), "utf8"));
const parentRaw = fs.readFileSync(path.join(root, baseline.parentBaselinePath));
const parent = JSON.parse(parentRaw.toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

check("schema", baseline.schemaVersion === "velmere.pass36.a102r44p1.current-visual-freeze-baseline.v1");
check("parent-baseline-raw-sha", sha256(parentRaw) === baseline.parentBaselineRawSha256);
check("denominator-retained", baseline.oldDenominator === parent.files.length && baseline.newDenominator === parent.files.length);
check("no-path-removal", baseline.removedPathCount === 0 && baseline.addedPathCount === 0);
const oldPaths = parent.files.map((row) => row.path);
const newPaths = baseline.files.map((row) => row.path);
check("exact-path-order-retained", JSON.stringify(newPaths) === JSON.stringify(oldPaths));
check("migration-counts", baseline.retainedPathCount + baseline.changedPathCount === baseline.newDenominator);
check("historical-baseline-immutable-command-separate", fs.readFileSync("package.json", "utf8").includes('"verify:visual-freeze:legacy-pass14"'));

const rows = baseline.files.map((expected) => {
  const file = path.join(root, expected.path);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return { path: expected.path, status: "MISSING" };
  const bytes = fs.readFileSync(file);
  const actual = { bytes: bytes.length, sha256: sha256(bytes) };
  return { path: expected.path, status: actual.bytes === expected.bytes && actual.sha256 === expected.sha256 ? "PASS" : "CHANGED", expected, actual };
});
for (const row of rows) check(`file:${row.path}`, row.status === "PASS", row.status === "PASS" ? null : row);
check("fail-closed-flags", baseline.globalDecision === "NO_GO" && baseline.live === false && baseline.saleEnabled === false && baseline.productionApproved === false && baseline.worldClassProven === false);

const failed = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a102r44p1.current-visual-freeze-verification.v1",
  status: failed.length ? "FAIL_CURRENT_VISUAL_FREEZE" : "PASS_CURRENT_VISUAL_FREEZE_LOCAL_ONLY",
  baselinePath,
  protectedFileCount: rows.length,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  migration: {
    oldDenominator: baseline.oldDenominator,
    newDenominator: baseline.newDenominator,
    retainedPathCount: baseline.retainedPathCount,
    changedPathCount: baseline.changedPathCount,
    removedPathCount: baseline.removedPathCount,
    addedPathCount: baseline.addedPathCount,
  },
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  failures: failed,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
