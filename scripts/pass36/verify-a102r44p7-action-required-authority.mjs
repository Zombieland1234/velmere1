import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const revision = "VELMERE_PASS36_A102R44P7_ACTION_REQUIRED_ADVANCED_INCREMENTAL_EVIDENCE_REMEDIATION_DELTA_AND_ADJUDICATION_READINESS_NO_LIVE_CREDIT";
const parentRevision = "VELMERE_PASS36_A102R44P6_ACTION_REQUIRED_CROSS_SURFACE_TIER_VALUE_TRUTH_AND_REAL_DATA_READINESS_NO_LIVE_CREDIT";
const manifestRel = "_velmere/PASS36_A102R44P7_SOURCE_MANIFEST.json";
const parentManifestRel = "_velmere/PASS36_A102R44P6_SOURCE_MANIFEST.json";
const stateRel = "config/pass36/a102r44p7-action-required-current-state.json";
const policyRel = "config/pass36/a102r44p7-advanced-incremental-evidence-policy.json";
const expectedLockSha256 = "abd75eb78ca1570c0b8c13717d128ae439c0ddd4c02c196e3ec03a877258258f";
const exclusions = new Set(["artifacts", ".velmere", "node_modules", ".cache", ".turbo", "coverage", "test-results", "playwright-report", "__pycache__"]);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

const manifestPath = path.join(root, manifestRel);
add("manifest-exists", fs.existsSync(manifestPath) && fs.statSync(manifestPath).isFile(), manifestRel);
if (!fs.existsSync(manifestPath)) {
  const output = { schemaVersion: "velmere.pass36.a102r44p7.authority-verification.v1", status: "FAIL_A102R44P7_AUTHORITY", revisionId: revision, checks: 1, passed: 0, failed: 1, globalDecision: "NO_GO", live: false, saleEnabled: false, failures: checks, rows: checks };
  console.log(JSON.stringify(output, null, 2));
  process.exit(1);
}
const manifest = readJson(manifestRel);
const parentManifestBytes = fs.readFileSync(path.join(root, parentManifestRel));
const rows = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (exclusions.has(entry.name) || entry.name.startsWith(".next")) continue;
      walk(absolute);
    } else if (entry.isFile() && relative !== manifestRel && !relative.endsWith(".pyc")) {
      const bytes = fs.readFileSync(absolute);
      rows.push({ path: relative, byteLength: bytes.length, sha256: sha(bytes), mode: (fs.statSync(absolute).mode & 0o777) | 0o100000 });
    }
  }
}
walk(root);
rows.sort((a, b) => a.path.localeCompare(b.path, "en"));
const byteLength = rows.reduce((sum, row) => sum + row.byteLength, 0);
const pathSetSha256 = sha(Buffer.from(rows.map((row) => row.path).join("\n")));
const aggregateSha256 = sha(Buffer.from(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}\n`).join("")));

add("revision", manifest.revisionId === revision, manifest.revisionId);
add("parent-revision", manifest.parentRevisionId === parentRevision, manifest.parentRevisionId);
add("schema", manifest.schemaVersion === "velmere.pass36.a102r44p7.source-manifest.v1", manifest.schemaVersion);
add("manifest-excluded-path", manifest.manifestExcludedPath === manifestRel, manifest.manifestExcludedPath);
add("parent-manifest-path", manifest.parentSourceManifestPath === parentManifestRel, manifest.parentSourceManifestPath);
add("parent-manifest-sha", manifest.parentSourceManifestSha256 === sha(parentManifestBytes), { actual: sha(parentManifestBytes), expected: manifest.parentSourceManifestSha256 });
add("file-count", rows.length === manifest.fileCount, { actual: rows.length, expected: manifest.fileCount });
add("byte-length", byteLength === manifest.byteLength, { actual: byteLength, expected: manifest.byteLength });
add("path-set", pathSetSha256 === manifest.pathSetSha256, { actual: pathSetSha256, expected: manifest.pathSetSha256 });
add("aggregate", aggregateSha256 === manifest.aggregateSha256, { actual: aggregateSha256, expected: manifest.aggregateSha256 });
add("entry-parity", rows.length === manifest.entries.length && rows.every((row, index) => {
  const expected = manifest.entries[index];
  return row.path === expected.path && row.byteLength === expected.byteLength && row.sha256 === expected.sha256 && row.mode === expected.mode;
}), "exact ordered rows");
add("global", manifest.globalDecision === "NO_GO" && !manifest.live && !manifest.saleEnabled && !manifest.productionApproved && !manifest.worldClassProven, manifest.globalDecision);
add("lockfile", sha(fs.readFileSync(path.join(root, "package-lock.json"))) === expectedLockSha256, sha(fs.readFileSync(path.join(root, "package-lock.json"))));
add("active-pass", fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim() === revision, fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim());
const state = readJson(stateRel);
const policy = readJson(policyRel);
add("state", state.revisionId === revision && state.parentRevisionId === parentRevision && state.globalDecision === "NO_GO" && !state.live && !state.saleEnabled && !state.productionApproved && !state.worldClassProven, state.revisionId);
add("policy", policy.revisionId === revision && policy.parentRevisionId === parentRevision && policy.evidenceFamilies.proExact === 4 && policy.evidenceFamilies.advancedExact === 7 && policy.denominators.independentAdjudications === 0, policy.revisionId);

const child = spawnSync(process.execPath, ["scripts/pass36/verify-a102r44p7-static-policy.mjs"], {
  cwd: root,
  encoding: "utf8",
  env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", LANG: "C.UTF-8", LC_ALL: "C.UTF-8" },
  timeout: 120000,
  shell: false,
  windowsHide: true,
});
let childJson = null;
let childParseError = null;
try { childJson = JSON.parse(child.stdout); } catch (error) { childParseError = error instanceof Error ? error.message : String(error); }
add("static-policy-child", child.status === 0 && child.stderr.length === 0 && childJson?.failed === 0 && childJson?.checks >= 67, { status: child.status, stderrBytes: Buffer.byteLength(child.stderr ?? ""), parseError: childParseError, summary: childJson && { checks: childJson.checks, passed: childJson.passed, failed: childJson.failed } });

const failed = checks.filter((row) => !row.passed);
const output = {
  schemaVersion: "velmere.pass36.a102r44p7.authority-verification.v1",
  revisionId: revision,
  parentRevisionId: parentRevision,
  status: failed.length ? "FAIL_A102R44P7_AUTHORITY" : "PASS_A102R44P7_AUTHORITY",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  sourceFiles: rows.length,
  sourceBytes: byteLength,
  sourcePathSetSha256: pathSetSha256,
  sourceAggregateSha256: aggregateSha256,
  manifestSha256: sha(fs.readFileSync(manifestPath)),
  advancedEvidenceFamilies: 7,
  proEvidenceFamilies: 4,
  independentAdjudicationCredit: 0,
  realAuditCredit: 0,
  realCustomerCredit: 0,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  failures: failed,
  rows: checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
