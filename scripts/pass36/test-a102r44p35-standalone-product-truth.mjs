#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const tsRoot = process.env.VELMERE_EXACT_TYPESCRIPT_ROOT;
if (!tsRoot) throw new Error("VELMERE_EXACT_TYPESCRIPT_ROOT_REQUIRED");
const ts = await import(pathToFileURL(path.join(tsRoot, "lib/typescript.js")));
if (ts.version !== "5.9.3") throw new Error(`TYPESCRIPT_VERSION_MISMATCH:${ts.version}`);

const cache = new Map();
function resolveTs(from, specifier) {
  if (!specifier.startsWith(".")) throw new Error(`UNEXPECTED_RUNTIME_IMPORT:${specifier}`);
  let target = path.resolve(path.dirname(from), specifier);
  if (!path.extname(target)) target += ".ts";
  return target;
}
function loadTsModule(relative) {
  const absolute = path.resolve(relative);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = fs.readFileSync(absolute, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: absolute,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      esModuleInterop: true,
      isolatedModules: true,
    },
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics ?? []).filter((row) => row.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(`TRANSPILE_FAILED:${relative}:${errors.map((row) => ts.flattenDiagnosticMessageText(row.messageText, "\n")).join("|")}`);
  const module = { exports: {} };
  cache.set(absolute, module);
  const wrapped = `(function(require,module,exports,__filename,__dirname){${compiled.outputText}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: `${absolute}.compiled.cjs` });
  const localRequire = (specifier) => loadTsModule(resolveTs(absolute, specifier));
  fn(localRequire, module, module.exports, absolute, path.dirname(absolute));
  return module.exports;
}

const insight = loadTsModule("lib/product/vlm-standalone-insight-contract.ts");
const angel = loadTsModule("lib/ai/angel-structured-response.ts");
const risk = loadTsModule("lib/market-integrity/risk-indicator-projection.ts");
const impact = loadTsModule("lib/market-integrity/market-impact-customer-truth.ts");
const whale = loadTsModule("lib/market-integrity/whale-watch-customer-truth.ts");

const rows = [];
const add = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });

const evidenceItems = Array.from({ length: 12 }, (_, index) => ({
  id: `fact-${index}`,
  label: `Fact <${index}>\n`,
  value: index,
  sourceClass: "VELMERE_DERIVED",
  evidenceRefs: [`sha256:${String(index).padStart(64, "0")}`],
  observedAt: "2026-08-08T00:00:00.000Z",
}));
const basicContract = insight.buildVlmStandaloneInsightContract({ productId: "market-impact", reportContextDepth: "basic", state: "limited", facts: evidenceItems });
const advancedContract = insight.buildVlmStandaloneInsightContract({ productId: "market-impact", reportContextDepth: "advanced", state: "limited", facts: evidenceItems });
add("contract-basic-depth-limit", basicContract.facts.length === 4);
add("contract-advanced-depth-limit", advancedContract.facts.length === 12);
add("contract-truth-invariant", basicContract.truthInvariantAcrossReportDepth === true && advancedContract.truthInvariantAcrossReportDepth === true);
add("contract-prohibited-claims", Object.values(basicContract.prohibitedClaims).every((value) => value === false));
add("contract-sanitizes-copy", basicContract.facts.every((row) => !/[<>\r\n]/u.test(row.label)));
add("contract-verifier", insight.verifyVlmStandaloneInsightContract(basicContract));

const guideBase = {
  authority: { verified: false, reason: "server_signed_analysis_required", clientScalarEvidenceIgnored: true },
  runtimeLane: "markets",
  requestedDepth: "basic",
  mentionedAssets: ["BTC"],
  sourceState: { providers: [], rawProviders: [], providerCount: 0, confidenceCap: 35, riskScore: null, sourceHealth: null },
  lanes: { confirmed: [], limited: [], missing: ["orderbook"], locked: ["holders"], conflicts: [] },
};
const angelBasic = angel.buildAngelStructuredResponse({ locale: "pl", reportContextDepth: "basic", guide: guideBase, reply: "test" });
const guideVerified = {
  ...guideBase,
  authority: { ...guideBase.authority, verified: true, reason: "server_signed_analysis_verified" },
  sourceState: { ...guideBase.sourceState, providers: ["provider-a", "provider-b"], providerCount: 2, confidenceCap: 63, riskScore: 71 },
  lanes: { confirmed: ["price", "identity"], limited: [], missing: [], locked: [], conflicts: [] },
};
const angelPro = angel.buildAngelStructuredResponse({ locale: "en", reportContextDepth: "pro", guide: guideVerified, reply: "test" });
add("angel-abstains-without-authority", angelBasic.abstention.required === true && angelBasic.confidence.state === "WITHHELD");
add("angel-missing-proof-visible", angelBasic.missingProof.includes("orderbook") && angelBasic.missingProof.includes("holders"));
add("angel-verified-nonprobabilistic", angelPro.abstention.required === false && angelPro.confidence.probabilityClaimAllowed === false);
add("angel-structured-order-fields", ["scope", "severity", "confidence", "evidence", "assumptions", "contradictions", "missingProof", "limitations", "safeRemediation", "nextSafeCheck", "abstention", "safety"].every((key) => key in angelPro));
add("angel-safety-false", Object.values(angelPro.safety).every((value) => value === false));
add("angel-verifier", angel.verifyAngelStructuredResponse(angelPro));

const riskResult = {
  token: { symbol: "TOK", name: "Token", assetClass: "crypto" },
  score: 74,
  level: "high",
  badge: "possible_manipulation_risk",
  signals: [
    { id: "mint_risk", severity: "high", points: 20, metrics: { canMint: true } },
    { id: "thin_liquidity", severity: "medium", points: 12, metrics: { liquidityUsd: 15000 } },
    { id: "source_divergence", severity: "medium", points: 10, metrics: { bps: 250 } },
  ],
  metrics: {},
  dataQuality: "live",
  dataSources: ["a", "b"],
  agentAssessments: [
    { id: "holders", label: "Holders", score: 10, weight: 1, confidence: 0.8, evidenceCount: 0, status: "low", verdict: "clear", evidenceSignalIds: [], reasoning: "", nextAction: "" },
  ],
  metaModel: { version: "1", verdict: "warning", dataFusionScore: 70, conflictLevel: "medium", requiredReview: true, summary: "", escalation: "", limitations: ["provider conflict"] },
  uncertainty: { schemaVersion: "velmere.risk-uncertainty.v1", method: "deterministic_evidence_sensitivity", interpretation: "sensitivity_band_not_empirical_confidence_interval", empiricalCalibrationStatus: "not_available", probabilityClaimAllowed: false, pointEstimate: 74, lowerBound: 60, upperBound: 82, halfWidth: 11, precision: "moderate", evidenceState: "live_multi_source", outOfDistribution: false, drivers: [] },
  generatedAt: "2026-08-08T00:00:00.000Z",
};
const riskBasic = risk.buildRiskIndicatorProjection(riskResult, "basic");
const riskPro = risk.buildRiskIndicatorProjection(riskResult, "pro");
const riskAdvanced = risk.buildRiskIndicatorProjection(riskResult, "advanced");
add("risk-depth-invariant", risk.verifyRiskIndicatorDepthInvariant(riskBasic, riskPro, riskAdvanced));
add("risk-domain-separation", riskBasic.technicalRisk.drivers.some((row) => row.id === "mint_risk") && riskBasic.marketRisk.drivers.some((row) => row.id === "thin_liquidity") && riskBasic.dataQualityRisk.drivers.some((row) => row.id === "source_divergence"));
add("risk-no-probability", riskBasic.indicator.isProbability === false && riskBasic.indicator.probabilityPercent === null);
add("risk-no-trade-guidance", Object.values(riskBasic.prohibitedGuidance).every((value) => value === null));
const riskWithheld = risk.buildRiskIndicatorProjection({ ...riskResult, dataQuality: "demo" }, "basic");
add("risk-demo-withheld", riskWithheld.indicator.state === "withheld" && riskWithheld.indicator.value === null && riskWithheld.refusal.required === true);
const riskMissing = risk.buildRiskIndicatorProjection(null, "basic");
add("risk-null-withheld", riskMissing.indicator.state === "withheld" && riskMissing.missingData.includes("verified_market_evidence_required"));

const impactFixture = {
  evidenceStatus: "fixture_only",
  providerFamilies: ["fixture-a"],
  venues: [{
    venueId: "v1",
    providerFamily: "fixture-a",
    observedAt: "2026-08-08T00:00:00.000Z",
    status: "verified_fixture",
    quoteCurrency: "USD",
    quoteToUsdRate: 1,
    quoteRateObservedAt: null,
    quoteRateStatus: null,
    quoteRateProviderFamily: null,
    quoteRateSourceDigest: null,
    bestBid: 99,
    bestAsk: 101,
    midPrice: 100,
    spreadBps: 200,
    bidDepthUsd: 10000,
    askDepthUsd: 10000,
    sourceDigest: "a".repeat(64),
  }],
  excludedVenues: [],
  executions: [{
    side: "sell",
    requestedNotionalUsd: 10000,
    referenceMidPrice: 100,
    requestedBaseQuantity: 100,
    filledBaseQuantity: 90,
    grossQuoteNotionalUsd: 9000,
    feeUsd: 9,
    netQuoteNotionalUsd: 8991,
    fillRatio: 0.9,
    unfilledNotionalUsd: 1000,
    vwap: 99.9,
    impactBps: 10,
    worstPrice: 99,
    venueContributions: [],
  }],
  blockers: ["fixture_only"],
};
const impactFixtureTruth = impact.buildMarketImpactCustomerTruth({ ...impactFixture, locale: "en" });
add("impact-standalone-not-tiered", impactFixtureTruth.productId === "market-impact" && impactFixtureTruth.reportContextDepth === null);
add("impact-fixture-simulation-only", impactFixtureTruth.inputMode === "FIXTURE_ORDER_BOOK_SIMULATION" && impactFixtureTruth.resultMode === "SIMULATION_ONLY");
add("impact-no-future-realized-claim", impactFixtureTruth.futureOutcomeClaimAllowed === false && impactFixtureTruth.realizedSlippageClaimAllowed === false && impactFixtureTruth.forecastClaimAllowed === false);
add("impact-no-hidden-liquidity-claim", impactFixtureTruth.hiddenLiquidityModeled === false && impactFixtureTruth.orderBookReplenishmentModeled === false);
add("impact-missing-real-proof", impactFixtureTruth.missingProof.includes("predicted-versus-realized slippage outcome"));
const impactLive = impact.buildMarketImpactCustomerTruth({ ...impactFixture, locale: "pl", evidenceStatus: "verified_live", providerFamilies: ["provider-a", "provider-b"], blockers: [] });
add("impact-live-is-snapshot-simulation", impactLive.inputMode === "CURRENT_ORDER_BOOK_SNAPSHOT" && impactLive.resultMode === "SNAPSHOT_EXECUTION_SIMULATION");
add("impact-polish-truth-copy", /symuluje wykonanie/i.test(impactLive.customerSummary));

const whaleArgs = {
  locale: "en",
  evidenceStatus: "verified_live",
  providerFamilies: ["chain", "labels"],
  holderCount: 100,
  verifiedLabelHolderCount: 60,
  unclassifiedHolderCount: 40,
  verifiedLabelArtifactCount: 2,
  transferCount: 25,
  flowWindows: [{ window: "24h", eventCount: 10, exchangeInflowUsd: 100, exchangeOutflowUsd: 80, netExchangeFlowUsd: 20, treasuryToExchangeUsd: 0, treasuryDistributionUsd: 0, bridgeFlowUsd: 0, liquidityAddedUsd: 0, liquidityRemovedUsd: 0, mintedUsd: 0, burnedUsd: 0, whaleTransferUsd: 200 }],
  alerts: [],
  blockers: ["verified_wallet_label_coverage_below_threshold"],
  labelErrors: [],
};
const whaleTruth = whale.buildWhaleWatchCustomerTruth(whaleArgs);
add("whale-standalone-not-tiered", whaleTruth.productId === "whale-watch" && whaleTruth.reportContextDepth === null);
add("whale-transfer-not-trade", whaleTruth.transferIsTradeClaimAllowed === false && whaleTruth.buyOrSellIntentClaimAllowed === false);
add("whale-partial-label-provenance", whaleTruth.verifiedLabelHolderCount === 60 && whaleTruth.unclassifiedHolderCount === 40 && whaleTruth.unverifiedDisplayLabel === "UNCLASSIFIED");
add("whale-correction-dispute-not-overclaimed", whaleTruth.correctionWorkflowStatus === "DESIGNED_NOT_OPERATIONALLY_PROVEN" && whaleTruth.monitoringContinuityStatus === "MISSING_CONTINUOUS_EXTERNAL_MONITORING");
add("whale-label-governance", whaleTruth.labelSignatureEnforced === true && whaleTruth.labelExpiryEnforced === true);
const whaleUnavailable = whale.buildWhaleWatchCustomerTruth({ ...whaleArgs, evidenceStatus: "unavailable", providerFamilies: [], holderCount: 0, verifiedLabelHolderCount: 0, unclassifiedHolderCount: 0, verifiedLabelArtifactCount: 0, transferCount: 0, flowWindows: [], blockers: ["validated_whale_evidence_unavailable"] });
add("whale-unavailable-withheld", ["UNAVAILABLE", "WITHHELD"].includes(whaleUnavailable.truthState) && whaleUnavailable.confidenceClass === "NO_BOUND_EVIDENCE");

const failures = rows.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p35.standalone-product-truth-test.v1",
  revisionId: "VELMERE_PASS36_A102R44P35_ACTION_REQUIRED_STANDALONE_DECISION_SUPPORT_ANGEL_RISK_IMPACT_WHALE_AND_PSYCHOLOGY30_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT",
  status: failures.length ? "FAIL" : "PASS_R44P35_STANDALONE_PRODUCT_TRUTH",
  typescriptVersion: ts.version,
  checks: rows.length,
  passed: rows.length - failures.length,
  failed: failures.length,
  realCustomerCredit: false,
  realProviderCredit: false,
  saleCredit: false,
  rows,
}, null, 2));
if (failures.length) process.exit(1);
