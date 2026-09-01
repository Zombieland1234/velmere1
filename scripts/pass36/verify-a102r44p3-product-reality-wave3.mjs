#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ANSI_ESCAPE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, "gu");
const root = process.cwd();
const REVISION = "VELMERE_PASS36_A102R44P3_ACTION_REQUIRED_CURRENT_BYTE_SHIELD_PRO_REAL_MARKETS_AND_MULTILINGUAL_AI_MATRIX_CLOSURE_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P2_ACTION_REQUIRED_AUTOMATED_INFORMATIONAL_SKU_PDF_POSIX_TOOL_BOUNDARY_AND_OFFICIAL_TOOLCHAIN_ADMISSION_NO_LIVE_CREDIT";
const MANIFEST_REL = "_velmere/PASS36_A102R44P3_SOURCE_MANIFEST.json";
const EXCLUDED_TOP = new Set(["artifacts", ".velmere", "node_modules", ".cache", ".turbo", "coverage", "test-results", "playwright-report", "__pycache__"]);
const checks = [];
const failures = [];
const check = (id, passed, detail = null) => { const row = { id, passed: Boolean(passed), detail }; checks.push(row); if (!row.passed) failures.push(row); };
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function collect(directory, prefix = "") {
  const rows = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)))) {
    if (!prefix && (EXCLUDED_TOP.has(entry.name) || entry.name.startsWith(".next"))) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (relative === MANIFEST_REL) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symlink_forbidden:${relative}`);
    if (entry.isDirectory()) rows.push(...collect(absolute, relative));
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(absolute);
      rows.push({ path: relative.split(path.sep).join("/"), byteLength: bytes.length, sha256: sha256(bytes), mode: fs.statSync(absolute).mode });
    }
  }
  return rows.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
}
function parseJson(stdout) {
  const text = String(stdout ?? "").replace(ANSI_ESCAPE, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("json_not_found");
  return JSON.parse(text.slice(start, end + 1));
}
const env = Object.fromEntries(Object.entries({ ...process.env, NODE_NO_WARNINGS: "1", NO_COLOR: "1", TERM: "dumb" }).filter(([, value]) => typeof value === "string"));
function runJson(id, args, validator, timeout = 600_000) {
  const run = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", shell: false, windowsHide: true, timeout, maxBuffer: 128 * 1024 * 1024, env });
  let value = null;
  let parseError = null;
  try { value = parseJson(run.stdout); } catch (error) { parseError = error instanceof Error ? error.message : String(error); }
  check(`${id}:exit`, run.status === 0, { status: run.status, signal: run.signal, stderr: String(run.stderr ?? "").slice(0, 1600) });
  check(`${id}:json`, value !== null, parseError);
  if (value !== null) check(`${id}:contract`, validator(value), value);
  return value;
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, MANIFEST_REL), "utf8"));
const rows = collect(root);
const pathSetSha256 = sha256(Buffer.from(`${rows.map((row) => row.path).join("\n")}\n`, "utf8"));
const aggregate = crypto.createHash("sha256");
for (const row of rows) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}\n`);
const aggregateSha256 = aggregate.digest("hex");
const expected = new Map(manifest.entries.map((row) => [row.path, row]));
check("manifest:schema", manifest.schemaVersion === "velmere.pass36.a102r44p3.source-manifest.v1", manifest.schemaVersion);
check("manifest:revision", manifest.revisionId === REVISION && manifest.parentRevisionId === PARENT, { revisionId: manifest.revisionId, parentRevisionId: manifest.parentRevisionId });
check("manifest:file-count", rows.length === manifest.fileCount, { actual: rows.length, expected: manifest.fileCount });
check("manifest:byte-length", rows.reduce((sum, row) => sum + row.byteLength, 0) === manifest.byteLength, { actual: rows.reduce((sum, row) => sum + row.byteLength, 0), expected: manifest.byteLength });
check("manifest:path-set", pathSetSha256 === manifest.pathSetSha256, { actual: pathSetSha256, expected: manifest.pathSetSha256 });
check("manifest:aggregate", aggregateSha256 === manifest.aggregateSha256, { actual: aggregateSha256, expected: manifest.aggregateSha256 });
let mismatches = 0;
for (const row of rows) {
  const expectedRow = expected.get(row.path);
  if (!expectedRow || expectedRow.byteLength !== row.byteLength || expectedRow.sha256 !== row.sha256 || expectedRow.mode !== row.mode) mismatches += 1;
}
check("manifest:per-entry", mismatches === 0, { mismatches });
check("manifest:no-extra", expected.size === rows.length, { expected: expected.size, actual: rows.length });
check("manifest:no-deletions", manifest.changeCounts.deleted === 0, manifest.changeCounts);
check("manifest:fail-closed", manifest.globalDecision === "NO_GO" && manifest.live === false && manifest.saleEnabled === false && manifest.productionApproved === false && manifest.worldClassProven === false, manifest);

