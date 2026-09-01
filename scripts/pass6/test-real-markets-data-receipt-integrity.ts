import assert from "node:assert/strict";
import {
  createPass4644ProviderEvidenceReceipt,
  isPass4644CommerciallyFreshReceipt,
  verifyPass4644ProviderEvidenceReceiptIntegrity,
} from "../../lib/market-integrity/provider-evidence-receipt";
import {
  buildRealMarketVlmProviderReceipt,
  isRealMarketRiskResultInternallyConsistent,
} from "../../lib/market-integrity/real-market-vlm-adapter";
import { analyzeTokenRisk } from "../../lib/market-integrity/risk-engine";
import { toCanonicalRealMarketInstrument } from "../../lib/market-integrity/real-markets-data-contract";
import { buildCustomerReportSourceBinding } from "../../lib/market-integrity/customer-report-source-binding";
import { buildPass4825CustomerReportFieldContract } from "../../lib/reporting/runtime-canonical-field-adapter";
import { buildPass6CommercialFieldCompletenessReceipt } from "../../lib/reporting/commercial-field-completeness";

const GENERATED_AT = "2026-07-18T12:00:00.000Z";
const OBSERVED_AT = "2026-07-18T11:59:30.000Z";
const SOURCE_DIGEST = `sha256:${"d".repeat(64)}`;
const EXPECTED_CANONICAL_IDENTITY = "equity:aapl";
process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = "pass6-real-markets-projection-test-secret-20260718";
process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = "pass6-rm-current";

function realMarketReceipt(providerId: string, providerFamily: string, price: number) {
  return buildRealMarketVlmProviderReceipt({
    providerId,
    providerFamily,
    requestedSymbol: "AAPL",
    resolvedSymbol: "AAPL",
    sourceIdentityMatched: true,
    observedAt: OBSERVED_AT,
    receivedAt: GENERATED_AT,
    latencyMs: providerId.includes("stooq") ? 91 : 73,
    httpStatus: 200,
    ttlMs: 5 * 60_000,
    normalizedPayload: {
      symbol: "AAPL",
      price,
      volume: 55_000_000,
      marketCap: 3_000_000_000_000,
      currency: "USD",
      exchange: "NASDAQ",
      corporateActions: [],
      observedAt: OBSERVED_AT,
    },
  });
}

const yahoo = realMarketReceipt("yahoo_finance_quote", "yahoo", 200);
assert.equal(yahoo.commercialEvidenceEligible, true);
assert.equal(yahoo.timestampProvenance, "provider");
assert.equal(yahoo.observedAt, OBSERVED_AT);
assert.equal(yahoo.receivedAt, GENERATED_AT);
assert.equal(yahoo.latencyMs, 73);
assert.deepEqual(yahoo.capabilities, [
  "currency",
  "exchange",
  "identity",
  "market_cap",
  "price",
  "quote",
  "source_timestamp",
  "volume",
]);
assert.equal(yahoo.capabilities.includes("history"), false);
assert.equal(yahoo.capabilities.includes("corporate_actions"), false);
assert.equal(verifyPass4644ProviderEvidenceReceiptIntegrity(yahoo), true);
assert.equal(verifyPass4644ProviderEvidenceReceiptIntegrity(JSON.parse(JSON.stringify(yahoo))), true);

const capabilityTamper = structuredClone(yahoo);
capabilityTamper.capabilities.push("corporate_actions", "history", "fundamentals");
assert.equal(verifyPass4644ProviderEvidenceReceiptIntegrity(capabilityTamper), false);
assert.equal(isPass4644CommerciallyFreshReceipt(capabilityTamper, Date.parse(GENERATED_AT)), false);
const tamperedBinding = buildCustomerReportSourceBinding({
  providerEvidenceReceipts: [capabilityTamper],
  observedSourceLabels: [],
  generatedAt: GENERATED_AT,
  expectedCanonicalIdentity: EXPECTED_CANONICAL_IDENTITY,
});
assert.equal(tamperedBinding.contentBoundReceiptCount, 0);
assert.equal(tamperedBinding.rejectedProviderReceiptCount, 1);

const ambiguousTimestamp = buildRealMarketVlmProviderReceipt({
  providerId: "stooq_quote",
  providerFamily: "stooq",
  requestedSymbol: "AAPL",
  resolvedSymbol: "AAPL",
  sourceIdentityMatched: true,
  observedAt: "2026-07-18 11:59:30",
  receivedAt: GENERATED_AT,
  latencyMs: 81,
  httpStatus: 200,
  ttlMs: 36 * 60 * 60_000,
  normalizedPayload: { symbol: "AAPL", price: 200.1, observedAt: "2026-07-18 11:59:30" },
});
assert.equal(ambiguousTimestamp.state, "rejected");
assert.equal(ambiguousTimestamp.timestampProvenance, "missing");
assert.equal(ambiguousTimestamp.commercialEvidenceEligible, false);
assert.ok(ambiguousTimestamp.rejectionReasons.includes("provider_source_timestamp_missing"));

