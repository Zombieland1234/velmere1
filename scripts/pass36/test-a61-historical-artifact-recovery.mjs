#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { writeDeterministicZip } from "../pass4826/release-package-contract.mjs";

const root = process.cwd();
const checks = [];
const failures = [];
const check = (id, ok, detail = null) => { const row = { id, ok: Boolean(ok), detail }; checks.push(row); if (!row.ok) failures.push(row); };
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a61-test-"));
const project = path.join(temp, "project");
fs.mkdirSync(path.join(project, "config/pass36"), { recursive: true });
const alpha = Buffer.from("A61 exact alpha artifact\n");
const beta = Buffer.from("A61 exact beta artifact with more bytes\n");
const policy = {
  schemaVersion: "velmere.pass36.a61.historical-artifact-recovery-policy.v1",
  revisionId: "A61_TEST_REVISION",
  artifacts: [
    { id: "ALPHA", targetPath: ".hidden/alpha.json", byteLength: alpha.length, sha256: sha256(alpha), archiveArgument: "--alpha-zip", acceptedArchives: [] },
    { id: "BETA", targetPath: "_history/beta.json", byteLength: beta.length, sha256: sha256(beta), archiveArgument: "--beta-zip", acceptedArchives: [] }
  ],
  budgets: { maximumArchiveBytes: 1048576, maximumEntries: 100, maximumTotalUncompressedBytes: 1048576, maximumSingleFileBytes: 1048576 },
  decisions: { verified: "VERIFIED_HISTORICAL_ARTIFACTS", verifiedNotInstalled: "VERIFIED_INPUTS_NOT_INSTALLED", partial: "PARTIAL_RECOVERY", blocked: "BLOCKED_EXACT_HISTORICAL_BYTES", rejected: "REJECTED_INTEGRITY" },
  truthBoundary: "fixture"
};
const alphaFile = path.join(temp, "alpha.json");
const betaFile = path.join(temp, "beta.json");
const wrongAlpha = path.join(temp, "wrong-alpha.json");
fs.writeFileSync(alphaFile, alpha);
fs.writeFileSync(betaFile, beta);
fs.writeFileSync(wrongAlpha, Buffer.alloc(alpha.length, 0x78));
function makeZip(name, entries) {
  const output = path.join(temp, name);
  const archive = writeDeterministicZip(output, entries.map((entry) => ({ ...entry, mode: 0o100644 })), { overwrite: true });
  return { output, archive };
}
const alphaZip = makeZip("alpha.zip", [{ path: "root/.hidden/alpha.json", content: alpha }]);
const betaZip = makeZip("beta.zip", [{ path: "_history/beta.json", content: beta }]);
policy.artifacts[0].acceptedArchives = [{ fileNames: ["alpha.zip"], byteLength: alphaZip.archive.byteLength, sha256: alphaZip.archive.sha256, entryCount: alphaZip.archive.entryCount }];
policy.artifacts[1].acceptedArchives = [{ fileNames: ["beta.zip"], byteLength: betaZip.archive.byteLength, sha256: betaZip.archive.sha256, entryCount: betaZip.archive.entryCount }];
const policyPath = path.join(project, "config/pass36/policy.json");
fs.writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);
function run(args = []) {
  const output = path.join(temp, `receipt-${checks.length}.json`);
  const child = spawnSync(process.execPath, [path.join(root, "scripts/pass36/verify-a61-historical-artifact-recovery.mjs"), ...args, "--output", output], {
    cwd: project,
    encoding: "utf8",
    env: { ...process.env, VELMERE_A61_TEST_POLICY_PATH: policyPath },
    maxBuffer: 8 * 1024 * 1024,
  });
  let receipt = null;
  try { receipt = JSON.parse(fs.readFileSync(output, "utf8")); } catch (ignoredError) { void ignoredError; }
  return { child, receipt };
}
let scenario = run();
check("blocked-no-input-exit", scenario.child.status === 2, scenario.child.status);
check("blocked-no-input-decision", scenario.receipt?.decision === "BLOCKED_EXACT_HISTORICAL_BYTES", scenario.receipt?.decision);
check("metadata-no-credit", scenario.receipt?.summary?.verifiedInputs === 0 && scenario.receipt?.summary?.installedExact === 0, scenario.receipt?.summary);
scenario = run(["--artifact-alpha", alphaFile, "--artifact-beta", betaFile]);
check("direct-readonly-exit", scenario.child.status === 0, scenario.child.status);
check("direct-readonly-decision", scenario.receipt?.decision === "VERIFIED_INPUTS_NOT_INSTALLED", scenario.receipt?.decision);
check("direct-readonly-no-install", scenario.receipt?.summary?.installedExact === 0, scenario.receipt?.summary);
scenario = run(["--artifact-alpha", alphaFile, "--artifact-beta", betaFile, "--install"]);
check("direct-install-exit", scenario.child.status === 0, scenario.child.status);
check("direct-install-decision", scenario.receipt?.decision === "VERIFIED_HISTORICAL_ARTIFACTS", scenario.receipt?.decision);
check("direct-install-count", scenario.receipt?.summary?.installedExact === 2 && scenario.receipt?.summary?.criticalOfflineGateEligible === true, scenario.receipt?.summary);
check("direct-install-alpha-bytes", fs.readFileSync(path.join(project, ".hidden/alpha.json")).equals(alpha));
check("direct-install-beta-bytes", fs.readFileSync(path.join(project, "_history/beta.json")).equals(beta));
fs.rmSync(path.join(project, ".hidden"), { recursive: true, force: true });
fs.rmSync(path.join(project, "_history"), { recursive: true, force: true });
scenario = run(["--alpha-zip", alphaZip.output, "--beta-zip", betaZip.output]);
check("archive-readonly-exit", scenario.child.status === 0, scenario.child.status);
check("archive-readonly-decision", scenario.receipt?.decision === "VERIFIED_INPUTS_NOT_INSTALLED", scenario.receipt?.decision);
check("archive-prefix-match", scenario.receipt?.results?.find((row) => row.id === "ALPHA")?.origin?.entry === "root/.hidden/alpha.json", scenario.receipt?.results);
scenario = run(["--alpha-zip", alphaZip.output, "--beta-zip", betaZip.output, "--install"]);
check("archive-install-exit", scenario.child.status === 0, scenario.child.status);
check("archive-install-decision", scenario.receipt?.decision === "VERIFIED_HISTORICAL_ARTIFACTS", scenario.receipt?.decision);
check("archive-anchor-bound", scenario.receipt?.results?.every((row) => /^[a-f0-9]{64}$/u.test(row.archive?.sha256 ?? "")), scenario.receipt?.results);
fs.rmSync(path.join(project, ".hidden"), { recursive: true, force: true });
fs.rmSync(path.join(project, "_history"), { recursive: true, force: true });
scenario = run(["--artifact-alpha", wrongAlpha, "--artifact-beta", betaFile]);
check("wrong-same-size-rejected-exit", scenario.child.status === 1, scenario.child.status);
check("wrong-same-size-rejected-decision", scenario.receipt?.decision === "REJECTED_INTEGRITY", scenario.receipt?.decision);
check("wrong-same-size-hash-error", scenario.receipt?.errors?.some((row) => row.error.includes("artifact_hash_mismatch")), scenario.receipt?.errors);
const wrongPolicy = structuredClone(policy);
wrongPolicy.artifacts[0].acceptedArchives[0].sha256 = "0".repeat(64);
fs.writeFileSync(policyPath, `${JSON.stringify(wrongPolicy, null, 2)}\n`);
scenario = run(["--alpha-zip", alphaZip.output, "--beta-zip", betaZip.output]);
check("wrong-archive-anchor-exit", scenario.child.status === 1, scenario.child.status);
check("wrong-archive-anchor-decision", scenario.receipt?.decision === "REJECTED_INTEGRITY", scenario.receipt?.decision);
check("wrong-archive-anchor-error", scenario.receipt?.errors?.some((row) => row.error.includes("archive_anchor_mismatch")), scenario.receipt?.errors);
fs.writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);
const partial = run(["--artifact-alpha", alphaFile]);
check("partial-exit", partial.child.status === 2, partial.child.status);
check("partial-decision", partial.receipt?.decision === "PARTIAL_RECOVERY", partial.receipt?.decision);
check("partial-count", partial.receipt?.summary?.verifiedInputs === 1, partial.receipt?.summary);
const realPolicy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a61-historical-artifact-recovery-policy.json"), "utf8"));
const currentRevision = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/current-revision.json"), "utf8"));
check("real-policy-schema", realPolicy.schemaVersion === "velmere.pass36.a61.historical-artifact-recovery-policy.v1", realPolicy.schemaVersion);
check("real-policy-two-artifacts", realPolicy.artifacts.length === 2, realPolicy.artifacts);
check("real-policy-pass6-anchor", realPolicy.artifacts[0].acceptedArchives[0].sha256 === "b8d1b5c31d83b5f1b0cf0e67193909ae16e3b1a9ccec0a6c7ea02c5fc01f1369");
check("real-policy-pass5-anchor", realPolicy.artifacts[1].acceptedArchives[0].sha256 === "56a36af9d8fe976ff932a3f576f887f3d6bdae15ff8b9b08b40ef76eacaad6c4");
check("a61-retained-as-historical-intake", currentRevision.sourceRevisionId === "VELMERE_PASS36_A75R0_TRUSTED_PROXY_AND_REQUEST_CLIENT_IDENTITY_BOUNDARY_HARDENING" && currentRevision.historicalArtifactRecoveryIntakeRevisionId === "VELMERE_PASS36_A61R0_HISTORICAL_ARTIFACT_RECOVERY_INTAKE_CRITICAL_GATE_TRUTH", currentRevision);
check("current-no-false-recovery-credit", currentRevision.historicalArtifactRecoveryComplete === false && currentRevision.criticalOfflineGatePassed === false, currentRevision);
check("real-targets-not-fabricated", realPolicy.artifacts.every((row) => !fs.existsSync(path.join(root, row.targetPath))), realPolicy.artifacts.map((row) => row.targetPath));
check("windows-runner-present", fs.existsSync(path.join(root, "VELMERE_RUN_A61_HISTORICAL_ARTIFACT_RECOVERY.cmd")));
const criticalTriage = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a61-critical-offline-gate-triage-receipt.json"), "utf8"));
check("critical-triage-no-semantic-failure", criticalTriage.status === "BLOCKED_NO_SEMANTIC_FAILURE_CREDIT" && criticalTriage.summary.semanticOrUnknownFailed === 0, criticalTriage.summary);
check("critical-triage-exact-byte-denominator", criticalTriage.summary.exactByteBlocked === 2, criticalTriage.summary);
check("critical-triage-runtime-blocked-separated", criticalTriage.summary.runtimeDependencyBlocked === 6, criticalTriage.summary);
const result = {
  schemaVersion: "velmere.pass36.a61.historical-artifact-recovery-test.v1",
  revisionId: "VELMERE_PASS36_A61R0_HISTORICAL_ARTIFACT_RECOVERY_INTAKE_CRITICAL_GATE_TRUTH",
  status: failures.length === 0 ? "PASS_A61_SAFE_RECOVERY_INTAKE" : "FAIL_A61_SAFE_RECOVERY_INTAKE",
  summary: { checks: checks.length, passed: checks.filter((row) => row.ok).length, failed: failures.length },
  checks,
  failures,
  saleEnabled: false,
  liveProven: false,
};
const compactResult = {
  ...result,
  checks: checks.map(({ id, ok }) => ({ id, ok })),
  failures: failures.map(({ id, ok }) => ({ id, ok })),
};
fs.mkdirSync(path.join(root, "artifacts/pass36/a61"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass36/a61/PASS36_A61_RECOVERY_INTAKE_TEST_DETAILS.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(root, "config/pass36/a61-historical-artifact-recovery-test-receipt.json"), `${JSON.stringify(compactResult, null, 2)}\n`);
console.log(JSON.stringify(compactResult, null, 2));
fs.rmSync(temp, { recursive: true, force: true });
if (failures.length) process.exit(1);
