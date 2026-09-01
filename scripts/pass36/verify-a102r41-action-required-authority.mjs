#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";
import { inspectHistoricalSparseEdgeLedger, verifyCurrentAuthority } from "./historical-descendant-chain-lib.mjs";
import { canonicalJson, sha256 } from "./a102r41-source-boundary.mjs";
import { collectA102R41Inventory } from "./package-a102r41-deterministic.mjs";
import { buildA60ChildEnvironment, expectedA60EvidencePaths } from "./a79-exact-build-browser-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { verifyA60BrowserFixtureEvidenceDenominatorMigration } from "./verify-a102r41-a60-browser-fixture-evidence-denominator-migration.mjs";

const REV = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
const STATUS = "PASS_A102R41_ACTION_REQUIRED_AUTHORITY_SECURITY_EVIDENCE_EXACT_WINDOWS_PREFLIGHT_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const MANIFEST = "config/pass36/a102r41-current-root-descendant-manifest.json";
const PROGRAM = "config/pass36/a102r41-world-class-completion-program.json";
const MODE = "config/pass36/a102r41-cross-platform-source-mode-policy.json";
const MODE_MIGRATION = "config/pass36/a102r41-source-mode-denominator-migration.json";
const A80R1_MECHANISM_MIGRATION = "config/pass36/a102r41-a80r1-mechanism-denominator-migration.json";
const SPARSE = "config/pass36/a102r41-historical-descendant-sparse-edge-ledger.json";
const read = (relativePath) => JSON.parse(fs.readFileSync(relativePath, "utf8"));
const active = fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim();
const pkg = read("package.json");
const authority = read("config/pass36/current-release-authority.json");
const current = read("config/pass35/current-revision.json");
const compat = read("config/current-release.json");
const a58 = read("config/pass36/a58-release-integrity-policy.json");
const state = read("config/pass36/a102r41-action-required-current-state.json");
const program = read(PROGRAM);
const a60Policy = read("config/pass36/a60-exact-final-byte-build-browser-acceptance.json");
const browserContract = read("config/pass35/a45-exact-runtime-browser-acceptance.json");
const a45StaticSource = fs.readFileSync("scripts/pass35/test-a45-exact-runtime-browser-acceptance.mjs", "utf8");
const evidencePlan = expectedA60EvidencePaths(a60Policy, browserContract);
const mode = read(MODE);
const frozenMode = read("config/pass36/a102r40-cross-platform-source-mode-policy.json");
const modeMigration = read(MODE_MIGRATION);
const mechanismMigration = read(A80R1_MECHANISM_MIGRATION);
const parentPackageManifest = read("config/pass36/a102r41-parent-source-package-manifest.json");
const manifest = read(MANIFEST);
function runCurrentJson(relativeScript) {
  const run = spawnSync(process.execPath, [relativeScript], {
    cwd: process.cwd(), encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
    env: buildA60ChildEnvironment(process.env), shell: false, windowsHide: true,
  });
  const value = (() => {
    try { return parseStrictJsonCli(run.stdout, { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true }); }
    catch { return null; }
  })();
  return { exitCode: run.status, stderrBytes: Buffer.byteLength(run.stderr ?? ""), value };
}
const fixtureCurrent = runCurrentJson("scripts/pass35/test-a45-browser-qa-fixture.mjs");
const a45StaticCurrent = runCurrentJson("scripts/pass35/test-a45-exact-runtime-browser-acceptance.mjs");
const a79Current = runCurrentJson("scripts/pass36/verify-a79-exact-final-byte-build-browser-evidence-binding.mjs");
const browserMigrationCurrent = verifyA60BrowserFixtureEvidenceDenominatorMigration(process.cwd());
const parentPaths = new Set(parentPackageManifest.entries.map((row) => row.path));
const observedNewShebangPaths = collectA102R41Inventory(process.cwd(), "source", { allowReservedManifestInput: true }).rows
  .filter((row) => !parentPaths.has(row.path))
  .map((row) => {
    const absolute = path.resolve(row.path);
    const before = fs.lstatSync(absolute);
    if (!before.isFile() || before.isSymbolicLink()) throw new Error(`mode_migration_new_path_not_regular:${row.path}`);
    const bytes = fs.readFileSync(absolute);
    const after = fs.lstatSync(absolute);
    const stable = before.dev === after.dev && before.ino === after.ino && before.mode === after.mode
      && before.size === after.size && before.mtimeMs === after.mtimeMs;
    if (!stable || bytes.length !== row.byteLength || sha256(bytes) !== row.sha256) throw new Error(`mode_migration_new_path_unstable_or_unbound:${row.path}`);
    return bytes.subarray(0, 2).toString("utf8") === "#!" ? row.path : null;
  })
  .filter(Boolean)
  .sort();
