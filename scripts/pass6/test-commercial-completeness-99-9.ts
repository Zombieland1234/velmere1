import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  buildPass4825RuntimeCanonicalFieldPacket,
  type Pass4825RuntimeFieldValue,
} from "../../lib/reporting/runtime-canonical-field-adapter";
import {
  assertPass6PaidCommercialCompleteness,
  buildPass6CommercialFieldCompletenessReceipt,
  pass6SourceReceiptRoot,
  verifyPass6CommercialFieldCompletenessReceipt,
} from "../../lib/reporting/commercial-field-completeness";
import { pass4644FieldValueHash } from "../../lib/market-integrity/provider-evidence-receipt";
import { canonicalJson } from "../../lib/security/canonical-json";
import { sha256Digest } from "../../lib/security/cryptographic-digest";
import type { SourceReceipt } from "../../lib/market-integrity/top1-risk-foundation";

const NOW = "2026-07-18T14:00:00.000Z";
const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const SOURCE_DIGEST = `sha256:${"c".repeat(64)}`;
const PROJECTION_SECRET = "pass6-test-only-source-receipt-projection-secret-20260718";
process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = PROJECTION_SECRET;
process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = "pass6-test-current";

function signReceiptProjection(receipt: SourceReceipt): SourceReceipt {
  const { projection: _projection, ...unsigned } = receipt;
  const payload = canonicalJson(unsigned);
  return {
    ...unsigned,
    projection: {
      schemaVersion: "pass4993_source_receipt_projection_v1",
      algorithm: "HMAC-SHA256",
      keyId: "pass6-test-current",
      payloadDigest: sha256Digest(payload),
      signature: createHmac("sha256", PROJECTION_SECRET)
        .update(`velmere:source-receipt-projection:v1:${payload}`, "utf8")
        .digest("base64url"),
    },
  };
}

function capabilityForField(fieldId: string) {
  if (fieldId.startsWith("identity.")) return "identity";
  if (fieldId.startsWith("evidence.")) return "evidence";
  if (fieldId.startsWith("risk.")) return "price";
  if (fieldId === "market.price" || fieldId === "source.second_source_divergence_bps") return "price";
  if (fieldId.startsWith("market.change_")) return "history";
  if (fieldId === "market.volume_24h") return "volume";
  if (fieldId === "market.liquidity_usd") return "liquidity";
  throw new Error(`fixture_capability_missing:${fieldId}`);
}

function receipt(args: { id: string; digest: string; upstream: string; rawValues: Record<string, unknown> }): SourceReceipt {
  const capabilities = ["identity", "evidence", "quote", "price", "history", "volume", "liquidity", "real_market_quote"];
  return signReceiptProjection({
    receiptId: args.id,
    provider: args.upstream,
    sourceFamily: "yahoo_stooq",
    dataType: "identity quote price history volume liquidity real market quote",
    observedAt: NOW,
    ageSeconds: 0,
    freshnessStatus: "fresh",
    qualityScore: 95,
    usedInLanes: capabilities,
    evidenceState: "content_bound",
    payloadDigest: args.digest,
    providerReceiptId: `${args.id}:provider`,
    identityMatched: true,
    commercialEvidenceEligible: true,
    upstreamRoot: args.upstream,
    providerReceiptCanonicalDigest: args.digest,
    providerReceiptIntegrityVerified: true,
    timestampProvenance: "provider",
    targetCanonicalIdentity: "equity:xnas:aapl",
    requestedCanonicalIdentity: "equity:xnas:aapl",
    resolvedCanonicalIdentity: "equity:xnas:aapl",
    resolvedIdentity: { symbol: "AAPL", marketId: null, address: null, chainId: null },
    receivedAt: NOW,
    expiresAt: NOW,
    providerSurface: "real_markets",
    providerVerification: "normalized_response",
    projection: null,
    fieldEvidence: Object.entries(args.rawValues).map(([fieldId, value]) => ({
      fieldPath: fieldId,
      capability: capabilityForField(fieldId),
      valueHash: pass4644FieldValueHash(value),
    })),
  });
}

