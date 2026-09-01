import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { readCurrentConsolidatedRoute } from "../lib/current-route-contract";
import type { TokenRiskResult } from "../../lib/market-integrity/risk-types";
import { buildCustomerSourceSyncPayload } from "../../lib/market-integrity/customer-source-sync";
import {
  enforceLegacyRiskPublicationTruth,
  enforceLegacyRiskSweepPublicationTruth,
} from "../../lib/market-integrity/legacy-route-publication-truth";

let assertions = 0;
function check(condition: unknown, label: string) {
  assert.ok(condition, label);
  assertions += 1;
}

const NOW = new Date("2026-07-18T12:00:00.000Z");
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);

function result(overrides: Partial<TokenRiskResult> = {}): TokenRiskResult {
  return {
    token: { marketId: "bitcoin", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
    score: 42,
    confidence: 0.82,
    level: "medium",
    badge: "elevated_risk",
    signals: [],
    metrics: { currentPrice: 60_000, volume24h: 1_000_000 },
    dataQuality: "live",
    dataSources: ["coingecko"],
    providerRiskDelivery: {
      schemaVersion: "pass6_provider_risk_delivery_v1",
      state: "verified",
      scorePublished: true,
      canonicalIdentity: "market:bitcoin",
      sourceReceiptRoot: DIGEST_A,
      receiptDigest: DIGEST_B,
      completenessBps: 10_000,
      sourceAsOf: NOW.toISOString(),
      blockers: [],
    },
    generatedAt: NOW.toISOString(),
    ...overrides,
  };
}

const verified = result();
const verifiedTruth = enforceLegacyRiskPublicationTruth(verified, NOW.toISOString());
check(verifiedTruth.mode === "live" && verifiedTruth.evidenceState === "verified", "complete PASS6 delivery may publish live");
check(verifiedTruth.scorePublished && verified.score === 42, "verified result preserves the server-authorized score");

const canonicalPrefixed = result();
canonicalPrefixed.providerRiskDelivery!.sourceReceiptRoot = `sha256:${DIGEST_A}`;
canonicalPrefixed.providerRiskDelivery!.receiptDigest = `sha256:${DIGEST_B}`;
const canonicalPrefixedTruth = enforceLegacyRiskPublicationTruth(canonicalPrefixed, NOW.toISOString());
check(canonicalPrefixedTruth.mode === "live" && canonicalPrefixedTruth.scorePublished, "canonical sha256-prefixed PASS6 receipts may publish live");

const labelOnly = result({ providerRiskDelivery: undefined, dataSources: ["CoinGecko", "Binance"], dataQuality: "live" });
const labelTruth = enforceLegacyRiskPublicationTruth(labelOnly, NOW.toISOString());
check(labelTruth.mode === "withheld" && labelTruth.blockers.includes("provider_risk_delivery_missing"), "provider labels never authorize live");
check((labelOnly.score as number | null) === null && labelOnly.providerRiskDelivery?.scorePublished === false, "unverified result is scrubbed, not merely relabeled");

const incomplete = result();
incomplete.providerRiskDelivery!.completenessBps = 9_999;
check(enforceLegacyRiskPublicationTruth(incomplete, NOW.toISOString()).blockers.includes("delivery_completeness:9999/10000"), "9999/10000 is withheld");

const stale = result();
stale.providerRiskDelivery!.sourceAsOf = new Date(NOW.getTime() - 5 * 60_000 - 1).toISOString();
check(enforceLegacyRiskPublicationTruth(stale, NOW.toISOString()).blockers.includes("provider_source_time_stale"), "stale provider time is withheld");

const future = result();
future.providerRiskDelivery!.sourceAsOf = new Date(NOW.getTime() + 30_001).toISOString();
check(enforceLegacyRiskPublicationTruth(future, NOW.toISOString()).blockers.includes("provider_source_time_in_future"), "future provider time is withheld");

const malformedDigest = result();
malformedDigest.providerRiskDelivery!.receiptDigest = "not-a-digest";
check(enforceLegacyRiskPublicationTruth(malformedDigest, NOW.toISOString()).blockers.includes("delivery_receipt_digest_invalid"), "malformed delivery digest is withheld");

const identityMismatch = result();
identityMismatch.providerRiskDelivery!.canonicalIdentity = "market:ethereum";
check(enforceLegacyRiskPublicationTruth(identityMismatch, NOW.toISOString()).blockers.includes("provider_risk_delivery_identity_mismatch"), "cross-asset delivery binding is withheld");

const declaredBlocker = result();
declaredBlocker.providerRiskDelivery!.blockers = ["quorum_shortfall"];
check(enforceLegacyRiskPublicationTruth(declaredBlocker, NOW.toISOString()).blockers.includes("quorum_shortfall"), "delivery blocker cannot coexist with live publication");

const missingScore = result({ score: null as unknown as number });
check(enforceLegacyRiskPublicationTruth(missingScore, NOW.toISOString()).blockers.includes("risk_score_missing"), "missing numerical verdict cannot publish live");

const mixedSweep = enforceLegacyRiskSweepPublicationTruth([
  result(),
  result({ providerRiskDelivery: undefined }),
], NOW.toISOString());
check(mixedSweep.mode === "withheld" && mixedSweep.verifiedRows === 1 && mixedSweep.withheldRows === 1, "one incomplete sweep row withholds aggregate live");
check(mixedSweep.completenessBps === 5_000, "sweep denominator is explicit and deterministic");

const completeSweep = enforceLegacyRiskSweepPublicationTruth([result(), result()], NOW.toISOString());
check(completeSweep.mode === "live" && completeSweep.completenessBps === 10_000, "all verified sweep rows may publish live");

function filesBelow(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? filesBelow(target) : [target];
  });
}

