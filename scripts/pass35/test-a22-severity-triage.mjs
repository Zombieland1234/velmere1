#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  analyzeA22SeverityCase,
  buildA22BenchmarkCase,
  runA22Benchmark,
  verifyA22Benchmark,
  verifyA22Policy,
  verifyA22SeverityReport,
} from "../../lib/security/pass35-a22-severity-triage-runtime.mjs";

const policy = JSON.parse(readFileSync("config/pass35/a22-severity-triage-policy.json", "utf8"));
let assertions = 0; const check = (value, message) => { assert.ok(value, message); assertions += 1; };
check(verifyA22Policy(policy), "policy invalid");

const critical = analyzeA22SeverityCase(buildA22BenchmarkCase("PUBLIC_PROTOCOL_DRAIN_CRITICAL", true, 5), policy);
check(verifyA22SeverityReport(critical), "critical receipt invalid");
check(critical.highestSeverity === "CRITICAL" && critical.findings[0].criticalJustified, "critical evidence requirements not enforced");
check(critical.findings[0].confidenceBand === "HIGH" && critical.findings[0].evidenceFamilies.length === 3, "critical evidence/confidence invalid");

const unknown = analyzeA22SeverityCase(buildA22BenchmarkCase("UNKNOWN_PATH_CAPPED_HIGH", true, 6), policy);
check(unknown.highestSeverity === "HIGH", "unknown path was not capped at high");
check(unknown.findings[0].capsApplied.includes("UNKNOWN_PATH_HIGH_CAP") && unknown.findings[0].confidence <= policy.confidence.unknownPathCap, "unknown path uncertainty boundary missing");

const unreachable = analyzeA22SeverityCase(buildA22BenchmarkCase("UNREACHABLE_SUPPRESSED", true, 7), policy);
check(unreachable.highestSeverity === "SUPPRESSED" && unreachable.findings[0].suppressed, "unreachable finding not suppressed");
check(unreachable.findings[0].capsApplied.includes("UNREACHABLE_PATH_SUPPRESSED"), "suppression reason missing");

const missingAsset = analyzeA22SeverityCase(buildA22BenchmarkCase("MISSING_ASSET_CAPPED_MEDIUM", true, 5), policy);
check(missingAsset.highestSeverity === "MEDIUM" && missingAsset.findings[0].capsApplied.includes("MISSING_ASSET_MEDIUM_CAP"), "missing asset cap invalid");

const conflicted = analyzeA22SeverityCase(buildA22BenchmarkCase("CONFLICTED_EVIDENCE_HIGH_CAP", true, 5), policy);
check(conflicted.highestSeverity === "HIGH" && conflicted.findings[0].confidence <= policy.confidence.conflictedEvidenceCap, "conflicted evidence cap invalid");

const chain = analyzeA22SeverityCase(buildA22BenchmarkCase("THREE_STEP_ATTACK_CHAIN_CRITICAL", true, 5), policy);
check(chain.attackChains.some((row) => row.length === 3 && row.class === "THREE_PLUS_STEP"), "three-step attack chain missing");
check(chain.highestSeverity === "CRITICAL" && chain.findings.every((row) => row.chainClass === "THREE_PLUS_STEP"), "attack-chain severity binding invalid");

const invalid = analyzeA22SeverityCase({ ...buildA22BenchmarkCase("PUBLIC_PROTOCOL_DRAIN_CRITICAL", true, 1), subjectBinding: { chainId: "1", contractAddress: "0x1234", exact: true } }, policy);
check(invalid.status === "BLOCKED" && invalid.blockers.includes("a22_address_invalid"), "invalid subject did not fail closed");

const cyclicInput = buildA22BenchmarkCase("THREE_STEP_ATTACK_CHAIN_CRITICAL", true, 1);
cyclicInput.attackEdges.push({ from: cyclicInput.findings[2].findingId, to: cyclicInput.findings[0].findingId, type: "ENABLES", evidenceRef: "cycle-evidence" });
const cyclic = analyzeA22SeverityCase(cyclicInput, policy);
check(cyclic.status === "BLOCKED" && cyclic.blockers.includes("a22_attack_chain_cycle"), "attack-chain cycle did not fail closed");

const tampered = structuredClone(critical); tampered.paidGateEligible = true;
check(verifyA22SeverityReport(tampered) === false, "tampered report accepted");
check(critical.paidGateEligible === false && critical.fullAuditClaimAllowed === false && critical.exploitabilityClaimAllowed === false, "local triage unlocked paid/full/exploitability claim");

const benchmark = runA22Benchmark(policy);
check(verifyA22Benchmark(benchmark, policy), `benchmark verification failed:${benchmark.failedGates.join(",")}`);
check(benchmark.denominators.cases === 192 && benchmark.denominators.frozen === 72 && benchmark.denominators.mutations === 2304, "benchmark denominators invalid");
check(benchmark.frozen.severityAccuracy === 1 && benchmark.frozen.suppressionAccuracy === 1, "frozen accuracy invalid");
check(benchmark.frozen.raterExactAgreement === 1 && benchmark.frozen.weightedKappa === 1, "rater consistency invalid");
check(benchmark.frozen.falseCriticalRemediated === 0 && benchmark.frozen.unjustifiedCritical === 0, "false/unjustified critical finding present");
check(benchmark.mutation.killed === 2304 && benchmark.mutation.killRate === 1, "mutation campaign invalid");
check(benchmark.paidGateEligible === false && benchmark.independentHumanRatersClaimed === false, "synthetic benchmark overclaimed");

console.log(JSON.stringify({
  status: "PASS_A22_EVIDENCE_BOUND_SEVERITY_TRIAGE",
  assertions,
  cases: benchmark.denominators.cases,
  frozen: benchmark.denominators.frozen,
  mutations: benchmark.denominators.mutations,
  severityAccuracy: benchmark.frozen.severityAccuracy,
  suppressionAccuracy: benchmark.frozen.suppressionAccuracy,
  weightedKappa: benchmark.frozen.weightedKappa,
  paidGateEligible: false,
}, null, 2));