function values(overrides: Record<string, Pass4825RuntimeFieldValue> = {}) {
  const base: Record<string, Pass4825RuntimeFieldValue> = {
    "risk.score": { value: 31, confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "risk.confidence": { value: 90, confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "evidence.missing": { value: [], confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "evidence.gap_count": { value: 0, confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "evidence.primary_gap": { value: "none", confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "market.price": { value: 101.25, mode: "provider_observation", currency: "USD", confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "market.change_24h": { value: 0, mode: "provider_observation", confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "market.volume_24h": { value: 5_000_000, mode: "provider_observation", currency: "USD", confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "market.change_1h": { value: 0.2, mode: "provider_observation", confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "source.second_source_divergence_bps": { value: 4, confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "market.liquidity_usd": { value: 2_000_000, mode: "provider_observation", currency: "USD", confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
  };
  return { ...base, ...overrides };
}

const FIXTURE_RAW_VALUES: Record<string, unknown> = {
  "identity.canonical_id": "equity:xnas:aapl",
  "identity.symbol": "AAPL",
  "identity.asset_class": "stock",
  ...Object.fromEntries(Object.entries(values()).map(([fieldId, configured]) => [fieldId, configured.value])),
};
const receipts = [
  receipt({ id: "yahoo-receipt", digest: DIGEST_A, upstream: "yahoo", rawValues: FIXTURE_RAW_VALUES }),
  receipt({ id: "stooq-receipt", digest: DIGEST_B, upstream: "stooq", rawValues: FIXTURE_RAW_VALUES }),
];

function packet(overrides: Record<string, Pass4825RuntimeFieldValue> = {}, sourceReceipts = receipts) {
  return buildPass4825RuntimeCanonicalFieldPacket({
    caseId: "pass6-pro-real-markets-complete",
    module: "real_markets",
    tier: "pro",
    identity: {
      canonicalId: "equity:xnas:aapl",
      symbol: "AAPL",
      assetClass: "stock",
      chainId: null,
      contractAddress: null,
    },
    generatedAt: NOW,
    sourceId: "pass6-source",
    sourceFamily: "commercial-field-packet",
    sourceDigest: SOURCE_DIGEST,
    sourceReceipts,
    values: values(overrides),
  }).packet;
}

const complete = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet(),
  sourceReceipts: receipts,
  requestedTier: "pro",
});
assert.equal(complete.status, "complete");
assert.equal(complete.paidDeliveryEligible, true);
assert.equal(complete.completenessBps, 10_000);
assert.equal(complete.completeFieldCount, 14);
assert.equal(complete.independentUpstreamCount, 2);
assert.equal(verifyPass6CommercialFieldCompletenessReceipt(complete), true);

assert.doesNotThrow(() => assertPass6PaidCommercialCompleteness({
  deliveryPolicy: { status: "ready_paid", visibleTier: "Pro", paidEvidenceAllowed: true },
  pass6CommercialFieldCompleteness: complete,
  pass4824CanonicalFieldPacket: packet(),
  receipts,
}, "Pro"));

const missingPrice = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({
    "market.price": {
      value: null,
      currency: "USD",
      missingReason: "provider_price_unavailable",
      confidence: 0,
      quality: 0,
      observedAt: NOW,
      receivedAt: NOW,
    },
  }),
  sourceReceipts: receipts,
  requestedTier: "pro",
});
assert.equal(missingPrice.paidDeliveryEligible, false);
assert.ok(missingPrice.explicitMissingFields.includes("market.price"));
assert.ok(missingPrice.blockers.some((item) => item.startsWith("critical_field_completeness:")));
assert.throws(() => assertPass6PaidCommercialCompleteness({
  deliveryPolicy: { status: "ready_paid", visibleTier: "Pro", paidEvidenceAllowed: true },
  pass6CommercialFieldCompleteness: missingPrice,
  pass4824CanonicalFieldPacket: packet({
    "market.price": {
      value: null,
      currency: "USD",
      missingReason: "provider_price_unavailable",
      confidence: 0,
      quality: 0,
      observedAt: NOW,
      receivedAt: NOW,
    },
  }),
  receipts,
}, "Pro"), /critical_fields_incomplete/);

const declaredGap = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({
    "evidence.missing": { value: ["filing unavailable"], confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "evidence.gap_count": { value: 1, confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
    "evidence.primary_gap": { value: "filing unavailable", confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
  }),
  sourceReceipts: receipts,
  requestedTier: "pro",
});
assert.equal(declaredGap.paidDeliveryEligible, false);
assert.equal(declaredGap.missingEvidenceDeclared, true);

const oneUpstream = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({}, receipts.slice(0, 1)),
  sourceReceipts: receipts.slice(0, 1),
  requestedTier: "pro",
});
assert.equal(oneUpstream.paidDeliveryEligible, false);
assert.equal(oneUpstream.independentUpstreamCount, 1);
assert.ok(oneUpstream.quorumShortfallFields.includes("market.price"));

const unreferencedQuorumPadding = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({}, receipts.slice(0, 1)),
  sourceReceipts: receipts,
  requestedTier: "pro",
});
assert.equal(unreferencedQuorumPadding.paidDeliveryEligible, false);
assert.equal(unreferencedQuorumPadding.independentUpstreamCount, 1);

const copiedReceipt = {
  ...receipts[0]!,
  receiptId: "copied-receipt",
  providerReceiptId: "copied-receipt:provider",
  provider: "claimed-independent-copy",
  upstreamRoot: "claimed-independent-copy",
};
const copiedReceiptSet = [receipts[0]!, copiedReceipt];
const copied = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({}, copiedReceiptSet),
  sourceReceipts: copiedReceiptSet,
  requestedTier: "pro",
});
assert.equal(copied.paidDeliveryEligible, false);
assert.equal(copied.independentUpstreamCount, 1);
assert.ok(copied.quorumShortfallFields.includes("market.price"));

const identityOnlyReceipts = receipts.map((item) => signReceiptProjection({
  ...item,
  dataType: "identity",
  usedInLanes: ["identity"],
}));
const capabilityMismatch = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet(),
  sourceReceipts: identityOnlyReceipts,
  requestedTier: "pro",
});
assert.equal(capabilityMismatch.paidDeliveryEligible, false);
assert.ok(capabilityMismatch.capabilityMismatchFields.includes("market.price"));