const sourceMismatch = buildRealMarketVlmProviderReceipt({
  providerId: "yahoo_finance_quote",
  providerFamily: "yahoo",
  requestedSymbol: "AAPL",
  resolvedSymbol: "MSFT",
  sourceIdentityMatched: false,
  observedAt: OBSERVED_AT,
  receivedAt: GENERATED_AT,
  latencyMs: 70,
  httpStatus: 200,
  ttlMs: 5 * 60_000,
  normalizedPayload: { symbol: "MSFT", price: 430, observedAt: OBSERVED_AT },
});
assert.equal(sourceMismatch.state, "rejected");
assert.equal(sourceMismatch.commercialEvidenceEligible, false);
assert.ok(sourceMismatch.rejectionReasons.includes("provider_symbol_identity_mismatch"));

const missingTransport = createPass4644ProviderEvidenceReceipt({
  providerId: "diagnostic_quote",
  providerFamily: "yahoo",
  surface: "real_markets",
  verification: "normalized_response",
  requestedIdentity: "AAPL",
  resolvedSymbol: "AAPL",
  identityMatched: true,
  capabilities: ["identity", "price"],
  timestampProvenance: "provider",
  observedAt: OBSERVED_AT,
  normalizedPayload: { symbol: "AAPL", price: 200 },
});
assert.equal(missingTransport.state, "rejected");
assert.equal(missingTransport.receivedAt, "1970-01-01T00:00:00.000Z");
assert.equal(missingTransport.latencyMs, -1);
assert.equal(missingTransport.commercialEvidenceEligible, false);
assert.ok(missingTransport.rejectionReasons.includes("receipt_received_at_missing"));
assert.ok(missingTransport.rejectionReasons.includes("receipt_latency_missing"));

const completeInstrument = toCanonicalRealMarketInstrument({
  id: "aapl",
  symbol: "AAPL",
  assetClass: "stock",
  state: "live",
  source: "Yahoo Finance chart adapter",
  sourceTimestamp: Date.parse(OBSERVED_AT) / 1_000,
  sourceReceivedAt: GENERATED_AT,
  sourceLatencyMs: 73,
  sourceCapabilities: ["identity", "price", "quote", "history", "volume", "market_cap", "currency", "exchange", "source_timestamp", "corporate_actions"],
  exchange: "NASDAQ",
  currency: "USD",
  currentPrice: 200,
  priceChange1h: 0.2,
  priceChange24h: 1.1,
  priceChange7d: 2.7,
  priceChange30d: 5.4,
  marketCap: 3_000_000_000_000,
  volume24h: 55_000_000,
}, Date.parse(GENERATED_AT));
assert.equal(completeInstrument.state, "available");
assert.deepEqual(completeInstrument.missingData, []);
assert.equal(completeInstrument.source.receivedAt, GENERATED_AT);
assert.equal(completeInstrument.source.latencyMs, 73);
assert.equal(completeInstrument.source.capabilities.includes("corporate_actions"), false);

const incompleteInstrument = toCanonicalRealMarketInstrument({
  symbol: "AAPL",
  assetClass: "stock",
  state: "live",
  source: "Yahoo Finance quote adapter",
  sourceTimestamp: Date.parse(OBSERVED_AT) / 1_000,
  currentPrice: 200,
}, Date.parse(GENERATED_AT));
assert.equal(incompleteInstrument.state, "unavailable");
for (const missing of [
  "currency",
  "change_1h",
  "change_1d",
  "change_7d",
  "change_30d",
  "market_cap",
  "volume_24h",
  "source_received_at",
  "source_latency_ms",
  "exchange",
]) assert.ok(incompleteInstrument.missingData.includes(missing), missing);

const stooq = realMarketReceipt("stooq_quote", "stooq", 200.1);
assert.equal(isPass4644CommerciallyFreshReceipt(yahoo, Date.parse(GENERATED_AT)), true);
assert.equal(isPass4644CommerciallyFreshReceipt(stooq, Date.parse(GENERATED_AT)), true);
const binding = buildCustomerReportSourceBinding({
  providerEvidenceReceipts: [yahoo, stooq],
  observedSourceLabels: [],
  generatedAt: GENERATED_AT,
  expectedCanonicalIdentity: EXPECTED_CANONICAL_IDENTITY,
});
assert.equal(binding.independentContentBoundUpstreamCount, 2);
assert.ok(binding.receipts.every((receipt) => receipt.targetCanonicalIdentity === EXPECTED_CANONICAL_IDENTITY && receipt.projection));

