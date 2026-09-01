#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { A80_REVISION, assertOutputOutsideSource, evaluateReleaseCandidate, readJson } from "./a80-release-candidate-freeze-lib.mjs";

const root = process.cwd();
const policy = readJson(root, "config/pass36/a80-frozen-local-release-candidate-admission.json");
const currentSource = readJson(root, "config/pass35/current-revision.json");
const currentAuthority = readJson(root, "config/pass36/current-release-authority.json");
const CURRENT_REVISION = currentSource.sourceRevisionId;
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const clone = (value) => structuredClone(value);
const digest = (char) => char.repeat(64);
const base = {
  current: {
    sourceRevisionId: CURRENT_REVISION, currentRootDescendantManifestRevisionId: CURRENT_REVISION,
    saleEnabled: false, liveProven: false, worldClassProven: false,
  },
  authority: {
    authorityRevisionId: CURRENT_REVISION, parentRevisionId: currentAuthority.parentRevisionId, currentSource: { revisionId: CURRENT_REVISION },
    claims: { saleEnabled: false, liveProven: false, worldClassProven: false },
  },
  a78State: {
    exactInputs: { runtime: true, dependencies: true, browser: true },
    currentRoot: { exactCredit: true },
    claims: { exactRuntimeVerified: true, dependencyBundleVerified: true, browserBundleVerified: true },
  },
  a79State: {
    exactExecution: {
      exactBuildExecuted: true, exactBrowserExecuted: true, webpackExecutedOnA79: true,
      turbopackExecutedOnA79: true, productionRuntimeExecutedOnA79: true,
      playwrightExecutedOnA79: true, screenshotParityExecutedOnA79: true, credit: true,
    },
  },
  a60Receipt: {
    decision: policy.requiredExactDecision, failure: null,
    runtime: { node: "24.18.0", npm: "11.16.0" },
    sourceUnchanged: true, sourceBefore: { sha256: digest("a") }, sourceAfter: { sha256: digest("a") },
    summary: { requiredStages: 13, executedStages: 13, passedStages: 13, failedStages: 0 },
    bindings: { baseUrl: "http://127.0.0.1:4176", runtimeInstanceSha256: digest("b"), browserExecutableSha256: digest("c"), buildId: "build-a80-exact" },
    saleEnabled: false, liveProven: false,
  },
  a58Verification: { blockingFailures: 0, archiveIntegrityVerified: true, cleanUnpackVerified: true },
  currentRootGate: { exactRuntime: true, passed: 30, required: 30, blocked: 0, semanticFailures: 0, sourceImmutable: true },
  hygiene: { passed: true, violations: [] },
  sourceAuthority: {
    passed: true,
    mismatches: [],
    manifestPath: "fixture/current-source-manifest.json",
    manifestSha256: digest("e"),
    payload: { fileCount: 1, aggregateSha256: digest("f") },
  },
};

const evaluate = (mutation = () => {}) => {
  const fixture = clone(base); mutation(fixture);
  return evaluateReleaseCandidate({ root, policy, ...fixture });
};
const good = evaluate();
check("fixture:verified", good.verified === true && good.decision === policy.decisions.verified, { decision: good.decision, blockers: good.blockers });
check("fixture:no-promotion", good.saleEnabled === false && good.liveProven === false && good.stagingApproved === false, { saleEnabled: good.saleEnabled, liveProven: good.liveProven, stagingApproved: good.stagingApproved });
check("fixture:digest", /^[a-f0-9]{64}$/u.test(good.candidateDigestSha256), "sha256_shape_verified");

