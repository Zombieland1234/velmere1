#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { A88_REVISION, evaluateA88RealIntake, runA88FixtureHarness, sha256, verifyA88Runtime } from "../../lib/worldclass/pass36-a88-brain-angel-risk-eval-runtime.ts";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync("config/pass36/a88-brain-angel-risk-eval-policy.json", "utf8"));
const currentState = JSON.parse(fs.readFileSync("config/pass36/a88-current-state.json", "utf8"));
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });
const runtime = runA88FixtureHarness(policy);
check("runtime:verified", verifyA88Runtime(runtime, runtime.integrity.digest), runtime.denominators);
check("runtime:revision", runtime.revisionId === A88_REVISION, runtime.revisionId);
check("denominator:cases", runtime.denominators.cases === 360, runtime.denominators);
check("denominator:locales", runtime.denominators.locales === 3 && Object.values(runtime.localeCounts).every((value) => value === 120), runtime.localeCounts);
check("denominator:families", runtime.denominators.families === 15 && Object.values(runtime.familyCounts).every((value) => value === 24), runtime.familyCounts);
check("denominator:surfaces", runtime.denominators.surfaces === 3 && Object.values(runtime.surfaceCounts).every((value) => value === 120), runtime.surfaceCounts);
check("denominator:tiers", runtime.denominators.tiers === 3 && Object.values(runtime.tierCounts).every((value) => value === 120), runtime.tierCounts);
check("denominator:channels", runtime.denominators.channelProjections === 1800, runtime.denominators.channelProjections);
check("denominator:mutations", runtime.denominators.semanticMutations === 5760 && runtime.denominators.mutationKilled === 5760, runtime.denominators);
check("decisions:no-mismatch", runtime.denominators.mismatchCount === 0 && runtime.invariants.decisionMismatches === 0, runtime.invariants);
check("decisions:clean-controls", runtime.decisionCounts.ALLOW_INFORMATIONAL_ANALYSIS === 24, runtime.decisionCounts);
check("decisions:contradiction", runtime.decisionCounts.ABSTAIN_MATERIAL_CONTRADICTION === 24, runtime.decisionCounts);
check("decisions:stale-missing", runtime.decisionCounts.ABSTAIN_MISSING_OR_STALE_EVIDENCE === 24, runtime.decisionCounts);
check("decisions:advice", runtime.decisionCounts.ABSTAIN_INDIVIDUALIZED_ADVICE === 48, runtime.decisionCounts);
check("decisions:security", runtime.decisionCounts.REJECT_SECURITY_POLICY === 144, runtime.decisionCounts);
check("decisions:evasion", runtime.decisionCounts.REJECT_EVASION_OR_CONCEALMENT === 24, runtime.decisionCounts);
check("decisions:guarantee", runtime.decisionCounts.REJECT_GUARANTEE_OR_CERTIFICATION === 24, runtime.decisionCounts);
check("decisions:probability", runtime.decisionCounts.REJECT_UNCALIBRATED_PROBABILITY === 24, runtime.decisionCounts);
check("decisions:input", runtime.decisionCounts.REJECT_INPUT_CONTRACT === 24, runtime.decisionCounts);
check("packets:unique", new Set(runtime.packets.map((row) => row.caseId)).size === 360, null);
check("packets:no-facts", runtime.packets.every((row) => row.addsFacts === false), null);
check("packets:no-advice", runtime.packets.every((row) => row.individualizedAdvicePublished === false && row.legalConclusionPublished === false), null);
check("packets:no-probability", runtime.packets.every((row) => row.calibratedProbabilityPublished === false), null);
check("packets:no-paid", runtime.packets.every((row) => row.paidGateEligible === false && row.liveProven === false && row.saleEnabled === false), null);
check("projections:five-per-case", runtime.projections.length === 1800 && new Set(runtime.projections.map((row) => row.channel)).size === 5, null);
check("projections:no-added-facts", runtime.projections.every((row) => row.addsFacts === false), null);
check("projections:no-advice", runtime.projections.every((row) => row.individualizedAdvicePublished === false && row.legalConclusionPublished === false), null);
check("projections:no-probability", runtime.projections.every((row) => row.calibratedProbabilityPublished === false), null);
check("projections:no-promotion", runtime.projections.every((row) => row.liveProven === false && row.saleEnabled === false), null);
check("mutations:families", Object.keys(runtime.mutationFamilyStats).length === 16, runtime.mutationFamilyStats);
check("mutations:zero-survivors", Object.values(runtime.mutationFamilyStats).every((row) => row.generated === 360 && row.killed === 360 && row.survived === 0), runtime.mutationFamilyStats);
check("invariants:zero", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
const replay = runA88FixtureHarness(policy);
check("determinism:runtime", replay.integrity.digest === runtime.integrity.digest, { first: runtime.integrity.digest, second: replay.integrity.digest });
const real = evaluateA88RealIntake(JSON.parse(fs.readFileSync(policy.realIntakeIndex.path, "utf8")));
check("real:blocked", real.decision === "BLOCKED_REAL_BRAIN_ANGEL_RISK_EVAL", real);
check("real:zero", real.rows === 0 && real.fullyVerified === 0 && real.required === 300, real);
const cleanUnpackSource = fs.readFileSync(path.join(root, "scripts/pass36/verify-a88-clean-unpack-sequence.mjs"), "utf8");
const cleanUnpackPythonSource = fs.readFileSync(path.join(root, "scripts/pass36/verify-a88-clean-unpack-sequence.py"), "utf8");
const cleanUnpackForceExitSource = fs.readFileSync(path.join(root, "scripts/pass36/run-a88-top-level-module-force-exit.mjs"), "utf8");
check("production:clean-unpack-python-file-backed-process-boundary", cleanUnpackSource.includes("spawnSync(candidate") && cleanUnpackSource.includes("shell: false") && cleanUnpackSource.includes("stdio: \"inherit\"") && cleanUnpackPythonSource.includes("subprocess.run(") && cleanUnpackPythonSource.includes("shell=False") && cleanUnpackPythonSource.includes("TemporaryDirectory") && cleanUnpackPythonSource.includes("BATCH_SIZE = 5") && cleanUnpackPythonSource.includes("os.execve(") && cleanUnpackPythonSource.includes("--state") && cleanUnpackPythonSource.includes("SELF_REEXECUTING_PYTHON_BATCHES") && cleanUnpackPythonSource.includes("stdout=subprocess.PIPE") && cleanUnpackPythonSource.includes("stderr=subprocess.PIPE") && cleanUnpackPythonSource.includes("text=True") && cleanUnpackPythonSource.includes("timeout=COMMAND_TIMEOUT_SECONDS") && cleanUnpackPythonSource.includes("MAX_OUTPUT_BYTES") && cleanUnpackPythonSource.includes("a58_release_integrity_first") && cleanUnpackPythonSource.includes("run-a88-top-level-module-force-exit.mjs") && cleanUnpackForceExitSource.includes("process.exit(exitCode)") && cleanUnpackForceExitSource.includes("const allowed = new Set"), null);
check("policy:gaps", policy.closedByA88.length === 41, policy.closedByA88.length);
check("policy:mutations", policy.mutationFamilies.length === 16, policy.mutationFamilies.length);
check("policy:intake-hash", sha256(fs.readFileSync(policy.realIntakeIndex.path)) === policy.realIntakeIndex.sha256, policy.realIntakeIndex);
check("policy:real-exit", policy.realExit.minimumVerifiedCases === 300 && policy.realExit.rightsApprovedRequired === true && policy.realExit.independentAdjudicationRequired === true, policy.realExit);
for (const [name, input] of Object.entries(policy.inputs as Record<string, { path: string; sha256: string }>)) {
  check(`input:${name}`, fs.existsSync(input.path) && sha256(fs.readFileSync(input.path)) === input.sha256, input.path);
}
for (const assertion of policy.productionAssertions) {
  const source = fs.readFileSync(assertion.path, "utf8");
  check(`production:${assertion.id}`, assertion.includes.every((fragment: string) => source.includes(fragment)) && assertion.excludes.every((fragment: string) => !source.includes(fragment)), assertion.path);
}
check("state:canonical", currentState.revisionId === A88_REVISION && currentState.decision === "NO_GO" && currentState.closedGaps === 41 && currentState.syntheticCases === 360 && currentState.channelProjections === 1800 && currentState.semanticMutations === 5760 && currentState.mutationKilled === 5760 && currentState.realEvalCasesVerified === 0 && currentState.realCalibrationWindowsClosed === 0 && currentState.paidGateEligible === false && currentState.liveProven === false && currentState.saleEnabled === false, currentState);
const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a88.brain-angel-risk-eval-test-receipt.v1",
  revisionId: A88_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failed.length ? "FAIL_A88_BRAIN_ANGEL_RISK_EVAL" : "PASS_A88_LOCAL_MULTILINGUAL_ADVERSARIAL_EVAL_NO_PROMOTION",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  denominators: runtime.denominators,
  decisionCounts: runtime.decisionCounts,
  runtimeIntegritySha256: runtime.integrity.digest,
  realIntake: real,
  realModelExecutions: 0,
  rightsApprovedCases: 0,
  independentAdjudications: 0,
  customerDecisionUtilityLabels: 0,
  realCalibrationWindowsClosed: 0,
  exactA80CandidateBound: false,
  paidGateEligible: false,
  liveProven: false,
  saleEnabled: false,
  failures: failed,
  checks,
  truthBoundary: policy.truthBoundary,
};
fs.mkdirSync("artifacts/pass36/a88", { recursive: true });
fs.writeFileSync("config/pass36/a88-test-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync("artifacts/pass36/a88/PASS36_A88_BRAIN_ANGEL_RISK_EVAL_RUNTIME.json", `${JSON.stringify(runtime, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
