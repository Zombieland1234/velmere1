#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REV = "VELMERE_PASS36_A102R44P23_ACTION_REQUIRED_LOCAL_DISPOSABLE_CUSTOMER_LIFECYCLE_REFUND_REVOCATION_DELETE_AND_DURABLE_DELIVERY_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P22_ACTION_REQUIRED_RUTHLESS_CUSTOMER_SECURE_PAID_PREVIEW_RISK_TIER_SPLIT_CROSS_ASSET_AND_LEGAL_DATA_ALTERNATIVES_NO_LIVE_CREDIT";
const MANIFEST = "_velmere/PASS36_A102R44P23_SOURCE_ONLY_MANIFEST.json";
const LEDGER = "config/pass36/a102r44p23-approved-current-source-changes.json";
const PARENT_MANIFEST = "_velmere/PASS36_A102R44P22_SOURCE_ONLY_MANIFEST.json";
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const forbiddenTop = new Set(["node_modules", ".git", ".velmere", "artifacts", "coverage", "out", "build", "dist", ".cache", "cache", "tmp", "temp", "__pycache__", ".turbo", "test-results", "playwright-report"]);
const reject = (rel) => {
  const parts = rel.split("/");
  const top = parts[0] ?? "";
  return forbiddenTop.has(top) || top.startsWith(".next") || top === ".env" || top.startsWith(".env.") || parts.includes("__pycache__") || rel.endsWith(".tsbuildinfo") || rel.endsWith(".pyc");
};
function collectRows(order) {
  const rows = [];
  function walk(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (rel === MANIFEST) continue;
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
  rows.sort((left, right) => (order.get(left.path) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.path) ?? Number.MAX_SAFE_INTEGER) || left.path.localeCompare(right.path));
  return rows;
}
const manifestBytes = fs.readFileSync(path.join(ROOT, MANIFEST));
const manifest = JSON.parse(manifestBytes);
const order = new Map(manifest.entries.map((row, index) => [row.path, index]));
const rows = collectRows(order);
const byteLength = rows.reduce((sum, row) => sum + row.byteLength, 0);
const pathSetSha256 = sha(Buffer.from(`${rows.map((row) => row.path).join("\n")}\n`));
const aggregateSha256 = sha(Buffer.from(`${rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode.toString(8)}`).join("\n")}\n`));
const state = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p23-action-required-current-state.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p23-disposable-customer-lifecycle-policy.json"), "utf8"));
const checks = [];
const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
add("schema", manifest.schemaVersion === "velmere.pass36.a102r44p23.source-manifest.v1");
add("revision", manifest.revisionId === REV && manifest.parentRevisionId === PARENT);
add("count", manifest.fileCount === rows.length, { manifest: manifest.fileCount, actual: rows.length });
add("bytes", manifest.byteLength === byteLength, { manifest: manifest.byteLength, actual: byteLength });
add("pathset", manifest.pathSetSha256 === pathSetSha256);
add("aggregate", manifest.aggregateSha256 === aggregateSha256);
add("entries", manifest.entries.length === rows.length && manifest.entries.every((expected, index) => expected.path === rows[index].path && expected.byteLength === rows[index].byteLength && expected.sha256 === rows[index].sha256 && expected.mode === rows[index].mode));
add("active-pass", fs.readFileSync(path.join(ROOT, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim() === REV);
add("flags", state.globalDecision === "NO_GO" && state.LIVE === false && state.saleEnabled === false && state.productionApproved === false && state.worldClassProven === false);
add("implemented", state.implemented?.localDisposableCustomerLifecycle === true && state.implemented?.lifecycleAssertions === 63 && state.implemented?.ruthlessPersonaLifecycleRows === 180);
add("basic-free", policy.nonNegotiable?.basicAlwaysFree === true && policy.nonNegotiable?.basicPaymentRequired === false);
add("pro-beta", policy.nonNegotiable?.proControlledBetaOnly === true && policy.nonNegotiable?.proPublicCheckoutAllowed === false);
add("advanced-stop-sale", policy.nonNegotiable?.advancedForSale === false);
add("local-not-staging", policy.classification === "LOCAL_DISPOSABLE_RUNTIME_E2E_NOT_STAGING" && policy.creditBoundary?.stagingCredit === false && policy.creditBoundary?.liveCredit === false);
add("approved-bound", manifest.approvedChangesPath === LEDGER && manifest.approvedChangesSha256 === sha(fs.readFileSync(path.join(ROOT, LEDGER))));
add("parent-bound", manifest.parentManifestPath === PARENT_MANIFEST && manifest.parentManifestSha256 === sha(fs.readFileSync(path.join(ROOT, PARENT_MANIFEST))));
add("no-forbidden", rows.every((row) => !reject(row.path)));
add("roadmap", fs.readFileSync(path.join(ROOT, "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt"), "utf8").startsWith("================================================================================\nVELMÈRE WORLD_CLASS_MAX ROADMAP — PASS36 A102R44P23"));
add("current-release-fail-closed", state.currentByteCredit?.exactWindows === false && state.currentByteCredit?.stagingCustomerLifecycle === false);
const failed = checks.filter((row) => !row.ok);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p23.source-authority-receipt.v1",
  status: failed.length ? "FAIL" : "PASS_R44P23_SOURCE_AUTHORITY",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  revisionId: REV,
  manifestSha256: sha(manifestBytes),
  aggregateSha256,
  fileCount: rows.length,
  sourceImmutable: true,
  rows: checks,
}, null, 2));
if (failed.length) process.exit(1);