const state = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p3-product-data-ai-matrix-state.json"), "utf8"));
check("state:revision", state.revisionId === REVISION && state.parentRevisionId === PARENT, { revisionId: state.revisionId, parentRevisionId: state.parentRevisionId });
check("state:fail-closed", state.globalDecision === "NO_GO" && state.live === false && state.saleEnabled === false && state.productionApproved === false && state.worldClassProven === false, state);
check("active-pass:current", fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim() === REVISION);
check("roadmap:current-prefix", fs.readFileSync(path.join(root, "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt"), "utf8").startsWith("================================================================================\nVELMERE WORLD-CLASS MAX ROADMAP — A102R44P3 PRODUCT DATA + AI MATRIX CLOSURE"));

runJson("hash-rebaseline", ["scripts/pass36/verify-a102r44p3-current-byte-product-matrix-rebaseline.mjs"], (value) => value.failed === 0 && value.migrations?.length === 2 && value.creditBoundary?.realDataCredit === false && value.creditBoundary?.saleEnabled === false);
runJson("non-mutating-a85-a86", ["scripts/pass36/test-a102r44p3-non-mutating-a85-a86.mjs"], (value) => value.failed === 0 && value.passed === 14 && value.explicitWriteRequired === true);
runJson("product-data-ai-matrix", ["scripts/pass36/verify-a102r44p3-product-data-ai-matrix.mjs"], (value) => value.failed === 0 && value.passed === 20 && value.matrixSummary?.checks === 35 && value.realCredit?.saleEnabled === false);
runJson("a85-verifier", ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/verify-a85-shield-pro-map-full-depth-matrix.ts"], (value) => value.failed === 0 && value.fixtureDenominators?.activeAssets === 318 && value.saleEnabled === false);
runJson("a86-verifier", ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/verify-a86-real-markets-cross-asset-matrix.ts"], (value) => value.failed === 0 && value.denominators?.instruments === 583 && value.saleEnabled === false);
runJson("wave2-claim-boundary", ["scripts/pass36/test-a102r44p2-paid-informational-claim-boundary.mjs"], (value) => value.failed === 0 && value.passed === 33);
runJson("wave2-sku-pdf-seal", ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a102r44p2-automated-informational-sku-pdf-seal.ts"], (value) => value.failed === 0 && value.passed === 87);
runJson("wave2-tier-value", ["scripts/pass36/verify-a102r44p2-automated-audit-tier-value.mjs"], (value) => value.auditCases === 50 && value.matrixRows === 450 && value.differentiationPass === 150 && value.realAuditCases === 0 && value.officialToolExecutions === 0);
runJson("wave2-adapters", ["scripts/pass18/verify-audit-lens-output-adapters.mjs", "--wave2-automated-informational", "--no-write"], (value) => value.ok === true && value.matrixRows === 900 && value.advancedAutomatedPassed === 150 && value.advancedAutomatedUnsafeClaimRows === 0);
runJson("official-tool-admission", ["scripts/pass36/verify-a102r44p2-official-audit-toolchain-admission.mjs"], (value) => value.requiredTools === 4 && value.admittedTools === 0 && value.officialToolExecutions === 0);
runJson("visual-freeze", ["scripts/pass36/verify-a102r44p1-current-visual-freeze.mjs"], (value) => value.failed === 0 && value.live === false && value.saleEnabled === false);
runJson("route-dispatch", ["scripts/pass15/verify-route-dispatch-consolidation.mjs"], (value) => value.failed === 0 && value.passed === 1480);
runJson("lazy-routes", ["scripts/pass15/verify-lazy-route-shells.mjs"], (value) => value.failed === 0 && value.passed === 176);

const finalRows = collect(root);
const finalAggregate = crypto.createHash("sha256");
for (const row of finalRows) finalAggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}\n`);
check("source:immutable-after-verification", finalRows.length === rows.length && finalAggregate.digest("hex") === aggregateSha256, { before: aggregateSha256, filesBefore: rows.length, filesAfter: finalRows.length });

const report = {
  schemaVersion: "velmere.pass36.a102r44p3.product-reality-wave3-verification.v1",
  revisionId: REVISION,
  status: failures.length ? "FAIL_A102R44P3_PRODUCT_REALITY_WAVE3" : "PASS_A102R44P3_LOCAL_CURRENT_BYTE_PRODUCT_DATA_AI_MATRIX_NO_REAL_OR_LIVE_CREDIT",
  platform: process.platform,
  node: process.versions.node,
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  source: { files: rows.length, bytes: manifest.byteLength, pathSetSha256, aggregateSha256, manifestSha256: sha256(fs.readFileSync(path.join(root, MANIFEST_REL))) },
  currentByteLocalMatrices: { shield: 318, shieldProMap: 318, realMarkets: 583, marketImpactWhale: 318, brainAngelRiskCases: 360 },
  realCredit: { shield: 0, shieldProMap: 0, realMarkets: 0, marketImpact: 0, whaleWatch: 0, brainAngelRisk: 0, providerRights: 0, productionBrowser: 0 },
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  failures,
  rows: checks,
  truthBoundary: "This aggregate proves the complete clean R44P3 source identity and local current-byte fixture/synthetic product matrices. It grants no exact Windows, real provider, rights, customer, paid delivery, staging, LIVE or sale credit.",
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