const checks = [];
const check = (id, value, detail = null) => { checks.push({ id, passed: Boolean(value), detail }); assert.ok(value, id); };

check("active", active === REV, active);
check("package-primary", pkg.velmerePass === REV && pkg.velmerePatch === "VELMERE_A102R41_PATCH.txt");
check("package-top", pkg.velmereCurrentReleaseAuthorityPass === REV && pkg.velmereWorldClassCompletionProgramPass === REV && pkg.velmereWorldClassCompletionProgramPath === PROGRAM && pkg.velmereCurrentRootDescendantManifestPath === MANIFEST);
check("package-metadata", pkg.velmerePassMetadata?.currentRevisionId === REV && pkg.velmerePassMetadata?.parentRevisionId === PARENT);
check("package-nested", pkg.velmere?.currentRevisionId === REV && pkg.velmere?.currentRevisionParentId === PARENT && pkg.velmere?.worldClassCompletionProgramPath === PROGRAM && pkg.velmere?.currentRootDescendantManifestPath === MANIFEST);
check("authority-identity", authority.authorityRevisionId === REV && authority.parentRevisionId === PARENT && authority.sourceRevisionId === REV && authority.sourceParentRevisionId === PARENT);
check("authority-current", authority.currentSource?.revisionId === REV && authority.currentSource?.parentRevisionId === PARENT && authority.currentSource?.checkpointClass === "ACTION_REQUIRED_NON_PASS" && authority.currentSource?.completedThrough === 89);
check("authority-program", authority.worldClassCompletionProgramRevisionId === REV && authority.worldClassCompletionProgramPath === PROGRAM && authority.planes?.roadmapProgram?.revisionId === REV && authority.planes?.roadmapProgram?.path === PROGRAM);
check("authority-descendant", authority.currentRootDescendantManifestRevisionId === REV && authority.currentRootDescendantManifestPath === MANIFEST);
check("authority-sparse", authority.historicalDescendantSparseEdgeLedgerPath === SPARSE);
check("authority-compatibility", authority.compatibilityPointers?.length === 3 && authority.compatibilityPointers.every((pointer) => pointer.declaredRevisionId === REV && pointer.mayDefineCurrentSource === false && pointer.reason.includes("A102R41")));
check("authority-truth", authority.claims?.currentRevisionId === REV && authority.claims?.parentRevisionId === PARENT && authority.claims?.decision === "NO_GO" && authority.claims?.a102r41CurrentSourceAuthorityChecks === 46 && authority.claims?.a102r41FindingCount === 39 && authority.claims?.a102r41A60EvidencePackagePathsRequired === evidencePlan.requiredPaths.length && authority.claims?.a102r41A60EvidencePackagePathsVerified === 0 && authority.claims?.a102r41A60EvidencePackageDeterministicBuildsRequired === 2 && authority.claims?.a102r41A60EvidencePackageDeterministicBuildsExecuted === 0 && authority.claims?.a102r41ExactFinalByteBuildBrowserCredit === false && authority.claims?.a102r41ExternalCommandExecutionCredit === false);
check("current-identity", current.sourceRevisionId === REV && current.sourceParentRevisionId === PARENT && current.parentSourceRevisionId === PARENT && current.currentReleaseAuthorityRevisionId === REV && current.exactBuildBrowserRequiredRows === 56 && current.exactBuildBrowserRequiredScreenshots === 29 && current.exactBuildBrowserRequiredPopupTabs === 4);
check("current-program", current.worldClassCompletionProgramRevisionId === REV && current.worldClassCompletionProgramPath === PROGRAM && current.authoritativeWorldClassCompletionProgramPath === PROGRAM && current.authoritativeCurrentWorldClassProgramPath === PROGRAM);
check("current-descendant", current.currentRootDescendantManifestRevisionId === REV && current.currentRootDescendantManifestPath === MANIFEST && current.authoritativeCurrentRootDescendantManifestPath === MANIFEST);
check("current-sparse", current.historicalDescendantSparseEdgeLedgerPath === SPARSE);
check("compat-product-plane-frozen", compat.sourceRevisionId === "VELMERE_PASS35_A32_REPORT_DELIVERY_EVIDENCE_NON_VISUAL" && compat.notAuthoritativeCurrentSourcePointer === true);
check("compat-authority", compat.authoritativeCurrentSourceRevisionId === REV && compat.authoritativeCurrentSourceParentRevisionId === PARENT && compat.currentReleaseAuthorityRevisionId === REV);
check("compat-program", compat.worldClassCompletionProgramRevisionId === REV && compat.worldClassCompletionProgramPath === PROGRAM && compat.authoritativeWorldClassCompletionProgramPath === PROGRAM && compat.authoritativeCurrentWorldClassProgramPath === PROGRAM);
check("compat-descendant", compat.currentRootDescendantManifestRevisionId === REV && compat.currentRootDescendantManifestPath === MANIFEST && compat.authoritativeCurrentRootDescendantManifestPath === MANIFEST);
check("a58-current", a58.currentSourceRevisionId === REV && a58.currentCheckpointRevisionId === REV && a58.currentCheckpointParentRevisionId === PARENT);
check("a58-paths", a58.currentDescendantManifestPath === MANIFEST && a58.currentWorldClassCompletionProgramRevisionId === REV && a58.currentWorldClassCompletionProgramPath === PROGRAM && a58.crossPlatformSourceModePolicyPath === MODE);
check("a58-verifier", a58.currentAuthorityVerifierPath === "scripts/pass36/verify-a102r41-action-required-authority.mjs" && a58.currentAuthorityVerifierExpectedStatus === STATUS);
check("a58-archive", a58.archiveManifestPath === "_velmere/PASS36_A102R41_SOURCE_ONLY_MANIFEST.json" && a58.archiveManifestSchemaVersion === "velmere.pass36.a102r41.source-only-package-manifest.v1" && a58.archiveManifestContract?.revisionId === REV);
check("mode", mode.revisionId === REV && mode.parentRevisionId === PARENT && mode.executablePaths.length === a58.crossPlatformExecutablePathCount && new Set(mode.executablePaths).size === mode.executablePaths.length);
check("mode-exact-denominator-anchor", mode.executablePaths.length === 58 && a58.crossPlatformExecutablePathCount === 58);
const modeMigrationCore = { ...modeMigration }; delete modeMigrationCore.migrationDigestSha256;
const mechanismMigrationCore = { ...mechanismMigration }; delete mechanismMigrationCore.migrationDigestSha256;
check("mode-migration-identity", modeMigration.schemaVersion === "velmere.pass36.a102r41.source-mode-denominator-migration.v1" && modeMigration.revisionId === REV && modeMigration.parentRevisionId === PARENT && modeMigration.migrationPath === MODE_MIGRATION && mechanismMigration.schemaVersion === "velmere.pass36.a102r41.a80r1-mechanism-denominator-migration.v1" && mechanismMigration.revisionId === REV && mechanismMigration.parentRevisionId === PARENT && mechanismMigration.migrationPath === A80R1_MECHANISM_MIGRATION);
check("mode-migration-digest", modeMigration.migrationDigestSha256 === sha256(canonicalJson(modeMigrationCore)) && mechanismMigration.migrationDigestSha256 === sha256(canonicalJson(mechanismMigrationCore)));
check("mode-migration-denominators", frozenMode.executablePaths.length === 35 && modeMigration.oldDenominator === 35 && modeMigration.newDenominator === 58 && modeMigration.retainedPaths.length === 35 && modeMigration.addedPaths.length === 23 && modeMigration.removedPaths.length === 0 && mechanismMigration.oldDenominator === 35 && mechanismMigration.newDenominator === 36 && mechanismMigration.retainedAssertionCount === 35 && mechanismMigration.addedAssertionIds.length === 1 && mechanismMigration.removedAssertionIds.length === 0);
check("mode-migration-path-conservation", canonicalJson(modeMigration.retainedPaths) === canonicalJson(frozenMode.executablePaths) && canonicalJson([...modeMigration.retainedPaths, ...modeMigration.addedPaths].sort()) === canonicalJson(mode.executablePaths) && canonicalJson(modeMigration.addedPaths) === canonicalJson(observedNewShebangPaths) && modeMigration.addedPaths.every((entry) => fs.readFileSync(entry).subarray(0, 2).toString("utf8") === "#!"));
check("mode-migration-truth", modeMigration.scoreImprovementClaimed === false && modeMigration.globalDecision === "NO_GO" && modeMigration.live === false && modeMigration.saleEnabled === false && modeMigration.productionApproved === false && modeMigration.worldClassProven === false && mechanismMigration.denominatorCollapseNegativeTest === true && mechanismMigration.scoreImprovementClaimed === false && mechanismMigration.globalDecision === "NO_GO" && mechanismMigration.live === false && mechanismMigration.saleEnabled === false && mechanismMigration.productionApproved === false && mechanismMigration.worldClassProven === false);
const findingIds = state.findings?.map((row) => row.id) ?? [];
const requiredLatestFindingGates = {
  "A102R41-P1-32": "A79R1_A80R1",
  "A102R41-P1-33": "A79R1_A80R1",
  "A102R41-P0-34": "A79R1_A80R1",
  "A102R41-P0-35": "A79R1_A80R1",
  "A102R41-P0-36": "A79R1_A80R1",
  "A102R41-P2-37": "A79R1_A80R1",
  "A102R41-P1-38": "A77R1_A80R1",
  "A102R41-P1-39": "A77R1_A80R1",
};
const requiredLatestFindings = Object.keys(requiredLatestFindingGates);
check("state", state.revisionId === REV && state.parentRevisionId === PARENT && state.globalDecision === "NO_GO" && state.live === false && state.saleEnabled === false && state.productionApproved === false && state.worldClassProven === false
  && state.findingCount === state.findings?.length && state.findingCount === 39 && findingIds.length === 39 && new Set(findingIds).size === 39
  && requiredLatestFindings.every((id) => findingIds.filter((entry) => entry === id).length === 1 && state.openEntryMigration?.findingToExistingGate?.[id] === requiredLatestFindingGates[id])
  && state.findings.find((row) => row.id === "A102R41-P1-33")?.severity === "P1_FIXTURE_GENERATION_FILESYSTEM_CONTAINMENT_AND_NO_CLOBBER"
  && ["A102R41-P0-34", "A102R41-P0-35", "A102R41-P0-36"].every((id) => state.findings.find((row) => row.id === id)?.severity.startsWith("P0_"))
  && state.findings.find((row) => row.id === "A102R41-P2-37")?.severity === "P2_FULL_FROZEN_REGRESSION_LINT_GATE_CLOSURE"
  && state.findings.find((row) => row.id === "A102R41-P1-38")?.severity === "P1_CLEAN_UNPACK_HIDDEN_TEST_ARTIFACT_MUTATION"
  && state.findings.find((row) => row.id === "A102R41-P1-39")?.severity === "P1_SANITIZED_CHILD_DENOMINATOR_TRUTH_RECONCILIATION");
