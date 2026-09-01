#!/usr/bin/env node
import { readFileSync } from "node:fs";
import {
  verifyA19RuntimePolicy,
  verifyA19ExactRuntimeEvaluation,
} from "../../lib/runtime/pass35-a19-exact-runtime-bootstrap.mjs";
import {
  verifyA19AuditStaticPolicy,
  verifyA19AuditStaticBenchmark,
} from "../../lib/security/pass35-a19-audit-static-benchmark-runtime.mjs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks += 1; };
const REVISION = "VELMERE_PASS35_A19_EXACT_RUNTIME_AND_AUDIT_STATIC_BENCHMARK_NON_VISUAL";

const runtimePolicy = readJson("config/pass35/a19-exact-runtime-bootstrap-policy.json");
const runtimeEvaluation = readJson("artifacts/pass35/PASS35_A19_EXACT_RUNTIME_BOOTSTRAP_EVALUATION.json");
const auditPolicy = readJson("config/pass35/a19-audit-static-benchmark-policy.json");
const auditRuntime = readJson("artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RUNTIME.json");
const auditReceipt = readJson("artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RECEIPT.json");
const contract = readJson("config/pass35/a19-exact-runtime-audit-static-runtime-contract.json");
const summary = readJson("artifacts/release/PASS35_A19_PRODUCT_ROADMAP_SUMMARY.json");
const status = readJson("config/pass35/current-status-register.json");
const zero = readJson("config/pass35/zero-budget-functional-roadmap.json");
const current = readJson("config/current-release.json");
const roadmap = readFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", "utf8");
const readme = readFileSync("README.md", "utf8");

check(runtimePolicy.passId === "PASS35_A19" && runtimePolicy.sourceRevisionId === REVISION, "a19_runtime_policy_identity");
check(verifyA19RuntimePolicy(runtimePolicy), "a19_runtime_policy_verify");
check(verifyA19ExactRuntimeEvaluation(runtimePolicy, runtimeEvaluation), "a19_runtime_evaluation_verify");
check(runtimeEvaluation.status === "BLOCKED_EXACT_RUNTIME_NOT_EXECUTED" && runtimeEvaluation.blockers.length === 12, "a19_runtime_blocked_truth");
check(!runtimeEvaluation.exactRuntimeProven && !runtimeEvaluation.promotionAllowed && !runtimeEvaluation.sellEnabled, "a19_runtime_no_false_credit");
check(runtimeEvaluation.node.expectedVersion === "v24.18.0" && runtimeEvaluation.npm.expectedVersion === "11.16.0", "a19_runtime_expected_versions");
check(runtimeEvaluation.node.observedVersion === "v22.16.0" && runtimeEvaluation.npm.observedVersion === "10.9.2", "a19_runtime_observed_versions");
check(runtimeEvaluation.requiredCommands.length === 9 && runtimeEvaluation.requiredCommands.every((row) => row.passed === false), "a19_runtime_matrix_unexecuted");

check(auditPolicy.passId === "PASS35_A19" && auditPolicy.sourceRevisionId === REVISION, "a19_audit_policy_identity");
check(verifyA19AuditStaticPolicy(auditPolicy), "a19_audit_policy_verify");
check(verifyA19AuditStaticBenchmark(auditRuntime, auditPolicy), "a19_audit_runtime_verify");
check(auditRuntime.localStaticBenchmarkPass && auditRuntime.failedGates.length === 0, "a19_audit_local_pass");
check(auditRuntime.denominators.families === 15 && auditRuntime.denominators.cases === 240 && auditRuntime.denominators.vulnerable === 120 && auditRuntime.denominators.remediated === 120, "a19_audit_denominators");
check(auditRuntime.denominators.development === 90 && auditRuntime.denominators.validation === 60 && auditRuntime.denominators.frozenTest === 90, "a19_audit_splits");
check(auditRuntime.denominators.mutations === 2880 && auditRuntime.denominators.mutationTypes === 12, "a19_audit_mutation_denominator");
check(auditRuntime.frozen.recall === 1 && auditRuntime.frozen.specificity === 1 && auditRuntime.frozen.precision === 1 && auditRuntime.frozen.f1 === 1 && auditRuntime.frozen.severityAccuracy === 1, "a19_audit_frozen_metrics");
check(auditRuntime.mutation.killed === 2880 && auditRuntime.mutation.killRate === 1, "a19_audit_mutations");
check(!auditRuntime.paidGateEligible && !auditRuntime.fullAuditClaimAllowed && !auditRuntime.independentExternalFamily && !auditRuntime.customerPurchaseWorthinessProven, "a19_audit_claim_boundary");
check(auditReceipt.status === "PASS_LOCAL_SYNTHETIC_STATIC_BENCHMARK_NOT_FOR_SALE", "a19_audit_receipt_status");
check(!auditReceipt.sellEnabled && !auditReceipt.chargeAllowed && !auditReceipt.liveClaimed && !auditReceipt.exploitabilityProven, "a19_audit_receipt_truth");

check(contract.passId === "PASS35_A19" && contract.sourceRevisionId === REVISION, "a19_contract_identity");
check(contract.canonicalWeightedPlanningPercent === 44.2 && contract.canonicalStrictDonePercent === 9.3, "a19_contract_canonical");
check(contract.zeroBudgetWeightedPlanningPercent === 85.1 && contract.zeroBudgetCoreDenominator === 47, "a19_contract_zero");
check(contract.progressDeltaVsA18.canonicalPercentagePoints === 1.2 && contract.progressDeltaVsA18.zeroBudgetPercentagePoints === 1.8, "a19_delta_a18");
check(contract.progressDeltaVsA16.canonicalPercentagePoints === 3.5 && contract.progressDeltaVsA16.zeroBudgetPercentagePoints === 5.1, "a19_delta_a16");
check(!contract.sellEnabled && !contract.chargeAllowed && !contract.paidDeliveryAllowed && !contract.liveClaimed && !contract.visualChangesMade, "a19_contract_boundaries");
check(summary.canonicalWeightedPlanningPercent === 44.2 && summary.zeroBudgetWeightedPlanningPercent === 85.1, "a19_summary_math");
check(summary.sellEnabledCount === 0 && summary.globalDecision === "NO_GO", "a19_summary_no_go");