const routeFiles = filesBelow("app/api/market-integrity").filter((file) => file.endsWith("/route.ts"));
const unconditionalLiveRoutes = routeFiles.filter((file) => /mode\s*:\s*["']live["']/u.test(readFileSync(file, "utf8")));
check(unconditionalLiveRoutes.length === 0, `no market-integrity route has unconditional live mode: ${unconditionalLiveRoutes.join(",")}`);
const degradedLiveRoutes = routeFiles.filter((file) => /degraded_live/u.test(readFileSync(file, "utf8")));
check(degradedLiveRoutes.length === 0, `degraded service state never masquerades as live: ${degradedLiveRoutes.join(",")}`);
const legacyLiveProbeRoutes = routeFiles.filter((file) => /["']live_probe["']/u.test(readFileSync(file, "utf8")));
check(legacyLiveProbeRoutes.length === 0, `diagnostic probe does not bypass publication truth: ${legacyLiveProbeRoutes.join(",")}`);

const analyzeRoute = readCurrentConsolidatedRoute("/api/market-integrity/analyze").handlerSource;
check(analyzeRoute.includes("enforceLegacyRiskPublicationTruth") && analyzeRoute.includes("status: 424"), "analyze route blocks unsigned risk before brain/history publication");
const probeRoute = readCurrentConsolidatedRoute("/api/market-integrity/probe").handlerSource;
check(probeRoute.includes('mode: "probe_withheld"') && probeRoute.includes("enforceLegacyRiskPublicationTruth"), "probe route withholds score before diagnostic brain output");
const liquidityRoute = readCurrentConsolidatedRoute("/api/market-integrity/liquidity-intelligence").handlerSource;
check(liquidityRoute.includes('mode: "partial"') && liquidityRoute.includes("independent_orderbook_quorum_missing"), "liquidity route labels unsigned orderbook evidence partial");
const reportRoute = readCurrentConsolidatedRoute("/api/market-integrity/report").handlerSource;
check(reportRoute.includes("premium_report_source_evidence_not_ready") && reportRoute.includes("status: 424"), "premium report blocks incomplete source proof");
const angelRoute = readCurrentConsolidatedRoute("/api/market-integrity/angel").handlerSource;
check(angelRoute.includes("verified_signed_fresh_quorum_market_evidence_required") && angelRoute.includes("status: 424"), "Angel blocks incomplete evidence before VLM delivery");
const commonVlm = readFileSync("lib/market-integrity/vlm-route-analysis.ts", "utf8");
check(commonVlm.includes('failFastStage: "signed_fresh_quorum_publication_gate"'), "shared VLM resolver fails before brain and generative output");
const marketIntelligenceRoute = readCurrentConsolidatedRoute("/api/market-integrity/market-intelligence").handlerSource;
check(marketIntelligenceRoute.includes("paid_market_intelligence_publication_not_ready") && marketIntelligenceRoute.includes("pass4993_signed_field_projection_not_attached"), "paid Market Intelligence is withheld without PASS4993 projection");

for (const adapter of ["lib/market-integrity/defillama-adapter.ts", "lib/market-integrity/geckoterminal-adapter.ts"]) {
  const source = readFileSync(adapter, "utf8");
  check(!/mode\s*:\s*["']live["']/u.test(source) && source.includes('mode: "partial"'), `${adapter} is observed partial, not commercial live`);
}

const partialDefiPayload = buildCustomerSourceSyncPayload({
  query: "ethereum",
  defi: {
    version: "pass2359-defillama-tvl-protocol-lane-v1",
    mode: "partial",
    query: "ethereum",
    provider: "DefiLlama",
    sourceFacts: ["provider transport observation only"],
    missingData: ["signed commercial receipt"],
    confidenceCap: 45,
    riskLane: "protocol_tvl_present",
    scoreImpact: "confidence_only",
    operatorNextSteps: ["attach signed field projection"],
    evidenceBoundary: "partial evidence is not LIVE",
    generatedAt: NOW.toISOString(),
  },
});
const projectedDefiLane = partialDefiPayload.sourceHealth.lanes.find((item) => item.id === "defillama");
check(projectedDefiLane?.state === "partial", "DefiLlama partial transport remains partial in customer source sync");
check(partialDefiPayload.sourceHealth.quorumState !== "ready", "one partial DefiLlama lane cannot establish customer quorum");

const allMarketLibraryFiles = filesBelow("lib/market-integrity").filter((file) => file.endsWith(".ts"));
const verifiedWriters = allMarketLibraryFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return source.includes("result.providerRiskDelivery = {") && source.includes('state: delivery.risk.state === "verified"');
});
check(verifiedWriters.length === 1 && verifiedWriters[0].endsWith("market-row-delivery-gate.ts"), "only shared market-row gate can mint verified provider-risk delivery");

console.log(`PASS6 legacy LIVE publication truth ${assertions}/${assertions} assertions PASS`);
console.log(JSON.stringify({
  schemaVersion: "pass6_legacy_live_publication_truth_test_v1",
  assertions,
  routeCount: routeFiles.length,
  unconditionalLiveRoutes,
  degradedLiveRoutes,
  legacyLiveProbeRoutes,
  externalCalls: 0,
  liveClaimed: false,
}, null, 2));
