import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";
import { inspectHistoricalSparseEdgeLedger, verifyCurrentAuthority } from "./historical-descendant-chain-lib.mjs";
import { canonicalJson, sha256 } from "./a102r42-source-boundary.mjs";
import { collectA102R42Inventory } from "./package-a102r42-deterministic.mjs";
import { buildA60ChildEnvironment, expectedA60EvidencePaths } from "./a79-exact-build-browser-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { verifyA60FailureFinalizationDenominatorMigration } from "./verify-a102r42-a60-failure-finalization-denominator-migration.mjs";

const REV = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const STATUS = "PASS_A102R42_ACTION_REQUIRED_AUTHORITY_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const MANIFEST = "config/pass36/a102r42-current-root-descendant-manifest.json";
const PROGRAM = "config/pass36/a102r42-world-class-completion-program.json";
const MODE = "config/pass36/a102r42-cross-platform-source-mode-policy.json";
const MODE_MIGRATION = "config/pass36/a102r42-source-mode-denominator-migration.json";
const SPARSE = "config/pass36/a102r41-historical-descendant-sparse-edge-ledger.json";
const ROADMAP = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const read = (relativePath) => parseStrictJsonCli(fs.readFileSync(relativePath, "utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
function runJson(relativeScript) {
  const run = spawnSync(process.execPath, [relativeScript], { cwd: process.cwd(), encoding: "utf8", maxBuffer: 32 * 1024 * 1024, env: buildA60ChildEnvironment(process.env), shell: false, windowsHide: true });
  let value;
  try { value = parseStrictJsonCli(run.stdout, { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true }); } catch { value = null; }
  return { exitCode: run.status, stderrBytes: Buffer.byteLength(run.stderr ?? ""), value };
}
const active = fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim();
const pkg = read("package.json");
const authority = read("config/pass36/current-release-authority.json");
const current = read("config/pass35/current-revision.json");
const compat = read("config/current-release.json");
const a58 = read("config/pass36/a58-release-integrity-policy.json");
const state = read("config/pass36/a102r42-action-required-current-state.json");
const program = read(PROGRAM);
const manifest = read(MANIFEST);
const mode = read(MODE);
const modeMigration = read(MODE_MIGRATION);
const approved = read("config/pass36/a102r42-approved-current-source-changes.json");
const a60Policy = read("config/pass36/a60-exact-final-byte-build-browser-acceptance.json");
const browserContract = read("config/pass35/a45-exact-runtime-browser-acceptance.json");
const evidencePlan = expectedA60EvidencePaths(a60Policy, browserContract);
const checks = [];
const check = (id, value, detail = null) => { const row = { id, passed: Boolean(value), detail }; checks.push(row); assert.ok(row.passed, id); };

check("active", active === REV, active);
check("package-primary", pkg.velmerePass === REV && pkg.velmerePatch === "VELMERE_A102R42_PATCH.txt" && pkg.velmereCurrentReleaseAuthorityPass === REV && pkg.velmereWorldClassCompletionProgramPass === REV);
check("package-nested", pkg.velmerePassMetadata?.currentRevisionId === REV && pkg.velmerePassMetadata?.parentRevisionId === PARENT && pkg.velmere?.currentRevisionId === REV && pkg.velmere?.currentRevisionParentId === PARENT && pkg.velmere?.worldClassCompletionProgramPath === PROGRAM && pkg.velmere?.currentRootDescendantManifestPath === MANIFEST);
check("authority-identity", authority.authorityRevisionId === REV && authority.parentRevisionId === PARENT && authority.sourceRevisionId === REV && authority.sourceParentRevisionId === PARENT);
check("authority-current", authority.currentSource?.revisionId === REV && authority.currentSource?.parentRevisionId === PARENT && authority.currentSource?.checkpointClass === "ACTION_REQUIRED_NON_PASS" && authority.currentSource?.completedThrough === 89);
check("authority-program", authority.worldClassCompletionProgramRevisionId === REV && authority.worldClassCompletionProgramPath === PROGRAM && authority.planes?.roadmapProgram?.revisionId === REV && authority.planes?.roadmapProgram?.path === PROGRAM);
check("authority-descendant", authority.currentRootDescendantManifestRevisionId === REV && authority.currentRootDescendantManifestPath === MANIFEST && authority.historicalDescendantSparseEdgeLedgerPath === SPARSE);
const expectedPointers = [["config/current-release.json", "LEGACY_PRODUCT_CONTRACT_COMPATIBILITY_POINTER"], ["config/pass35/current-revision.json", "PASS35_COMPATIBILITY_MIRROR_OF_CURRENT_SOURCE_AND_PLANES"], [ROADMAP, "HUMAN_READABLE_CUMULATIVE_ROADMAP"]];
check("authority-compatibility", authority.compatibilityPointers?.length === 3 && authority.compatibilityPointers.every((pointer, index) => pointer.path === expectedPointers[index][0] && pointer.classification === expectedPointers[index][1] && pointer.declaredRevisionId === REV && pointer.mayDefineCurrentSource === false && pointer.reason.includes("A102R42")));
check("authority-claims", authority.claims?.currentRevisionId === REV && authority.claims?.parentRevisionId === PARENT && authority.claims?.decision === "NO_GO" && authority.claims?.a102r42ActionAuthorityChecks === 47 && authority.claims?.a102r42CurrentSourcePreflightScenarios === 60 && authority.claims?.a102r42FindingCount === 54 && authority.claims?.a102r42A60SemanticCases === 34 && authority.claims?.a102r42FrozenRegressionStages === 29 && authority.claims?.a102r42DescendantVerifierChecks === 28 && authority.claims?.a102r42A80R1MechanismChecks === 48 && authority.claims?.a102r42PackageBoundaryChecks === 38 && authority.claims?.a102r42A42VerifierChecks === 54 && authority.claims?.a102r42ExactFinalByteBuildBrowserCredit === false);
check("current-identity", current.sourceRevisionId === REV && current.sourceParentRevisionId === PARENT && current.parentSourceRevisionId === PARENT && current.currentReleaseAuthorityRevisionId === REV);
check("current-program", current.worldClassCompletionProgramRevisionId === REV && current.worldClassCompletionProgramPath === PROGRAM && current.authoritativeWorldClassCompletionProgramPath === PROGRAM && current.authoritativeCurrentWorldClassProgramPath === PROGRAM);
check("current-descendant", current.currentRootDescendantManifestRevisionId === REV && current.currentRootDescendantManifestPath === MANIFEST && current.authoritativeCurrentRootDescendantManifestPath === MANIFEST && current.historicalDescendantSparseEdgeLedgerPath === SPARSE);
check("compat-nonpromotional", compat.pointerClassification === "LEGACY_PRODUCT_CONTRACT_COMPATIBILITY_POINTER" && compat.notAuthoritativeCurrentSourcePointer === true && compat.productionPromotionAllowed === false && compat.readinessScoreIssued === false && compat.legacyCandidateAuthoritativeForCurrentStaging === false && compat.authoritativeCurrentDecision === "NO_GO" && compat.authoritativeCurrentSaleEnabled === false && compat.currentReleaseAuthorityStatus === "ACTION_REQUIRED_NON_PASS");
check("compat-authority", compat.authoritativeCurrentSourceRevisionId === REV && compat.authoritativeCurrentSourceParentRevisionId === PARENT && compat.currentReleaseAuthorityRevisionId === REV && compat.worldClassCompletionProgramRevisionId === REV && compat.currentRootDescendantManifestRevisionId === REV);
check("a58-current", a58.currentSourceRevisionId === REV && a58.currentCheckpointRevisionId === REV && a58.currentCheckpointParentRevisionId === PARENT && a58.currentDescendantManifestPath === MANIFEST && a58.currentWorldClassCompletionProgramPath === PROGRAM && a58.crossPlatformSourceModePolicyPath === MODE);
check("a58-verifier", a58.currentAuthorityVerifierPath === "scripts/pass36/verify-a102r42-action-required-authority.mjs" && a58.currentAuthorityVerifierExpectedStatus === STATUS);
check("a58-archive", a58.archiveManifestPath === "_velmere/PASS36_A102R42_SOURCE_ONLY_MANIFEST.json" && a58.archiveManifestSchemaVersion === "velmere.pass36.a102r42.source-only-package-manifest.v1" && a58.archiveManifestContract?.revisionId === REV && a58.archiveManifestContract?.path === a58.archiveManifestPath && a58.archiveManifestContract?.schemaVersion === a58.archiveManifestSchemaVersion);
check("mode", mode.schemaVersion === "velmere.pass36.cross-platform-source-mode-policy.v1" && mode.revisionId === REV && mode.parentRevisionId === PARENT && mode.executablePaths.length === 58 && new Set(mode.executablePaths).size === 58 && a58.crossPlatformExecutablePathCount === 58);
const modeCore = { ...modeMigration }; delete modeCore.migrationDigestSha256;
check("mode-migration", modeMigration.schemaVersion === "velmere.pass36.a102r42.source-mode-denominator-migration.v1" && modeMigration.revisionId === REV && modeMigration.parentRevisionId === PARENT && modeMigration.oldDenominator === 58 && modeMigration.newDenominator === 58 && modeMigration.retainedPaths.length === 58 && modeMigration.addedPaths.length === 0 && modeMigration.removedPaths.length === 0 && modeMigration.migrationDigestSha256 === sha256(canonicalJson(modeCore)));
const parentState = read("config/pass36/a102r41-action-required-current-state.json");
check("state", state.schemaVersion === "velmere.pass36.a102r42.action-required-current-state.v1" && state.revisionId === REV && state.parentRevisionId === PARENT && state.findingCount === 54 && state.findings?.length === 54 && canonicalJson(state.findings.slice(0, 39)) === canonicalJson(parentState.findings) && state.globalDecision === "NO_GO" && state.live === false && state.saleEnabled === false && state.productionApproved === false && state.worldClassProven === false);
const findingIds = state.findings.map((row) => row.id);
check("state-findings", new Set(findingIds).size === 54 && ["A102R42-P0-40", "A102R42-P1-41", "A102R42-P1-42", "A102R42-P0-43", "A102R42-P1-44", "A102R42-P1-45", "A102R42-P2-46", "A102R42-P1-47", "A102R42-P1-48", "A102R42-P1-49", "A102R42-P1-50", "A102R42-P0-51", "A102R42-P1-52", "A102R42-P1-53", "A102R42-P1-54"].every((id) => findingIds.includes(id) && state.openEntryMigration?.findingToExistingGate?.[id]));
check("program", program.schemaVersion === "velmere.pass36.a102r42.world-class-completion-program.v1" && program.revisionId === REV && program.parentRevisionId === PARENT && program.formalOpenEntries === 31 && program.globalDecision === "NO_GO" && program.live === false && program.saleEnabled === false && program.productionApproved === false && program.worldClassProven === false);
const p = program.a102r42;
check("program-denominators", p.findingCount === 54 && p.actionAuthorityChecksRequired === 47 && p.currentSourcePreflightScenariosRequired === 60 && p.descendantVerifierChecksRequired === 28 && p.sourceModeExecutablePathsRequired === 58 && p.a80r1MechanismChecksRequired === 48 && p.packageBoundaryChecksRequired === 38 && p.a42VerifierChecksRequired === 54 && p.a60StageSequenceAndLogBindingSubcasesRequired === 34 && p.frozenLocalRegressionStagesRequired === 29 && p.browserRowsRequired === 56 && p.browserScenarioChecksRequired === 57 && p.screenshotsRequired === 29 && p.popupTabsRequired === 4 && p.browserEvidenceVerifierChecksRequired === 584 && p.a60EvidencePackagePathsRequired === 59 && p.passCredit === false);
check("descendant", manifest.schemaVersion === "velmere.pass36.a102r42.current-root-descendant-manifest.v1" && manifest.revisionId === REV && manifest.parentRevisionId === PARENT && manifest.parentDescendantManifestDigestSha256 === "92672a889d2a98723486e3ad3071e93d84bc3fb45b55ceb8111eaea388fbf8a6" && manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS" && manifest.completedThrough === 89);
check("descendant-bindings", Object.keys(manifest.staticBindings ?? {}).length === 14 && Object.values(manifest.staticBindings).every((digest) => /^[a-f0-9]{64}$/u.test(digest)) && manifest.claims?.a102r42NewFindings === 15 && manifest.claims?.a102r42CurrentSourcePreflightScenarios === 60 && manifest.claims?.a102r42DescendantVerifierChecks === 28);
const sparse = inspectHistoricalSparseEdgeLedger(process.cwd());
check("sparse-ledger", sparse.present && sparse.ok && sparse.edges.length === 1, sparse.errors);
const mirror = verifyCurrentAuthority(process.cwd());
check("current-authority-mirror", mirror.ok, mirror.checks.filter((row) => !row.passed));
const exact = validateCurrentSourceAuthorityExact(process.cwd());
check("current-source-exact", exact.passed && exact.mismatches.length === 0, exact.mismatches);
check("sku", state.skuDecisions.basic.decision === "PILOT_ONLY_FREE_PRESCREEN" && state.skuDecisions.basic.priceRecommendation === null && state.skuDecisions.pro.decision === "NOT_FOR_SALE" && state.skuDecisions.pro.priceRecommendation === null && state.skuDecisions.advanced.decision === "NOT_FOR_SALE" && state.skuDecisions.advanced.priceRecommendation === null && state.skuDecisions.paidPdfTiers.decision === "NOT_FOR_SALE" && state.skuDecisions.paidPdfTiers.priceRecommendation === null);
check("promotion", authority.claims.liveProven === false && authority.claims.saleEnabled === false && authority.claims.productionApproved === false && authority.claims.worldClassProven === false && current.liveProven === false && current.saleEnabled === false && current.worldClassProven === false);
const failureMigration = verifyA60FailureFinalizationDenominatorMigration(process.cwd());
check("a60-failure-finalization-migration", failureMigration.checks === 21 && failureMigration.passed === 21 && failureMigration.failed === 0 && failureMigration.oldSemanticDenominator === 16 && failureMigration.newSemanticDenominator === 34 && failureMigration.removedSemanticCases === 0);
const authorityMigration = runJson("scripts/pass36/verify-a102r42-current-source-authority-denominator-migration.mjs");
check("authority-denominator-migration", authorityMigration.exitCode === 0 && authorityMigration.stderrBytes === 0 && authorityMigration.value?.checks === 68 && authorityMigration.value?.passed === 68 && authorityMigration.value?.newDenominator === 60);
const regressionMigration = runJson("scripts/pass36/verify-a102r42-frozen-regression-denominator-migration.mjs");
const a80ReceiptMigration = runJson("scripts/pass36/verify-a102r42-a80r1-receipt-denominator-migration.mjs");
const packageBoundaryMigration = runJson("scripts/pass36/verify-a102r42-package-boundary-denominator-migration.mjs");
check("frozen-regression-migration", regressionMigration.exitCode === 0 && regressionMigration.stderrBytes === 0 && regressionMigration.value?.checks === 17 && regressionMigration.value?.passed === 17 && regressionMigration.value?.newDenominator === 29 && a80ReceiptMigration.exitCode === 0 && a80ReceiptMigration.stderrBytes === 0 && a80ReceiptMigration.value?.checks === 12 && a80ReceiptMigration.value?.passed === 12 && a80ReceiptMigration.value?.newDenominator === 48 && packageBoundaryMigration.exitCode === 0 && packageBoundaryMigration.stderrBytes === 0 && packageBoundaryMigration.value?.checks === 16 && packageBoundaryMigration.value?.passed === 16 && packageBoundaryMigration.value?.newDenominator === 38);
const a42 = runJson("scripts/pass36/verify-a102r42-a42-critical-rebaseline.mjs");
check("a42", a42.exitCode === 0 && a42.stderrBytes === 0 && a42.value?.checks === 54 && a42.value?.passed === 54 && a42.value?.criticalFilesPassed === 76);
const approvedVerification = runJson("scripts/pass36/verify-a102r42-approved-current-source-changes.mjs");
check("approved", approvedVerification.exitCode === 0 && approvedVerification.stderrBytes === 0 && approvedVerification.value?.passed === approvedVerification.value?.checks && approvedVerification.value?.checks === 11 + 4 * approved.fileCount);
const parentPackageBytes = fs.readFileSync("config/pass36/a102r42-parent-source-package-manifest.json");
const parentPackage = parseStrictJsonCli(parentPackageBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
check("parent-package", parentPackageBytes.length === 1179119 && sha(parentPackageBytes) === "8925e849d7c625e82fe9d4e85040da5a818f995c99d80e50e6c627a963f334b3" && parentPackage.manifestSha256 === "9e3baa4830255919873e56d9c19be76d8f87c84d605629d63f8ee215bdf9930b" && parentPackage.revisionId === PARENT);
const parentDescendantBytes = fs.readFileSync("config/pass36/a102r41-current-root-descendant-manifest.json");
const parentDescendant = parseStrictJsonCli(parentDescendantBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
check("parent-descendant", sha(parentDescendantBytes) === "dfa91c49372c5a858071dbcf9c0ff0f0a1ef63722bd7fcb8e197deaf2e3e3859" && parentDescendant.manifestDigestSha256 === "92672a889d2a98723486e3ad3071e93d84bc3fb45b55ceb8111eaea388fbf8a6");
const roadmapBytes = fs.readFileSync(ROADMAP);
const marker = Buffer.from("================================================================================\nPRESERVED PRIOR CANONICAL ROADMAP CONTENT FOLLOWS\n================================================================================\n\n", "utf8");
const legacyR42Marker = Buffer.from("\n===== EXACT R41 ROADMAP SUFFIX — 1867987 BYTES — SHA256 70365bcd82276db15d5893344edb7264b8735228339df6864d31c1e3f36095b1 =====\n", "utf8");
const markerIndex = roadmapBytes.indexOf(marker); const roadmapSuffix = markerIndex >= 0 ? roadmapBytes.subarray(markerIndex + marker.length) : Buffer.alloc(0);
check("parent-roadmap-suffix", markerIndex > 0 && roadmapBytes.indexOf(legacyR42Marker) === -1 && roadmapSuffix.length === 1867987 && sha(roadmapSuffix) === "70365bcd82276db15d5893344edb7264b8735228339df6864d31c1e3f36095b1");
const patchText = fs.readFileSync("VELMERE_A102R42_PATCH.txt", "utf8");
check("patch", patchText.includes(REV) && patchText.includes(PARENT) && patchText.includes("GLOBAL DECISION: NO_GO") && patchText.includes("saleEnabled=false"));
const parentPathSet = new Set(parentPackage.entries.map((row) => row.path));
const newShebangPaths = collectA102R42Inventory(process.cwd(), "source", { allowReservedManifestInput: true }).rows.filter((row) => !parentPathSet.has(row.path)).filter((row) => fs.readFileSync(row.path).subarray(0, 2).toString("utf8") === "#!").map((row) => row.path);
check("no-new-shebang", newShebangPaths.length === 0 && modeMigration.addedPaths.length === 0, newShebangPaths);
check("a60-policy", a60Policy.currentSourceRevisionId === REV && a60Policy.currentSourceParentRevisionId === PARENT && a60Policy.sourceManifestPath === MANIFEST && a60Policy.requiredStages.length === 14 && a60Policy.browser.requiredChecks === 56 && a60Policy.browser.requiredScreenshots === 29 && a60Policy.browser.requiredPopupTabs.length === 4);
const runnerSource = fs.readFileSync("scripts/a60-exact-final-byte-build-browser-acceptance.mjs", "utf8");
check("a60-runner-v3", runnerSource.includes("velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v3") && runnerSource.includes('id: "stage-validation-internal-error"') && runnerSource.includes('detail: "bounded_internal_error"'));
const packagerSource = fs.readFileSync("scripts/a60-package-evidence.mjs", "utf8");
check("a60-packager-v3", packagerSource.includes("velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v3"));
const releaseBindings = ["config/pass36/a60-exact-final-byte-build-browser-acceptance.json", "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json", "config/pass36/a63-staging-program-orchestrator.json", "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json", "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json", "config/pass36/a80-frozen-local-release-candidate-admission.json"];
check("release-bindings", releaseBindings.every((relativePath) => { const binding = read(relativePath); return binding.sourceManifestPath === MANIFEST && binding.currentSourceRevisionId === REV && binding.currentSourceParentRevisionId === PARENT; }));
check("evidence-path-denominator", evidencePlan.requiredPaths.length === 59 && evidencePlan.corePaths.length === 4 && evidencePlan.requiredLogPaths.length === 26 && evidencePlan.screenshotPaths.length === 29 && sha256(evidencePlan.requiredPaths.join("\n")) === "748873f54fb9fe4c10946f1f55e13fc9f8ccabec30ba28758735d102be60eba9");
check("browser-denominators", current.exactBuildBrowserRequiredRows === 56 && current.exactBuildBrowserRequiredScreenshots === 29 && current.exactBuildBrowserRequiredPopupTabs === 4 && pkg.a102r40A79BrowserRowsRequired === 56 && pkg.a102r40A79ScreenshotsRequired === 29 && authority.claims.a102r40A79BrowserRowsRequired === 56 && authority.claims.a102r40A79ScreenshotsRequired === 29);
const realRows = Object.entries(state.realDenominators).filter(([, value]) => value && typeof value === "object" && Object.hasOwn(value, "verified"));
check("external-denominators-zero", realRows.length >= 28 && realRows.every(([, value]) => value.verified === 0 && Number.isInteger(value.required) && value.required > 0));

assert.equal(checks.length, 47, "a102r42_action_authority_verifier_denominator");
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r42.action-required-authority-verification.v1",
  status: failed.length === 0 ? STATUS : "FAIL_A102R42_AUTHORITY",
  revisionId: REV, parentRevisionId: PARENT,
  checks: checks.length, passed: checks.length - failed.length, failed: failed.length,
  currentSourcePreflightScenariosRequired: 60,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
  failures: failed,
}, null, 2));
if (failed.length > 0) process.exit(1);
