#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { verifyA60StageAuthorityMigration } from "./verify-a102r41-a60-stage-authority-migration.mjs";
import { verifyR44P46A60TypeScriptDenominatorMigration } from "./verify-a102r44p46-a60-typescript-denominator-migration.mjs";
import { verifyA60RuntimeSmokeDenominatorMigration } from "./verify-a102r41-a60-runtime-smoke-denominator-migration.mjs";
import { verifyA60BrowserFixtureEvidenceDenominatorMigration } from "./verify-a102r41-a60-browser-fixture-evidence-denominator-migration.mjs";
import { A60_REQUIRED_STAGE_IDS, a60ChildProcessHasExited, buildA60ChildEnvironment, evaluateA60LogSafety, evaluateA60ServerTermination, evaluateA60Stderr, expectedA60StageCommand, sha256, validateA60StageSequence } from "./a79-exact-build-browser-lib.mjs";
import { verifyA60FailureFinalizationDenominatorMigration } from "./verify-a102r42-a60-failure-finalization-denominator-migration.mjs";
import { runR44P46A58ResultValidatorCases } from "./test-a102r44p46-a58-result-validator.mjs";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a60-exact-final-byte-build-browser-acceptance.json"), "utf8"));
const checks = [];
const failures = [];
const check = (id, ok, detail = null) => { const row = { id, ok: Boolean(ok), detail }; checks.push(row); if (!row.ok) failures.push(row); };
check("policy-schema", policy.schemaVersion === "velmere.pass36.a60.exact-final-byte-build-browser-acceptance.v1");
check("policy-parent", policy.parentRevisionId === "VELMERE_PASS36_A59R0_BUILD_GRAPH_ROUTE_CSS_BUDGET_RECOVERY");
check("runtime-exact", policy.expectedRuntime.node === "24.18.0" && policy.expectedRuntime.npm === "11.16.0", policy.expectedRuntime);
check("dual-build-required", policy.promotionConditions.dualBuildRequired === true && policy.runtimeBuildOutput?.mode === "turbopack" && policy.runtimeBuildOutput?.distDir === ".next-pass25-turbopack" && policy.runtimeBuildOutput?.buildIdPath === ".next-pass25-turbopack/BUILD_ID" && policy.runtimeBuildOutput?.genericNextAliasForbidden === true);
check("browser-required", policy.promotionConditions.browserRequired === true && policy.runtimeSmoke?.runnerPath === "scripts/deployment/run-production-smoke.mjs" && policy.runtimeSmoke?.mode === "turbopack" && policy.runtimeSmoke?.requiredUniqueAssertions === 55 && policy.runtimeSmoke?.requiredUniqueResults === 16 && policy.runtimeSmoke?.simulatedTlsReverseProxy === true && policy.runtimeSmoke?.realTlsCredit === false && policy.browser?.processIsolation?.mode === "SIX_ROUTE_BROWSER_PROCESS_BATCH" && policy.browser?.processIsolation?.batchSize === 6 && policy.browser?.processIsolation?.expectedBrowserLaunches === 11 && policy.browser?.processIsolation?.denominatorStable === true && policy.browser?.qaFixture?.generate === true && policy.browser.qaFixture.providerCredit === false && policy.browser.qaFixture.durableStorageCredit === false && policy.browser.qaFixture.realDataCredit === false && policy.browser.qaFixture.liveCredit === false && policy.browser.qaFixture.saleCredit === false && policy.evidencePackage?.coreArtifactsRequired === 4 && policy.evidencePackage?.childStageLogsRequired === 24 && policy.evidencePackage?.productionServerLogsRequired === 2 && policy.evidencePackage?.totalLogsRequired === 26 && policy.evidencePackage?.screenshotsRequired === 29 && policy.evidencePackage?.requiredPaths === 59 && policy.evidencePackage?.requiredPathSetSha256 === "748873f54fb9fe4c10946f1f55e13fc9f8ccabec30ba28758735d102be60eba9" && policy.evidencePackage?.browserScenarioChecksRequired === 57 && policy.evidencePackage?.browserVerifierChecksRequired === 584 && policy.evidencePackage?.browserVerifierCheckIdentitySha256 === "35cccfef96eece4751495d9f87f9f6cc8a63d3a4df380005ad7769ffa2ddc882");
check("external-anchor-required", policy.promotionConditions.externalSourceManifestAnchorRequired === true);
check("truth-boundary", policy.promotionConditions.saleEnabled === false && policy.promotionConditions.liveProven === false);
const cleanupCases = [
  { id: "running", passed: a60ChildProcessHasExited({ exitCode: null, signalCode: null }) === false },
  { id: "normal-exit", passed: a60ChildProcessHasExited({ exitCode: 0, signalCode: null }) === true },
  { id: "sigterm-exit", passed: a60ChildProcessHasExited({ exitCode: null, signalCode: "SIGTERM" }) === true },
  { id: "accepted-posix-sigterm", passed: evaluateA60ServerTermination({ wasRunning: true, serverExitCode: null, serverSignalCode: "SIGTERM", portClosed: true, platform: "linux" }).passed === true },
  { id: "reject-still-running", passed: evaluateA60ServerTermination({ wasRunning: true, serverExitCode: null, serverSignalCode: null, portClosed: true, platform: "linux" }).passed === false },
  { id: "reject-sigkill", passed: evaluateA60ServerTermination({ wasRunning: true, serverExitCode: null, serverSignalCode: "SIGKILL", portClosed: true, platform: "linux" }).passed === false },
  { id: "reject-open-port", passed: evaluateA60ServerTermination({ wasRunning: true, serverExitCode: null, serverSignalCode: "SIGTERM", portClosed: false, platform: "linux" }).passed === false },
  { id: "reject-missing-process-state", passed: evaluateA60ServerTermination({ portClosed: true, platform: "linux" }).passed === false },
  { id: "accepted-windows-taskkill", passed: evaluateA60ServerTermination({ wasRunning: true, serverExitCode: 1, serverSignalCode: null, portClosed: true, platform: "win32", terminationExitCode: 0 }).passed === true },
  { id: "reject-windows-taskkill-failure", passed: evaluateA60ServerTermination({ wasRunning: true, serverExitCode: 1, serverSignalCode: null, portClosed: true, platform: "win32", terminationExitCode: 1 }).passed === false },
];
check("server-cleanup-signal-semantics", cleanupCases.length === 10 && cleanupCases.every((row) => row.passed), cleanupCases);
const stageMigration = verifyA60StageAuthorityMigration(root);
const postBuildTypeScriptMigration = verifyR44P46A60TypeScriptDenominatorMigration(root);
const runtimeSmokeMigration = verifyA60RuntimeSmokeDenominatorMigration(root);
const browserFixtureEvidenceMigration = verifyA60BrowserFixtureEvidenceDenominatorMigration(root);
const failureFinalizationMigration = verifyA60FailureFinalizationDenominatorMigration(root);
const r44p46A58ValidatorCases = runR44P46A58ResultValidatorCases();
const emptyLogSha256 = sha256(Buffer.alloc(0));
const stageArtifactReader = (relativePath) => ({ path: relativePath, byteLength: 0, sha256: emptyLogSha256 });
const stageBaseUrl = "http://127.0.0.1:4176";
const expectedStageRuntime = {
  baseUrl: stageBaseUrl,
  buildId: "test-build-id",
  runtimeBuildMode: policy.runtimeBuildOutput.mode,
  runtimeDistDir: policy.runtimeBuildOutput.distDir,
  runtimeInstanceSha256: "a".repeat(64),
  runtimeProbeSha256: "b".repeat(64),
};
const canonicalStageListExact = () => JSON.stringify(policy.requiredStages) === JSON.stringify(A60_REQUIRED_STAGE_IDS);
const validStageRows = policy.requiredStages.map((id, index) => {
  const timing = { startedAtMs: 1_000 + index * 10, completedAtMs: 1_005 + index * 10 };
  if (id === "source-manifest-preflight") return { id, ok: true, ...timing, detail: { passed: true, mismatches: [] } };
  if (id === "production-server-ready") return { id, ok: true, ...timing, detail: { status: 200, baseUrl: stageBaseUrl, url: `${stageBaseUrl}/pl`, buildId: "test-build-id", runtimeBuildMode: policy.runtimeBuildOutput.mode, runtimeDistDir: policy.runtimeBuildOutput.distDir, runtimeInstanceSha256: "a".repeat(64), runtimeProbeSha256: "b".repeat(64) } };
  return {
    id, ok: true, ...timing, durationMs: timing.completedAtMs - timing.startedAtMs, command: expectedA60StageCommand(id, policy), exitCode: 0, signal: null, errorCode: null, outputContractPassed: true, outputContractError: null,
    stdout: { path: `artifacts/pass36/a60/logs/${id}.stdout.log`, bytes: 0, sha256: emptyLogSha256 },
    stderr: { path: `artifacts/pass36/a60/logs/${id}.stderr.log`, bytes: 0, sha256: emptyLogSha256 },
    stdoutSafety: evaluateA60LogSafety(Buffer.alloc(0)), stderrPolicy: evaluateA60Stderr(id, Buffer.alloc(0)),
  };
});
const rejectsStructured = (options) => {
  try {
    const result = validateA60StageSequence({ root, readArtifact: stageArtifactReader, ...options });
    return result.passed === false && result.checks.length === A60_REQUIRED_STAGE_IDS.length + 1 && result.failures.length > 0;
  } catch {
    return false;
  }
};
const stageSequenceCases = [
  { id: "valid", passed: validateA60StageSequence({ root, stages: validStageRows, policy, readArtifact: stageArtifactReader, expectedRuntime: expectedStageRuntime }).passed === true },
  { id: "missing", passed: validateA60StageSequence({ root, stages: validStageRows.slice(0, -1), policy, readArtifact: stageArtifactReader }).passed === false },
  { id: "duplicate", passed: validateA60StageSequence({ root, stages: [...validStageRows.slice(0, -1), structuredClone(validStageRows[0])], policy, readArtifact: stageArtifactReader }).passed === false },
  { id: "reordered", passed: validateA60StageSequence({ root, stages: [validStageRows[1], validStageRows[0], ...validStageRows.slice(2)], policy, readArtifact: stageArtifactReader }).passed === false },
  { id: "extra", passed: validateA60StageSequence({ root, stages: [...validStageRows, { id: "unapproved-extra", ok: true, startedAtMs: 2_000, completedAtMs: 2_001 }], policy, readArtifact: stageArtifactReader }).passed === false },
  { id: "nonzero-exit", passed: (() => { const rows = structuredClone(validStageRows); const child = rows.find((row) => Number.isInteger(row.exitCode)); child.exitCode = 1; return validateA60StageSequence({ root, stages: rows, policy, readArtifact: stageArtifactReader }).passed === false; })() },
  { id: "signal", passed: (() => { const rows = structuredClone(validStageRows); const child = rows.find((row) => Number.isInteger(row.exitCode)); child.signal = "SIGTERM"; return validateA60StageSequence({ root, stages: rows, policy, readArtifact: stageArtifactReader }).passed === false; })() },
  { id: "command-substitution", passed: (() => { const rows = structuredClone(validStageRows); const child = rows.find((row) => Array.isArray(row.command)); child.command = ["<EXACT_NODE>", "unapproved-script.mjs"]; return validateA60StageSequence({ root, stages: rows, policy, readArtifact: stageArtifactReader }).passed === false; })() },
  { id: "output-contract", passed: (() => { const rows = structuredClone(validStageRows); const child = rows.find((row) => Number.isInteger(row.exitCode)); child.outputContractPassed = false; child.outputContractError = "forced_contract_failure"; return validateA60StageSequence({ root, stages: rows, policy, readArtifact: stageArtifactReader }).passed === false; })() },
  { id: "invalid-timing", passed: (() => { const rows = structuredClone(validStageRows); rows[0].completedAtMs = rows[0].startedAtMs - 1; return validateA60StageSequence({ root, stages: rows, policy, readArtifact: stageArtifactReader }).passed === false; })() },
  { id: "duration-mismatch", passed: (() => { const rows = structuredClone(validStageRows); const child = rows.find((row) => Number.isInteger(row.durationMs)); child.durationMs = 0; return validateA60StageSequence({ root, stages: rows, policy, readArtifact: stageArtifactReader }).passed === false; })() },
  { id: "log-path-substitution", passed: (() => { const rows = structuredClone(validStageRows); const child = rows.find((row) => row.stdout); child.stdout.path = "artifacts/pass36/a60/logs/substituted.stdout.log"; return validateA60StageSequence({ root, stages: rows, policy, readArtifact: stageArtifactReader }).passed === false; })() },
  { id: "log-length-substitution", passed: (() => { const rows = structuredClone(validStageRows); const child = rows.find((row) => row.stdout); child.stdout.bytes = 1; return validateA60StageSequence({ root, stages: rows, policy, readArtifact: stageArtifactReader }).passed === false; })() },
  { id: "log-sha-substitution", passed: (() => { const rows = structuredClone(validStageRows); const child = rows.find((row) => row.stdout); child.stdout.sha256 = "f".repeat(64); return validateA60StageSequence({ root, stages: rows, policy, readArtifact: stageArtifactReader }).passed === false; })() },
  { id: "observed-log-path-alias", passed: validateA60StageSequence({ root, stages: validStageRows, policy, readArtifact: (relativePath) => ({ path: `${relativePath}.alias`, byteLength: 0, sha256: emptyLogSha256 }) }).passed === false },
  { id: "missing-log", passed: validateA60StageSequence({ root, stages: validStageRows, policy, readArtifact: () => { throw new Error("missing_test_log"); } }).passed === false },
  { id: "missing-runtime-bound-stage", passed: rejectsStructured({ stages: validStageRows.filter((row) => row.id !== "production-server-ready"), policy, expectedRuntime: expectedStageRuntime }) },
  { id: "undefined-row", passed: (() => { const rows = structuredClone(validStageRows); rows[1] = undefined; return rejectsStructured({ stages: rows, policy, expectedRuntime: expectedStageRuntime }); })() },
  { id: "null-row", passed: (() => { const rows = structuredClone(validStageRows); rows[1] = null; return rejectsStructured({ stages: rows, policy, expectedRuntime: expectedStageRuntime }); })() },
  { id: "sparse-row", passed: (() => { const rows = structuredClone(validStageRows); delete rows[1]; return rejectsStructured({ stages: rows, policy, expectedRuntime: expectedStageRuntime }); })() },
  { id: "scalar-row", passed: (() => { const rows = structuredClone(validStageRows); rows[1] = "npm-ci"; return rejectsStructured({ stages: rows, policy, expectedRuntime: expectedStageRuntime }); })() },
  { id: "missing-id", passed: (() => { const rows = structuredClone(validStageRows); delete rows[1].id; return rejectsStructured({ stages: rows, policy, expectedRuntime: expectedStageRuntime }); })() },
  { id: "nonarray-stages", passed: rejectsStructured({ stages: { 0: validStageRows[0] }, policy, expectedRuntime: expectedStageRuntime }) },
  { id: "missing-policy", passed: rejectsStructured({ stages: validStageRows, policy: undefined, expectedRuntime: expectedStageRuntime }) },
  { id: "null-policy", passed: rejectsStructured({ stages: validStageRows, policy: null, expectedRuntime: expectedStageRuntime }) },
  { id: "empty-required-stages", passed: rejectsStructured({ stages: validStageRows, policy: { ...policy, requiredStages: [] }, expectedRuntime: expectedStageRuntime }) },
  { id: "invalid-required-stage", passed: rejectsStructured({ stages: validStageRows, policy: { ...policy, requiredStages: [...policy.requiredStages.slice(0, -1), null] }, expectedRuntime: expectedStageRuntime }) },
  { id: "duplicate-required-stage", passed: rejectsStructured({ stages: validStageRows, policy: { ...policy, requiredStages: [...policy.requiredStages.slice(0, -1), policy.requiredStages[0]] }, expectedRuntime: expectedStageRuntime }) },
  { id: "runtime-base-url-substitution", passed: rejectsStructured({ stages: validStageRows, policy, expectedRuntime: { ...expectedStageRuntime, baseUrl: "http://127.0.0.1:4999" } }) },
  { id: "runtime-build-id-substitution", passed: rejectsStructured({ stages: validStageRows, policy, expectedRuntime: { ...expectedStageRuntime, buildId: "substituted-build" } }) },
  { id: "runtime-instance-substitution", passed: rejectsStructured({ stages: validStageRows, policy, expectedRuntime: { ...expectedStageRuntime, runtimeInstanceSha256: "c".repeat(64) } }) },
  { id: "runtime-probe-substitution", passed: rejectsStructured({ stages: validStageRows, policy, expectedRuntime: { ...expectedStageRuntime, runtimeProbeSha256: "d".repeat(64) } }) },
  { id: "log-safety-risk-token-boundary", passed: evaluateA60LogSafety('"brainAngelRiskMultilingualEvalRevisionId":"VELMERE_PASS36_A88R0_BRAIN_ANGEL_RISK_MULTILINGUAL_EVAL"').passed === true },
  { id: "log-safety-provider-secret-rejected", passed: evaluateA60LogSafety("credential=sk_test_example123456").passed === false },
];
const stageSequenceCaseIds = stageSequenceCases.map((row) => row.id);
check("stage-denominator", policy.requiredStages.length === 14 && new Set(policy.requiredStages).size === policy.requiredStages.length && canonicalStageListExact() && stageMigration.checks === 20 && stageMigration.passed === 20 && stageMigration.failed === 0 && stageMigration.oldDenominator === 13 && stageMigration.newDenominator === 13 && stageMigration.retainedStages === 12 && stageMigration.replacedHistoricalStages === 1 && stageMigration.addedCurrentAuthorityStages === 1 && stageMigration.testsDeleted === 0 && failureFinalizationMigration.failed === 0 && failureFinalizationMigration.oldSemanticDenominator === 16 && failureFinalizationMigration.newSemanticDenominator === 34 && failureFinalizationMigration.retainedSemanticCases === 16 && failureFinalizationMigration.addedSemanticCases === 18 && failureFinalizationMigration.removedSemanticCases === 0 && stageSequenceCases.length === 34 && new Set(stageSequenceCaseIds).size === 34 && sha256(stageSequenceCaseIds.join("\n")) === failureFinalizationMigration.semanticCaseIdentitySha256 && stageSequenceCases.every((row) => row.passed), { requiredStages: policy.requiredStages, migration: stageMigration, failureFinalizationMigration, semanticCases: { denominator: stageSequenceCases.length, identitySha256: sha256(stageSequenceCaseIds.join("\n")), passed: stageSequenceCases.filter((row) => row.passed).length, rows: stageSequenceCases } });
check("post-build-typescript-denominator-migration", postBuildTypeScriptMigration.failed === 0
  && postBuildTypeScriptMigration.preBuildRootDenominator === 161
  && postBuildTypeScriptMigration.preBuildMinimumTransitiveFirstPartyFiles === 1560
  && postBuildTypeScriptMigration.postDualBuildRootDenominator === 303
  && postBuildTypeScriptMigration.postDualBuildGeneratedRootDenominator === 142
  && postBuildTypeScriptMigration.postDualBuildMinimumTransitiveFirstPartyFiles === 1702
  && postBuildTypeScriptMigration.minimumToolingSyntaxFiles === 185
  && postBuildTypeScriptMigration.observedSourceRootFiles === 161
  && postBuildTypeScriptMigration.internalClosure?.numerator === 1
  && postBuildTypeScriptMigration.internalClosure?.denominator === 26
  && postBuildTypeScriptMigration.internalClosure?.onlyClosedGate === "G11"
  && postBuildTypeScriptMigration.externalEvidenceValidated === false,
postBuildTypeScriptMigration);
check("runtime-smoke-denominator-migration", runtimeSmokeMigration.failed === 0 && runtimeSmokeMigration.checks === 23 && runtimeSmokeMigration.passed === 23 && runtimeSmokeMigration.stageDenominatorBefore === 14 && runtimeSmokeMigration.stageDenominatorAfter === 14 && runtimeSmokeMigration.historicalTargetDenominator === 15 && runtimeSmokeMigration.currentAssertionDenominator === 55 && runtimeSmokeMigration.currentResultDenominator === 16 && runtimeSmokeMigration.testsDeleted === 0, runtimeSmokeMigration);
check("browser-fixture-evidence-denominator-migration", browserFixtureEvidenceMigration.failed === 0 && browserFixtureEvidenceMigration.checks === 38 && browserFixtureEvidenceMigration.passed === 38 && browserFixtureEvidenceMigration.verifierDenominatorBefore === 520 && browserFixtureEvidenceMigration.verifierDenominatorAfter === 584 && browserFixtureEvidenceMigration.verifierChecksAdded === 64 && browserFixtureEvidenceMigration.verifierChecksRemoved === 0, browserFixtureEvidenceMigration);
check(
  "r44p46-a58-result-validator-profile-and-tamper-suite",
  r44p46A58ValidatorCases.profile?.id === "R44P46_CANONICAL_SOURCE_MANIFEST"
    && r44p46A58ValidatorCases.profile?.legacyFixedCountContract === false
    && r44p46A58ValidatorCases.checks === 21
    && r44p46A58ValidatorCases.passed === 21
    && r44p46A58ValidatorCases.failed === 0,
  r44p46A58ValidatorCases,
);
for (const relative of [
  "scripts/a60-exact-final-byte-build-browser-acceptance.mjs",
  "scripts/a60-browser-evidence-verifier.mjs",
  "VELMERE_RUN_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.cmd"
]) {
  const absolute = path.join(root, relative);
  const present = fs.existsSync(absolute);
  const launcherSource = present && relative.endsWith(".cmd") ? fs.readFileSync(absolute, "utf8") : "";
  const launcherExact = !relative.endsWith(".cmd") || (launcherSource.includes("VELMERE_TASK_EXACT_NODE") && !/(?:^|\r?\n)node\s/iu.test(launcherSource));
  check(`file:${relative}`, present && launcherExact);
}
const runner = fs.readFileSync(path.join(root, "scripts/a60-exact-final-byte-build-browser-acceptance.mjs"), "utf8");
const segmentedBuildRunner = fs.readFileSync(path.join(root, "scripts/deployment/run-segmented-build.mjs"), "utf8");
const sanitizedBuildEnvironment = fs.readFileSync(path.join(root, "lib/build/sanitized-build-environment.mjs"), "utf8");
check(
  "a60-runtime-probe-nested-build-propagation",
  segmentedBuildRunner.includes("const a60RuntimeProbeSha256 = process.env.VELMERE_A60_RUNTIME_PROBE_SHA256;")
    && segmentedBuildRunner.includes("VELMERE_A60_RUNTIME_PROBE_SHA256: a60RuntimeProbeSha256")
    && sanitizedBuildEnvironment.includes('const A60_RUNTIME_PROBE_NAME = "VELMERE_A60_RUNTIME_PROBE_SHA256";')
    && sanitizedBuildEnvironment.includes("build_environment_a60_runtime_probe_invalid")
    && !sanitizedBuildEnvironment.includes('"VELMERE_A60_",'),
);
for (const marker of ["wrong_node", "wrong_npm", "missing_external_source_manifest_anchor", "current_source_authority_anchor_mismatch", "confirmation_token_invalid", "npm-ci", "build-webpack", "build-turbopack", "post-build-typecheck", "production-server-ready", "browser-acceptance", "sourceUnchanged"]) check(`runner-marker:${marker}`, runner.includes(marker));
const currentAuthority = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/current-release-authority.json"), "utf8"));
const currentManifestPath = currentAuthority.currentRootDescendantManifestPath;
const before = fs.readFileSync(path.join(root, currentManifestPath));
const forcedReceiptRelativePath = `artifacts/pass36/a60-test/PASS36_A60_FORCED_PREFLIGHT_TEST-${crypto.randomBytes(8).toString("hex")}.json`;
const forced = spawnSync(process.execPath, ["scripts/a60-exact-final-byte-build-browser-acceptance.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, env: { ...buildA60ChildEnvironment(process.env), VELMERE_A60_TEST_FORCE_RUNTIME_MISMATCH: "1", VELMERE_A60_TEST_RECEIPT_RELATIVE_PATH: forcedReceiptRelativePath }, shell: false, windowsHide: true });
check("forced-preflight-exit", forced.status !== 0, forced.status);
const receiptPath = path.join(root, ...forcedReceiptRelativePath.split("/"));
check("forced-receipt-present", fs.existsSync(receiptPath));
let receipt = null;
try { receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8")); } catch (ignoredError) { void ignoredError; }
check("forced-decision", receipt?.decision === "BLOCKED_EXACT_PREFLIGHT" && receipt?.receiptRelativePath === forcedReceiptRelativePath, { decision: receipt?.decision, receiptRelativePath: receipt?.receiptRelativePath });
check("forced-zero-mutation", receipt?.summary?.mutationStarted === false, receipt?.summary);
check("forced-zero-stages", receipt?.summary?.executedStages === 0, receipt?.summary);
check("forced-source-unchanged", receipt?.sourceUnchanged === true, receipt?.sourceUnchanged);
check("manifest-byte-unchanged", Buffer.compare(before, fs.readFileSync(path.join(root, currentManifestPath))) === 0);
const current = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/current-revision.json"), "utf8"));
check("a60-retained-as-exact-build-admission", current.exactFinalByteBuildAcceptanceRevisionId === policy.revisionId && current.sourceRevisionId === current.currentRootDescendantManifestRevisionId, { sourceRevisionId: current.sourceRevisionId, exactFinalByteBuildAcceptanceRevisionId: current.exactFinalByteBuildAcceptanceRevisionId });
check("current-acceptance-a57", current.activeAcceptanceRevisionId === policy.activeAcceptanceRevisionId, current.activeAcceptanceRevisionId);
check("current-no-false-credit", current.exactFinalByteBuildExecuted === false && current.browserScreenshotParityExecuted === false && current.saleEnabled === false && current.liveProven === false, current);
const result = {
  schemaVersion: "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-test.v1",
  revisionId: policy.revisionId,
  status: failures.length === 0 ? "PASS_A60_HARNESS_AND_FAIL_CLOSED_PREFLIGHT" : "FAIL_A60_HARNESS",
  exactRuntimeExecuted: false,
  summary: { checks: checks.length, passed: checks.filter((row) => row.ok).length, failed: failures.length },
  failures,
  checks,
  truthBoundary: policy.truthBoundary,
  saleEnabled: false,
  liveProven: false
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