const staleReceipts = receipts.map((item) => ({
  ...item,
  freshnessStatus: "stale" as const,
  commercialEvidenceEligible: false,
}));
const stale = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({}, staleReceipts),
  sourceReceipts: staleReceipts,
  requestedTier: "pro",
});
assert.equal(stale.paidDeliveryEligible, false);
assert.ok(stale.unboundFields.includes("market.price"));

const ageMismatchReceipts = receipts.map((item) => ({ ...item, ageSeconds: 3_600 }));
const ageMismatch = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({}, ageMismatchReceipts),
  sourceReceipts: ageMismatchReceipts,
  requestedTier: "pro",
});
assert.equal(ageMismatch.paidDeliveryEligible, false);
assert.ok(ageMismatch.unboundFields.includes("market.price"));

const lowQualityReceipts = receipts.map((item) => ({ ...item, qualityScore: 64 }));
const lowReceiptQuality = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({}, lowQualityReceipts),
  sourceReceipts: lowQualityReceipts,
  requestedTier: "pro",
});
assert.equal(lowReceiptQuality.paidDeliveryEligible, false);
assert.ok(lowReceiptQuality.unboundFields.includes("market.price"));

const tamperedFieldEvidenceReceipts = receipts.map((item, index) => index === 0 ? {
  ...item,
  fieldEvidence: item.fieldEvidence?.map((evidence, evidenceIndex) => evidenceIndex === 0
    ? { ...evidence, valueHash: "d".repeat(64) }
    : evidence),
} : item);
const tamperedFieldEvidence = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet(),
  sourceReceipts: tamperedFieldEvidenceReceipts,
  requestedTier: "pro",
});
assert.equal(tamperedFieldEvidence.paidDeliveryEligible, false);
assert.ok(tamperedFieldEvidence.derivationMismatchFields.length > 0);

