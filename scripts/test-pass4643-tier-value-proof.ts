import assert from "node:assert/strict";
import { buildAnalysisReadiness, buildInsufficientDataRiskResult } from "../lib/market-integrity/analysis-readiness";
import {
  createPass4644ProviderEvidenceReceipt,
  pass4644FieldValueHash,
} from "../lib/market-integrity/provider-evidence-receipt";
import { buildPass4645ProviderEvidenceLedger } from "../lib/market-integrity/provider-evidence-ledger";
import type { TokenRiskResult } from "../lib/market-integrity/risk-types";
import { buildPass4643ProviderRuntimeInventory } from "../lib/market-integrity/provider-runtime-inventory";
import { buildPass4643AuditTierValueProof } from "../lib/security/audit-tier-value-proof";
import { createPass4656AuditBenchmarkAttestation, verifyPass4656AuditBenchmarkAttestation } from "../lib/security/audit-benchmark-attestation";
import {
  PASS4809_COMMERCIAL_COHORT_POLICY_ID,
  type CommercialCohortGate,
} from "../lib/worldclass/commercial-cohort-policy";

const providerReceiptSigningSecret = "pass4643-fixture-provider-receipt-signing-secret-v1";
process.env.VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET = providerReceiptSigningSecret;

function verifiedAuditCohortGate(tier: "pro" | "advanced"): CommercialCohortGate {
  return {
    schemaVersion: "velmere.commercial-cohort-gate.v1",
    policyVersion: PASS4809_COMMERCIAL_COHORT_POLICY_ID,
    product: "audit",
    tier,
    verified: true,
    primaryVerified: true,
    dualControlVerified: true,
    antiCherryPickVerified: true,
    precommitBound: true,
    transparencyBound: true,
    publicCheckpointVerified: true,
    rollbackProtected: true,
    externallyWitnessed: true,
    keyRotationVerified: true,
    deploymentReceiptVerified: true,
    artifactBound: true,
    stagingE2eVerified: true,
    stagingE2eBound: true,
    stagingRollbackProtected: true,
    stagingSequence: 1,
    stagingReceiptDigest: `sha256:${"1".repeat(64)}`,
    stagingProbeCount: 12,
    chaosRecoveryVerified: true,
    recoveryBound: true,
    recoveryRollbackProtected: true,
    rtoRpoVerified: true,
    idempotencyVerified: true,
    chaosSequence: 1,
    chaosReceiptDigest: `sha256:${"2".repeat(64)}`,
    chaosScenarioCount: 8,
    observabilityVerified: true,
    telemetryBound: true,
    sloVerified: true,
    incidentResponseVerified: true,
    safeDegradationVerified: true,
    observabilityRollbackProtected: true,
    observabilitySequence: 1,
    observabilityReceiptDigest: `sha256:${"3".repeat(64)}`,
    observabilityObjectiveCount: 8,
    privacyVerified: true,
    tenantIsolationVerified: true,
    dataLifecycleVerified: true,
    abuseResistanceVerified: true,
    auditTrailVerified: true,
    privacyRollbackProtected: true,
    privacySequence: 1,
    privacyReceiptDigest: `sha256:${"4".repeat(64)}`,
    privacyControlCount: 8,
    supplyChainVerified: true,
    reproducibleBuild: true,
    vulnerabilityGatePassed: true,
    supplyChainBound: true,
    supplyChainProvenanceDigest: `sha256:${"5".repeat(64)}`,
    deploymentRollbackProtected: true,
    deploymentSequence: 1,
    deploymentReceiptDigest: `sha256:${"6".repeat(64)}`,
    checkpointSequence: 1,
    checkpointDigest: `sha256:${"7".repeat(64)}`,
    trustEpoch: 1,
    externalWitnessCount: 2,
    ready: true,
    manifestDigest: `sha256:${"8".repeat(64)}`,
    antiCherryPickReceiptDigest: `sha256:${"9".repeat(64)}`,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    blockers: [],
    metrics: null,
    pdfMetrics: null,
    thresholdSource: "internal_release_policy_not_external_benchmark",
  };
}