const productionMissingProjectionKey = buildCustomerReportSourceBinding({
  providerEvidenceReceipts: [yahoo, stooq],
  observedSourceLabels: [],
  generatedAt: GENERATED_AT,
  expectedCanonicalIdentity: EXPECTED_CANONICAL_IDENTITY,
  projectionEnv: { NODE_ENV: "production" },
});
assert.equal(productionMissingProjectionKey.contentBoundReceiptCount, 0);
assert.equal(productionMissingProjectionKey.evidenceLedgerEligible, false);
assert.ok(productionMissingProjectionKey.blockers.includes("source_receipt_projection_signing_key_unavailable"));

function incompleteTier(tier: "pro" | "advanced") {
  const contract = buildPass4825CustomerReportFieldContract({
    reportId: `rm-incomplete-${tier}`,
    module: "real_markets",
    tier,
    identity: {
      canonicalId: EXPECTED_CANONICAL_IDENTITY,
      symbol: "AAPL",
      assetClass: "stock",
      chainId: null,
      contractAddress: null,
    },
    generatedAt: GENERATED_AT,
    sourceDigest: SOURCE_DIGEST,
    riskScore: 31,
    confidenceScore: 90,
    missingEvidence: ["history/fundamentals/depth unavailable"],
    sourceQuorum: binding.independentContentBoundUpstreamCount,
    sourceReceipts: binding.receipts,
    values: {
      "market.price": {
        value: 200,
        currency: "USD",
        confidence: 90,
        quality: 90,
        observedAt: OBSERVED_AT,
        receivedAt: GENERATED_AT,
      },
    },
  });
  return buildPass6CommercialFieldCompletenessReceipt({
    packet: contract.packet,
    sourceReceipts: binding.receipts,
    requestedTier: tier,
  });
}

const pro = incompleteTier("pro");
assert.equal(pro.status, "blocked");
assert.equal(pro.paidDeliveryEligible, false);
assert.ok(pro.completenessBps < 10_000);
assert.ok(pro.explicitMissingFields.length > 0);
assert.equal(pro.missingEvidenceDeclared, true);

const advanced = incompleteTier("advanced");
assert.equal(advanced.status, "blocked");
assert.equal(advanced.paidDeliveryEligible, false);
// The registry grades the free Yahoo/Stooq family at 74, below the Advanced
// confidence floor (75), so neither source may be promoted by tier alone.
assert.equal(advanced.independentUpstreamCount, 0);
assert.equal(advanced.requiredIndependentUpstreamCount, 3);
assert.ok(advanced.blockers.includes("independent_upstream_quorum:0/3"));

const engineResult = analyzeTokenRisk({
  marketId: "real-market:AAPL",
  symbol: "AAPL",
  name: "Apple Inc.",
  assetClass: "stock",
  currentPrice: 200,
  marketCap: 3_000_000_000_000,
  volume24h: 55_000_000,
  averageVolume7d: 52_000_000,
  priceChange24h: 1.1,
  priceChange7d: 2.7,
  sparkline7d: [194, 195, 196, 197, 198, 199, 200],
  dataSources: ["Yahoo Finance market adapter", "Stooq quote adapter"],
}, "live");
assert.equal(isRealMarketRiskResultInternallyConsistent(engineResult), true);
assert.equal(engineResult.uncertainty?.pointEstimate, engineResult.score);
assert.equal(engineResult.signals.some((signal) => /holder|contract|honeypot|tax|mint|blacklist/.test(signal.id)), false);
const scoreTamper = structuredClone(engineResult);
scoreTamper.score += 1;
assert.equal(isRealMarketRiskResultInternallyConsistent(scoreTamper), false);

console.log(JSON.stringify({
  schemaVersion: "pass6-real-markets-data-receipt-integrity-test-v1",
  status: "PASS",
  assertions: 64,
  capabilityTamperBlocked: true,
  timestampFabricationBlocked: true,
  sourceMismatchBlocked: true,
  missingTransportBlocked: true,
  incompleteProBlocked: true,
  incompleteAdvancedBlocked: true,
  postEngineScoreMutationBlocked: true,
  canonicalMissingDataCount: incompleteInstrument.missingData.length,
}, null, 2));