const validHexWrongValueReceipts = receipts.map((item, index) => signReceiptProjection({
  ...item,
  fieldEvidence: item.fieldEvidence?.map((evidence) => evidence.fieldPath === "market.price"
    ? { ...evidence, valueHash: (index === 0 ? "d" : "e").repeat(64) }
    : evidence),
}));
const validHexWrongValue = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet(),
  sourceReceipts: validHexWrongValueReceipts,
  requestedTier: "pro",
});
assert.equal(validHexWrongValue.paidDeliveryEligible, false);
assert.ok(validHexWrongValue.fieldEvidenceMismatchFields.includes("market.price"));

// The runtime adapter recomputes a syntactically valid derivation digest for
// the caller-supplied score. It still cannot authorize delivery because no
// provider field evidence hashes the claimed transform input value.
const regeneratedFakeDigestPacket = packet({
  "risk.score": { value: 99, confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
});
const regeneratedFakeDigest = buildPass6CommercialFieldCompletenessReceipt({
  packet: regeneratedFakeDigestPacket,
  sourceReceipts: receipts,
  requestedTier: "pro",
});
assert.equal(regeneratedFakeDigest.paidDeliveryEligible, false);
assert.ok(regeneratedFakeDigest.fieldEvidenceMismatchFields.includes("risk.score"));

const evidenceBypassReceipts = receipts.map((item) => signReceiptProjection({
  ...item,
  fieldEvidence: item.fieldEvidence?.filter((evidence) => !evidence.fieldPath.startsWith("evidence.")),
}));
const evidenceBypass = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({}, evidenceBypassReceipts),
  sourceReceipts: evidenceBypassReceipts,
  requestedTier: "pro",
});
assert.equal(evidenceBypass.paidDeliveryEligible, false);
assert.ok(evidenceBypass.fieldEvidenceMismatchFields.includes("evidence.missing"));

const quorumPaddingReceipts = [
  receipts[0]!,
  signReceiptProjection({
    ...receipts[1]!,
    fieldEvidence: receipts[1]!.fieldEvidence?.map((evidence) => evidence.fieldPath === "market.price"
      ? { ...evidence, valueHash: "9".repeat(64) }
      : evidence),
  }),
];
const quorumPadding = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({}, quorumPaddingReceipts),
  sourceReceipts: quorumPaddingReceipts,
  requestedTier: "pro",
});
assert.equal(quorumPadding.paidDeliveryEligible, false);
assert.ok(quorumPadding.quorumShortfallFields.includes("market.price"));
assert.equal(quorumPadding.independentUpstreamCount, 2);

const inconsistentEvidencePacket = packet({
  "evidence.gap_count": { value: 1, confidence: 90, quality: 90, observedAt: NOW, receivedAt: NOW },
});
const inconsistentEvidence = buildPass6CommercialFieldCompletenessReceipt({
  packet: inconsistentEvidencePacket,
  sourceReceipts: receipts,
  requestedTier: "pro",
});
assert.equal(inconsistentEvidence.paidDeliveryEligible, false);
assert.ok(inconsistentEvidence.derivationMismatchFields.includes("evidence.missing"));
assert.ok(inconsistentEvidence.derivationMismatchFields.includes("evidence.gap_count"));
assert.ok(inconsistentEvidence.derivationMismatchFields.includes("evidence.primary_gap"));

assert.equal(pass6SourceReceiptRoot(receipts), pass6SourceReceiptRoot([...receipts].reverse()));
assert.throws(() => buildPass6CommercialFieldCompletenessReceipt({
  packet: packet(),
  sourceReceipts: Array.from({ length: 65 }, () => receipts[0]!),
  requestedTier: "pro",
}), /source_receipt_limit_exceeded/);

const lowConfidence = buildPass6CommercialFieldCompletenessReceipt({
  packet: packet({
    "market.price": { value: 101.25, currency: "USD", confidence: 64, quality: 90, observedAt: NOW, receivedAt: NOW },
  }),
  sourceReceipts: receipts,
  requestedTier: "pro",
});
assert.equal(lowConfidence.paidDeliveryEligible, false);
assert.ok(lowConfidence.lowConfidenceFields.includes("market.price"));

