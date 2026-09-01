#!/usr/bin/env node
import { readFileSync } from "node:fs";
import {
  applyPass35A18TierValuePolicy,
  runPass35A18TierValueBenchmarkRuntime,
  verifyPass35A18TierValueBenchmarkRuntime,
  verifyPass35A18TierValuePolicy,
} from "../../lib/market-integrity/pass35-a18-tier-value-benchmark-runtime.mjs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks += 1; };
const product = readJson("config/pass35/product-tier-content-contract.json");
const policy = readJson("config/pass35/a18-tier-value-benchmark-policy.json");

check(verifyPass35A18TierValuePolicy(product, policy), "a18_policy_verify");
const applied = applyPass35A18TierValuePolicy(product, policy);
check(applied.passId === "PASS35_A18", "a18_policy_pass_id");
check(applied.surfaces.length === 7, "a18_surface_count");
check(applied.surfaces.find((row) => row.surfaceId === "pdf_delivery").tiers.pro.requiredEvidenceFamilies.includes("scenario_receipts"), "a18_pdf_pro_supplement");
check(applied.surfaces.find((row) => row.surfaceId === "whale_watch").tiers.advanced.requiredEvidenceFamilies.includes("cluster_methodology_validation"), "a18_whale_advanced_supplement");

const runtime = runPass35A18TierValueBenchmarkRuntime({ productContract: product, policy });
check(verifyPass35A18TierValueBenchmarkRuntime(runtime, policy), "a18_runtime_verify");
check(runtime.caseDenominator === 350, "a18_case_denominator");
check(runtime.outputDenominator === 1050, "a18_output_denominator");
check(runtime.comparisonDenominator === 700, "a18_comparison_denominator");
check(runtime.blindComparisonDenominator === 700, "a18_blind_denominator");
check(runtime.mutationDenominator === 5600, "a18_mutation_denominator");
check(runtime.structuralPassRate === 1, "a18_structural_pass_rate");
check(runtime.blindSelectionAccuracy === 1, "a18_blind_accuracy");
check(runtime.mutationKillRate === 1, "a18_mutation_kill_rate");
check(runtime.noSilentTierDowngrade, "a18_no_silent_downgrade");
check(runtime.noPageCountOnlyUpgrade, "a18_no_page_count_upgrade");
check(runtime.cleanOutputsNoCharge && runtime.mutantsNoCharge, "a18_no_charge");
check(!runtime.customerPurchaseWorthinessProven && !runtime.sellEnabled && !runtime.liveClaimed, "a18_truth_boundary");
check(Object.values(runtime.perSurface).every((row) => row.cases === 50 && row.outputs === 150 && row.comparisons === 100), "a18_per_surface_denominators");
check(Object.values(runtime.perSurface).every((row) => row.structuralPassRate === 1 && row.blindSelectionAccuracy === 1 && row.mutationKillRate === 1), "a18_per_surface_rates");
check(runtime.splitCounts.development === 210 && runtime.splitCounts.validation === 70 && runtime.splitCounts.frozen_test === 70, "a18_split_counts");
check(runtime.outputs.every((row) => row.outputClaimIds.length === row.sourceClaimIds.length && row.addedFactCount === 0), "a18_claim_integrity");
check(runtime.comparisons.every((row) => row.newFields.length >= 8), "a18_field_delta");
check(runtime.comparisons.every((row) => row.newEvidenceFamilies.length >= 2), "a18_evidence_delta");
check(runtime.comparisons.every((row) => row.newScenarios.length >= 1), "a18_scenario_delta");

const tampered = JSON.parse(JSON.stringify(runtime));
tampered.mutationKillRate = 0.5;
check(!verifyPass35A18TierValueBenchmarkRuntime(tampered, policy), "a18_integrity_tamper_detected");
const replay = runPass35A18TierValueBenchmarkRuntime({ productContract: product, policy });
check(replay.integrity.digest === runtime.integrity.digest, "a18_deterministic");

console.log(JSON.stringify({
  status: "PASS_A18_TIER_VALUE_BENCHMARK",
  checks,
  cases: runtime.caseDenominator,
  outputs: runtime.outputDenominator,
  comparisons: runtime.comparisonDenominator,
  blindComparisons: runtime.blindComparisonDenominator,
  mutations: runtime.mutationDenominator,
  structuralPassRate: runtime.structuralPassRate,
  blindSelectionAccuracy: runtime.blindSelectionAccuracy,
  mutationKillRate: runtime.mutationKillRate,
  sellEnabled: runtime.sellEnabled,
  customerPurchaseWorthinessProven: runtime.customerPurchaseWorthinessProven,
}, null, 2));
