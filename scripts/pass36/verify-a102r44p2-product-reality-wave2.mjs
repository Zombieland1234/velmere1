#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ANSI_ESCAPE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, "gu");
const root = process.cwd();
const REVISION = "VELMERE_PASS36_A102R44P2_ACTION_REQUIRED_AUTOMATED_INFORMATIONAL_SKU_PDF_POSIX_TOOL_BOUNDARY_AND_OFFICIAL_TOOLCHAIN_ADMISSION_NO_LIVE_CREDIT";
const manifestRel = "_velmere/PASS36_A102R44P2_PATCH_SOURCE_MANIFEST.json";
const excludedTop = new Set(["artifacts", ".velmere", "node_modules", ".cache", ".turbo", "coverage", "test-results", "playwright-report", "__pycache__"]);
const checks = [];
const failures = [];
const check = (id, pass, detail = null) => {
  const row = { id, pass: Boolean(pass), detail };
  checks.push(row);
  if (!row.pass) failures.push(row);
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const norm = (value) => value.split(path.sep).join("/");
const ordinal = (left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0;

function walk(directory, prefix = "") {
  const rows = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (!prefix && (excludedTop.has(entry.name) || entry.name.startsWith(".next"))) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (relative === manifestRel) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symlink_forbidden:${relative}`);
    if (entry.isDirectory()) rows.push(...walk(absolute, relative));
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(absolute);
      rows.push({ path: norm(relative), byteLength: bytes.length, sha256: sha256(bytes), mode: fs.statSync(absolute).mode });
    }
  }
  return rows;
}

function parseJsonOutput(stdout) {
  const text = String(stdout ?? "").replace(ANSI_ESCAPE, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("json_object_not_found");
  return JSON.parse(text.slice(start, end + 1));
}

const environment = Object.fromEntries(Object.entries({
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  USERPROFILE: process.env.USERPROFILE,
  TMPDIR: process.env.TMPDIR,
  TMP: process.env.TMP,
  TEMP: process.env.TEMP,
  LANG: process.env.LANG,
  LC_ALL: process.env.LC_ALL,
  TERM: "dumb",
  NO_COLOR: "1",
  NODE_NO_WARNINGS: "1",
}).filter(([, value]) => typeof value === "string"));

function runJson(id, args, validate, timeout = 300_000) {
  const run = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout,
    maxBuffer: 64 * 1024 * 1024,
    env: environment,
  });
  let value = null;
  let parseError = null;
  try { value = parseJsonOutput(run.stdout); } catch (error) { parseError = error instanceof Error ? error.message : String(error); }
  const acceptedStderr = String(run.stderr ?? "").replace(ANSI_ESCAPE, "").trim();
  check(`${id}:exit`, run.status === 0, { status: run.status, signal: run.signal, stderr: acceptedStderr.slice(0, 1200) });
  check(`${id}:json`, value !== null, parseError);
  if (value !== null && typeof validate === "function") check(`${id}:contract`, validate(value), value);
  return value;
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(root, manifestRel), "utf8"));
} catch (error) {
  manifest = null;
  check("manifest:read", false, error instanceof Error ? error.message : String(error));
}

if (manifest) {
  const rows = walk(root).sort(ordinal);
  const aggregate = createHash("sha256");
  for (const row of rows) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}\n`);
  const aggregateSha256 = aggregate.digest("hex");
  const pathSetSha256 = sha256(Buffer.from(`${rows.map((row) => row.path).join("\n")}\n`, "utf8"));
  const expected = new Map(manifest.entries.map((row) => [row.path, row]));
  check("manifest:schema", manifest.schemaVersion === "velmere.pass36.a102r44p2.patch-source-manifest.v1", manifest.schemaVersion);
  check("manifest:revision", manifest.revisionId === REVISION, manifest.revisionId);
  check("manifest:file-count", rows.length === manifest.fileCount, { actual: rows.length, expected: manifest.fileCount });
  check("manifest:path-set", pathSetSha256 === manifest.pathSetSha256, { actual: pathSetSha256, expected: manifest.pathSetSha256 });
  check("manifest:aggregate", aggregateSha256 === manifest.aggregateSha256, { actual: aggregateSha256, expected: manifest.aggregateSha256 });
  let mismatches = 0;
  for (const row of rows) {
    const expectedRow = expected.get(row.path);
    if (!expectedRow || expectedRow.byteLength !== row.byteLength || expectedRow.sha256 !== row.sha256 || expectedRow.mode !== row.mode) mismatches += 1;
  }
  check("manifest:per-entry", mismatches === 0, { mismatches });
  check("manifest:no-extra", expected.size === rows.length, { expected: expected.size, actual: rows.length });
}

const state = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p2-product-reality-wave2-state.json"), "utf8"));
check("state:revision", state.revisionId === REVISION, state.revisionId);
check("state:fail-closed", state.globalDecision === "NO_GO" && state.live === false && state.saleEnabled === false && state.productionApproved === false && state.worldClassProven === false, state);
check("state:no-false-official-credit", state.realDenominators.officialToolExecutions.completed === 0 && state.localEvidence.officialToolAdmission.admittedTools === 0, state.localEvidence.officialToolAdmission);
check("state:current-sku-split", state.skuDecisions.auditBasic.decision === "GO_FREE_INFORMATIONAL_PILOT" && state.skuDecisions.auditPro.decision === "PILOT_ONLY_PAID_INFORMATIONAL" && state.skuDecisions.auditAdvanced.decision === "PILOT_ONLY_PAID_INFORMATIONAL" && state.skuDecisions.humanReviewedAudit.decision === "NOT_FOR_SALE", state.skuDecisions);
check("roadmap:current-prefix", fs.readFileSync(path.join(root, "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt"), "utf8").startsWith("================================================================================\nVELMERE WORLD-CLASS MAX ROADMAP — A102R44P2 PRODUCT REALITY WAVE 2"));

runJson("wave1-patch", ["scripts/pass36/test-a102r44-product-reality-wave1-patch.mjs"], (value) => value.failed === 0 && value.live === false && value.saleEnabled === false);
runJson("visual-freeze", ["scripts/pass36/verify-a102r44p1-current-visual-freeze.mjs"], (value) => value.failed === 0 && value.live === false && value.saleEnabled === false);
runJson("claim-boundary", ["scripts/pass36/test-a102r44p2-paid-informational-claim-boundary.mjs"], (value) => value.failed === 0 && value.passed === 33);
runJson("sku-pdf-seal", ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a102r44p2-automated-informational-sku-pdf-seal.ts"], (value) => value.failed === 0 && value.passed === 87);
runJson("tier-value", ["scripts/pass36/verify-a102r44p2-automated-audit-tier-value.mjs"], (value) => value.auditCases === 50 && value.matrixRows === 450 && value.contractPass === 450 && value.differentiationPass === 150 && value.realAuditCases === 0 && value.officialToolExecutions === 0);
runJson("audit-lens-wave2", ["scripts/pass18/verify-audit-lens-output-adapters.mjs", "--wave2-automated-informational"], (value) => value.ok === true && value.matrixRows === 900 && value.contractPass === 900 && value.advancedAutomatedPassed === 150 && value.advancedAutomatedUnsafeClaimRows === 0);
runJson("tool-admission-test", ["scripts/pass36/test-a102r44p2-official-audit-toolchain-admission.mjs"], (value) => value.failed === 0 && value.officialToolExecutions === 0);
runJson("tool-admission", ["scripts/pass36/verify-a102r44p2-official-audit-toolchain-admission.mjs"], (value) => value.requiredTools === 4 && value.admittedTools === 0 && value.officialToolExecutions === 0);
runJson("tool-readiness", ["scripts/pass36/verify-a102r44p2-official-tool-readiness.mjs"], (value) => value.summary?.requiredTools === 4 && value.summary?.officialExecutionsCompleted === 0 && value.summary?.officialToolCredit === false);
runJson("tool-probe", ["scripts/pass36/probe-a102r44p2-official-audit-toolchain.mjs"], (value) => value.toolsRequired === 4 && value.toolsExactReady === 0 && value.officialExecutions === 0 && value.officialExecutionCredit === false);

runJson("a66-migration", ["scripts/pass36/verify-a102r44p2-a66-denominator-migration.mjs"], (value) => value.failed === 0 && value.oldDenominator === 26 && value.newDenominator === 27 && value.removedChecks === 0);

// The POSIX execution-boundary test intentionally creates and terminates detached process
// groups. Running it as a nested child of the aggregate verifier can terminate the
// verifier's own supervising process group in some CI/container harnesses. The physical
// 10/10 and A66 27/27 executions are therefore separate MATERIALS receipts. This
// source-only verifier validates the exact source/policy boundary without replaying that
// destructive process-tree test and grants no official-tool or release credit for it.
const posixBoundarySource = fs.readFileSync(path.join(root, "scripts/pass36/test-a102r44p2-posix-official-tool-boundary.mjs"), "utf8");
const brokerSource = fs.readFileSync(path.join(root, "scripts/pass36/posix-process-group-broker.mjs"), "utf8");
check("posix-boundary:separate-materials-receipt-required", state.localEvidence.posixBoundary.executionReceiptRequiredInMaterials === true);
check("posix-boundary:source-contract", posixBoundarySource.includes("PASS36_POSIX_PROCESS_GROUP_BROKER_ID")
  && posixBoundarySource.includes('containmentBroker: "POSIX_PROCESS_GROUP_V1"')
  && posixBoundarySource.includes("officialToolExecutionCredit: false"));
check("posix-boundary:broker-contract", brokerSource.includes("detached: true")
  && brokerSource.includes('signalGroup(pgid, "SIGTERM")')
  && brokerSource.includes('signalGroup(pgid, "SIGKILL")')
  && brokerSource.includes("processGroupClean"));
check("a66-boundary:separate-materials-receipt-required", state.localEvidence.a66Boundary.executionReceiptRequiredInMaterials === true);

runJson("route-dispatch", ["scripts/pass15/verify-route-dispatch-consolidation.mjs"], (value) => value.failed === 0 && value.passed === 1480);
runJson("lazy-routes", ["scripts/pass15/verify-lazy-route-shells.mjs"], (value) => value.failed === 0 && value.passed === 176);

const result = {
  schemaVersion: "velmere.pass36.a102r44p2.product-reality-wave2-verification.v1",
  revisionId: REVISION,
  status: failures.length ? "FAIL_A102R44P2_PRODUCT_REALITY_WAVE2" : "PASS_A102R44P2_LOCAL_PRODUCT_REALITY_WAVE2_NO_LIVE_CREDIT",
  platform: process.platform,
  node: process.versions.node,
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  officialToolExecutionsRequired: 200,
  officialToolExecutionsCompleted: 0,
  realAuditCasesCompleted: 0,
  realCustomerPdfsCompleted: 0,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  failures,
  truthBoundary: "This verifier proves source identity and local automated informational SKU, PDF, adapter and tool-admission contracts only. It grants no exact Windows, official-tool, real-contract, real-customer, staging, paid-release or LIVE credit.",
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
