import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { verifyCriticalFiles } from "../../lib/build/dev-runtime-cache-recovery.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REV = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
const CONTRACT_PATH = "config/pass35/a42-dev-runtime-cache-recovery.json";
const EVIDENCE_PATH = "config/pass36/a102r41-a42-critical-rebaseline.json";
const PARENT_MANIFEST_PATH = "config/pass36/a102r41-parent-source-package-manifest.json";
const EXPECTED_PATHS = [
  "VELMERE_ACTIVE_PASS.txt",
  "config/pass36/current-release-authority.json",
  "next.config.mjs",
  "package.json",
  "scripts/a44-source-integrity-audit.mjs",
];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const readStrict = (relativePath) => parseStrictJsonCli(fs.readFileSync(relativePath, "utf8"), {
  maxBytes: 16 * 1024 * 1024,
  maxDepth: 64,
  maxNodes: 250000,
  requireObject: true,
});

function structuralEvidenceValid(value) {
  if (!value || typeof value !== "object") return false;
  const core = { ...value };
  delete core.evidenceDigestSha256;
  const rows = value.rebaselinedRows;
  return value.schemaVersion === "velmere.pass36.a102r41.a42-critical-rebaseline.v1"
    && value.revisionId === REV && value.parentRevisionId === PARENT
    && value.criticalFileDenominator === 76
    && value.rebaselinedRowCount === 5 && Array.isArray(rows) && rows.length === 5
    && canonicalJson(rows.map((row) => row.path).sort()) === canonicalJson([...EXPECTED_PATHS].sort())
    && value.rowDenominatorMigration?.old === 4 && value.rowDenominatorMigration?.new === 5
    && value.rowDenominatorMigration?.retained === 4 && value.rowDenominatorMigration?.added === 1
    && value.rowDenominatorMigration?.removed === 0 && value.rowDenominatorMigration?.scoreCredit === false
    && value.verifierDenominatorMigration?.old === 33 && value.verifierDenominatorMigration?.new === 38
    && value.verifierDenominatorMigration?.removedAssertions === 0 && value.verifierDenominatorMigration?.scoreCredit === false
    && value.evidenceDigestSha256 === sha256(canonicalJson(core))
    && value.globalDecision === "NO_GO" && value.live === false && value.saleEnabled === false
    && value.productionApproved === false && value.worldClassProven === false;
}

const contract = readStrict(CONTRACT_PATH);
const evidence = readStrict(EVIDENCE_PATH);
const parentManifest = readStrict(PARENT_MANIFEST_PATH);
const parentEntryByPath = new Map(parentManifest.entries.map((entry) => [entry.path, entry]));
const checks = [];
const check = (id, value, detail = null) => {
  checks.push({ id, passed: Boolean(value), detail });
  assert.ok(value, id);
};

check("schema", evidence.schemaVersion === "velmere.pass36.a102r41.a42-critical-rebaseline.v1");
check("identity", evidence.revisionId === REV && evidence.parentRevisionId === PARENT);
check("self-digest", structuralEvidenceValid(evidence));
check("critical-denominator", evidence.criticalFileDenominator === 76 && Object.keys(contract.criticalFiles).length === 76);
check("row-denominator-migration", evidence.rowDenominatorMigration.old === 4 && evidence.rowDenominatorMigration.new === 5 && evidence.rowDenominatorMigration.retained === 4 && evidence.rowDenominatorMigration.added === 1 && evidence.rowDenominatorMigration.removed === 0 && evidence.rowDenominatorMigration.scoreCredit === false);
check("verifier-denominator-migration", evidence.verifierDenominatorMigration.old === 33 && evidence.verifierDenominatorMigration.new === 38 && evidence.verifierDenominatorMigration.removedAssertions === 0 && evidence.verifierDenominatorMigration.scoreCredit === false);
check("row-count", evidence.rebaselinedRowCount === 5 && evidence.rebaselinedRows.length === 5);
check("unique-exact-path-set", new Set(evidence.rebaselinedRows.map((row) => row.path)).size === 5 && canonicalJson(evidence.rebaselinedRows.map((row) => row.path).sort()) === canonicalJson([...EXPECTED_PATHS].sort()));
for (const row of evidence.rebaselinedRows) {
  const bytes = fs.readFileSync(row.path);
  const parent = parentEntryByPath.get(row.path);
  check(`bytes:${row.path}`, bytes.length === row.currentByteLength);
  check(`sha:${row.path}`, sha256(bytes) === row.currentSha256);
  check(`contract:${row.path}`, contract.criticalFiles[row.path] === row.currentSha256);
  check(`parent:${row.path}`, parent?.byteLength === row.parentByteLength && parent?.sha256 === row.parentSha256);
  check(`changed:${row.path}`, row.parentSha256 !== row.currentSha256 && row.classification === "A102R41_AUTHORITY_SECURITY_AND_SOURCE_AUDIT_APPROVED_REBASELINE");
}
const verified = verifyCriticalFiles(process.cwd(), contract.criticalFiles);
check("all-critical-files", verified.ok && verified.checks.length === 76 && verified.failures.length === 0);
check("promotion", evidence.globalDecision === "NO_GO" && evidence.live === false && evidence.saleEnabled === false && evidence.productionApproved === false && evidence.worldClassProven === false);
const collapsed = structuredClone(evidence);
collapsed.rebaselinedRows.pop(); collapsed.rebaselinedRowCount = 4; collapsed.rowDenominatorMigration.new = 4;
check("negative-row-denominator-collapse", structuralEvidenceValid(collapsed) === false);
const removed = structuredClone(evidence);
removed.rowDenominatorMigration.removed = 1;
check("negative-removed-row", structuralEvidenceValid(removed) === false);
const digestTamper = structuredClone(evidence);
digestTamper.evidenceDigestSha256 = "0".repeat(64);
check("negative-self-digest-tamper", structuralEvidenceValid(digestTamper) === false);

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a102r41.a42-critical-rebaseline-verification.v1",
  revisionId: REV,
  status: failed.length === 0 ? "PASS_A102R41_A42_CRITICAL_REBASELINE_76_OF_76_NO_WINDOWS_BROWSER_STAGING_OR_SALE_CREDIT" : "FAIL_A102R41_A42_CRITICAL_REBASELINE",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  criticalFilesPassed: verified.checks.length,
  rebaselinedRows: evidence.rebaselinedRowCount,
  rowDenominatorMigration: evidence.rowDenominatorMigration,
  verifierDenominatorMigration: evidence.verifierDenominatorMigration,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  failures: failed,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length > 0) process.exit(1);
