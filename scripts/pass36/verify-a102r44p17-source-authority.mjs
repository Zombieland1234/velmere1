#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REVISION = "VELMERE_PASS36_A102R44P17_ACTION_REQUIRED_DETERMINISTIC_50_ASSET_REAL_NETWORK_DIAGNOSTIC_CROSS_SURFACE_VALUE_AND_RIGHTS_BOUNDARY_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P16_ACTION_REQUIRED_SINGLE_SKU_TRUTH_ANALYSIS_QUEUE_AND_CUSTOMER_CLAIM_CLOSURE_NO_LIVE_CREDIT";
const MANIFEST_REL = "_velmere/PASS36_A102R44P17_SOURCE_ONLY_MANIFEST.json";
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_REL), "utf8"));
const excludedTop = new Set(["node_modules", ".git", ".velmere", "artifacts", "coverage", "test-results", "playwright-report", ".cache", "tmp", "temp", "__pycache__"]);
const forbiddenParts = new Set(["node_modules", ".git", ".velmere", "artifacts", "coverage", "test-results", "playwright-report", ".cache", "__pycache__"]);
const sha = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const rows = [];
function walk(dir, rel = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (!rel && (excludedTop.has(entry.name) || entry.name.startsWith(".next"))) continue;
    if (childRel === MANIFEST_REL) continue;
    const full = path.join(dir, entry.name);
    const st = fs.lstatSync(full);
    if (st.isSymbolicLink()) throw new Error(`symlink_forbidden:${childRel}`);
    if (entry.isDirectory()) { walk(full, childRel); continue; }
    if (!entry.isFile()) throw new Error(`non_regular_forbidden:${childRel}`);
    if (childRel.split("/").some((part) => forbiddenParts.has(part) || part.startsWith(".next"))) throw new Error(`forbidden_path:${childRel}`);
    const bytes = fs.readFileSync(full);
    rows.push({ path: childRel, byteLength: bytes.length, sha256: sha(bytes), mode: st.mode & 0o777 });
  }
}
walk(ROOT);
const manifestOrder = new Map(manifest.entries.map((row, index) => [row.path, index]));
rows.sort((a, b) => (manifestOrder.get(a.path) ?? Number.MAX_SAFE_INTEGER) - (manifestOrder.get(b.path) ?? Number.MAX_SAFE_INTEGER));
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const byteLength = rows.reduce((sum, row) => sum + row.byteLength, 0);
const pathSetSha256 = sha(Buffer.from(rows.map((row) => row.path).join("\n") + "\n"));
const aggregateSha256 = sha(Buffer.from(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode.toString(8)}`).join("\n") + "\n"));
check("schema", manifest.schemaVersion === "velmere.pass36.a102r44p17.source-manifest.v1");
check("revision", manifest.revisionId === REVISION && manifest.parentRevisionId === PARENT);
check("file-count", manifest.fileCount === rows.length, { expected: manifest.fileCount, actual: rows.length });
check("byte-length", manifest.byteLength === byteLength, { expected: manifest.byteLength, actual: byteLength });
check("path-set", manifest.pathSetSha256 === pathSetSha256, { expected: manifest.pathSetSha256, actual: pathSetSha256 });
check("aggregate", manifest.aggregateSha256 === aggregateSha256, { expected: manifest.aggregateSha256, actual: aggregateSha256 });
const expected = new Map(manifest.entries.map((row) => [row.path, row]));
const current = new Map(rows.map((row) => [row.path, row]));
const missing = manifest.entries.filter((row) => !current.has(row.path)).map((row) => row.path);
const extra = rows.filter((row) => !expected.has(row.path)).map((row) => row.path);
const changed = rows.filter((row) => {
  const old = expected.get(row.path);
  return old && (old.byteLength !== row.byteLength || old.sha256 !== row.sha256 || old.mode !== row.mode);
}).map((row) => row.path);
check("missing-zero", missing.length === 0, missing.slice(0, 20));
check("extra-zero", extra.length === 0, extra.slice(0, 20));
check("changed-zero", changed.length === 0, changed.slice(0, 20));
check("active-pass", fs.readFileSync(path.join(ROOT, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim() === REVISION);
const state = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p17-action-required-current-state.json"), "utf8"));
check("truth-flags", state.globalDecision === "NO_GO" && state.LIVE === false && state.saleEnabled === false && state.productionApproved === false && state.worldClassProven === false);
check("approved-bound", manifest.approvedChangesPath === "config/pass36/a102r44p17-approved-current-source-changes.json" && /^[0-9a-f]{64}$/u.test(manifest.approvedChangesSha256));
check("no-forbidden", rows.every((row) => !row.path.split("/").some((part) => forbiddenParts.has(part) || part.startsWith(".next"))));
check("provider-policy", state.localEvidence.providerDiagnostic.realNetworkObservedAssets === 50 && state.localEvidence.providerDiagnostic.rightsApprovedAssets === 0);
const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p17.source-authority-receipt.v1",
  status: failed.length ? "FAIL" : "PASS_R44P17_SOURCE_AUTHORITY",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  revisionId: REVISION,
  manifestSha256: sha(fs.readFileSync(path.join(ROOT, MANIFEST_REL))),
  aggregateSha256,
  fileCount: rows.length,
  sourceImmutable: true,
  rows: checks,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
