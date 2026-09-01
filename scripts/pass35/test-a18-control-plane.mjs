#!/usr/bin/env node
import { readFileSync } from "node:fs";
import {
  verifyPass35A18TierValueBenchmarkRuntime,
  verifyPass35A18TierValuePolicy,
} from "../../lib/market-integrity/pass35-a18-tier-value-benchmark-runtime.mjs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks += 1; };

const policy = readJson("config/pass35/a18-tier-value-benchmark-policy.json");
const product = readJson("config/pass35/product-tier-content-contract.json");
const runtime = readJson("artifacts/pass35/PASS35_A18_TIER_VALUE_BENCHMARK_RUNTIME.json");
const receipt = readJson("artifacts/pass35/PASS35_A18_TIER_VALUE_BENCHMARK_RECEIPT.json");
const contract = readJson("config/pass35/a18-tier-value-runtime-contract.json");
const summary = readJson("artifacts/release/PASS35_A18_PRODUCT_ROADMAP_SUMMARY.json");
const status = readJson("config/pass35/current-status-register.json");
const zero = readJson("config/pass35/zero-budget-functional-roadmap.json");
const current = readJson("config/current-release.json");
const roadmap = readFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", "utf8");
const readme = readFileSync("README.md", "utf8");

check(policy.passId === "PASS35_A18", "a18_policy_pass");
check(verifyPass35A18TierValuePolicy(product, policy), "a18_policy_contract_verify");
check(verifyPass35A18TierValueBenchmarkRuntime(runtime, policy), "a18_runtime_verify");
check(receipt.status === "PASS_FUNCTIONAL_OFFLINE_NOT_FOR_SALE", "a18_receipt_status");
check(receipt.denominators.cases === 350 && receipt.denominators.outputs === 1050 && receipt.denominators.mutations === 5600, "a18_receipt_denominators");
check(receipt.results.structuralPassRate === 1 && receipt.results.blindSelectionAccuracy === 1 && receipt.results.mutationKillRate === 1, "a18_receipt_rates");
check(!receipt.customerPurchaseWorthinessProven && !receipt.sellEnabled && !receipt.chargeAllowed && !receipt.liveClaimed, "a18_receipt_truth");
check(contract.canonicalWeightedPlanningPercent === 43 && contract.canonicalStrictDonePercent === 9.3, "a18_contract_canonical");
check(contract.zeroBudgetWeightedPlanningPercent === 83.3 && contract.zeroBudgetCoreDenominator === 45, "a18_contract_zero");
check(contract.progressDeltaVsA17.canonicalPercentagePoints === 1.1 && contract.progressDeltaVsA17.zeroBudgetPercentagePoints === 1.2, "a18_delta_a17");
check(contract.progressDeltaVsA16.canonicalPercentagePoints === 2.3 && contract.progressDeltaVsA16.zeroBudgetPercentagePoints === 3.3, "a18_delta_a16");
check(summary.canonicalWeightedPlanningPercent === 43 && summary.zeroBudgetWeightedPlanningPercent === 83.3, "a18_summary_math");
check(summary.sellEnabledCount === 0 && summary.globalDecision === "NO_GO", "a18_summary_no_go");

const statusCounts = Object.fromEntries(status.allowedStatuses.map((stateName) => [stateName, status.rows.filter((row) => row.status === stateName).length]));
check(status.rows.length === 43, "a18_status_denominator");
check(statusCounts.DONE === 4 && statusCounts.PARTIAL === 29 && statusCounts.BLOCKED_EXTERNAL === 9 && statusCounts.NOT_DONE === 1, "a18_status_counts");
check(status.rows.find((row) => row.id === "BENCH01_CANONICAL_CORPUS").status === "PARTIAL", "a18_bench_partial");
check(status.rows.find((row) => row.id === "BENCH01_CANONICAL_CORPUS").doneEvidence.some((row) => row.includes("5600-mutation")), "a18_bench_evidence");
check(status.sellEnabledCount === 0 && status.globalDecision === "NO_GO", "a18_status_no_go");
check(status.truthBoundary.startsWith("PASS35 A18 is the only canonical current status."), "a18_status_truth");

