#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const contract = JSON.parse(readFileSync("config/pass35/market-impact-whale-tier-contract.json", "utf8"));
const product = JSON.parse(readFileSync("config/pass35/product-tier-content-contract.json", "utf8"));
const summary = JSON.parse(readFileSync("artifacts/release/PASS35_A17_PRODUCT_ROADMAP_SUMMARY.json", "utf8"));
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
check(contract.schemaVersion === "velmere.pass35.market-impact-whale-tier-contract.v1", "schema");
check(contract.passId === "PASS35_A11", "pass");
check(contract.sourceRevisionId === product.sourceRevisionId, "revision");
check(contract.visualChangesMade === false, "visual");
check(contract.surfaceTierMatrices.length === 6, "tier matrices");
check(contract.providerRuntime.orderBookFamilies.join(",") === "binance,mexc,coinbase,kraken", "order book providers");
check(contract.corpus.marketImpactCases === 60 && contract.corpus.whaleWatchCases === 60 && contract.corpus.generatedTierPackets === 360, "corpus");
check(contract.sellEnabled === false && contract.paidDeliveryEligible === false, "billing lock");
for (const surfaceId of ["market_impact", "whale_watch"]) {
  const surface = product.surfaces.find((row) => row.surfaceId === surfaceId);
  check(Boolean(surface), `surface:${surfaceId}`);
  for (const tier of ["basic", "pro", "advanced"]) {
    const row = contract.surfaceTierMatrices.find((item) => item.surfaceId === surfaceId && item.tier === tier);
    check(Boolean(row), `matrix:${surfaceId}:${tier}`);
    check(row.requiredFieldCount >= 15, `fields:${surfaceId}:${tier}`);
    check(row.minimumIndependentEvidenceFamilies === ({ basic: 1, pro: 2, advanced: 3 })[tier], `quorum:${surfaceId}:${tier}`);
    check(row.failClosedIf.length >= 7, `fail closed:${surfaceId}:${tier}`);
    check(row.purchaseValueReason.length > 100, `purchase value:${surfaceId}:${tier}`);
  }
}
const impactBasic = contract.surfaceTierMatrices.find((row) => row.surfaceId === "market_impact" && row.tier === "basic");
const impactAdvanced = contract.surfaceTierMatrices.find((row) => row.surfaceId === "market_impact" && row.tier === "advanced");
const whaleBasic = contract.surfaceTierMatrices.find((row) => row.surfaceId === "whale_watch" && row.tier === "basic");
const whaleAdvanced = contract.surfaceTierMatrices.find((row) => row.surfaceId === "whale_watch" && row.tier === "advanced");
check(impactBasic.requiredScenarios.length === 0, "impact basic scenario leak");
check(impactAdvanced.requiredScenarios.includes("spread_x3_depth_minus_50"), "impact advanced stress missing");
check(!whaleBasic.requiredFields.some((field) => field.includes("cluster")), "whale basic cluster leak");
check(whaleAdvanced.requiredFields.includes("holder_exit_stress_by_fraction"), "whale exit stress missing");
check(contract.integration.frontendHookupDeferredToCodex === true, "frontend ownership");
check(summary.canonicalWeightedPlanningPercent === 41.9, "canonical percent");
check(summary.canonicalStrictDonePercent === 9.3, "strict percent");
check(summary.zeroBudgetWeightedPlanningPercent === 82.1, "zero budget percent");
check(contract.realProviderCoverageStatus === "NOT_EXECUTED_FULL_CATALOG", "real provider truth");
console.log(JSON.stringify({ status: "PASS_A11_MARKET_IMPACT_WHALE_TIER_CONTRACT", checks, matrices: contract.surfaceTierMatrices.length, visualChangesMade: false, sellEnabled: false }, null, 2));