const local = state.localImplementation;
const physicalTargetedResultsPass = fixtureCurrent.exitCode === 0 && fixtureCurrent.stderrBytes === 0 && fixtureCurrent.value?.checks === 28 && fixtureCurrent.value?.passed === 28 && fixtureCurrent.value?.failed === 0
  && a45StaticCurrent.exitCode === 0 && a45StaticCurrent.stderrBytes === 0 && a45StaticCurrent.value?.checks === 64 && a45StaticCurrent.value?.passed === 64 && a45StaticCurrent.value?.failed === 0
  && !a45StaticSource.includes("writeFileSync") && !a45StaticSource.includes("mkdirSync") && !a45StaticSource.includes("PASS35_A45_CONTRACT_TEST.json")
  && browserMigrationCurrent.checks === 38 && browserMigrationCurrent.passed === 38 && browserMigrationCurrent.failed === 0
  && a79Current.exitCode === 0 && a79Current.stderrBytes === 0 && a79Current.value?.checks === 18 && a79Current.value?.passed === 18 && a79Current.value?.failed === 0;
check("state-security", local.currentSourceAuthorityChecks === 46 && local.sanitizedChildProcessChecks === 11 && local.sanitizedChildProcessChecksPriorRejectedClaim === 12 && local.externalCommandExecutionCredit === false && local.durableAccountOperationWorkflowsImplemented === 0 && local.durableOpaqueCheckoutFlowImplemented === false
  && local.a60BrowserFixtureEvidenceMigrationChecks === 38 && local.a60BrowserFixtureEvidenceMigrationStrengthenedExistingRows === 4 && local.a45BrowserFixtureChecks === 28 && local.a45BrowserFixtureReparseOperationsCovered === 2 && local.a45StaticBrowserContractChecks === 64
  && local.a60BrowserEvidenceVerifierChecksBefore === 520 && local.a60BrowserEvidenceVerifierChecksAfter === 584 && local.a60HarnessChecks === 36 && local.a79HarnessChecks === 54 && local.a79VerifierChecks === 18 && local.a79SourceTrackedReceiptWrites === 0 && local.a79LiveStaticCanonicalEqualityRequired === true
  && local.failedFrozenRegressionAttemptsRetained === 1 && local.failedFrozenRegressionRequiredStages === 28 && local.failedFrozenRegressionExecutedStages === 27 && local.failedFrozenRegressionPassedStages === 26 && local.failedFrozenRegressionStage === "eslint"
  && local.failedFrozenRegressionEslintPartitions === 98 && local.failedFrozenRegressionEslintPassedPartitions === 93 && local.failedFrozenRegressionLintErrors === 13 && local.failedFrozenRegressionLintWarnings === 0 && local.failedFrozenRegressionProcessFailures === 0 && local.failedFrozenRegressionSourceImmutable === true && local.targetedLintRemediationFiles === 6 && local.targetedLintRemediationExitCode === 0
  && local.failedCleanUnpackAttemptsRetained === 1 && local.failedCleanUnpackRequiredSteps === 17 && local.failedCleanUnpackPassedSteps === 17 && local.failedCleanUnpackNestedRegressionPassedStages === 28 && local.failedCleanUnpackSourceFilesBefore === 5544 && local.failedCleanUnpackSourceFilesAfter === 5545 && local.failedCleanUnpackUnexpectedArtifactBytes === 222 && local.failedCleanUnpackSourceImmutable === false && local.failedCleanUnpackCleanExtractImmutable === false && local.a45StaticSourceTrackedReceiptWrites === 0 && local.a45StaticStdoutOnly === true
  && local.browserSemanticAndPngSubcases === 16 && local.browserPngIntegritySubcases === 3 && local.browserHttpPrivacyAndBudgetSubcases === 8 && local.a60StageSequenceAndLogBindingSubcases === 16 && local.a60EvidencePathSetSubcases === 8
  && local.browserEvidenceCollectorRetainedLimit === 60 && local.browserHttpUrlCharacterLimit === 16384 && local.browserHttpTextInputCharacterLimit === 32768 && local.browserHttpTextRetainedByteLimit === 8192 && local.browserHttpQueryKeyLimit === 32
  && local.a60EvidencePackageCorePathsRequired === evidencePlan.corePaths.length && local.a60EvidencePackageLogPathsRequired === evidencePlan.requiredLogPaths.length && local.a60EvidencePackageScreenshotPathsRequired === evidencePlan.screenshotPaths.length && local.a60EvidencePackageTotalPathsRequired === evidencePlan.requiredPaths.length
  && local.a60EvidencePackagePathSetSha256 === sha256(evidencePlan.requiredPaths.join("\n")) && local.a60EvidencePackageDeterministicBuildsRequired === 2 && local.a60EvidencePackagePathsVerified === 0 && local.a60EvidencePackageDeterministicBuildsExecuted === 0
  && local.a60BrowserVerifierCheckIdentitySha256 === a60Policy.evidencePackage.browserVerifierCheckIdentitySha256 && local.a60RuntimeProbeObservationsRequired === 2 && local.a60RuntimeProbeObservationsVerified === 0 && local.a60PortClosureRefusalProbesRequired === 3 && local.a60PortClosureRefusalProbesVerified === 0
  && local.a60CanonicalReceiptCreateNewOnly === true && local.a60ForcedTestReceiptIsolated === true && local.a60StrictArtifactJsonParsing === true && local.windowsHandleRelativeOpenCredit === false && physicalTargetedResultsPass,
{ fixtureCurrent, a45StaticCurrent, browserMigrationCurrent: { checks: browserMigrationCurrent.checks, passed: browserMigrationCurrent.passed, failed: browserMigrationCurrent.failed }, a79Current });
const p = program.a102r41;
check("program", program.revisionId === REV && program.parentRevisionId === PARENT && program.globalDecision === "NO_GO" && program.formalOpenEntries === 31 && p.currentSourceAuthorityChecksRequired === 46 && p.findingCount === 39 && p.passCredit === false
  && requiredLatestFindings.every((id) => program.openEntryMigration?.findingToExistingGate?.[id] === requiredLatestFindingGates[id])
  && p.browserRowsRequired === 56 && p.browserScenarioChecksRequired === 57 && p.screenshotsRequired === 29 && p.popupTabsRequired === 4 && p.browserEvidenceVerifierChecksRequired === 584 && p.browserEvidenceVerifierCheckIdentitySha256 === a60Policy.evidencePackage.browserVerifierCheckIdentitySha256
  && p.a45BrowserFixtureChecksRequired === 28 && p.a45StaticBrowserContractChecksRequired === 64 && p.a60HarnessChecksRequired === 36 && p.a60BrowserFixtureMigrationChecksRequired === 38 && p.a79HarnessChecksRequired === 54 && p.a79VerifierChecksRequired === 18
  && p.sanitizedChildProcessChecksRequired === 11 && p.sanitizedChildProcessChecksPriorRejectedClaim === 12
  && p.failedFrozenRegressionAttemptsRetained === 1 && p.failedFrozenRegressionRequiredStages === 28 && p.failedFrozenRegressionExecutedStages === 27 && p.failedFrozenRegressionPassedStages === 26 && p.failedFrozenRegressionStage === "eslint" && p.failedFrozenRegressionEslintPartitions === 98 && p.failedFrozenRegressionEslintPassedPartitions === 93 && p.failedFrozenRegressionLintErrors === 13 && p.failedFrozenRegressionLintWarnings === 0 && p.failedFrozenRegressionProcessFailures === 0 && p.failedFrozenRegressionSourceImmutable === true && p.targetedLintRemediationFiles === 6 && p.targetedLintRemediationExitCode === 0
  && p.failedCleanUnpackAttemptsRetained === 1 && p.failedCleanUnpackRequiredSteps === 17 && p.failedCleanUnpackPassedSteps === 17 && p.failedCleanUnpackNestedRegressionPassedStages === 28 && p.failedCleanUnpackSourceFilesBefore === 5544 && p.failedCleanUnpackSourceFilesAfter === 5545 && p.failedCleanUnpackUnexpectedArtifactBytes === 222 && p.failedCleanUnpackSourceImmutable === false && p.failedCleanUnpackCleanExtractImmutable === false && p.a45StaticSourceTrackedReceiptWrites === 0 && p.a45StaticStdoutOnly === true
  && p.browserSemanticAndPngSubcasesRequired === 16 && p.browserPngIntegritySubcasesRequired === 3 && p.browserPrivacyAndBudgetSubcasesRequired === 8 && p.a60StageSequenceAndLogBindingSubcasesRequired === 16 && p.a60EvidencePathSetSubcasesRequired === 8
  && p.a60EvidencePackageCorePathsRequired === evidencePlan.corePaths.length && p.a60EvidencePackageLogPathsRequired === evidencePlan.requiredLogPaths.length && p.a60EvidencePackageScreenshotPathsRequired === evidencePlan.screenshotPaths.length && p.a60EvidencePackagePathsRequired === evidencePlan.requiredPaths.length && p.a60EvidencePackagePathSetSha256 === sha256(evidencePlan.requiredPaths.join("\n"))
  && p.a60EvidencePackageDeterministicBuildsRequired === 2 && p.a60EvidencePackagePathsVerified === 0 && p.a60EvidencePackageDeterministicBuildsExecuted === 0 && p.a60RuntimeProbeObservationsRequired === 2 && p.a60RuntimeProbeObservationsVerified === 0 && p.a60PortClosureRefusalProbesRequired === 3 && p.a60PortClosureRefusalProbesVerified === 0);