const statusCounts = Object.fromEntries(status.allowedStatuses.map((stateName) => [stateName, status.rows.filter((row) => row.status === stateName).length]));
check(status.rows.length === 43, "a19_status_denominator");
check(statusCounts.DONE === 4 && statusCounts.PARTIAL === 30 && statusCounts.BLOCKED_EXTERNAL === 9 && statusCounts.NOT_DONE === 0, "a19_status_counts");
check(status.rows.find((row) => row.id === "SRC02_EXACT_RUNTIME_NODE_NPM")?.status === "PARTIAL", "a19_src02_partial");
check(status.rows.find((row) => row.id === "AUD05_A05_LOCAL_STATIC_LANES")?.doneEvidence.some((row) => row.includes("2880/2880 mutation campaign")), "a19_aud05_evidence");
check(status.sellEnabledCount === 0 && status.globalDecision === "NO_GO", "a19_status_no_go");
check(status.truthBoundary.startsWith("PASS35 A19 is the only canonical current status."), "a19_status_truth");

const excluded = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !excluded.has(row.id));
const zeroCounts = {
  DONE: core.filter((row) => row.status === "DONE").length,
  PARTIAL: core.filter((row) => row.status === "PARTIAL").length,
  NOT_DONE: core.filter((row) => row.status === "NOT_DONE").length,
};
check(core.length === 47, "a19_zero_denominator");
check(zeroCounts.DONE === 34 && zeroCounts.PARTIAL === 12 && zeroCounts.NOT_DONE === 1, "a19_zero_counts");
check(["ZB09_AUDIT_BASIC_AUTOMATED", "ZB48_AUDIT_STATIC_PRESCREEN_FROZEN_BENCHMARK", "ZB49_EXACT_RUNTIME_BOOTSTRAP_FAIL_CLOSED"].every((id) => zero.capabilities.find((row) => row.id === id)?.status === "DONE"), "a19_zero_new_done");

check(current.sourceRevisionId === REVISION, "a19_current_revision");
check(current.sourceRevisionStatus === "A19_EXACT_RUNTIME_BOOTSTRAP_AND_AUDIT_STATIC_BENCHMARK_IMPLEMENTED_EXECUTION_LIVE_UNCLAIMED", "a19_current_status");
check(current.a19RuntimeContractPath === "config/pass35/a19-exact-runtime-audit-static-runtime-contract.json", "a19_current_contract");
check(current.a19ExactRuntimeEvaluationPath === "artifacts/pass35/PASS35_A19_EXACT_RUNTIME_BOOTSTRAP_EVALUATION.json", "a19_current_runtime_evaluation");
check(current.a19AuditStaticReceiptPath === "artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RECEIPT.json", "a19_current_audit_receipt");
check(readme.includes(`source revision \`${REVISION}\``), "a19_readme_revision");
check(readme.includes("## PASS35 A19 local changes"), "a19_readme_section");

check(roadmap.startsWith("====================================================================================================\nPASS35 A19 — EXACT RUNTIME BOOTSTRAP + AUDIT STATIC BENCHMARK (NON-VISUAL)"), "a19_roadmap_current_header");
check(roadmap.includes("A16 START: 40.7% canonical / 80% ZERO-BUDGET"), "a19_roadmap_a16_start");
check(roadmap.includes("A18 BASELINE: 43% canonical / 83.3% ZERO-BUDGET"), "a19_roadmap_a18_baseline");
check(roadmap.includes("A19 CURRENT: 44.2% canonical weighted / 9.3% strict; 85.1% ZERO-BUDGET"), "a19_roadmap_current_math");
check(roadmap.includes("HISTORYCZNE PODSUMOWANIE A18 I WCZEŚNIEJSZYCH FAL"), "a19_roadmap_history");
check(!roadmap.includes("PASS35 A18 is the only canonical current status."), "a19_no_stale_current_truth");
check(roadmap.includes("PASS35 A18 was canonical at that historical checkpoint and does not override A19."), "a19_history_truth_rewritten");
check((roadmap.match(/^PASS35 A18 —/gmu) ?? []).length === 1, "a19_history_a18_heading_once");
check((roadmap.match(/^PASS35 A17 —/gmu) ?? []).length === 1, "a19_history_a17_heading_once");
check((roadmap.match(/^PASS35 A16 —/gmu) ?? []).length === 1, "a19_history_a16_heading_once");
check((roadmap.match(/^PASS35 A15 —/gmu) ?? []).length === 1, "a19_history_a15_heading_once");
check(roadmap.includes("240 cases (120 vulnerable / 120 remediated)"), "a19_roadmap_audit_denominator");
check(roadmap.includes("2880/2880"), "a19_roadmap_mutations");

console.log(JSON.stringify({
  status: "PASS_A19_CONTROL_PLANE",
  checks,
  canonicalWeightedPlanningPercent: contract.canonicalWeightedPlanningPercent,
  canonicalStrictDonePercent: contract.canonicalStrictDonePercent,
  zeroBudgetWeightedPlanningPercent: contract.zeroBudgetWeightedPlanningPercent,
  statusCounts,
  zeroCounts,
  exactRuntimeProven: false,
  localStaticBenchmarkPass: true,
  sellEnabled: false,
  visualChangesMade: false,
}, null, 2));
