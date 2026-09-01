#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyzeA23RemediationCase, buildA23BenchmarkCase, runA23Benchmark, verifyA23Benchmark, verifyA23Policy, verifyA23RemediationReport } from "../../lib/security/pass35-a23-remediation-closure-runtime.mjs";
const read = (p) => JSON.parse(readFileSync(p, "utf8")); let assertions = 0; const check = (v, m) => { assert.ok(v, m); assertions += 1; };
const policy = read("config/pass35/a23-remediation-closure-policy.json"), a22 = read("config/pass35/a22-severity-triage-policy.json");
check(verifyA23Policy(policy), "policy"); const benchmark = runA23Benchmark(policy, a22); check(verifyA23Benchmark(benchmark, policy), "benchmark integrity");
check(benchmark.denominators.cases === 192 && benchmark.denominators.frozen === 72 && benchmark.denominators.mutations === 2304, "denominators");
check(benchmark.frozen.closureAccuracy === 1 && benchmark.frozen.unsafeClosureSuppression === 1 && benchmark.frozen.unsafeClosures === 0 && benchmark.frozen.falseBlocks === 0, "frozen metrics");
check(benchmark.mutation.killRate === 1 && benchmark.mutation.killed === 2304, "mutation metrics");
const closable = buildA23BenchmarkCase("ACCESS_CONTROL_BYPASS", true, 7, policy); const closed = analyzeA23RemediationCase(closable, policy, a22);
check(closed.status === "VERIFIED_LOCAL_CLOSURE_CONTRACT" && closed.localClosureContractVerified === true && closed.blockers.length === 0, "closable case");
check(closed.requiredRetestControls.length === policy.requiredControlsByFindingFamily.ACCESS_CONTROL_BYPASS.length && closed.retests.every((row) => row.passed), "retest matrix");
check(closed.patchImpactGraph.cycle === false && closed.originalFinding.affectedComponents.every((component) => closed.patch.changedComponents.includes(component)), "impact graph");
check(closed.postTriage.highestSeverity === "SUPPRESSED" && closed.regressionFindingSeverities.length === 0, "post triage");
check(closed.signedCustomerClosureEligible === false && closed.signedClosure === false && closed.paidGateEligible === false && closed.advancedDeliveryAllowed === false, "truth boundary");
check(verifyA23RemediationReport(closed), "report verify"); const tampered = structuredClone(closed); tampered.paidGateEligible = true; check(!verifyA23RemediationReport(tampered), "tamper rejection");
const blocked = analyzeA23RemediationCase(buildA23BenchmarkCase("ACCESS_CONTROL_BYPASS", false, 4, policy), policy, a22); check(blocked.status === "BLOCKED" && blocked.localClosureContractVerified === false && blocked.blockers.some((x) => x.startsWith("a23_post_severity_not_closed")), "reopened severity blocked");
console.log(JSON.stringify({ status: "PASS_A23_EVIDENCE_BOUND_REMEDIATION_CLOSURE", assertions, cases: benchmark.denominators.cases, frozen: benchmark.denominators.frozen, mutations: benchmark.denominators.mutations, closureAccuracy: benchmark.frozen.closureAccuracy, unsafeClosureSuppression: benchmark.frozen.unsafeClosureSuppression, paidGateEligible: false }, null, 2));
