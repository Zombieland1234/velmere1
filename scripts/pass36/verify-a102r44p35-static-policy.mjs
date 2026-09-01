#!/usr/bin/env node
import fs from "node:fs";

const REV = "VELMERE_PASS36_A102R44P35_ACTION_REQUIRED_STANDALONE_DECISION_SUPPORT_ANGEL_RISK_IMPACT_WHALE_AND_PSYCHOLOGY30_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT";
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const readText = (file) => fs.readFileSync(file, "utf8");

const topology = readJson("config/pass36/a102r44p35-canonical-product-topology.json");
const scoring = readJson("config/pass36/a102r44p35-dynamic-scoring-policy.json");
const ledger = readJson("config/pass36/a102r44p35-score-gate-ledger.json");
const psychology = readJson("config/pass36/a102r44p35-standalone-psychology-policy.json");
const state = readJson("config/pass36/a102r44p35-action-required-current-state.json");
const ui = readText("components/market-integrity/AssetIntelligenceTabs.tsx");
const client = readText("components/market-integrity/asset-detail/market-intelligence-client-runtime.ts");
const route = readText("lib/server/market-integrity-route-modules/market-intelligence.ts");
const decision = readText("lib/intelligence/vlm-standalone-decision-support.ts");
const angelContext = readText("lib/ai/angel-evidence-context.ts");
const angelPanel = readText("components/angel/AngelPanel.tsx");
const riskCopy = readText("components/intelligence/RiskMethodologyModal.tsx");
const impactTruth = readText("lib/market-integrity/market-impact-customer-truth.ts");
const riskTruth = readText("lib/market-integrity/risk-indicator-customer-truth.ts");
const whaleTruth = readText("lib/market-integrity/whale-watch-customer-truth.ts");
const targetedTypeScript = readText("scripts/pass36/verify-a102r44p35-targeted-typescript.mjs");
const roadmap = readText("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt");
const patch = readText("VELMERE_A102R44P35_PATCH.txt");

const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const products = new Set(topology.products.map((row) => row.productId));
const gateIds = new Set(ledger.gates.map((row) => row.gateId));

