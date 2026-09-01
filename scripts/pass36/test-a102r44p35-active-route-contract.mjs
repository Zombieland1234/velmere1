#!/usr/bin/env node
import fs from "node:fs";

const route = fs.readFileSync("lib/server/market-integrity-route-modules/market-intelligence.ts", "utf8");
const angel = fs.readFileSync("lib/server/lazy-route-modules/angel.ts", "utf8");
const decision = fs.readFileSync("lib/intelligence/vlm-standalone-decision-support.ts", "utf8");
const angelPanel = fs.readFileSync("components/angel/AngelPanel.tsx", "utf8");
const impactTruth = fs.readFileSync("lib/market-integrity/market-impact-customer-truth.ts", "utf8");
const rows = [];
const add = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });

add("route-uses-canonical-impact-truth", route.includes("const marketImpactTruth = marketImpact.customerTruth"));
add("route-imports-whale-truth", route.includes("buildWhaleWatchCustomerTruth"));
add("route-imports-risk-projection", route.includes("buildRiskIndicatorProjection"));
add("route-imports-risk-customer-truth", route.includes("buildRiskIndicatorCustomerTruth"));
add("route-builds-whale-without-basic-product-lock", !/let whaleWatch:[\s\S]{0,220}if \(selectedDepth !== "basic"\)/u.test(route));
add("route-no-whale-required-tier-pro", !route.includes('requiredTier: "pro"'));
add("route-returns-risk-indicator", /riskIndicator,/u.test(route));
add("route-returns-risk-indicator-truth", /riskIndicatorTruth,/u.test(route));
add("route-returns-impact-truth", /marketImpactTruth,/u.test(route));
add("route-returns-whale-truth", /whaleWatchTruth,/u.test(route));
add("route-context-depth-only", route.includes("truthInvariantAcrossDepth: true") && route.includes("payment never changes the underlying module result"));
add("route-early-product-truth", route.includes("reportContextChangesPresentationDepthOnly: true"));
add("route-publication-remains-fail-closed", route.includes("market_intelligence_publication_not_ready") && route.includes("scorePublished: false"));
add("angel-imports-structured", angel.includes("buildAngelStructuredResponse") && angel.includes("verifyAngelStructuredResponse"));
add("angel-returns-structured", /reply,\s*structured,/u.test(angel));
add("angel-product-standalone", angel.includes('productClass: "STANDALONE_PRODUCT"') && angel.includes("paidDepthChangesTruth: false"));
add("angel-integrity-fail-closed", angel.includes("angel_structured_response_integrity_failed"));

add("route-passes-report-context-to-impact", route.includes("reportContextDepth: selectedDepth"));
add("impact-standalone-insight-contract", impactTruth.includes("buildVlmStandaloneInsightContract") && impactTruth.includes('productId: "market-impact"') && impactTruth.includes("reportContextChangesExplanationOnly: true") && impactTruth.includes("contract,"));
add("impact-rights-not-overclaimed", impactTruth.includes('commercialRightsStatus: "NOT_EVALUATED_BY_MODEL"') && impactTruth.includes("PROVIDER_RIGHTS_UNVERIFIED"));
add("angel-panel-renders-truth-boundary", angelPanel.includes('data-angel-customer-truth="r44p35"') && angelPanel.includes("message.truth.nextSafeCheck"));
add("angel-panel-localizes-truth-rail", angelPanel.includes('locale === "pl"') && angelPanel.includes('locale === "de"') && angelPanel.includes("truthCopy.withheld") && angelPanel.includes("truthCopy.next"));
add("angel-panel-basic-only-client-lane", angelPanel.includes('depth: "basic"') && angelPanel.includes("Paid Angel depth must not be inferred"));
add("decision-impact-simulation-copy", decision.includes("simulation_must_not_be_presented_as_trade_result"));
add("decision-whale-transfer-not-trade", decision.includes("transfer_is_not_trade") && decision.includes("unverified_address_remains_unclassified"));
add("decision-risk-no-probability", decision.includes("probabilityPercent: null") && decision.includes("leverageRecommendation: null") && decision.includes("positionSizingRecommendation: null"));
add("decision-angel-abstention", decision.includes("mustAbstain") && decision.includes("unresolvedSourceConflict"));

const failures = rows.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p35.active-route-contract-test.v1",
  status: failures.length ? "FAIL" : "PASS_R44P35_ACTIVE_ROUTE_CONTRACT",
  checks: rows.length,
  passed: rows.length - failures.length,
  failed: failures.length,
  rows,
}, null, 2));
if (failures.length) process.exit(1);
