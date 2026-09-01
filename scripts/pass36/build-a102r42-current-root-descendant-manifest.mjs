import fs from "node:fs";
import path from "node:path";
import {
  REV, PARENT, MANIFEST, PARENT_MANIFEST, STATE, PROGRAM, MODE_POLICY, MODE_MIGRATION,
  APPROVED_LEDGER, SPARSE_LEDGER, FAILURE_FINALIZATION_MIGRATION, FROZEN_REGRESSION_MIGRATION,
  AUTHORITY_MIGRATION, A80_RECEIPT_MIGRATION, PACKAGE_BOUNDARY_MIGRATION, A78_MIGRATION, DESCENDANT_VERIFIER_MIGRATION, A42_REBASELINE, sha256, canonicalJson, collect, payload,
} from "./a102r42-source-boundary.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { verifyA102R42StaticSemanticDocuments } from "./verify-a102r42-static-semantic-documents.mjs";

const root = process.cwd();
const read = (relativePath) => parseStrictJsonCli(fs.readFileSync(path.join(root, relativePath), "utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const parentBytes = fs.readFileSync(path.join(root, PARENT_MANIFEST));
const parent = parseStrictJsonCli(parentBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const state = read(STATE);
const program = read(PROGRAM);
const mode = read(MODE_POLICY);
const modeMigration = read(MODE_MIGRATION);
const approved = read(APPROVED_LEDGER);
const authorityMigration = read(AUTHORITY_MIGRATION);
const failureMigration = read(FAILURE_FINALIZATION_MIGRATION);
const regressionMigration = read(FROZEN_REGRESSION_MIGRATION);
const a80ReceiptMigration = read(A80_RECEIPT_MIGRATION);
const packageBoundaryMigration = read(PACKAGE_BOUNDARY_MIGRATION);
const descendantVerifierMigration = read(DESCENDANT_VERIFIER_MIGRATION);
const a42 = read(A42_REBASELINE);
const sparse = read(SPARSE_LEDGER);
const verifySelfDigest = (document, field, code) => {
  const core = { ...document }; const digest = core[field]; delete core[field];
  if (!/^[a-f0-9]{64}$/u.test(String(digest ?? "")) || digest !== sha256(canonicalJson(core))) throw new Error(code);
};
if (sha256(parentBytes) !== "dfa91c49372c5a858071dbcf9c0ff0f0a1ef63722bd7fcb8e197deaf2e3e3859" || parent.revisionId !== PARENT || parent.manifestDigestSha256 !== "92672a889d2a98723486e3ad3071e93d84bc3fb45b55ceb8111eaea388fbf8a6") throw new Error("a102r42_parent_descendant_identity");
if (state.schemaVersion !== "velmere.pass36.a102r42.action-required-current-state.v1" || state.revisionId !== REV || state.parentRevisionId !== PARENT || state.findingCount !== 54 || state.findings?.length !== 54 || state.globalDecision !== "NO_GO" || state.live !== false || state.saleEnabled !== false || state.productionApproved !== false || state.worldClassProven !== false) throw new Error("a102r42_state_identity");
if (program.schemaVersion !== "velmere.pass36.a102r42.world-class-completion-program.v1" || program.revisionId !== REV || program.parentRevisionId !== PARENT || program.a102r42?.findingCount !== 54 || program.a102r42?.actionAuthorityChecksRequired !== 47 || program.a102r42?.currentSourcePreflightScenariosRequired !== 60 || program.a102r42?.descendantVerifierChecksRequired !== 28 || program.a102r42?.a80r1MechanismChecksRequired !== 48 || program.a102r42?.packageBoundaryChecksRequired !== 38 || program.a102r42?.a42VerifierChecksRequired !== 54 || program.globalDecision !== "NO_GO" || program.live !== false || program.saleEnabled !== false || program.productionApproved !== false || program.worldClassProven !== false) throw new Error("a102r42_program_identity");
if (mode.schemaVersion !== "velmere.pass36.cross-platform-source-mode-policy.v1" || mode.revisionId !== REV || mode.parentRevisionId !== PARENT || mode.executablePaths?.length !== 58 || new Set(mode.executablePaths).size !== 58) throw new Error("a102r42_mode_identity");
if (modeMigration.schemaVersion !== "velmere.pass36.a102r42.source-mode-denominator-migration.v1" || modeMigration.revisionId !== REV || modeMigration.parentRevisionId !== PARENT || modeMigration.oldDenominator !== 58 || modeMigration.newDenominator !== 58 || modeMigration.retainedPaths?.length !== 58 || modeMigration.addedPaths?.length !== 0 || modeMigration.removedPaths?.length !== 0) throw new Error("a102r42_mode_migration_identity");
verifySelfDigest(modeMigration, "migrationDigestSha256", "a102r42_mode_migration_digest");
if (approved.schemaVersion !== "velmere.pass36.a102r42.approved-current-source-changes.v1" || approved.revisionId !== REV || approved.parentRevisionId !== PARENT || approved.deletedFiles?.length !== 0 || approved.parentDescendantRawSha256 !== "dfa91c49372c5a858071dbcf9c0ff0f0a1ef63722bd7fcb8e197deaf2e3e3859") throw new Error("a102r42_approved_identity");
verifySelfDigest(approved, "ledgerDigestSha256", "a102r42_approved_digest");
if (authorityMigration.schemaVersion !== "velmere.pass36.a102r42.current-source-authority-denominator-migration.v1" || authorityMigration.revisionId !== REV || authorityMigration.parentRevisionId !== PARENT || authorityMigration.oldDenominator !== 46 || authorityMigration.newDenominator !== 60 || authorityMigration.retainedCount !== 46 || authorityMigration.addedCount !== 14 || authorityMigration.removedCount !== 0) throw new Error("a102r42_authority_migration_identity");
verifySelfDigest(authorityMigration, "migrationDigestSha256", "a102r42_authority_migration_digest");
if (failureMigration.schemaVersion !== "velmere.pass36.a102r42.a60-failure-finalization-denominator-migration.v1" || failureMigration.revisionId !== REV || failureMigration.parentRevisionId !== PARENT || failureMigration.oldSemanticDenominator !== 16 || failureMigration.newSemanticDenominator !== 34 || failureMigration.removedSemanticCaseIds?.length !== 0) throw new Error("a102r42_failure_migration_identity");
verifySelfDigest(failureMigration, "migrationDigestSha256", "a102r42_failure_migration_digest");
if (regressionMigration.schemaVersion !== "velmere.pass36.a102r42.frozen-regression-denominator-migration.v1" || regressionMigration.revisionId !== REV || regressionMigration.parentRevisionId !== PARENT || regressionMigration.oldDenominator !== 28 || regressionMigration.newDenominator !== 29 || regressionMigration.retainedCount !== 28 || regressionMigration.addedCount !== 1 || regressionMigration.removedCount !== 0) throw new Error("a102r42_regression_migration_identity");
verifySelfDigest(regressionMigration, "migrationDigestSha256", "a102r42_regression_migration_digest");
if (a80ReceiptMigration.schemaVersion !== "velmere.pass36.a102r42.a80r1-receipt-denominator-migration.v1" || a80ReceiptMigration.revisionId !== REV || a80ReceiptMigration.parentRevisionId !== PARENT || a80ReceiptMigration.oldDenominator !== 36 || a80ReceiptMigration.newDenominator !== 48 || a80ReceiptMigration.retainedAssertionCount !== 36 || a80ReceiptMigration.addedAssertionIds?.length !== 12 || a80ReceiptMigration.removedAssertionIds?.length !== 0 || a80ReceiptMigration.fullRegressionStageDenominator !== 29) throw new Error("a102r42_a80_receipt_migration_identity");
verifySelfDigest(a80ReceiptMigration, "migrationDigestSha256", "a102r42_a80_receipt_migration_digest");
if (packageBoundaryMigration.schemaVersion !== "velmere.pass36.a102r42.package-boundary-denominator-migration.v1" || packageBoundaryMigration.revisionId !== REV || packageBoundaryMigration.parentRevisionId !== PARENT || packageBoundaryMigration.oldDenominator !== 36 || packageBoundaryMigration.newDenominator !== 38 || packageBoundaryMigration.retainedCount !== 36 || packageBoundaryMigration.addedCount !== 2 || packageBoundaryMigration.removedCount !== 0) throw new Error("a102r42_package_boundary_migration_identity");
verifySelfDigest(packageBoundaryMigration, "migrationDigestSha256", "a102r42_package_boundary_migration_digest");
if (descendantVerifierMigration.schemaVersion !== "velmere.pass36.a102r42.descendant-verifier-denominator-migration.v1" || descendantVerifierMigration.revisionId !== REV || descendantVerifierMigration.parentRevisionId !== PARENT || descendantVerifierMigration.oldDenominator !== 20 || descendantVerifierMigration.newDenominator !== 28 || descendantVerifierMigration.retainedCount !== 20 || descendantVerifierMigration.addedCount !== 8 || descendantVerifierMigration.removedCount !== 0) throw new Error("a102r42_descendant_verifier_migration_identity");
verifySelfDigest(descendantVerifierMigration, "migrationDigestSha256", "a102r42_descendant_verifier_migration_digest");
if (a42.schemaVersion !== "velmere.pass36.a102r42.a42-critical-rebaseline.v1" || a42.revisionId !== REV || a42.parentRevisionId !== PARENT || a42.criticalFileDenominator !== 76 || a42.rebaselinedRowCount !== 8) throw new Error("a102r42_a42_identity");
verifySelfDigest(a42, "evidenceDigestSha256", "a102r42_a42_digest");
if (sparse.schemaVersion !== "velmere.pass36.a102r41.historical-descendant-sparse-edge-ledger.v1" || sparse.revisionId !== PARENT || sparse.historicalManifestRewriteAllowed !== false || sparse.wildcardEdgesAllowed !== false) throw new Error("a102r42_sparse_identity");
verifySelfDigest(sparse, "ledgerDigestSha256", "a102r42_sparse_digest");
const semanticDocuments = verifyA102R42StaticSemanticDocuments(root);
if (semanticDocuments.checks !== 8 || semanticDocuments.passed !== 8 || semanticDocuments.failed !== 0) throw new Error(`a102r42_static_semantic_documents:${JSON.stringify(semanticDocuments.rows.filter((row) => !row.passed))}`);
const inventory = collect(root, { platform: process.platform });
if (inventory.rejected.length) throw new Error(`a102r42_source_rejected:${JSON.stringify(inventory.rejected)}`);
const sourcePayload = payload(inventory.rows);
const claims = {};
for (let pass = 90; pass <= 116; pass += 1) claims[`a${pass}PassCredit`] = false;
Object.assign(claims, {
  exactA77R1ToA80R1Credit: false,
  a102r42CurrentSourceAuthorityChecks: 47,
  a102r42CurrentSourcePreflightScenarios: 60,
  a102r42DescendantVerifierChecks: 28,
  a102r42A80R1MechanismChecks: 48,
  a102r42PackageBoundaryChecks: 38,
  a102r42A42VerifierChecks: 54,
  a102r42RetainedParentFindings: 39,
  a102r42NewFindings: 15,
  a102r42A60SemanticCasesBefore: 16,
  a102r42A60SemanticCasesAfter: 34,
  a102r42FrozenRegressionStagesBefore: 28,
  a102r42FrozenRegressionStagesAfter: 29,
  a102r42A60EvidencePackagePathsRequired: 59,
  a102r42A60EvidencePackagePathsVerified: 0,
  browserRowsRequired: 56,
  browserScenarioChecksRequired: 57,
  screenshotsRequired: 29,
  popupTabsRequired: 4,
  exactWindowsBuildBrowserCredit: false,
  stagingCredit: false,
  externalCommandExecutionCredit: false,
  durableAccountOperationWorkflowsImplemented: 0,
  durableOpaqueCheckoutFlowImplemented: false,
  paidCheckoutStopSellActive: true,
  executablePathDenominator: mode.executablePaths.length,
  realBrowserRows: 0,
  liveProven: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false
});
const bindings = {
  stateSha256: STATE,
  completionProgramSha256: PROGRAM,
  sourceModePolicySha256: MODE_POLICY,
  sourceModeMigrationSha256: MODE_MIGRATION,
  approvedChangeLedgerSha256: APPROVED_LEDGER,
  historicalSparseEdgeLedgerSha256: SPARSE_LEDGER,
  currentSourceAuthorityMigrationSha256: AUTHORITY_MIGRATION,
  failureFinalizationMigrationSha256: FAILURE_FINALIZATION_MIGRATION,
  frozenRegressionMigrationSha256: FROZEN_REGRESSION_MIGRATION,
  a80r1ReceiptMigrationSha256: A80_RECEIPT_MIGRATION,
  packageBoundaryMigrationSha256: PACKAGE_BOUNDARY_MIGRATION,
  a42CriticalRebaselineSha256: A42_REBASELINE
  ,a78LockfileMigrationSha256: A78_MIGRATION
  ,descendantVerifierMigrationSha256: DESCENDANT_VERIFIER_MIGRATION
};
const staticBindings = Object.fromEntries(Object.entries(bindings).map(([key, relative]) => [key, sha256(fs.readFileSync(path.join(root, relative)))]));
const output = {
  schemaVersion: "velmere.pass36.a102r42.current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: "2026-08-01T23:05:00+02:00",
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "A102R42_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_LOCAL_ONLY_NO_FORMAL_PASS_CREDIT",
  physicalPlatform: process.platform,
  posixFilesystemPhysicallyTested: process.platform !== "win32",
  payload: sourcePayload,
  staticBindings,
  claims,
  denominators: state.realDenominators,
  skuDecisions: state.skuDecisions
};
output.manifestDigestSha256 = sha256(canonicalJson(output));
fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "BUILT_A102R42_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION", physicalPlatform: process.platform, payload: output.payload, manifestDigestSha256: output.manifestDigestSha256, globalDecision: "NO_GO", live: false, saleEnabled: false }, null, 2));
