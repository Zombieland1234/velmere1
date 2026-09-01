#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REVISION = "VELMERE_PASS36_A102R44P34_ACTION_REQUIRED_CANONICAL_PRODUCT_TAXONOMY_DYNAMIC_SCORING_PSYCHOLOGY30_AND_TEST_CYCLE_1_OF_3_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P33_ACTION_REQUIRED_EXTERNAL_CI_STRIPE_MOCK_PROTOCOL12_SIGSTORE_OIDC_REAL_STRIPE_TEST_BLOCKED_NO_LIVE_CREDIT";
const PARENT_MANIFEST = "_velmere/PASS36_A102R44P33_SOURCE_ONLY_MANIFEST.json";
const CURRENT_MANIFEST = "_velmere/PASS36_A102R44P34_SOURCE_ONLY_MANIFEST.json";
const LEDGER = "config/pass36/a102r44p34-approved-current-source-changes.json";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
const parent = readJson(PARENT_MANIFEST);
const current = readJson(CURRENT_MANIFEST);
const ledger = readJson(LEDGER);
const parentMap = new Map(parent.entries.map((row) => [row.path, row]));
const currentMap = new Map(current.entries.filter((row) => row.path !== LEDGER).map((row) => [row.path, row]));
const changes = [];
for (const [filePath, after] of currentMap) {
  const before = parentMap.get(filePath);
  if (!before) changes.push({ path: filePath, change: "ADDED", after });
  else if (before.sha256 !== after.sha256 || before.byteLength !== after.byteLength || before.mode !== after.mode) {
    changes.push({ path: filePath, change: "MODIFIED", before, after });
  }
}
for (const [filePath, before] of parentMap) {
  if (!currentMap.has(filePath)) changes.push({ path: filePath, change: "DELETED", before });
}
changes.sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;

const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("schema", ledger.schemaVersion === "velmere.pass36.a102r44p34.approved-current-source-changes.v1");
add("revision", ledger.revisionId === REVISION && ledger.parentRevisionId === PARENT);
add("parent-manifest", ledger.parentManifestPath === PARENT_MANIFEST && ledger.parentManifestSha256 === sha256(fs.readFileSync(path.join(ROOT, PARENT_MANIFEST))));
add("decision", ledger.decision === "APPROVED_ACTION_REQUIRED_NO_PROMOTION");
add("no-delete", ledger.deletedCount === 0 && changes.every((row) => row.change !== "DELETED"));
add("no-history-mutation", ledger.historyMutations === 0 && ledger.removedTests === 0 && ledger.denominatorCollapse === false);
add("counts", ledger.addedCount === changes.filter((row) => row.change === "ADDED").length && ledger.modifiedCount === changes.filter((row) => row.change === "MODIFIED").length && ledger.deletedCount === changes.filter((row) => row.change === "DELETED").length);
add("exact-change-set", JSON.stringify(stable(ledger.changes)) === JSON.stringify(stable(changes)));
add("required-files", ledger.requiredAddedFiles.every((filePath) => currentMap.has(filePath) && !parentMap.has(filePath)));
add("parent-manifest-added", changes.some((row) => row.path === PARENT_MANIFEST && row.change === "ADDED"));
add("no-self-cycle", !ledger.changes.some((row) => row.path === CURRENT_MANIFEST || row.path === LEDGER));
add("truth-boundary", ledger.truthBoundary.currentChildFullRegressionCredit === false && ledger.truthBoundary.customerProofCredit === false && ledger.truthBoundary.saleCredit === false && ledger.truthBoundary.liveCredit === false);
add("topology-files", [
  "config/pass36/a102r44p34-canonical-product-topology.json",
  "lib/product/vlm-canonical-product-topology.ts",
  "lib/commerce/vlm-current-sku-truth.ts",
  "lib/ai/angel-route-policy.ts",
].every((filePath) => changes.some((row) => row.path === filePath)));
add("scoring-files", [
  "config/pass36/a102r44p34-dynamic-scoring-policy.json",
  "config/pass36/a102r44p34-score-gate-ledger.json",
  "lib/product/vlm-dynamic-product-scoring.mjs",
].every((filePath) => changes.some((row) => row.path === filePath)));
add("psychology-files", [
  "config/pass36/a102r44p34-customer-psychology-policy.json",
  "scripts/pass36/build-a102r44p34-psychology-customer-matrix.mjs",
].every((filePath) => changes.some((row) => row.path === filePath)));

const failures = checks.filter((check) => !check.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p34.approved-current-source-changes-verification.v1",
  status: failures.length ? "FAIL" : "PASS_R44P34_APPROVED_CHANGES",
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  added: changes.filter((row) => row.change === "ADDED").length,
  modified: changes.filter((row) => row.change === "MODIFIED").length,
  deleted: changes.filter((row) => row.change === "DELETED").length,
  rows: checks,
}, null, 2));
if (failures.length) process.exit(1);
