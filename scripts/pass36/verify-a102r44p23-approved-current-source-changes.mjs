#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REV = "VELMERE_PASS36_A102R44P23_ACTION_REQUIRED_LOCAL_DISPOSABLE_CUSTOMER_LIFECYCLE_REFUND_REVOCATION_DELETE_AND_DURABLE_DELIVERY_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P22_ACTION_REQUIRED_RUTHLESS_CUSTOMER_SECURE_PAID_PREVIEW_RISK_TIER_SPLIT_CROSS_ASSET_AND_LEGAL_DATA_ALTERNATIVES_NO_LIVE_CREDIT";
const PARENT_MANIFEST = "_velmere/PASS36_A102R44P22_SOURCE_ONLY_MANIFEST.json";
const CURRENT_MANIFEST = "_velmere/PASS36_A102R44P23_SOURCE_ONLY_MANIFEST.json";
const LEDGER = "config/pass36/a102r44p23-approved-current-source-changes.json";
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => JSON.stringify(value, (key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item);
const forbiddenTop = new Set(["node_modules", ".git", ".velmere", "artifacts", "coverage", "out", "build", "dist", ".cache", "cache", "tmp", "temp", "__pycache__", ".turbo", "test-results", "playwright-report"]);
const reject = (rel) => {
  const parts = rel.split("/");
  const top = parts[0] ?? "";
  return forbiddenTop.has(top) || top.startsWith(".next") || top === ".env" || top.startsWith(".env.") || parts.includes("__pycache__") || rel.endsWith(".tsbuildinfo") || rel.endsWith(".pyc");
};
function collectRows() {
  const rows = [];
  function walk(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (rel === CURRENT_MANIFEST || rel === LEDGER) continue;
      const full = path.join(directory, entry.name);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) throw new Error(`symlink:${rel}`);
      if (entry.isDirectory()) {
        if (!reject(rel)) walk(full, rel);
        continue;
      }
      if (!entry.isFile()) throw new Error(`non_regular:${rel}`);
      if (reject(rel)) continue;
      const bytes = fs.readFileSync(full);
      rows.push({ path: rel, byteLength: bytes.length, sha256: sha(bytes), mode: stat.mode & 0o777 });
    }
  }
  walk(ROOT);
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
const parentManifestBytes = fs.readFileSync(path.join(ROOT, PARENT_MANIFEST));
const parentManifest = JSON.parse(parentManifestBytes);
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, LEDGER), "utf8"));
const current = new Map(collectRows().map((row) => [row.path, row]));
const parent = new Map(parentManifest.entries.map((row) => [row.path, row]));
const changes = [];
for (const rel of [...new Set([...parent.keys(), ...current.keys()])].sort()) {
  const before = parent.get(rel);
  const after = current.get(rel);
  if (!before && after) changes.push({ path: rel, change: "ADDED", after });
  else if (before && !after) changes.push({ path: rel, change: "DELETED", before });
  else if (before && after && (before.sha256 !== after.sha256 || before.byteLength !== after.byteLength || before.mode !== after.mode)) changes.push({ path: rel, change: "MODIFIED", before, after });
}
const historicalRevisionPath = /(?:^|[/_.-])(?:a102r44p(?:[0-9]|1[0-9]|2[0-2]))(?:[/_.-]|$)/iu;
const historyMutations = changes.filter((row) => row.change !== "ADDED" && historicalRevisionPath.test(row.path));
const checks = [];
const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
add("schema", ledger.schemaVersion === "velmere.pass36.a102r44p23.approved-current-source-changes.v1");
add("revision", ledger.revisionId === REV && ledger.parentRevisionId === PARENT);
add("parent-manifest", ledger.parentManifestPath === PARENT_MANIFEST && ledger.parentManifestSha256 === sha(parentManifestBytes));
add("exact-changes", canonical(ledger.changes) === canonical(changes), { expected: changes.length, actual: ledger.changes?.length });
add("counts", ledger.addedCount === changes.filter((row) => row.change === "ADDED").length && ledger.modifiedCount === changes.filter((row) => row.change === "MODIFIED").length && ledger.deletedCount === changes.filter((row) => row.change === "DELETED").length);
add("no-deletions", ledger.deletedCount === 0);
add("no-removed-tests", ledger.removedTests === 0);
add("no-denominator-collapse", ledger.denominatorCollapse === false);
add("no-history-mutations", ledger.historyMutations === 0 && historyMutations.length === 0, historyMutations.map((row) => row.path));
add("parent-manifest-retained", current.has(PARENT_MANIFEST));
add("lifecycle-runtime", current.has("lib/security/audit-disposable-customer-lifecycle.mjs"));
add("separate-worker", current.has("scripts/pass36/a102r44p23-disposable-lifecycle-worker.mjs"));
add("runtime-e2e", current.has("scripts/pass36/test-a102r44p23-disposable-customer-lifecycle-e2e.mjs"));
add("repeatability", current.has("scripts/pass36/test-a102r44p23-disposable-customer-lifecycle-repeatability.mjs"));
add("persona-matrix", current.has("scripts/pass36/build-a102r44p23-lifecycle-persona-matrix.mjs") && current.has("scripts/pass36/test-a102r44p23-lifecycle-persona-matrix.mjs"));
add("migration", current.has("config/pass36/a102r44p23-local-e2e-denominator-migration.json") && current.has("scripts/pass36/verify-a102r44p23-local-e2e-denominator-migration.mjs"));
add("static-boundary", current.has("scripts/pass36/test-a102r44p23-disposable-lifecycle-static-boundary.mjs"));
add("static-policy", current.has("scripts/pass36/verify-a102r44p23-static-policy.mjs"));
const failed = checks.filter((row) => !row.ok);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p23.approved-source-changes-verification.v1",
  status: failed.length ? "FAIL" : "PASS_R44P23_APPROVED_SOURCE_CHANGES",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  changes: changes.length,
  rows: checks,
}, null, 2));
if (failed.length) process.exit(1);