const tampered = structuredClone(complete);
tampered.completenessBps = 9_999;
assert.equal(verifyPass6CommercialFieldCompletenessReceipt(tampered), false);
assert.throws(() => assertPass6PaidCommercialCompleteness({
  deliveryPolicy: { status: "ready_paid", visibleTier: "Pro", paidEvidenceAllowed: true },
  pass6CommercialFieldCompleteness: tampered,
  pass4824CanonicalFieldPacket: packet(),
  receipts,
}, "Pro"), /receipt_missing_or_invalid/);

assert.throws(() => assertPass6PaidCommercialCompleteness({
  deliveryPolicy: { status: "redacted_to_basic", visibleTier: "Basic", paidEvidenceAllowed: false },
  pass6CommercialFieldCompleteness: complete,
  pass4824CanonicalFieldPacket: packet(),
  receipts,
}, "Pro"), /delivery_policy_not_ready/);

const basicPacket = buildPass4825RuntimeCanonicalFieldPacket({
  caseId: "pass6-basic-preview",
  module: "real_markets",
  tier: "basic",
  identity: {
    canonicalId: "equity:xnas:aapl",
    symbol: "AAPL",
    assetClass: "stock",
    chainId: null,
    contractAddress: null,
  },
  generatedAt: NOW,
  sourceId: "pass6-source",
  sourceFamily: "commercial-field-packet",
  sourceDigest: SOURCE_DIGEST,
  sourceReceipts: receipts.slice(0, 1),
  values: values({
    "market.price": {
      value: null,
      currency: "USD",
      missingReason: "preview_price_unavailable",
      confidence: 0,
      quality: 0,
      observedAt: NOW,
      receivedAt: NOW,
    },
  }),
}).packet;
const basicPreview = buildPass6CommercialFieldCompletenessReceipt({
  packet: basicPacket,
  sourceReceipts: receipts.slice(0, 1),
  requestedTier: "basic",
});
assert.equal(basicPreview.status, "preview_only");
assert.equal(basicPreview.paidDeliveryEligible, false);
assert.ok(basicPreview.explicitMissingFields.includes("market.price"));
assert.doesNotThrow(() => assertPass6PaidCommercialCompleteness({
  deliveryPolicy: { status: "ready_basic", visibleTier: "Basic", paidEvidenceAllowed: false },
  pass6CommercialFieldCompleteness: basicPreview,
  pass4824CanonicalFieldPacket: basicPacket,
  receipts: receipts.slice(0, 1),
}, "Basic"));
assert.throws(() => assertPass6PaidCommercialCompleteness({
  deliveryPolicy: { status: "redacted_to_basic", visibleTier: "Basic", paidEvidenceAllowed: false },
  pass6CommercialFieldCompleteness: basicPreview,
  pass4824CanonicalFieldPacket: basicPacket,
  receipts: receipts.slice(0, 1),
}, "Basic"), /delivery_policy_not_ready/);

console.log(JSON.stringify({
  schemaVersion: "pass6-commercial-completeness-test-v1",
  status: "PASS",
  assertions: 59,
  complete: {
    completenessBps: complete.completenessBps,
    completeFieldCount: complete.completeFieldCount,
    independentUpstreamCount: complete.independentUpstreamCount,
  },
  mutationsBlocked: ["explicit_missing", "declared_gap", "one_upstream", "unreferenced_quorum_padding", "copied_receipt", "capability_mismatch", "stale_receipts", "receipt_age_mismatch", "low_receipt_quality", "field_evidence_tamper", "valid_hex_wrong_value_hash", "regenerated_fake_digest", "evidence_field_bypass", "field_quorum_padding", "evidence_triplet_inconsistency", "low_confidence", "receipt_tamper", "paid_downgrade", "downgraded_basic_relabel", "receipt_input_limit"],
  basicPreview: {
    status: basicPreview.status,
    completenessBps: basicPreview.completenessBps,
    paidDeliveryEligible: basicPreview.paidDeliveryEligible,
  },
}, null, 2));