check("descendant", manifest.revisionId === REV && manifest.parentRevisionId === PARENT && manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS" && manifest.completedThrough === 89);
const sparse = inspectHistoricalSparseEdgeLedger(process.cwd());
check("sparse-ledger", sparse.present && sparse.ok && sparse.edges.length === 1, sparse.errors);
const mirror = verifyCurrentAuthority(process.cwd());
check("current-authority-mirror", mirror.ok, mirror.checks.filter((row) => !row.passed));
for (const relativePath of [
  "config/pass36/a60-exact-final-byte-build-browser-acceptance.json",
  "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json",
  "config/pass36/a63-staging-program-orchestrator.json",
  "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json",
  "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json",
  "config/pass36/a80-frozen-local-release-candidate-admission.json",
]) {
  const binding = read(relativePath);
  check(`release-binding:${relativePath}`, binding.sourceManifestPath === MANIFEST && binding.currentSourceRevisionId === REV && binding.currentSourceParentRevisionId === PARENT);
}
const exact = validateCurrentSourceAuthorityExact(process.cwd());
check("current-source-exact", exact.passed && exact.mismatches.length === 0, exact.mismatches);
check("sku", state.skuDecisions.basic.decision === "PILOT_ONLY_FREE_PRESCREEN" && state.skuDecisions.basic.priceRecommendation === null && state.skuDecisions.pro.decision === "NOT_FOR_SALE" && state.skuDecisions.pro.priceRecommendation === null && state.skuDecisions.advanced.decision === "NOT_FOR_SALE" && state.skuDecisions.advanced.priceRecommendation === null && state.skuDecisions.paidPdfTiers.decision === "NOT_FOR_SALE" && state.skuDecisions.paidPdfTiers.priceRecommendation === null);
check("promotion", authority.claims.liveProven === false && authority.claims.saleEnabled === false && authority.claims.productionApproved === false && authority.claims.worldClassProven === false && current.liveProven === false && current.saleEnabled === false && current.worldClassProven === false);
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r41.action-required-authority-verification.v1", status: failed.length === 0 ? STATUS : "FAIL_A102R41_AUTHORITY", revisionId: REV, parentRevisionId: PARENT, checks: checks.length, passed: checks.length - failed.length, failed: failed.length, globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false, failures: failed }, null, 2));
if (failed.length) process.exit(1);
