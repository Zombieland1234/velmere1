import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { verifyCriticalFiles } from "../../lib/build/dev-runtime-cache-recovery.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REV = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const CONTRACT_PATH = "config/pass35/a42-dev-runtime-cache-recovery.json";
const EVIDENCE_PATH = "config/pass36/a102r42-a42-critical-rebaseline.json";
const PARENT_EVIDENCE_PATH = "config/pass36/a102r41-a42-critical-rebaseline.json";
const R40_PACKAGE_PATH = "config/pass36/a102r41-parent-source-package-manifest.json";
const R41_PACKAGE_PATH = "config/pass36/a102r42-parent-source-package-manifest.json";
const CURRENT_PATHS = ["VELMERE_ACTIVE_PASS.txt", "config/pass36/current-release-authority.json", "package.json"];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const readStrict = (relativePath) => parseStrictJsonCli(fs.readFileSync(relativePath, "utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 64, maxNodes: 250000, requireObject: true });

const contract = readStrict(CONTRACT_PATH);
const evidenceBytes = fs.readFileSync(EVIDENCE_PATH);
const evidence = readStrict(EVIDENCE_PATH);
const parentEvidenceBytes = fs.readFileSync(PARENT_EVIDENCE_PATH);
const parentEvidence = readStrict(PARENT_EVIDENCE_PATH);
const r40Package = readStrict(R40_PACKAGE_PATH);
const r41Package = readStrict(R41_PACKAGE_PATH);
const r40ByPath = new Map(r40Package.entries.map((entry) => [entry.path, entry]));
const r41ByPath = new Map(r41Package.entries.map((entry) => [entry.path, entry]));
const checks = [];
const check = (id, value, detail = null) => { const row = { id, passed: Boolean(value), detail }; checks.push(row); assert.ok(row.passed, id); };
const evidenceCore = { ...evidence }; delete evidenceCore.evidenceDigestSha256;
const compositeKeys = [
  ...evidence.retainedHistoricalRows.map((row) => `${PARENT}\0${row.path}`),
  ...evidence.currentRebaselinedRows.map((row) => `${REV}\0${row.path}`),
];
const verified = verifyCriticalFiles(process.cwd(), contract.criticalFiles);

check("schema", evidence.schemaVersion === "velmere.pass36.a102r42.a42-critical-rebaseline.v1");
check("identity", evidence.revisionId === REV && evidence.parentRevisionId === PARENT);
check("self-digest", /^[a-f0-9]{64}$/u.test(evidence.evidenceDigestSha256) && evidence.evidenceDigestSha256 === sha256(canonicalJson(evidenceCore)) && evidenceBytes.length > 0);
check("parent-evidence-anchor", evidence.parentEvidencePath === PARENT_EVIDENCE_PATH && evidence.parentEvidenceRawSha256 === "a16f186e6154bd60b091459af70b69a87ed798567e2eb6b659197b35d2295ec7" && sha256(parentEvidenceBytes) === evidence.parentEvidenceRawSha256 && evidence.parentEvidenceDigestSha256 === "cf57d77d7ddef7a49a67625f5c0750144a40ad99b228c7baa5ccd0b515d4b520" && parentEvidence.evidenceDigestSha256 === evidence.parentEvidenceDigestSha256);
check("critical-denominator", evidence.criticalFileDenominator === 76 && Object.keys(contract.criticalFiles).length === 76);
check("row-denominator-migration", evidence.rowDenominatorMigration.old === 5 && evidence.rowDenominatorMigration.new === 8 && evidence.rowDenominatorMigration.retained === 5 && evidence.rowDenominatorMigration.added === 3 && evidence.rowDenominatorMigration.removed === 0 && evidence.rowDenominatorMigration.scoreCredit === false);
check("verifier-denominator-migration", evidence.verifierDenominatorMigration.old === 38 && evidence.verifierDenominatorMigration.new === 54 && evidence.verifierDenominatorMigration.retainedAssertions === 38 && evidence.verifierDenominatorMigration.addedAssertions === 16 && evidence.verifierDenominatorMigration.removedAssertions === 0 && evidence.verifierDenominatorMigration.scoreCredit === false);
check("row-count", evidence.rebaselinedRowCount === 8 && evidence.retainedHistoricalRows.length === 5 && evidence.currentRebaselinedRows.length === 3);
check("composite-unique-exact-path-set", new Set(compositeKeys).size === 8 && canonicalJson(evidence.currentRebaselinedRows.map((row) => row.path).sort()) === canonicalJson([...CURRENT_PATHS].sort()));
check("all-critical-files", verified.ok && verified.checks.length === 76 && verified.failures.length === 0);
check("promotion", evidence.globalDecision === "NO_GO" && evidence.live === false && evidence.saleEnabled === false && evidence.productionApproved === false && evidence.worldClassProven === false);
const collapsed = structuredClone(evidence); collapsed.currentRebaselinedRows.pop(); collapsed.rebaselinedRowCount = 7; collapsed.rowDenominatorMigration.new = 7;
const collapsedCore = { ...collapsed }; delete collapsedCore.evidenceDigestSha256;
check("negative-row-denominator-collapse", collapsed.evidenceDigestSha256 !== sha256(canonicalJson(collapsedCore)) && collapsed.currentRebaselinedRows.length !== 3 && collapsed.rowDenominatorMigration.new !== 8);
const removed = structuredClone(evidence); removed.retainedHistoricalRows.pop(); removed.rebaselinedRowCount = 7; removed.rowDenominatorMigration.retained = 4; removed.rowDenominatorMigration.new = 7;
const removedCore = { ...removed }; delete removedCore.evidenceDigestSha256;
check("negative-removed-row", removed.evidenceDigestSha256 !== sha256(canonicalJson(removedCore)) && removed.retainedHistoricalRows.length !== 5 && removed.rowDenominatorMigration.retained !== 5 && removed.rowDenominatorMigration.new !== 8);
const digestTamper = structuredClone(evidence); digestTamper.evidenceDigestSha256 = "0".repeat(64);
const digestTamperCore = { ...digestTamper }; delete digestTamperCore.evidenceDigestSha256;
check("negative-self-digest-tamper", digestTamper.evidenceDigestSha256 !== sha256(canonicalJson(digestTamperCore)));

for (let index = 0; index < evidence.retainedHistoricalRows.length; index += 1) {
  const row = evidence.retainedHistoricalRows[index];
  const frozen = parentEvidence.rebaselinedRows[index];
  const r40 = r40ByPath.get(row.path);
  const r41 = r41ByPath.get(row.path);
  check(`historical-row-exact:${row.path}`, canonicalJson(row) === canonicalJson(frozen));
  check(`historical-parent-anchor:${row.path}`, r40?.byteLength === row.parentByteLength && r40?.sha256 === row.parentSha256);
  check(`historical-current-anchor:${row.path}`, r41?.byteLength === row.currentByteLength && r41?.sha256 === row.currentSha256);
  check(`historical-classification:${row.path}`, row.classification === "A102R41_AUTHORITY_SECURITY_AND_SOURCE_AUDIT_APPROVED_REBASELINE");
  check(`historical-changed:${row.path}`, row.parentSha256 !== row.currentSha256);
}
for (const row of evidence.currentRebaselinedRows) {
  const bytes = fs.readFileSync(row.path);
  const parent = r41ByPath.get(row.path);
  check(`current-bytes:${row.path}`, bytes.length === row.currentByteLength && sha256(bytes) === row.currentSha256);
  check(`current-contract:${row.path}`, contract.criticalFiles[row.path] === row.currentSha256);
  check(`current-parent-anchor:${row.path}`, parent?.byteLength === row.parentByteLength && parent?.sha256 === row.parentSha256);
  check(`current-classification:${row.path}`, row.revisionId === REV && row.classification === "A102R42_AUTHORITY_A60_FAIL_CLOSED_APPROVED_REBASELINE");
  check(`current-changed:${row.path}`, row.parentSha256 !== row.currentSha256);
}

const failed = checks.filter((row) => !row.passed);
assert.equal(checks.length, 54, "a102r42_a42_verifier_denominator");
const report = {
  schemaVersion: "velmere.pass36.a102r42.a42-critical-rebaseline-verification.v1",
  revisionId: REV,
  status: failed.length === 0 ? "PASS_A102R42_A42_CRITICAL_REBASELINE_76_OF_76_RETAINED_5_ADDED_3_NO_WINDOWS_BROWSER_STAGING_OR_SALE_CREDIT" : "FAIL_A102R42_A42_CRITICAL_REBASELINE",
  checks: checks.length, passed: checks.length - failed.length, failed: failed.length,
  criticalFilesPassed: verified.checks.length, retainedHistoricalRows: 5, currentRebaselinedRows: 3,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
  failures: failed,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length > 0) process.exit(1);
