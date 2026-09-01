#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const rootIndex = args.indexOf("--evidence-root");
const evidenceRoot = rootIndex >= 0 && args[rootIndex + 1] ? path.resolve(args[rootIndex + 1]) : null;
if (rootIndex >= 0 && !evidenceRoot) throw new Error("--evidence-root requires a path");

const policyPath = path.join(sourceRoot, "config/pass36/a102r44p12-turbopack-rss-budget-migration.json");
const policy = parseStrictJsonCli(fs.readFileSync(policyPath, "utf8"), { maxBytes: 256 * 1024, maxDepth: 64, maxNodes: 100000, requireObject: true });
const runner = fs.readFileSync(path.join(sourceRoot, "scripts/deployment/run-segmented-build.mjs"), "utf8");
const checks = [];
const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const clone = structuredClone(policy);
const declaredDigest = clone.migrationDigestSha256;
delete clone.migrationDigestSha256;
const observedDigest = sha256(Buffer.from(stable(clone)));

add("schema-v2", policy.schemaVersion === "velmere.pass36.a102r44p12.turbopack-rss-budget-migration.v2");
add("revision-chain", policy.revisionId.includes("A102R44P12") && policy.parentRevisionId.includes("A102R44P11"));
add("old-budget", policy.budget.oldMaxRssKb === 2750000);
add("new-budget", policy.budget.newMaxRssKb === 3100000);
add("budget-increase-exact", policy.budget.increaseKb === 350000 && Math.abs(policy.budget.increasePercent - 12.727273) < 0.000001);
add("old-failure-peak", policy.budget.oldFailurePeakRssKb === 2811820 && policy.budget.oldFailurePeakRssKb > policy.budget.oldMaxRssKb);
add("new-pass-peak", policy.budget.newPassPeakRssKb === 2850220 && policy.budget.newPassPeakRssKb < policy.budget.newMaxRssKb);
add("bounded-headroom", policy.budget.newHeadroomOverObservedPeakKb === 249780 && policy.budget.newHeadroomOverObservedPeakPercent > 8 && policy.budget.newHeadroomOverObservedPeakPercent < 9);
add("heap-unchanged", policy.unchangedLimits.heapMb === 1200 && policy.antiGaming.v8HeapIncreased === false);
add("internal-limit-unchanged", policy.unchangedLimits.turbopackMemoryLimitBytes === 1363148800 && policy.antiGaming.internalTurbopackMemoryLimitIncreased === false);
add("cpu-unchanged", policy.unchangedLimits.cpus === 1 && policy.antiGaming.cpusIncreased === 0);
add("timeouts-not-increased", policy.antiGaming.timeoutsIncreased === 0 && policy.unchangedLimits.compileTimeoutSeconds === 5400 && policy.unchangedLimits.generateTimeoutSeconds === 1800 && policy.unchangedLimits.defaultStallSeconds === 600 && policy.unchangedLimits.diagnosticPassStallSeconds === 120);
add("stage-denominator-retained", policy.unchangedLimits.stageDenominator === 14 && policy.antiGaming.stagesRemoved === 0);
add("tests-retained", policy.antiGaming.testsRemoved === 0 && policy.antiGaming.outputChecksRemoved === 0);
add("runner-default-updated", runner.includes('mode === "turbopack" ? 3100000 : 3250000'));
add("runner-old-default-absent", !runner.includes('mode === "turbopack" ? 2750000 : 3250000'));
add("runner-memory-fail-closed-retained", runner.includes("overMemorySamples >= memorySamplesRequired") && runner.includes('requestTermination("memory_budget")') && runner.includes("FAIL_MEMORY_BUDGET"));
add("runner-output-contract-retained", runner.includes("outputContractCheck()") && runner.includes("closeStandaloneRuntime"));
add("declared-old-failure-contract", policy.physicalEvidence.oldFailure.status === "FAIL_MEMORY_BUDGET" && policy.physicalEvidence.oldFailure.ok === false && policy.physicalEvidence.oldFailure.compileStatus === "FAIL_MEMORY_BUDGET" && policy.physicalEvidence.oldFailure.memoryBudgetExceeded === true && policy.physicalEvidence.oldFailure.generateStatus === "NOT_EXECUTED" && policy.physicalEvidence.oldFailure.outputContractOk === false && policy.physicalEvidence.oldFailure.sourceImmutable === true);
add("declared-new-pass-contract", policy.physicalEvidence.newPass.status === "PASS" && policy.physicalEvidence.newPass.ok === true && policy.physicalEvidence.newPass.compileStatus === "PASS" && policy.physicalEvidence.newPass.generateStatus === "PASS" && policy.physicalEvidence.newPass.outputContractOk === true && policy.physicalEvidence.newPass.runtimeClosureStatus === "PASS" && policy.physicalEvidence.newPass.sourceImmutable === true);
add("misclassified-pass-rejected", policy.antiGaming.misclassifiedReceiptRejected === true && policy.physicalEvidence.rejectedMisclassifiedAttempt.status === "PASS");
add("evidence-outside-source", policy.physicalEvidence.storedOutsideSource === true);
add("final-credit-fail-closed", policy.creditBoundary.localTurbopackBuildCreditAfterFinalFrozenRetest === false && policy.creditBoundary.exactWindowsCredit === false && policy.creditBoundary.stagingCredit === false && policy.creditBoundary.liveCredit === false && policy.creditBoundary.saleCredit === false);
add("global-fail-closed", policy.globalDecision === "NO_GO" && policy.live === false && policy.saleEnabled === false && policy.productionApproved === false && policy.worldClassProven === false);
add("migration-digest", declaredDigest === observedDigest, { declared: declaredDigest, observed: observedDigest });

