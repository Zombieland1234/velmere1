import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { canonicalJson } from "../../lib/security/canonical-json.js";
import { sha256Hex } from "../../lib/security/cryptographic-digest.js";
import { projectShieldMapCustomerConfidence } from "../../lib/market-integrity/shield-map-customer-confidence.js";

const NOW = "2026-08-21T10:00:00.000Z";
const HEX_A = "a".repeat(64);
const HEX_B = "b".repeat(64);
const PROFILE_ID = `risk-cal-${"c".repeat(24)}`;

const identity = {
  namespace: "symbol_or_market" as const,
  providerId: "coingecko",
  providerFamily: "market_data",
  requested: "btc",
  resolvedMarketId: "bitcoin",
  resolvedSymbol: "BTC",
  resolvedQuote: "USD" as const,
  receiptId: `p4644_${HEX_A}`,
};

function rightsDecision(purpose: string, overrides: Record<string, unknown> = {}) {
  const unsigned = {
    schemaVersion: "velmere.pass36.a102r44p18.provider-delivery-rights-resolution.v2",
    providerId: "coingecko",
    purpose,
    allowed: true,
    blockers: [],
    legalApprovalStatus: "APPROVED",
    engineeringClassification: "CUSTOMER_DELIVERY_APPROVED",
    requiredPlanOrConsent: "VERIFIED",
    sourceIds: ["official_terms"],
    matrixSha256: HEX_A,
    decisionSha256: HEX_B,
    diagnosticOnly: false,
    ...overrides,
  };
  return { ...unsigned, receiptSha256: sha256Hex(canonicalJson(unsigned)) };
}

function rightsProjection(
  overrides: Record<string, unknown> = {},
  decisionOverrides: Partial<Record<string, Record<string, unknown>>> = {},
) {
  const decisions = Object.fromEntries(
    ["public_display", "commercial_product", "customer_delivery", "derived_analytics_external"].map(
      (purpose) => [purpose, rightsDecision(purpose, decisionOverrides[purpose])],
    ),
  );
  return {
    schemaVersion: "velmere.pass36.a102r44p18.provider-rights-projection.v2",
    providerId: "coingecko",
    decisions,
    customerDeliveryAllowed: true,
    paidTierAllowed: false,
    publicDisplayAllowed: true,
    internalDiagnosticAllowed: true,
    projectionSha256: sha256Hex(canonicalJson(decisions)),
    ...overrides,
  };
}

const publication = {
  schemaVersion: "pass6_legacy_route_publication_truth_v1",
  mode: "live",
  evidenceState: "verified",
  scorePublished: true,
  canonicalIdentity: "market:bitcoin",
  completenessBps: 10_000,
  sourceAsOf: "2026-08-21T09:59:00.000Z",
  sourceReceiptRoot: HEX_A,
  receiptDigest: HEX_B,
  blockers: [],
};

const calibratedResult = {
  token: { marketId: "bitcoin", symbol: "BTC" },
  dataQuality: "live",
  confidence: 0.99,
  modelBinding: {
    schemaVersion: "velmere.risk-model-binding.v1",
    scoreFormula: "deterministic_continuous_evidence_fusion_v10",
    featureSchemaVersion: "velmere.risk-feature-schema.v2",
    featureSchemaDigest: `sha256:${HEX_A}`,
    assetClassCohort: "crypto",
    providerConfigurationDigest: `sha256:${HEX_B}`,
  },
  uncertainty: {
    schemaVersion: "velmere.risk-uncertainty.v1",
    method: "deterministic_evidence_sensitivity",
    interpretation: "sensitivity_band_not_empirical_confidence_interval",
    empiricalCalibrationStatus: "holdout_validated",
    probabilityClaimAllowed: true,
    calibrationProfileId: PROFILE_ID,
    outOfDistribution: false,
    evidenceState: "live_multi_source",
  },
  empiricalCalibration: {
    schemaVersion: "velmere.risk-result-calibration.v1",
    status: "holdout_validated",
    profileId: PROFILE_ID,
    outcomeDefinition: "declared adverse market-integrity event within 30 days",
    probability: 0.82,
    issuedAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    integrityDigest: `sha256:${HEX_A}`,
    modelBindingDigest: `sha256:${HEX_B}`,
  },
  providerRiskDelivery: {
    schemaVersion: "pass6_provider_risk_delivery_v1",
    state: "verified",
    scorePublished: true,
    canonicalIdentity: "market:bitcoin",
    sourceReceiptRoot: HEX_A,
    receiptDigest: HEX_B,
    completenessBps: 10_000,
    sourceAsOf: "2026-08-21T09:59:00.000Z",
    blockers: [],
  },
  customerTruth: {
    schemaVersion: "velmere.standalone-customer-truth.v1",
    contractId: "pass36-a102r44p35-standalone-customer-truth",
    productId: "risk-indicator",
    truthState: "CONFIRMED",
    confidenceClass: "EVIDENCE_BOUND",
    probabilityClaimAllowed: true,
    investmentRecommendationAllowed: false,
    leverageRecommendationAllowed: false,
    guaranteedOutcomeClaimAllowed: false,
    conflicts: [],
    missingProof: [],
    reasonCards: [],
  },
};

const published = projectShieldMapCustomerConfidence({
  identity,
  result: calibratedResult,
  publication,
  rightsProjection: rightsProjection(),
  evaluatedAt: NOW,
});
assert.deepEqual(published, {
  state: "published",
  value: 82,
  calibrationProfileId: PROFILE_ID,
  outcomeDefinition: "declared adverse market-integrity event within 30 days",
});

