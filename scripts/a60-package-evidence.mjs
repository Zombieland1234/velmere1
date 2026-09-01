#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { canonicalJson, parseDeterministicZipBytes, writeDeterministicZip } from "./pass4826/release-package-contract.mjs";
import {
  expectedA60EvidencePaths,
  ensureSafeDirectoryInsideRoot,
  evaluateA60LogSafety,
  evaluateA60Stderr,
  normalizeLoopbackBaseUrl,
  readBoundRegularFileInsideRoot,
  sha256,
  validateA60StageSequence,
  validateA60EvidencePathSet,
  validateBrowserReceipt,
} from "./pass36/a79-exact-build-browser-lib.mjs";
import { validateCurrentSourceAuthorityExact } from "./pass36/current-source-authority-lib.mjs";
import { parseStrictJsonCli } from "./pass36/strict-json-cli.mjs";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a60-exact-final-byte-build-browser-acceptance.json"), "utf8"));
const browserContract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a45-exact-runtime-browser-acceptance.json"), "utf8"));
const snapshots = new Map();
function snapshot(relativePath, options = {}) {
  const portable = relativePath.replaceAll("\\", "/");
  if (!snapshots.has(portable)) snapshots.set(portable, readBoundRegularFileInsideRoot(root, portable, { maxBytes: options.maxBytes ?? 128 * 1024 * 1024, label: options.label ?? "a60_package_artifact" }));
  return snapshots.get(portable);
}
function parseJsonSnapshot(relativePath, options = {}) {
  return parseStrictJsonCli(snapshot(relativePath, options).bytes.toString("utf8"), { maxBytes: options.maxBytes ?? 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
}
function requireBinding(binding, observed, id) {
  if (binding?.relativePath !== observed.path || binding?.byteLength !== observed.byteLength || binding?.sha256 !== observed.sha256) throw new Error(`a60_${id}_binding_mismatch`);
}

const sourceBefore = validateCurrentSourceAuthorityExact(root);
if (!sourceBefore.passed || sourceBefore.mismatches.length) throw new Error("a60_package_current_source_authority_invalid_before");

const topPath = "artifacts/pass36/a60/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.json";
const verifierPath = "artifacts/pass36/a60/PASS36_A60_BROWSER_EVIDENCE_VERIFICATION.json";
const browserPath = "artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json";
const fixturePath = policy.browser.qaFixture.relativePath;
const receipt = parseJsonSnapshot(topPath, { maxBytes: 16 * 1024 * 1024, label: "a60_top_receipt" });
const browserReceipt = parseJsonSnapshot(browserPath, { maxBytes: 16 * 1024 * 1024, label: "a60_browser_receipt" });
const browserVerifier = parseJsonSnapshot(verifierPath, { maxBytes: 16 * 1024 * 1024, label: "a60_browser_verifier" });
const fixtureSnapshot = snapshot(fixturePath, { maxBytes: 8 * 1024 * 1024, label: "a60_fixture" });

if (receipt.schemaVersion !== "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v3"
  || receipt.receiptRelativePath !== topPath || receipt.decision !== "VERIFIED_LOCAL_EXACT_FINAL_BYTE_BUILD_BROWSER"
  || receipt.failure !== null || !Array.isArray(receipt.decisionFailures) || receipt.decisionFailures.length !== 0
  || receipt.preflightEvidenceWriteOnly !== false || receipt.saleEnabled !== false || receipt.liveProven !== false || receipt.sourceUnchanged !== true
  || receipt.summary?.requiredStages !== policy.requiredStages.length || receipt.summary?.executedStages !== policy.requiredStages.length
  || receipt.summary?.passedStages !== policy.requiredStages.length || receipt.summary?.failedStages !== 0
  || receipt.summary?.exactStageSequence !== true || receipt.summary?.orchestrationFailure !== null || receipt.summary?.decisionFailureCount !== 0
  || !Array.isArray(receipt.summary?.missingStages) || receipt.summary.missingStages.length !== 0
  || receipt.cleanup?.attempted !== true || receipt.cleanup?.passed !== true || receipt.cleanup?.processExited !== true || receipt.cleanup?.portClosed !== true
  || receipt.cleanup?.wasRunning !== true || !Number.isInteger(receipt.cleanup?.serverExitCode) || receipt.cleanup?.terminationStderrBytes !== 0
  || !Array.isArray(receipt.cleanup?.portClosureProbes) || receipt.cleanup.portClosureProbes.length !== 3 || !receipt.cleanup.portClosureProbes.every((row) => row?.closed === true && row?.outcome === "ECONNREFUSED")
  || (process.platform === "win32" && receipt.cleanup?.terminationExitCode !== 0)
  || receipt.stageValidation?.passed !== true || receipt.stageValidation?.checks !== policy.requiredStages.length + 1
  || receipt.stageValidation?.requiredStages !== policy.requiredStages.length || receipt.stageValidation?.declaredStages !== policy.requiredStages.length
  || !Array.isArray(receipt.stageValidation?.failureIds) || receipt.stageValidation.failureIds.length !== 0 || receipt.stageValidation?.notRun !== false) throw new Error("a60_evidence_not_verified_exactly");
if (receipt.sourceBefore?.manifestSha256 !== sourceBefore.manifestSha256 || receipt.sourceAfter?.manifestSha256 !== sourceBefore.manifestSha256) throw new Error("a60_top_receipt_source_binding_stale");
const recomputedRuntimeInstanceSha256 = sha256(canonicalJson({
  nodeExecutableSha256: receipt.runtime?.nodeExecutable?.sha256,
  npmCliSha256: receipt.runtime?.npmCli?.sha256,
  browserExecutableSha256: receipt.bindings?.browserExecutableSha256,
  sourceManifestSha256: receipt.sourceBefore?.manifestSha256,
  buildId: receipt.bindings?.buildId,
  baseUrl: receipt.bindings?.baseUrl,
  runNonceSha256: receipt.bindings?.runNonceSha256,
  runtimeProbeSha256: receipt.bindings?.runtimeProbeSha256,
}));
const runtimeProbeRows = [receipt.bindings?.runtimeProbeBefore, receipt.bindings?.runtimeProbeAfter];
if (!/^[a-f0-9]{64}$/u.test(receipt.bindings?.runNonceSha256 ?? "") || !/^[a-f0-9]{64}$/u.test(receipt.bindings?.runtimeProbeSha256 ?? "")
  || receipt.bindings?.runtimeInstanceSha256 !== recomputedRuntimeInstanceSha256
  || !runtimeProbeRows.every((row) => row?.status >= 200 && row.status < 400 && row?.url === `${receipt.bindings.baseUrl}/pl` && row?.runtimeProbeSha256 === receipt.bindings.runtimeProbeSha256)) throw new Error("a60_runtime_instance_binding_invalid");

const expected = {
  baseUrl: normalizeLoopbackBaseUrl(String(receipt.bindings?.baseUrl ?? "")),
  sourceManifestSha256: String(receipt.sourceBefore?.manifestSha256 ?? ""),
  runtimeInstanceSha256: String(receipt.bindings?.runtimeInstanceSha256 ?? ""),
  browserExecutableSha256: String(receipt.bindings?.browserExecutableSha256 ?? ""),
  buildId: String(receipt.bindings?.buildId ?? ""),
  requireHttpErrors: true,
  qaFixtureRequired: true,
  qaFixtureRelativePath: fixturePath,
  qaFixtureGeneratorId: policy.browser.qaFixture.generatorId,
  qaFixtureRequestCounterKeys: policy.browser.qaFixture.requestCounterKeys,
  qaFixtureRequiredPositiveRequestFamilies: policy.browser.qaFixture.requiredPositiveRequestFamilies,
};
const currentBrowserValidation = validateBrowserReceipt({ root, receipt: browserReceipt, contract: browserContract, expected, artifactReader: snapshot });
if (!currentBrowserValidation.passed || currentBrowserValidation.checks.length !== 584 || currentBrowserValidation.failures.length !== 0) throw new Error(`a60_current_browser_evidence_invalid:${currentBrowserValidation.checks.length}:${currentBrowserValidation.failures.length}`);
if (browserVerifier.schemaVersion !== "velmere.pass36.a60.browser-evidence-verification.v2"
  || browserVerifier.status !== "PASS_BROWSER_EVIDENCE_EXACTLY_BOUND"
  || browserVerifier.checks !== policy.evidencePackage.browserVerifierChecksRequired || browserVerifier.passed !== policy.evidencePackage.browserVerifierChecksRequired
  || !Array.isArray(browserVerifier.failures) || browserVerifier.failures.length !== 0 || browserVerifier.saleEnabled !== false || browserVerifier.liveProven !== false
  || canonicalJson(browserVerifier.expected) !== canonicalJson(expected)
  || browserVerifier.checkIdentitySha256 !== policy.evidencePackage.browserVerifierCheckIdentitySha256
  || browserVerifier.checkIdentitySha256 !== sha256(currentBrowserValidation.checks.map((row) => row.id).join("\n"))) throw new Error("a60_browser_verifier_not_exact_current_584_of_584");
requireBinding(browserVerifier.browserReceiptBinding, snapshot(browserPath), "verifier_browser_receipt");
requireBinding(receipt.bindings?.browserReceipt, snapshot(browserPath), "top_browser_receipt");
requireBinding(receipt.bindings?.browserVerifier, snapshot(verifierPath), "top_browser_verifier");
requireBinding(receipt.bindings?.qaFixture, fixtureSnapshot, "top_fixture");
if (browserReceipt.qaFixture?.fixtureRelativePath !== fixturePath || browserReceipt.qaFixture?.fixtureSha256 !== fixtureSnapshot.sha256 || browserReceipt.qaFixture?.fixtureByteLength !== fixtureSnapshot.byteLength) throw new Error("a60_browser_fixture_binding_mismatch");

const browserAt = Date.parse(String(browserReceipt.generatedAt ?? ""));
const verifierAt = Date.parse(String(browserVerifier.generatedAt ?? ""));
const completedAt = Date.parse(String(receipt.completedAt ?? ""));
if (![browserAt, verifierAt, completedAt].every(Number.isFinite) || browserAt > verifierAt || verifierAt > completedAt) throw new Error("a60_evidence_timing_order_invalid");

const stageValidation = validateA60StageSequence({
  root,
  stages: receipt.stages,
  policy,
  readArtifact: snapshot,
  expectedRuntime: {
    baseUrl: receipt.bindings?.baseUrl,
    buildId: receipt.bindings?.buildId,
    runtimeBuildMode: receipt.bindings?.runtimeBuildMode,
    runtimeDistDir: receipt.bindings?.runtimeDistDir,
    runtimeInstanceSha256: receipt.bindings?.runtimeInstanceSha256,
    runtimeProbeSha256: receipt.bindings?.runtimeProbeSha256,
  },
});
if (!stageValidation.passed || stageValidation.requiredStages !== 14 || stageValidation.declaredStages !== 14) throw new Error("a60_stage_sequence_or_log_binding_invalid_at_package_time");

const evidencePlan = expectedA60EvidencePaths(policy, browserContract);
const requiredLogPaths = evidencePlan.requiredLogPaths;
const serverStdoutSnapshot = snapshot("artifacts/pass36/a60/logs/production-server.stdout.log");
const serverStderrSnapshot = snapshot("artifacts/pass36/a60/logs/production-server.stderr.log");
requireBinding(receipt.bindings?.productionServerLogs?.stdout, serverStdoutSnapshot, "server_stdout");
requireBinding(receipt.bindings?.productionServerLogs?.stderr, serverStderrSnapshot, "server_stderr");
const serverStdoutSafety = evaluateA60LogSafety(serverStdoutSnapshot.bytes);
const serverStderrPolicy = evaluateA60Stderr("production-server", serverStderrSnapshot.bytes);
if (!serverStdoutSafety.passed || !serverStderrPolicy.passed
  || canonicalJson(receipt.bindings?.productionServerLogs?.stdoutSafety) !== canonicalJson(serverStdoutSafety)
  || canonicalJson(receipt.bindings?.productionServerLogs?.stderrPolicy) !== canonicalJson(serverStderrPolicy)) throw new Error("a60_server_log_policy_invalid");

const requiredScreenshotPaths = evidencePlan.screenshotPaths;
const requiredPaths = evidencePlan.requiredPaths;
const pathSetValidation = validateA60EvidencePathSet(requiredPaths, policy, browserContract);
if (!pathSetValidation.passed) throw new Error("a60_evidence_required_path_set_invalid");

function exactDirectoryFiles(relativeDirectory, expectedPaths) {
  const absolute = path.join(root, ...relativeDirectory.split("/"));
  const rows = fs.readdirSync(absolute, { withFileTypes: true });
  if (rows.some((row) => !row.isFile() || row.isSymbolicLink())) throw new Error("a60_evidence_directory_nonregular_entry");
  const observed = rows.map((row) => `${relativeDirectory}/${row.name}`).sort();
  if (canonicalJson(observed) !== canonicalJson([...expectedPaths].sort())) throw new Error(`a60_evidence_directory_path_set_mismatch:${relativeDirectory}`);
}
exactDirectoryFiles("artifacts/pass36/a60/logs", requiredLogPaths);
exactDirectoryFiles("artifacts/pass35/a45/screenshots", requiredScreenshotPaths);
for (const relativePath of requiredPaths) snapshot(relativePath);

const entries = requiredPaths.map((relativePath) => ({ path: relativePath, content: snapshot(relativePath).bytes, mode: 0o100644 }));
ensureSafeDirectoryInsideRoot(root, "artifacts/pass36", { label: "a60_evidence_package_output" });
const output = path.join(root, "artifacts/pass36/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE_EVIDENCE.zip");
const firstOutput = path.join(root, "artifacts/pass36/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE_EVIDENCE.determinism-1.zip");
if (fs.existsSync(firstOutput) || fs.existsSync(output)) throw new Error("a60_evidence_package_output_must_be_new");
const first = writeDeterministicZip(firstOutput, entries);
const firstBytes = readBoundRegularFileInsideRoot(root, path.relative(root, firstOutput).replaceAll("\\", "/"), { maxBytes: 512 * 1024 * 1024, label: "a60_first_evidence_archive" }).bytes;
const second = writeDeterministicZip(output, entries);
const secondBytes = readBoundRegularFileInsideRoot(root, path.relative(root, output).replaceAll("\\", "/"), { maxBytes: 512 * 1024 * 1024, label: "a60_second_evidence_archive" }).bytes;
if (!firstBytes.equals(secondBytes) || first.sha256 !== second.sha256) throw new Error("a60_evidence_package_not_deterministic_2_of_2");
const parsed = parseDeterministicZipBytes(secondBytes);
if (canonicalJson(parsed.entries.map((entry) => entry.path)) !== canonicalJson(requiredPaths)) throw new Error("a60_evidence_archive_readback_path_set_mismatch");
for (const entry of parsed.entries) {
  const observed = snapshot(entry.path);
  if (entry.mode !== 0o100644 || entry.byteLength !== observed.byteLength || entry.sha256 !== observed.sha256 || !entry.content.equals(observed.bytes)) throw new Error(`a60_evidence_archive_readback_entry_mismatch:${entry.path}`);
}

const sourceAfter = validateCurrentSourceAuthorityExact(root);
if (!sourceAfter.passed || sourceAfter.manifestSha256 !== sourceBefore.manifestSha256 || sourceAfter.payload?.aggregateSha256 !== sourceBefore.payload?.aggregateSha256) throw new Error("a60_package_changed_current_source");
console.log(JSON.stringify({
  status: "PASS_A60_EVIDENCE_PACKAGED_EXACT_SNAPSHOT_2_OF_2",
  output: path.relative(root, output).replaceAll("\\", "/"),
  archiveSha256: second.sha256,
  byteLength: second.byteLength,
  entryCount: parsed.entries.length,
  requiredPathSetSha256: sha256(requiredPaths.join("\n")),
  deterministicBuilds: 2,
  byteIdentical: true,
  readbackVerified: true,
  sourceUnchanged: true,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
}, null, 2));