const cases = [
  ["current-revision", (f) => { f.current.sourceRevisionId = "old"; }],
  ["authority-revision", (f) => { f.authority.authorityRevisionId = "old"; }],
  ["runtime-input", (f) => { f.a78State.exactInputs.runtime = false; }],
  ["dependencies-input", (f) => { f.a78State.exactInputs.dependencies = false; }],
  ["browser-input", (f) => { f.a78State.exactInputs.browser = false; }],
  ["a78-credit", (f) => { f.a78State.currentRoot.exactCredit = false; }],
  ["a79-webpack", (f) => { f.a79State.exactExecution.webpackExecutedOnA79 = false; }],
  ["a79-turbopack", (f) => { f.a79State.exactExecution.turbopackExecutedOnA79 = false; }],
  ["a79-runtime", (f) => { f.a79State.exactExecution.productionRuntimeExecutedOnA79 = false; }],
  ["a79-playwright", (f) => { f.a79State.exactExecution.playwrightExecutedOnA79 = false; }],
  ["a79-screenshot", (f) => { f.a79State.exactExecution.screenshotParityExecutedOnA79 = false; }],
  ["a60-decision", (f) => { f.a60Receipt.decision = "BLOCKED_EXACT_PREFLIGHT"; }],
  ["a60-failure", (f) => { f.a60Receipt.failure = "build_failed"; }],
  ["a60-source-drift", (f) => { f.a60Receipt.sourceAfter.sha256 = digest("d"); }],
  ["a60-source-hashes-missing", (f) => { delete f.a60Receipt.sourceBefore.sha256; delete f.a60Receipt.sourceAfter.sha256; }],
  ["a60-node", (f) => { f.a60Receipt.runtime.node = "24.11.1"; }],
  ["a60-npm", (f) => { f.a60Receipt.runtime.npm = "10.9.2"; }],
  ["a60-stage", (f) => { f.a60Receipt.summary.executedStages = 12; }],
  ["a60-runtime-binding", (f) => { f.a60Receipt.bindings.runtimeInstanceSha256 = null; }],
  ["a60-browser-binding", (f) => { f.a60Receipt.bindings.browserExecutableSha256 = "bad"; }],
  ["a60-build-id", (f) => { f.a60Receipt.bindings.buildId = ""; }],
  ["a60-base-url", (f) => { f.a60Receipt.bindings.baseUrl = "https://example.com"; }],
  ["current-root-29", (f) => { f.currentRootGate.passed = 29; f.currentRootGate.blocked = 1; }],
  ["current-root-nonexact", (f) => { f.currentRootGate.exactRuntime = false; }],
  ["current-root-semantic", (f) => { f.currentRootGate.semanticFailures = 1; }],
  ["current-root-mutation", (f) => { f.currentRootGate.sourceImmutable = false; }],
  ["a58-blocker", (f) => { f.a58Verification.blockingFailures = 1; }],
  ["a58-archive", (f) => { f.a58Verification.archiveIntegrityVerified = false; }],
  ["a58-clean", (f) => { f.a58Verification.cleanUnpackVerified = false; }],
  ["source-hygiene", (f) => { f.hygiene = { passed: false, violations: ["environment_file:.env"] }; }],
  ["source-authority-mismatch", (f) => { f.sourceAuthority = { ...f.sourceAuthority, passed: false, mismatches: ["payload_drift"] }; }],
  ["sale-claim", (f) => { f.current.saleEnabled = true; }],
  ["live-claim", (f) => { f.authority.claims.liveProven = true; }],
];
for (const [id, mutate] of cases) {
  const result = evaluate(mutate);
  check(`mutation:${id}`, result.verified === false && result.decision === policy.decisions.blocked && result.blockers.length > 0, result.blockers);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a80-output-"));
try {
  check("output:outside-accepted", assertOutputOutsideSource(root, path.join(tmp, "candidate.json")) === path.resolve(tmp, "candidate.json"));
  let rejected = false;
  try { assertOutputOutsideSource(root, path.join(root, "artifacts/pass36/a80/candidate.json")); } catch (error) { rejected = String(error).includes("a80_output_inside_source_forbidden"); }
  check("output:inside-rejected", rejected);
  const reparsePath = path.join(tmp, "source-reparse");
  let reparseCreated = false;
  try {
    fs.symlinkSync(root, reparsePath, process.platform === "win32" ? "junction" : "dir");
    reparseCreated = true;
    let reparseRejected = false;
    try { assertOutputOutsideSource(root, path.join(reparsePath, "candidate.json")); } catch (error) { reparseRejected = String(error).includes("a80_output_inside_source_forbidden"); }
    check("output:reparse-into-source-rejected", reparseRejected);
  } finally {
    if (reparseCreated) fs.unlinkSync(reparsePath);
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

const actual = evaluateReleaseCandidate({
  root, policy,
  current: readJson(root, "config/pass35/current-revision.json"),
  authority: readJson(root, "config/pass36/current-release-authority.json"),
  a78State: readJson(root, "config/pass36/a78-current-state.json"),
  a79State: readJson(root, "config/pass36/a79-current-state.json"),
  a60Receipt: fs.existsSync(path.join(root, "artifacts/pass36/a60/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.json"))
    ? readJson(root, "artifacts/pass36/a60/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.json")
    : { decision: "MISSING_A60_EXACT_RECEIPT", failure: "not_supplied", saleEnabled: false, liveProven: false },
  a58Verification: { blockingFailures: 0, archiveIntegrityVerified: true, cleanUnpackVerified: true },
  currentRootGate: { exactRuntime: false, passed: 24, required: 30, blocked: 6, semanticFailures: 0, sourceImmutable: true },
});
check("actual:blocked", actual.verified === false && actual.blockers.includes("a78:exact-inputs") && actual.blockers.includes("a79:exact-execution") && actual.blockers.includes("current-root:exact-30-of-30"), actual.blockers);
check("actual:no-live-sale", actual.liveProven === false && actual.saleEnabled === false, { liveProven: actual.liveProven, saleEnabled: actual.saleEnabled });

const failures = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a80.frozen-local-release-candidate-admission-test.v1",
  revisionId: A80_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failures.length ? "FAIL_A80" : "PASS_A80_LOCAL_ADMISSION_BLOCKED_EXACT_PREREQUISITES",
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
  actualDecision: actual.decision,
  actualBlockers: actual.blockers,
  exactReleaseCandidateVerified: false,
  liveProven: false,
  saleEnabled: false,
  failures,
  checks,
  truthBoundary: policy.truthBoundary,
};
const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0) {
  const requestedOutput = process.argv[outputIndex + 1];
  if (!requestedOutput) throw new Error("a80_test_output_path_missing");
  const outputPath = assertOutputOutsideSource(root, requestedOutput);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify(receipt, null, 2));
if (failures.length) process.exit(1);