const rejectedCases: Array<[string, Parameters<typeof projectShieldMapCustomerConfidence>[0]]> = [
  ["high heuristic without calibration", {
    identity,
    result: { ...calibratedResult, confidence: 1, empiricalCalibration: undefined },
    publication,
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["rights projection missing", {
    identity, result: calibratedResult, publication, rightsProjection: undefined, evaluatedAt: NOW,
  }],
  ["public display right denied", {
    identity,
    result: calibratedResult,
    publication,
    rightsProjection: rightsProjection({ publicDisplayAllowed: false }),
    evaluatedAt: NOW,
  }],
  ["derived analytics right denied", {
    identity,
    result: calibratedResult,
    publication,
    rightsProjection: rightsProjection({}, { derived_analytics_external: { allowed: false, blockers: ["not_approved"] } }),
    evaluatedAt: NOW,
  }],
  ["diagnostic-only rights injection", {
    identity,
    result: calibratedResult,
    publication,
    rightsProjection: rightsProjection({}, { customer_delivery: { diagnosticOnly: true } }),
    evaluatedAt: NOW,
  }],
  ["rights digest tamper", {
    identity,
    result: calibratedResult,
    publication,
    rightsProjection: { ...rightsProjection(), projectionSha256: HEX_A },
    evaluatedAt: NOW,
  }],
  ["identity substitution", {
    identity,
    result: {
      ...calibratedResult,
      providerRiskDelivery: { ...calibratedResult.providerRiskDelivery, canonicalIdentity: "market:ethereum" },
    },
    publication,
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["publication withheld", {
    identity,
    result: calibratedResult,
    publication: { ...publication, mode: "withheld", evidenceState: "withheld", scorePublished: false },
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["stale provider evidence", {
    identity,
    result: {
      ...calibratedResult,
      providerRiskDelivery: { ...calibratedResult.providerRiskDelivery, sourceAsOf: "2026-08-21T09:40:00.000Z" },
    },
    publication: { ...publication, sourceAsOf: "2026-08-21T09:40:00.000Z" },
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["future provider evidence", {
    identity,
    result: {
      ...calibratedResult,
      providerRiskDelivery: { ...calibratedResult.providerRiskDelivery, sourceAsOf: "2026-08-21T10:02:00.000Z" },
    },
    publication: { ...publication, sourceAsOf: "2026-08-21T10:02:00.000Z" },
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["expired calibration", {
    identity,
    result: {
      ...calibratedResult,
      empiricalCalibration: { ...calibratedResult.empiricalCalibration, expiresAt: "2026-08-20T00:00:00.000Z" },
    },
    publication,
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["future-issued calibration", {
    identity,
    result: {
      ...calibratedResult,
      empiricalCalibration: { ...calibratedResult.empiricalCalibration, issuedAt: "2026-08-21T10:02:00.000Z" },
    },
    publication,
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["invalid calibration digest", {
    identity,
    result: {
      ...calibratedResult,
      empiricalCalibration: { ...calibratedResult.empiricalCalibration, integrityDigest: "trusted" },
    },
    publication,
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["non-finite probability", {
    identity,
    result: {
      ...calibratedResult,
      empiricalCalibration: { ...calibratedResult.empiricalCalibration, probability: Number.NaN },
    },
    publication,
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["customer truth is not evidence-bound", {
    identity,
    result: {
      ...calibratedResult,
      customerTruth: { ...calibratedResult.customerTruth, confidenceClass: "LIMITED_EVIDENCE" },
    },
    publication,
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["out-of-distribution calibration", {
    identity,
    result: {
      ...calibratedResult,
      uncertainty: { ...calibratedResult.uncertainty, outOfDistribution: true },
    },
    publication,
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["calibration profile mismatch", {
    identity,
    result: {
      ...calibratedResult,
      uncertainty: { ...calibratedResult.uncertainty, calibrationProfileId: `risk-cal-${"d".repeat(24)}` },
    },
    publication,
    rightsProjection: rightsProjection(),
    evaluatedAt: NOW,
  }],
  ["canonical identity absent", {
    identity: null, result: calibratedResult, publication, rightsProjection: rightsProjection(), evaluatedAt: NOW,
  }],
  ["malformed nested values", {
    identity,
    result: { providerRiskDelivery: { blockers: "none" }, empiricalCalibration: [] },
    publication: { blockers: { length: 0 } },
    rightsProjection: { decisions: null },
    evaluatedAt: NOW,
  }],
];

for (const [label, input] of rejectedCases) {
  const projected = projectShieldMapCustomerConfidence(input);
  assert.equal(projected.state, "withheld", `${label} must fail closed`);
  assert.equal(projected.value, null, `${label} must never expose a number`);
}

const client = readFileSync("components/market-integrity/ShieldMapCommandClient.tsx", "utf8");
assert.match(client, /projectShieldMapCustomerConfidence\(\{/);
assert.match(client, /setCustomerConfidence\(confidenceProjection\)/);
assert.match(client, /customerConfidence\?\.state === "published"/);
assert.doesNotMatch(client, /\{investigator\.confidenceScore\}%/);
assert.doesNotMatch(client, /Δ confidence/);
assert.doesNotMatch(client, /Potential confidence lift|Möglicher Konfidenzgewinn|Możliwy wzrost pewności/);
assert.ok(
  client.indexOf("projectShieldMapCustomerConfidence({")
    < client.indexOf("setInvestigator(payload.investigator)"),
  "customer confidence must pass the boundary before graph state is published",
);

console.log("Shield Map customer confidence boundary: PASS");
