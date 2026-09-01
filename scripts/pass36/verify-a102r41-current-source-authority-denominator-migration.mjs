#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const MIGRATION_PATH = "config/pass36/a102r41-current-source-authority-denominator-migration.json";
const FROZEN_MANIFEST_PATH = "config/pass36/a102r41-parent-source-package-manifest.json";
const R41_TEST_PATH = "scripts/pass36/test-a102r41-current-source-authority-preflight.mjs";
const migration = JSON.parse(fs.readFileSync(MIGRATION_PATH, "utf8"));
const frozen = JSON.parse(fs.readFileSync(FROZEN_MANIFEST_PATH, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => Array.isArray(value)
  ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
    : JSON.stringify(value);

function validate(document) {
  const errors = [];
  const add = (condition, id) => { if (!condition) errors.push(id); };
  const core = { ...document };
  delete core.migrationDigestSha256;
  add(document.schemaVersion === "velmere.pass36.a102r41.current-source-authority-denominator-migration.v1", "schema");
  add(document.classification === "FORMAL_AUTHORITY_POINTER_ATTACK_DENOMINATOR_EXPANSION_NO_SCORE_CREDIT", "classification");
  add(document.migrationDigestSha256 === sha256(canonical(core)), "digest");
  add(document.oldDenominator === 37 && document.newDenominator === 46, "denominators");
  add(document.retainedCount === 37 && document.addedCount === 9 && document.removedCount === 0, "counts");
  add(Array.isArray(document.retainedIds) && document.retainedIds.length === 37 && new Set(document.retainedIds).size === 37, "retained-unique");
  add(Array.isArray(document.addedIds) && document.addedIds.length === 9 && new Set(document.addedIds).size === 9, "added-unique");
  add(document.retainedIds.every((id) => !document.addedIds.includes(id)), "sets-disjoint");
  add([...document.retainedIds, ...document.addedIds].every((id) => typeof id === "string" && id.length > 3 && !/[?*]/u.test(id)), "ids-exact");
  add(document.scoreImprovementClaimed === false, "no-score-credit");
  add(document.frozenA102R40?.testSha256 === "981a311fa5ed8703ed6a396d01780f42c353b186a7e66ade27bb5bebeaa1fe07", "frozen-test-anchor");
  add(document.frozenA102R40?.receiptSha256 === "9b1a6b5a89b572c007f05a9f4f3e3fd970ebe4dba6021752b6ccf46fcba55a4e", "frozen-receipt-anchor");
  add(document.globalDecision === "NO_GO" && document.live === false && document.saleEnabled === false && document.productionApproved === false && document.worldClassProven === false, "no-promotion");
  return { passed: errors.length === 0, errors };
}

function resign(document) {
  const core = { ...document };
  delete core.migrationDigestSha256;
  document.migrationDigestSha256 = sha256(canonical(core));
  return document;
}

const checks = [];
const check = (id, condition, detail = null) => { checks.push({ id, passed: Boolean(condition), detail }); assert.ok(condition, id); };
const baseline = validate(migration);
check("migration-valid", baseline.passed, baseline.errors);
const frozenTest = frozen.entries.find((row) => row.path === migration.frozenA102R40.testPath);
const frozenReceipt = frozen.entries.find((row) => row.path === migration.frozenA102R40.receiptPath);
check("frozen-test-bound", frozenTest?.sha256 === migration.frozenA102R40.testSha256, frozenTest);
check("frozen-receipt-bound", frozenReceipt?.sha256 === migration.frozenA102R40.receiptSha256, frozenReceipt);
const currentTestSource = fs.readFileSync(R41_TEST_PATH, "utf8");
for (const id of [...migration.retainedIds, ...migration.addedIds]) {
  const sourceNeedle = id.startsWith("release-binding:") ? JSON.stringify(id.slice("release-binding:".length)) : JSON.stringify(id);
  check(`current-test-id:${id}`, currentTestSource.includes(sourceNeedle), id);
}

for (const [id, mutate] of [
  ["denominator-collapse-rejected", (d) => { d.newDenominator = 45; }],
  ["retained-id-removal-rejected", (d) => { d.retainedIds.pop(); d.retainedCount = 36; }],
  ["duplicate-added-id-rejected", (d) => { d.addedIds[8] = d.addedIds[0]; }],
  ["unknown-or-wildcard-id-rejected", (d) => { d.addedIds[8] = "authority-*"; }],
  ["frozen-anchor-tamper-rejected", (d) => { d.frozenA102R40.testSha256 = "0".repeat(64); }],
]) {
  const document = structuredClone(migration);
  mutate(document);
  resign(document);
  const result = validate(document);
  check(id, result.passed === false, result.errors);
}

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r41.current-source-authority-denominator-migration-verification.v1",
  status: failed.length === 0 ? "PASS_A102R41_CURRENT_SOURCE_AUTHORITY_DENOMINATOR_MIGRATION_NO_PROMOTION" : "FAIL",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  oldDenominator: 37,
  newDenominator: 46,
  retained: 37,
  added: 9,
  removed: 0,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  failures: failed,
}, null, 2));
if (failed.length) process.exit(1);
