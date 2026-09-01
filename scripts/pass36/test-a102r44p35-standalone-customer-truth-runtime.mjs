#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const tsRoot = process.env.VELMERE_EXACT_TYPESCRIPT_ROOT || path.resolve(process.cwd(), "node_modules/typescript");
if (!tsRoot || !fs.existsSync(tsRoot)) throw new Error("VELMERE_EXACT_TYPESCRIPT_ROOT_REQUIRED");
const ts = await import(pathToFileURL(path.join(tsRoot, "lib/typescript.js")));
if (ts.version !== "5.9.3") throw new Error(`TYPESCRIPT_VERSION_MISMATCH:${ts.version}`);
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function resolveModule(from, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = path.extname(base)
    ? [base]
    : [`${base}.ts`, `${base}.mjs`, `${base}.js`, path.join(base, "index.ts"), path.join(base, "index.mjs"), path.join(base, "index.js")];
  const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!found) throw new Error(`LOCAL_MODULE_NOT_FOUND:${from}:${specifier}`);
  return found;
}
function loadModule(relativeOrAbsolute) {
  const absolute = path.resolve(relativeOrAbsolute);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  if (absolute.endsWith(".json")) {
    const module = { exports: JSON.parse(fs.readFileSync(absolute, "utf8")) };
    cache.set(absolute, module);
    return module.exports;
  }
  const source = fs.readFileSync(absolute, "utf8");
  const compiled = absolute.endsWith(".ts")
    ? ts.transpileModule(source, {
        fileName: absolute,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true, esModuleInterop: true, isolatedModules: true },
        reportDiagnostics: true,
      })
    : { outputText: source, diagnostics: [] };
  const errors = (compiled.diagnostics ?? []).filter((row) => row.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(`TRANSPILE_FAILED:${absolute}:${errors.map((row) => ts.flattenDiagnosticMessageText(row.messageText, "\n")).join("|")}`);
  const module = { exports: {} };
  cache.set(absolute, module);
  const wrapped = `(function(require,module,exports,__filename,__dirname){${compiled.outputText}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: `${absolute}.compiled.cjs` });
  const localRequire = (specifier) => {
    const resolved = resolveModule(absolute, specifier);
    return resolved ? loadModule(resolved) : nativeRequire(specifier);
  };
  fn(localRequire, module, module.exports, absolute, path.dirname(absolute));
  return module.exports;
}

const marketImpactModule = loadModule("lib/market-integrity/market-impact-engine.ts");
const riskTruthModule = loadModule("lib/market-integrity/risk-indicator-customer-truth.ts");
const whaleModule = loadModule("lib/market-integrity/whale-watch-engine.ts");
const walletModule = loadModule("lib/market-integrity/wallet-label-registry.ts");
const { buildMarketImpactAnalysis, verifyMarketImpactResultIntegrity } = marketImpactModule;
const { buildRiskIndicatorCustomerTruth } = riskTruthModule;
const { buildWhaleWatchAnalysis, verifyWhaleWatchResultIntegrity } = whaleModule;
const { createWalletLabelRegistryArtifact } = walletModule;

const now = new Date("2026-08-08T00:00:00.000Z");
const digest = (char) => char.repeat(64);
const checks = [];
const check = (id, fn) => {
  try { fn(); checks.push({ id, passed: true }); }
  catch (error) { checks.push({ id, passed: false, error: error instanceof Error ? error.message : String(error) }); }
};

const liveSnapshots = [
  {
    venueId: "binance-spot",
    providerFamily: "binance",
    assetKey: "BTCUSD",
    quoteCurrency: "USD",
    observedAt: "2026-08-07T23:59:40.000Z",
    status: "verified_live",
    feeBps: 10,
    bids: [{ price: 99, baseQuantity: 20 }, { price: 98, baseQuantity: 30 }],
    asks: [{ price: 101, baseQuantity: 20 }, { price: 102, baseQuantity: 30 }],
    sourceDigest: digest("a"),
  },
  {
    venueId: "coinbase-advanced",
    providerFamily: "coinbase",
    assetKey: "BTCUSD",
    quoteCurrency: "USD",
    observedAt: "2026-08-07T23:59:42.000Z",
    status: "verified_live",
    feeBps: 12,
    bids: [{ price: 99.2, baseQuantity: 18 }, { price: 98.1, baseQuantity: 25 }],
    asks: [{ price: 100.8, baseQuantity: 18 }, { price: 101.9, baseQuantity: 25 }],
    sourceDigest: digest("b"),
  },
];

const impact = buildMarketImpactAnalysis({
  assetKey: "BTCUSD",
  snapshots: liveSnapshots,
  now,
  locale: "pl",
  reportContextDepth: "advanced",
  policy: { notionalUsdGrid: [1_000, 5_000], maximumCrossVenueMidDivergenceBps: 200 },
});
check("impact-integrity", () => assert.equal(verifyMarketImpactResultIntegrity(impact), true));
check("impact-standalone-product", () => assert.equal(impact.customerTruth.productId, "market-impact"));
check("impact-simulation-not-forecast", () => assert.equal(impact.customerTruth.forecastClaimAllowed, false));
check("impact-no-realized-slippage-claim", () => assert.equal(impact.customerTruth.realizedSlippageClaimAllowed, false));
check("impact-no-hidden-liquidity-claim", () => assert.equal(impact.customerTruth.hiddenLiquidityModeled, false));
check("impact-current-snapshot-mode", () => assert.equal(impact.customerTruth.inputMode, "CURRENT_ORDER_BOOK_SNAPSHOT"));
check("impact-polish-copy", () => assert.match(impact.customerTruth.customerSummary, /symuluje wykonanie/i));
check("impact-outcome-missing", () => assert.ok(impact.customerTruth.missingProof.includes("predicted-versus-realized slippage outcome")));
check("impact-context-depth-is-presentation", () => assert.equal(impact.customerTruth.reportContextDepth, "advanced"));
check("impact-contract-standalone", () => assert.equal(impact.customerTruth.contract.productClass, "STANDALONE_PRODUCT"));
check("impact-contract-truth-invariant", () => assert.equal(impact.customerTruth.contract.truthInvariantAcrossReportDepth, true));
check("impact-no-commercial-rights-claim", () => assert.equal(impact.customerTruth.commercialRightsStatus, "NOT_EVALUATED_BY_MODEL"));
check("impact-next-safe-action", () => assert.ok(impact.customerTruth.nextSafeCheck.length >= 40));


const fixtureImpact = buildMarketImpactAnalysis({
  assetKey: "BTCUSD",
  snapshots: liveSnapshots.map((row) => ({ ...row, status: "verified_fixture" })),
  now,
  locale: "en",
  policy: { allowFixture: true, notionalUsdGrid: [1_000] },
});
check("impact-fixture-only", () => assert.equal(fixtureImpact.customerTruth.inputMode, "FIXTURE_ORDER_BOOK_SIMULATION"));
check("impact-fixture-block-card", () => assert.ok(fixtureImpact.customerTruth.reasonCards.some((row) => row.code === "FIXTURE_ONLY")));

const unavailableImpact = buildMarketImpactAnalysis({ assetKey: "BTCUSD", snapshots: [], now, locale: "de" });
check("impact-unavailable", () => assert.equal(unavailableImpact.customerTruth.truthState, "UNAVAILABLE"));
check("impact-order-book-blocked", () => assert.ok(unavailableImpact.customerTruth.reasonCards.some((row) => row.code === "ORDER_BOOK_UNAVAILABLE")));

const riskInput = {
  marketId: "btc",
  symbol: "BTC",
  name: "Bitcoin",
  assetClass: "crypto",
  currentPrice: 100,
  athPrice: 120,
  marketCap: 1_000_000_000,
  fdv: 1_000_000_000,
  liquidityUsd: 120_000_000,
  volume24h: 40_000_000,
  averageVolume7d: 35_000_000,
  priceChange1h: -1,
  priceChange24h: -4,
  priceChange7d: 2,
  top10HolderPercent: 12,
  holderCount: 1_000_000,
  providerHealthScore: 95,
  sourceDivergenceBps: 5,
  freshnessSeconds: 12,
  freshnessState: "fresh",
  consensusState: "aligned",
  dataSources: ["coingecko", "binance"],
};
const riskResult = {
  score: 34,
  level: "medium",
  signals: [
    { id: "major_drawdown", severity: "medium", points: 12 },
    { id: "source_divergence", severity: "low", points: 3 },
  ],
  metrics: { currentPrice: 100, athPrice: 120, drawdownPercent: 16.67, marketCap: 1_000_000_000, liquidityUsd: 120_000_000, providerHealthScore: 95, sourceDivergenceBps: 5, freshnessSeconds: 12 },
  dataQuality: "live",
  limitations: ["prospective outcomes unavailable"],
  metaModel: { verdict: "watch" },
  dataSources: ["coingecko", "binance"],
};
const riskBasic = buildRiskIndicatorCustomerTruth({ input: riskInput, result: riskResult, locale: "en", reportContextDepth: "basic" });
const riskAdvanced = buildRiskIndicatorCustomerTruth({ input: riskInput, result: riskResult, locale: "en", reportContextDepth: "advanced" });
check("risk-standalone-product", () => assert.equal(riskBasic.productId, "risk-indicator"));
check("risk-not-probability", () => assert.equal(riskBasic.probabilityClaimAllowed, false));
check("risk-no-price-forecast", () => assert.equal(riskBasic.priceDirectionForecastAllowed, false));
check("risk-no-position-sizing", () => assert.equal(riskBasic.positionSizingAllowed, false));
check("risk-no-leverage", () => assert.equal(riskBasic.leverageRecommendationAllowed, false));
check("risk-score-interpretation", () => assert.equal(riskBasic.scoreInterpretation, "BOUNDED_REVIEW_PRIORITY_NOT_EVENT_PROBABILITY"));
check("risk-fingerprint-tier-invariant", () => assert.equal(riskBasic.indicatorFingerprint, riskAdvanced.indicatorFingerprint));
check("risk-context-explanation-only", () => assert.equal(riskAdvanced.reportContextChangesExplanationOnly, true));
check("risk-calibration-block-card", () => assert.ok(riskBasic.reasonCards.some((row) => row.code === "CALIBRATION_MISSING")));
check("risk-contract-standalone", () => assert.equal(riskBasic.contract.productClass, "STANDALONE_PRODUCT"));
check("risk-contract-truth-invariant", () => assert.equal(riskAdvanced.contract.truthInvariantAcrossReportDepth, true));
check("risk-prohibited-claims-all-false", () => assert.ok(Object.values(riskAdvanced.contract.prohibitedClaims).every((value) => value === false)));


const riskInsufficient = buildRiskIndicatorCustomerTruth({
  input: { symbol: "?", name: "Unknown", dataSources: [] },
  result: {
    score: 0,
    level: "low",
    signals: [{ id: "insufficient_data", severity: "high", points: 25 }],
    metrics: {},
    dataQuality: "demo",
    limitations: ["no trusted observations"],
    metaModel: { verdict: "insufficient_data" },
    dataSources: [],
  },
  locale: "pl",
});
check("risk-refusal-on-demo", () => assert.equal(riskInsufficient.refusalRequired, true));
check("risk-polish-refusal", () => assert.match(riskInsufficient.customerSummary, /wstrzymuje|niepełne/i));

const walletSecret = "R44P35WalletLabelSigningKey_6f89d1c8bca2e374ad91f0e2";
const redactionSecret = "R44P35WhaleRedactionKey_8f14a3d9b2c7e6105a4f93e1";
const labelArtifact = createWalletLabelRegistryArtifact({
  secret: walletSecret,
  payload: {
    assetKey: "TOKEN",
    holderId: "0xwhale",
    category: "private_whale",
    clusterId: "verified-whale-cluster",
    providerFamily: "arkham",
    sourceDigest: digest("c"),
    confidencePercent: 93,
    issuedAt: "2026-08-07T20:00:00.000Z",
    expiresAt: "2026-09-07T20:00:00.000Z",
    nonce: "r44p35-wallet-label-nonce-0001",
  },
});
const whale = buildWhaleWatchAnalysis({
  assetKey: "TOKEN",
  totalSupply: 1_000,
  priceUsd: 10,
  now,
  locale: "de",
  redactionSecret,
  walletLabelVerificationSecret: walletSecret,
  walletLabelArtifacts: [labelArtifact],
  holders: [
    { holderId: "0xwhale", balance: 600, category: "private_whale", labelVerified: true, clusterId: "verified-whale-cluster", observedAt: "2026-08-07T23:30:00.000Z", providerFamily: "arkham", status: "verified_live", sourceDigest: digest("c") },
    { holderId: "0xunknown", balance: 400, category: "unknown", labelVerified: false, observedAt: "2026-08-07T23:31:00.000Z", providerFamily: "etherscan", status: "verified_live", sourceDigest: digest("d") },
  ],
  transfers: [
    { eventId: "evt-1", observedAt: "2026-08-07T23:40:00.000Z", amountBase: 20, fromHolderId: "0xwhale", toHolderId: "0xunknown", kind: "transfer", providerFamily: "alchemy", status: "verified_live", sourceDigest: digest("e") },
  ],
  capabilityReceipts: [
    { capability: "holder_distribution", providerFamily: "etherscan", observedAt: "2026-08-07T23:50:00.000Z", status: "verified_live", recordCount: 2, coverageComplete: true, sourceDigest: digest("f") },
    { capability: "wallet_labels", providerFamily: "arkham", observedAt: "2026-08-07T23:50:01.000Z", status: "verified_live", recordCount: 1, coverageComplete: false, sourceDigest: digest("1") },
    { capability: "transfer_history", providerFamily: "alchemy", observedAt: "2026-08-07T23:50:02.000Z", status: "verified_live", recordCount: 1, coverageComplete: true, sourceDigest: digest("2") },
  ],
  marketImpactSnapshots: liveSnapshots.map((row) => ({ ...row, assetKey: "TOKEN" })),
  policy: { minimumProviderFamilies: 2, minimumHolderCoveragePercent: 50, minimumVerifiedLabelCoveragePercent: 30, minimumClusterCoveragePercent: 15 },
});
check("whale-integrity", () => assert.equal(verifyWhaleWatchResultIntegrity(whale), true));
check("whale-standalone-product", () => assert.equal(whale.customerTruth.productId, "whale-watch"));
check("whale-transfer-not-trade", () => assert.equal(whale.customerTruth.transferIsTradeClaimAllowed, false));
check("whale-no-buy-sell-intent", () => assert.equal(whale.customerTruth.buyOrSellIntentClaimAllowed, false));
check("whale-unclassified-label", () => assert.equal(whale.customerTruth.unverifiedDisplayLabel, "UNCLASSIFIED"));
check("whale-label-signature-enforced", () => assert.equal(whale.customerTruth.labelSignatureEnforced, true));
check("whale-label-expiry-enforced", () => assert.equal(whale.customerTruth.labelExpiryEnforced, true));
check("whale-has-unclassified", () => assert.equal(whale.customerTruth.unclassifiedHolderCount, 1));
check("whale-has-verified-label", () => assert.equal(whale.customerTruth.verifiedLabelHolderCount, 1));
check("whale-german-copy", () => assert.match(whale.customerTruth.customerSummary, /Transfer beweist/i));
check("whale-monitoring-not-proven", () => assert.equal(whale.customerTruth.monitoringContinuityStatus, "MISSING_CONTINUOUS_EXTERNAL_MONITORING"));
check("whale-contract-standalone", () => assert.equal(whale.customerTruth.contract.productClass, "STANDALONE_PRODUCT"));
check("whale-contract-transfer-assumption", () => assert.ok(whale.customerTruth.contract.assumptions.some((row) => row.id === "transfer-not-trade")));
check("whale-next-safe-action", () => assert.ok(whale.customerTruth.nextSafeCheck.length >= 30));


const failures = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p35.standalone-customer-truth-runtime.v1",
  status: failures.length ? "FAIL" : "PASS_R44P35_STANDALONE_CUSTOMER_TRUTH_RUNTIME",
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  rows: checks,
}, null, 2));
if (failures.length) process.exit(1);
