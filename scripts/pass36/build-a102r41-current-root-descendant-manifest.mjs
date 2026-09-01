#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  REV, PARENT, MANIFEST, PARENT_MANIFEST, STATE, PROGRAM, MODE_POLICY, MODE_MIGRATION,
  APPROVED_LEDGER, SPARSE_LEDGER, AUTHORITY_MIGRATION, A78_MIGRATION,
  sha256, canonicalJson, collect, payload,
} from "./a102r41-source-boundary.mjs";

const root = process.cwd();
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const parent = read(PARENT_MANIFEST);
const state = read(STATE);
const program = read(PROGRAM);
const mode = read(MODE_POLICY);
const modeMigration = read(MODE_MIGRATION);
const approved = read(APPROVED_LEDGER);
const sparse = read(SPARSE_LEDGER);
if (parent.revisionId !== PARENT || parent.manifestDigestSha256 !== "70e421274d421f299da37ded54e09a4a46833ec8d1c588ae2fbaa97307b578be") throw new Error("a102r41_parent_descendant_identity");
if (state.revisionId !== REV || state.parentRevisionId !== PARENT || program.revisionId !== REV || mode.revisionId !== REV || modeMigration.revisionId !== REV || approved.revisionId !== REV || sparse.revisionId !== REV) throw new Error("a102r41_static_identity");
const inventory = collect(root, { platform: process.platform });
if (inventory.rejected.length) throw new Error(`a102r41_source_rejected:${JSON.stringify(inventory.rejected)}`);
const sourcePayload = payload(inventory.rows);
const claims = {};
for (let pass = 90; pass <= 116; pass += 1) claims[`a${pass}PassCredit`] = false;
Object.assign(claims, {
  exactA77R1ToA80R1Credit: false,
  a102r41CurrentSourceAuthorityChecks: 46,
  a102r41HistoricalSparseEdgeLedgerChecks: 11,
  a102r41HistoricalInnerChainChecksExpected: 415,
  a80HistoricalReportChecksExpected: 426,
  a102r41RlsRemediationChecks: 18,
  a102r41PhysicalEvidenceBoundaryChecks: 9,
  a102r41RealIntakeDenialChecks: 14,
  a102r41SanitizedChildProcessChecks: 11,
  a102r41ExternalCommandContainmentChecks: 11,
  a102r41AccountOperationPrivacyChecks: 55,
  a102r41CheckoutContainmentChecks: 15,
  a102r41A80AdmissionChecks: 41,
  a102r41A80R1MechanismChecks: 36,
  a102r41PackageBoundaryChecks: 36,
  exactWindowsInputPreflightLocalOnly: true,
  exactWindowsBuildBrowserCredit: false,
  externalCommandExecutionCredit: false,
  durableAccountOperationWorkflowsImplemented: 0,
  durableOpaqueCheckoutFlowImplemented: false,
  paidCheckoutStopSellActive: true,
  executablePathDenominator: mode.executablePaths.length,
  browserRowsRequired: 56,
  screenshotsRequired: 29,
  popupTabsRequired: 4,
  formalRemainingEntries: 31,
  realBrowserRows: 0,
  stagingCredit: false,
  liveProven: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
});
const output = {
  schemaVersion: "velmere.pass36.a102r41.current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: "2026-08-01T10:25:32+02:00",
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "A102R41_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_INPUT_PREFLIGHT_AND_FAIL_CLOSED_RELEASE_PACKAGING_LOCAL_ONLY_NO_FORMAL_PASS_CREDIT",
  physicalPlatform: process.platform,
  posixFilesystemPhysicallyTested: process.platform !== "win32",
  payload: sourcePayload,
  staticBindings: {
    stateSha256: sha256(fs.readFileSync(path.join(root, STATE))),
    completionProgramSha256: sha256(fs.readFileSync(path.join(root, PROGRAM))),
    sourceModePolicySha256: sha256(fs.readFileSync(path.join(root, MODE_POLICY))),
    sourceModeMigrationSha256: sha256(fs.readFileSync(path.join(root, MODE_MIGRATION))),
    approvedChangeLedgerSha256: sha256(fs.readFileSync(path.join(root, APPROVED_LEDGER))),
    historicalSparseEdgeLedgerSha256: sha256(fs.readFileSync(path.join(root, SPARSE_LEDGER))),
    currentSourceAuthorityMigrationSha256: sha256(fs.readFileSync(path.join(root, AUTHORITY_MIGRATION))),
    a78LockfileMigrationSha256: sha256(fs.readFileSync(path.join(root, A78_MIGRATION))),
  },
  claims,
  denominators: state.realDenominators,
  skuDecisions: state.skuDecisions,
};
output.manifestDigestSha256 = sha256(canonicalJson(output));
fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "BUILT_A102R41_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION", physicalPlatform: process.platform, payload: output.payload, manifestDigestSha256: output.manifestDigestSha256, globalDecision: "NO_GO", live: false, saleEnabled: false }, null, 2));