add("revision", [topology, scoring, ledger, psychology, state].every((row) => row.revisionId === REV));
add("no-go", state.globalDecision === "NO_GO" && [state.LIVE, state.saleEnabled, state.productionApproved, state.worldClassProven].every((value) => value === false));
add("cycle-2-of-3", topology.testCycle.current === 2 && state.testCycle.current === 2 && state.testCycle.total === 3 && state.testCycle.fullRegressionCurrentPassExecuted === false);
add("products-17", topology.products.length === 17 && products.size === 17);
add("tiered-9", topology.products.filter((row) => row.tier !== null).length === 9);
add("standalone-8", topology.products.filter((row) => row.tier === null).length === 8);
add("standalone-no-tier", topology.products.filter((row) => row.productClass === "STANDALONE_PRODUCT").every((row) => row.tier === null));
add("no-fake-impact-whale-angel-risk-tiers", ["market-impact", "whale-watch", "angel", "risk-indicator"].every((id) => topology.products.some((row) => row.productId === id && row.tier === null)));
add("market-impact-ui-standalone", ui.includes('useMarketIntelligence(asset, locale, "market-impact")'));
add("whale-ui-standalone", ui.includes('useMarketIntelligence(asset, locale, "whale-watch")'));
add("no-pro-lock-copy", !/requires confirmed Pro|wymaga potwierdzonego dostępu Pro|benötigt bestätigten Pro/u.test(ui));
add("no-required-tier", !client.includes("requiredTier") && !route.includes('requiredTier: "pro"'));
add("modelled-impact", ui.includes("Modelled execution scenarios") && decision.includes("realized_slippage_not_observed"));
add("transfer-not-trade", ui.includes("A transfer does not automatically mean") && decision.includes("transfer_is_not_trade"));
add("unclassified", ui.includes("UNCLASSIFIED") && decision.includes("unverified_address_remains_unclassified"));
add("server-decision-support", route.includes("standaloneDecisionSupport") && route.includes("reportContextBoundary"));
add("route-canonical-customer-truth", route.includes("marketImpact.customerTruth") && route.includes("whaleWatch?.customerTruth") && route.includes("marketRisk?.customerTruth"));
add("angel-structured-context", angelContext.includes("standaloneAnswerContract") && decision.includes("orderedSections"));
add("angel-panel-structured-evidence", angelPanel.includes('data-angel-structured-evidence="r44p35"') && angelPanel.includes("message.structured.evidence.confirmedLanes") && angelPanel.includes("message.structured.missingProof"));
add("angel-no-artificial-5200-delay", angelPanel.includes("MIN_ANGEL_RESPONSE_DISPLAY_MS = 420") && !angelPanel.includes("MIN_ANGEL_RESPONSE_DISPLAY_MS = 5200"));
add("angel-abstention", decision.includes("mustAbstain") && decision.includes("unresolvedSourceConflict"));
add("risk-three-dimensions", decision.includes("technicalRisk") && decision.includes("marketRisk") && decision.includes("dataQualityRisk"));
add("risk-no-probability", decision.includes("probabilityPercent: null") && decision.includes("leverageRecommendation: null") && decision.includes("positionSizingRecommendation: null"));
add("risk-customer-truth", riskTruth.includes("probabilityClaimAllowed: false") && riskTruth.includes("reportContextFingerprintInvariant: true") && riskTruth.includes("technicalRiskLevel"));
add("risk-no-human-review-promise", riskCopy.includes("does not promise that a human review is included") && riskCopy.includes("nie obiecuje w tym miejscu review człowieka"));
add("impact-hidden-liquidity-boundary", impactTruth.includes("Hidden liquidity, queue position, cancellations, replenishment and market reaction are not modeled.") && impactTruth.includes("realizedSlippageClaimAllowed: false"));
add("whale-provenance-boundary", whaleTruth.includes("UNCLASSIFIED") && whaleTruth.includes("transfer") && whaleTruth.includes("label"));
add("score-gates-112", ledger.gates.length === 112);
add("score-gate-ids-unique", gateIds.size === ledger.gates.length);
add("score-before-after", ledger.gates.every((gate) => typeof gate.beforeStatus === "string" && typeof gate.afterStatus === "string" && Number.isInteger(gate.weight) && gate.weight > 0));
add("new-runtime-gates-present", ["standalone-customer-truth-runtime", "active-route-truth-binding", "angel-structured-evidence-ui", "angel-artificial-delay-removed", "market-impact-nonmodeled-liquidity-boundary", "whale-monitoring-continuity-external", "risk-indicator-customer-truth-binding"].every((id) => gateIds.has(id)));
add("psychology-720", psychology.personas === 30 && psychology.rows === 720 && psychology.standaloneModules.length === 4);
add("customer-proof-zero", psychology.customerProof.realParticipants === 0 && psychology.customerProof.customerProven === false && state.standalonePsychology.realParticipants === 0 && state.dynamicScoring.customerProvenRows === 0);
add("targeted-credit", state.currentByteCredit.targetedTypeScript === true && state.currentByteCredit.standaloneDecisionSupport === true && state.currentByteCredit.standalonePsychologyMatrix === true && state.currentByteCredit.dynamicScorecard === true);
add("full-regression-not-claimed", state.currentByteCredit.fullEslint === false && state.currentByteCredit.fullTypeScript === false && state.currentByteCredit.sourceAudit === false && state.currentByteCredit.webpack === false && state.currentByteCredit.turbopack === false && state.currentByteCredit.browser57 === false && state.currentByteCredit.pdf150 === false);
add("targeted-typescript-dynamic-discovery", targetedTypeScript.includes("ALL_CURRENT_TS_TSX_FILES_ADDED_OR_CHANGED_VS_EXACT_R44P34_MANIFEST") && targetedTypeScript.includes("semanticTypecheckCredit: false") && targetedTypeScript.includes("fullProjectTypeScriptCredit: false"));
add("roadmap", roadmap.startsWith("================================================================================\nVELMÈRE WORLD CLASS MAX ROADMAP — PASS36 A102R44P35"));
add("patch", patch.startsWith("VELMÈRE PASS36 A102R44P35"));
add("no-sale", state.saleEnabled === false && state.currentByteCredit.exactWindows === false);

const failures = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p35.static-policy-verification.v2",
  status: failures.length ? "FAIL" : "PASS_R44P35_STATIC_POLICY",
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  rows: checks,
}, null, 2));
if (failures.length) process.exit(1);