const excluded = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !excluded.has(row.id));
const zeroCounts = {
  DONE: core.filter((row) => row.status === "DONE").length,
  PARTIAL: core.filter((row) => row.status === "PARTIAL").length,
  NOT_DONE: core.filter((row) => row.status === "NOT_DONE").length,
};
check(core.length === 45, "a18_zero_denominator");
check(zeroCounts.DONE === 31 && zeroCounts.PARTIAL === 13 && zeroCounts.NOT_DONE === 1, "a18_zero_counts");
check(["ZB45_TIER_INCREMENTAL_VALUE_BENCHMARK", "ZB46_TIER_VALUE_MUTATION_FILLER_DEFENSE", "ZB47_NO_SILENT_DOWNGRADE_NO_CHARGE_RUNTIME"].every((id) => zero.capabilities.find((row) => row.id === id)?.status === "DONE"), "a18_zero_new_done");

check(current.sourceRevisionId === "VELMERE_PASS35_A18_TIER_VALUE_BENCHMARK_AND_DOWNGRADE_GUARD_NON_VISUAL", "a18_current_revision");
check(current.sourceRevisionStatus === "A18_TIER_VALUE_BENCHMARK_DOWNGRADE_GUARD_IMPLEMENTED_LIVE_UNCLAIMED", "a18_current_status");
check(current.a18TierValueContractPath === "config/pass35/a18-tier-value-runtime-contract.json", "a18_current_contract");
check(readme.includes("source revision `VELMERE_PASS35_A18_TIER_VALUE_BENCHMARK_AND_DOWNGRADE_GUARD_NON_VISUAL`"), "a18_readme_revision");
check(readme.includes("## PASS35 A18 local changes"), "a18_readme_section");

check(roadmap.startsWith("====================================================================================================\nPASS35 A18"), "a18_roadmap_current_header");
check(roadmap.includes("A16 START: 40.7% canonical / 80% ZERO-BUDGET"), "a18_roadmap_a16_start");
check(roadmap.includes("A17 BASELINE: 41.9% canonical / 82.1% ZERO-BUDGET"), "a18_roadmap_a17_baseline");
check(roadmap.includes("A18 CURRENT: 43% canonical weighted / 9.3% strict; 83.3% ZERO-BUDGET"), "a18_roadmap_current_math");
check(roadmap.includes("HISTORYCZNE PODSUMOWANIE A17 I WCZEŚNIEJSZYCH FAL"), "a18_roadmap_history");
check(!roadmap.includes("PASS35 A17 is the only canonical current status."), "a18_no_stale_current_truth");
check(roadmap.includes("PASS35 A17 was canonical at that historical checkpoint and does not override A18."), "a18_history_truth_rewritten");
check((roadmap.match(/^PASS35 A17 —/gmu) ?? []).length === 1, "a18_history_a17_heading_once");
check((roadmap.match(/^PASS35 A16 —/gmu) ?? []).length === 1, "a18_history_a16_heading_once");
check((roadmap.match(/^PASS35 A15 —/gmu) ?? []).length === 1, "a18_history_a15_heading_once");
check((roadmap.match(/PASS35 A17 was canonical at that historical checkpoint and does not override A18\./gu) ?? []).length === 1, "a18_history_truth_once");
check(roadmap.includes("PASS35 A16 was canonical at that historical checkpoint and does not override A17."), "a18_history_a16_truth_preserved");
check(roadmap.includes("Canonical institutional roadmap: 40.7% weighted / 9.3% strict"), "a18_history_a16_math_preserved");
check(roadmap.includes("5600 mutations"), "a18_roadmap_mutations");
check(roadmap.includes("Clean synthetic outputs also remain not-for-sale"), "a18_roadmap_sell_boundary");

check(product.passId === "PASS35_A18", "a18_product_pass");
check(product.sourceRevisionId === "VELMERE_PASS35_A18_TIER_VALUE_BENCHMARK_AND_DOWNGRADE_GUARD_NON_VISUAL", "a18_product_revision");
check(product.a18TierValuePolicy?.supplementalEvidenceFamilyRuleCount === 5, "a18_product_policy_binding");
check(product.surfaces.find((row) => row.surfaceId === "pdf_delivery").tiers.pro.requiredEvidenceFamilies.includes("scenario_receipts"), "a18_product_pdf_pro_family");
check(product.surfaces.find((row) => row.surfaceId === "real_markets").tiers.advanced.requiredEvidenceFamilies.includes("macro_factor_reference"), "a18_product_real_advanced_family");

console.log(JSON.stringify({
  status: "PASS_A18_CONTROL_PLANE",
  checks,
  canonicalWeightedPlanningPercent: contract.canonicalWeightedPlanningPercent,
  canonicalStrictDonePercent: contract.canonicalStrictDonePercent,
  zeroBudgetWeightedPlanningPercent: contract.zeroBudgetWeightedPlanningPercent,
  statusCounts,
  zeroCounts,
  sellEnabled: false,
  visualChangesMade: false,
}, null, 2));