const verifiedProAuditCohortGate = verifiedAuditCohortGate("pro");
const verifiedAdvancedAuditCohortGate = verifiedAuditCohortGate("advanced");

function providerId(source: string) {
  return source.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function sourceBoundRiskPayload(result: TokenRiskResult, source: string) {
  const payload: Record<string, unknown> = {
    provider: source,
    identity: {
      symbol: result.token.symbol,
      marketId: result.token.marketId,
      chainId: result.token.chainId,
      tokenAddress: result.token.tokenAddress,
    },
  };
  const capabilities = ["identity"];
  const include = (capability: string, field: string, value: unknown) => {
    if (value === undefined || value === null) return;
    payload[field] = value;
    capabilities.push(capability);
  };
  const normalizedSource = source.toLowerCase();
  if (/coingecko|dexscreener|binance|defillama|coinbase|geckoterminal|kraken|coinmarketcap/.test(normalizedSource)) {
    include("price", "currentPrice", result.metrics.currentPrice);
    include("market_cap", "marketCap", result.metrics.marketCap);
    include("volume", "volume24h", result.metrics.volume24h);
  }
  if (/coingecko|binance|coinbase|geckoterminal|kraken|coinmarketcap/.test(normalizedSource)) {
    include("history", "priceChange7d", result.metrics.priceChange7d);
    include("history", "priceChange30d", result.metrics.priceChange30d);
  }
  if (/dexscreener|binance|defillama|geckoterminal/.test(normalizedSource)) {
    include("liquidity", "liquidityUsd", result.metrics.liquidityUsd);
  }
  if (/alchemy|etherscan/.test(normalizedSource)) {
    include("holders", "holderCount", result.metrics.holderCount);
    include("holders", "top10HolderPercent", result.metrics.top10HolderPercent);
  }
  if (/alchemy|etherscan|quicknode/.test(normalizedSource)) {
    include(
      "contract_permissions",
      "contractPermissions",
      result.signals.some((signal) => signal.id === "contract_privileges"),
    );
  }
  if (/coingecko|defillama|coinmarketcap/.test(normalizedSource)) {
    include("supply", "circulatingSupply", result.metrics.circulatingSupply);
    include("supply", "totalSupply", result.metrics.totalSupply);
  }
  if (/binance|coinbase|kraken/.test(normalizedSource)) {
    include("orderbook", "bidAskImbalancePercent", result.metrics.bidAskImbalancePercent);
    include("slippage", "simulatedSlippage10k", result.metrics.simulatedSlippage10k);
  }
  if (/quicknode|coinbase|geckoterminal/.test(normalizedSource)) {
    include("scenario_dependency", "scenarioDependency", {
      verdict: result.metaModel?.verdict,
      escalation: result.metaModel?.escalation,
      requiredReview: result.metaModel?.requiredReview,
    });
  }
  return { payload, capabilities: Array.from(new Set(capabilities)) };
}

function cryptoFixture(overrides: Partial<TokenRiskResult> = {}): TokenRiskResult {
  const result: TokenRiskResult = {
    token: {
      marketId: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      chainId: "1",
      tokenAddress: "0x1111111111111111111111111111111111111111",
      assetClass: "crypto",
    },
    score: 22,
    confidence: 0.8,
    level: "low",
    badge: "low_detected_risk",
    signals: [],
    metrics: {},
    dataQuality: "live",
    dataSources: [],
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
  if (!result.providerEvidenceReceipts?.length && result.dataSources.length) {
    result.providerEvidenceReceipts = result.dataSources.map((source) => {
      const evidence = sourceBoundRiskPayload(result, source);
      return createPass4644ProviderEvidenceReceipt({
        providerId: providerId(source),
        providerFamily: providerId(source),
        surface: "crypto",
        verification: "normalized_response",
        requestedIdentity: "BTC",
        resolvedSymbol: "BTC",
        resolvedMarketId: "bitcoin",
        identityMatched: true,
        capabilities: evidence.capabilities,
        timestampProvenance: "provider",
        observedAt: new Date(),
        receivedAt: new Date(),
        latencyMs: 45,
        normalizedPayload: evidence.payload,
      });
    });
  }
  if (result.providerEvidenceReceipts?.length && !result.providerEvidenceLedger) {
    const ledger = buildPass4645ProviderEvidenceLedger({
      receipts: result.providerEvidenceReceipts,
      requestedIdentity: "BTC",
      surface: "crypto",
      depth: "advanced",
      generatedAt: new Date(),
      signingSecret: providerReceiptSigningSecret,
    });
    result.providerEvidenceLedger = ledger;
    result.providerEvidencePersistence = {
      schemaVersion: "pass4645_provider_evidence_persistence_v1",
      durable: true,
      mode: "filesystem",
      ledgerId: ledger.ledgerId,
      headHash: ledger.headHash,
      recordCount: ledger.entries.length,
      readBackVerified: true,
      persistedAt: new Date().toISOString(),
      locator: `fixture:${ledger.ledgerId}`,
      blockers: [],
    };
  }
  return result;
}

const checks: string[] = [];
function check(name: string, fn: () => void) {
  fn();
  checks.push(name);
}

check("zero-source result blocks every commercial tier", () => {
  const readiness = buildAnalysisReadiness(buildInsufficientDataRiskResult("BTC"));
  assert.equal(readiness.riskScore, null);
  assert.equal(readiness.tiers.basic.sellReady, false);
  assert.equal(readiness.tiers.pro.sellReady, false);
  assert.equal(readiness.tiers.advanced.sellReady, false);
});

check("Basic requires corroborated data rather than one source", () => {
  const readiness = buildAnalysisReadiness(cryptoFixture({
    confidence: 0.35,
    dataSources: ["CoinGecko market", "DexScreener pair"],
    metrics: { currentPrice: 10, marketCap: 1000, volume24h: 100 },
  }));
  assert.equal(readiness.tiers.basic.sellReady, true);
  assert.equal(readiness.tiers.pro.sellReady, false);
  assert.equal(readiness.evidenceCategories.includes("identity"), true);
  assert.equal(readiness.evidenceCategories.includes("market"), true);
});

check("risk fixtures bind exact normalized field values into provider receipts", () => {
  const fixture = cryptoFixture({
    confidence: 0.35,
    dataSources: ["CoinGecko market", "DexScreener pair"],
    metrics: { currentPrice: 10, marketCap: 1000, volume24h: 100, liquidityUsd: 500 },
  });
  const receipts = fixture.providerEvidenceReceipts ?? [];
  assert.equal(receipts.length, 2);
  assert.equal(receipts.every((receipt) => (receipt.fieldEvidence?.length ?? 0) >= 5), true);
  assert.equal(receipts.every((receipt) => receipt.fieldEvidence?.some((field) =>
    field.fieldPath === "currentPrice" && field.valueHash === pass4644FieldValueHash(10))), true);
  assert.equal(receipts.every((receipt) => receipt.fieldEvidence?.some((field) =>
    field.fieldPath === "marketCap" && field.valueHash === pass4644FieldValueHash(1000))), true);
});

check("Pro proves broader evidence but cannot impersonate Advanced", () => {
  const readiness = buildAnalysisReadiness(cryptoFixture({
    confidence: 0.78,
    dataSources: [
      "CoinGecko market", "DexScreener pair", "Binance orderbook",
      "DefiLlama protocol", "Alchemy transfers", "Etherscan verified source",
    ],
    signals: [
      { id: "holder_concentration", severity: "medium", points: 10 },
      { id: "contract_privileges", severity: "high", points: 20 },
    ],
    metrics: {
      currentPrice: 10, marketCap: 1000, volume24h: 100, liquidityUsd: 500,
      top10HolderPercent: 35, holderCount: 1200, priceChange24h: 2,
      priceChange7d: -3, circulatingSupply: 100, totalSupply: 120,
    },
  }));
  assert.equal(readiness.tiers.pro.sellReady, true, readiness.tiers.pro.reason);
  assert.equal(readiness.tiers.pro.valueDeltaProven, true);
  assert.equal(readiness.tiers.advanced.sellReady, false);
});

check("Advanced requires institutional evidence depth and scenario lane", () => {
  const readiness = buildAnalysisReadiness(cryptoFixture({
    confidence: 0.91,
    dataSources: [
      "CoinGecko market", "DexScreener pair", "Binance orderbook", "DefiLlama protocol",
      "Alchemy transfers", "Etherscan verified source", "QuickNode logs", "Coinbase orderbook",
      "GeckoTerminal pool OHLCV", "Kraken trades", "CoinMarketCap market",
    ],
    signals: [
      { id: "holder_concentration", severity: "medium", points: 10 },
      { id: "contract_privileges", severity: "high", points: 20 },
      { id: "orderbook_imbalance", severity: "medium", points: 8 },
    ],
    metrics: {
      currentPrice: 10, athPrice: 20, drawdownPercent: 50, marketCap: 1000,
      fdv: 1200, liquidityUsd: 500, volume24h: 100, priceChange1h: 1,
      priceChange24h: 2, priceChange7d: -3, priceChange30d: 9,
      top10HolderPercent: 35, holderCount: 1200, simulatedSlippage10k: 0.7,
      bidAskImbalancePercent: 5, circulatingSupply: 100, totalSupply: 120,
    },
    metaModel: {
      version: "test", verdict: "watch", dataFusionScore: 90, conflictLevel: "none",
      requiredReview: false, summary: "source-bound", escalation: "monitor", limitations: [],
    },
  }));
  assert.equal(readiness.tiers.advanced.sellReady, true, readiness.tiers.advanced.reason);
  assert.equal(readiness.tiers.advanced.valueDeltaProven, true);
  assert.equal(readiness.sourceFamilyCount >= 3, true);
  assert.equal(readiness.evidenceCategoryCount >= 6, true);
});

check("provider inventory never exposes secret values", () => {
  const inventory = buildPass4643ProviderRuntimeInventory("crypto", {
    NODE_ENV: "test",
    ETHERSCAN_API_KEY: "super-secret-value",
    ALCHEMY_API_KEY: "another-secret",
  });
  const serialized = JSON.stringify(inventory);
  assert.equal(serialized.includes("super-secret-value"), false);
  assert.equal(serialized.includes("another-secret"), false);
  assert.equal(inventory.secretValuesExposed, false);
  assert.equal(inventory.usableProviders >= 8, true);
});



const auditBenchmarkSecret = "pass4656-audit-benchmark-secret-longer-than-thirty-two-bytes";
const auditBenchmarkAttestation = createPass4656AuditBenchmarkAttestation({
  signingSecret: auditBenchmarkSecret,
  payload: {
    benchmarkFingerprint: "a".repeat(64),
    generatedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    signerKeyId: "benchmark-test-current",
    caseCount: 120,
    vulnerableCaseCount: 50,
    controlCaseCount: 50,
    categoryCoverageCount: 12,
    overallRecall: 0.92,
    criticalRecall: 1,
    highRecall: 0.94,
    precision: 0.91,
    controlFalsePositiveRate: 0.04,
    evidenceBindingRate: 1,
    preDisclosureOnly: true,
    independentReviewComplete: true,
    worldClassAuditReady: true,
  },
});
const auditBenchmarkProof = verifyPass4656AuditBenchmarkAttestation({
  attestation: auditBenchmarkAttestation,
  signingSecrets: { current: auditBenchmarkSecret },
});

function auditEvidenceBundle(
  lanes: Array<{ id: string; state: string; evidence?: string[] }>,
  depth: "pro" | "advanced",
) {
  const requestedIdentity = "0x1111111111111111111111111111111111111111";
  const receipts = lanes.filter((lane) => lane.state === "confirmed").map((lane, index) => {
    const facts = Object.fromEntries((lane.evidence ?? [lane.id]).map((evidence) => [
      evidence.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
      evidence,
    ]));
    return createPass4644ProviderEvidenceReceipt({
      providerId: lane.id,
      providerFamily: `audit_family_${index}`,
      surface: "contract_audit",
      verification: "normalized_response",
      requestedIdentity,
      resolvedAddress: requestedIdentity,
      resolvedChainId: "1",
      identityMatched: true,
      capabilities: lane.evidence ?? [lane.id],
      timestampProvenance: "provider",
      observedAt: new Date(),
      receivedAt: new Date(),
      latencyMs: 45,
      normalizedPayload: {
        identity: { contractAddress: requestedIdentity, chainId: "1" },
        facts,
      },
    });
  });
  const ledger = buildPass4645ProviderEvidenceLedger({
    receipts,
    requestedIdentity,
    surface: "contract_audit",
    depth,
    generatedAt: new Date(),
    signingSecret: providerReceiptSigningSecret,
  });
  return { receipts, ledger, requestedIdentity };
}

const baseLanes = [
  { id: "explorer", state: "confirmed", tier: ["basic", "pro", "advanced"], evidence: ["verified source", "contract identity"] },
  { id: "dex", state: "confirmed", tier: ["basic", "pro", "advanced"], evidence: ["pool identity", "liquidity snapshot"] },
  { id: "goplus", state: "confirmed", tier: ["pro", "advanced"], evidence: ["permission map", "tax flags", "honeypot flags"] },
  { id: "holders", state: "confirmed", tier: ["pro", "advanced"], evidence: ["holder concentration", "deployer balance", "lock evidence"] },
  { id: "source-parser", state: "confirmed", tier: ["pro", "advanced"], evidence: ["ABI selectors", "proxy detection", "admin functions"] },
] as const;

check("audit Pro requires actual evidence delta", () => {
  const lanes = baseLanes.map((lane) => ({ ...lane, tier: [...lane.tier], evidence: [...lane.evidence] }));
  const bundle = auditEvidenceBundle(lanes, "pro");
  const proof = buildPass4643AuditTierValueProof({
    lanes,
    providerEvidenceReceipts: bundle.receipts,
    providerEvidenceLedger: bundle.ledger,
    requestedIdentity: bundle.requestedIdentity,
    providerConfirmed: 5,
    providerPartial: 0,
    sourceAbiReady: true,
    permissionParserReady: true,
    liquidityHolderRiskReady: true,
    pdfParityReady: true,
    auditBenchmarkProof,
    commercialCohortGates: { pro: verifiedProAuditCohortGate },
  });
  assert.equal(proof.tiers.basic.sellReady, true);
  assert.equal(proof.tiers.pro.sellReady, true, proof.tiers.pro.blockers.join(","));
  assert.equal(proof.tiers.advanced.sellReady, false);
});

check("audit Advanced proves its evidence delta but cannot self-assert manual authority", () => {
  const lanes = [
    ...baseLanes.map((lane) => ({ ...lane, tier: [...lane.tier], evidence: [...lane.evidence] })),
    { id: "dex-secondary", state: "confirmed", tier: ["advanced"], evidence: ["pool identity", "liquidity depth", "pool reserves"] },
    { id: "holders-secondary", state: "confirmed", tier: ["advanced"], evidence: ["treasury ownership", "whale concentration"] },
    { id: "trace", state: "confirmed", tier: ["advanced"], evidence: ["trace replay", "state transition", "economic attack scenario", "dependency graph", "second static analysis"] },
  ];
  const bundle = auditEvidenceBundle(lanes, "advanced");
  const proof = buildPass4643AuditTierValueProof({
    lanes,
    providerEvidenceReceipts: bundle.receipts,
    providerEvidenceLedger: bundle.ledger,
    requestedIdentity: bundle.requestedIdentity,
    providerConfirmed: 6,
    providerPartial: 0,
    sourceAbiReady: true,
    permissionParserReady: true,
    liquidityHolderRiskReady: true,
    pdfParityReady: true,
    auditBenchmarkProof,
    commercialCohortGates: {
      pro: verifiedProAuditCohortGate,
      advanced: verifiedAdvancedAuditCohortGate,
    },
    durableReceiptReady: true,
    verifiedPaymentReceipt: true,
    conflictFree: true,
  });
  assert.equal(proof.tiers.advanced.sellReady, true, proof.tiers.advanced.blockers.join(","));
  assert.equal(proof.tiers.advanced.valueDeltaProven, true);
  assert.equal(proof.tiers.advanced.deliveryReady, false);
  assert.equal(proof.tiers.advanced.deliveryBlockers.includes("operator_final_sign_not_ready"), true);
});


check("audit paid tiers fail closed without signed benchmark attestation", () => {
  const lanes = baseLanes.map((lane) => ({ ...lane, tier: [...lane.tier], evidence: [...lane.evidence] }));
  const bundle = auditEvidenceBundle(lanes, "pro");
  const proof = buildPass4643AuditTierValueProof({
    lanes,
    providerEvidenceReceipts: bundle.receipts,
    providerEvidenceLedger: bundle.ledger,
    requestedIdentity: bundle.requestedIdentity,
    providerConfirmed: 5,
    providerPartial: 0,
    sourceAbiReady: true,
    permissionParserReady: true,
    liquidityHolderRiskReady: true,
    pdfParityReady: true,
  });
  assert.equal(proof.tiers.basic.sellReady, true);
  assert.equal(proof.tiers.pro.sellReady, false);
  assert.equal(proof.tiers.pro.blockers.some((value) => value.startsWith("audit_benchmark_not_verified:")), true);
});

check("Advanced delivery remains fail-closed when operator and payment proofs are omitted", () => {
  const lanes = [
    ...baseLanes.map((lane) => ({ ...lane, tier: [...lane.tier], evidence: [...lane.evidence] })),
    { id: "dex-secondary", state: "confirmed", tier: ["advanced"], evidence: ["pool identity", "liquidity depth", "pool reserves"] },
    { id: "holders-secondary", state: "confirmed", tier: ["advanced"], evidence: ["treasury ownership", "whale concentration"] },
    { id: "trace", state: "confirmed", tier: ["advanced"], evidence: ["trace replay", "state transition", "economic attack scenario", "dependency graph", "second static analysis"] },
  ];
  const bundle = auditEvidenceBundle(lanes, "advanced");
  const proof = buildPass4643AuditTierValueProof({
    lanes,
    providerEvidenceReceipts: bundle.receipts,
    providerEvidenceLedger: bundle.ledger,
    requestedIdentity: bundle.requestedIdentity,
    providerConfirmed: 8,
    providerPartial: 0,
    sourceAbiReady: true,
    permissionParserReady: true,
    liquidityHolderRiskReady: true,
    pdfParityReady: true,
    auditBenchmarkProof,
    conflictFree: true,
    commercialCohortGates: {
      pro: verifiedProAuditCohortGate,
      advanced: verifiedAdvancedAuditCohortGate,
    },
  });
  assert.equal(proof.tiers.advanced.preCheckoutReady, true);
  assert.equal(proof.tiers.advanced.deliveryReady, false);
  assert.equal(proof.tiers.advanced.deliveryBlockers.includes("verified_payment_receipt_missing"), true);
  assert.equal(proof.tiers.advanced.deliveryBlockers.includes("operator_final_sign_not_ready"), true);
});

console.log(`PASS4643 TIER VALUE PROOF: ${checks.length}/${checks.length}`);
for (const name of checks) console.log(`PASS ${name}`);