let physicalEvidenceVerified = false;
if (evidenceRoot) {
  const realSourceRoot = fs.realpathSync(sourceRoot);
  const realEvidenceRoot = fs.realpathSync(evidenceRoot);
  add("evidence-root-outside-source", !realEvidenceRoot.startsWith(`${realSourceRoot}${path.sep}`) && realEvidenceRoot !== realSourceRoot, { realSourceRoot, realEvidenceRoot });
  const readBound = (name, bound) => {
    const target = path.resolve(evidenceRoot, bound.path);
    const rootPrefix = `${realEvidenceRoot}${path.sep}`;
    const realTarget = fs.realpathSync(target);
    add(`${name}-path-contained`, realTarget.startsWith(rootPrefix));
    const stat = fs.lstatSync(realTarget);
    add(`${name}-regular-file`, stat.isFile() && !stat.isSymbolicLink());
    const bytes = fs.readFileSync(realTarget);
    add(`${name}-bytes`, bytes.length === bound.bytes, { declared: bound.bytes, observed: bytes.length });
    add(`${name}-sha256`, sha256(bytes) === bound.sha256, { declared: bound.sha256, observed: sha256(bytes) });
    return { target: realTarget, bytes };
  };
  const oldReceiptFile = readBound("old-receipt", policy.physicalEvidence.oldFailure);
  const oldLogFile = readBound("old-log", { path: policy.physicalEvidence.oldFailure.compileLogPath, bytes: policy.physicalEvidence.oldFailure.compileLogBytes, sha256: policy.physicalEvidence.oldFailure.compileLogSha256 });
  const newReceiptFile = readBound("new-receipt", policy.physicalEvidence.newPass);
  const newLogFile = readBound("new-log", { path: policy.physicalEvidence.newPass.compileLogPath, bytes: policy.physicalEvidence.newPass.compileLogBytes, sha256: policy.physicalEvidence.newPass.compileLogSha256 });
  const rejectedFile = readBound("rejected-misclassified", policy.physicalEvidence.rejectedMisclassifiedAttempt);
  const manifestFile = readBound("evidence-manifest", { path: policy.physicalEvidence.manifestPath, bytes: policy.physicalEvidence.manifestBytes, sha256: policy.physicalEvidence.manifestSha256 });
  const oldReceipt = parseStrictJsonCli(oldReceiptFile.bytes.toString("utf8"), { maxBytes: 512 * 1024, maxDepth: 96, maxNodes: 500000, requireObject: true });
  const newReceipt = parseStrictJsonCli(newReceiptFile.bytes.toString("utf8"), { maxBytes: 512 * 1024, maxDepth: 96, maxNodes: 500000, requireObject: true });
  const rejectedReceipt = parseStrictJsonCli(rejectedFile.bytes.toString("utf8"), { maxBytes: 512 * 1024, maxDepth: 96, maxNodes: 500000, requireObject: true });
  const evidenceManifest = parseStrictJsonCli(manifestFile.bytes.toString("utf8"), { maxBytes: 256 * 1024, maxDepth: 32, maxNodes: 100000, requireObject: true });
  add("old-physical-failure", oldReceipt.status === "FAIL_MEMORY_BUDGET" && oldReceipt.ok === false && oldReceipt.mode === "turbopack" && oldReceipt.maxRssKb === 2750000 && oldReceipt.compile?.status === "FAIL_MEMORY_BUDGET" && oldReceipt.compile?.memoryBudgetExceeded === true && oldReceipt.compile?.peakRssKb === 2811820 && oldReceipt.compile?.maxRssKb === 2750000 && oldReceipt.compile?.exitCode === 143 && oldReceipt.generate === null && oldReceipt.outputContract?.ok === false && oldReceipt.runtimeClosure?.status === "NOT_EXECUTED" && oldReceipt.sourceImmutable === true);
  add("old-log-compiler-success-before-watchdog", oldLogFile.bytes.includes(Buffer.from("Compiled successfully")) && oldLogFile.bytes.includes(Buffer.from("Finalizing page optimization")));
  add("new-physical-pass", newReceipt.status === "PASS" && newReceipt.ok === true && newReceipt.mode === "turbopack" && newReceipt.maxRssKb === 3100000 && newReceipt.compile?.status === "PASS" && newReceipt.compile?.peakRssKb === 2850220 && newReceipt.compile?.maxRssKb === 3100000 && newReceipt.compile?.memoryBudgetExceeded === false && newReceipt.generate?.status === "PASS" && newReceipt.runtimeClosure?.status === "PASS" && newReceipt.outputContract?.ok === true && newReceipt.sourceImmutable === true);
  add("new-log-success", newLogFile.bytes.includes(Buffer.from("Compiled successfully")));
  add("rejected-receipt-really-pass", rejectedReceipt.status === "PASS" && rejectedReceipt.ok === true && rejectedReceipt.compile?.status === "PASS" && rejectedReceipt.outputContract?.ok === true);
  const manifestMap = new Map(evidenceManifest.files.map((row) => [row.path, row]));
  const boundPaths = [policy.physicalEvidence.oldFailure.path, policy.physicalEvidence.oldFailure.compileLogPath, policy.physicalEvidence.newPass.path, policy.physicalEvidence.newPass.compileLogPath, policy.physicalEvidence.rejectedMisclassifiedAttempt.path];
  add("manifest-binds-canonical-evidence", boundPaths.every((item) => manifestMap.has(item)));
  physicalEvidenceVerified = checks.every((row) => row.ok);
}

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p12.turbopack-rss-budget-migration-verification.v2",
  status: failed.length
    ? "FAIL_R44P12_TURBOPACK_RSS_BUDGET_MIGRATION"
    : evidenceRoot
      ? "PASS_R44P12_TURBOPACK_RSS_BUDGET_MIGRATION_PHYSICAL_NO_PROMOTION"
      : "PASS_R44P12_TURBOPACK_RSS_BUDGET_POLICY_ONLY_NO_PHYSICAL_CREDIT",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  physicalEvidenceRootProvided: Boolean(evidenceRoot),
  physicalEvidenceVerified,
  oldMaxRssKb: policy.budget.oldMaxRssKb,
  newMaxRssKb: policy.budget.newMaxRssKb,
  oldFailurePeakRssKb: policy.budget.oldFailurePeakRssKb,
  newPassPeakRssKb: policy.budget.newPassPeakRssKb,
  checksDetail: checks,
  failures: failed,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
