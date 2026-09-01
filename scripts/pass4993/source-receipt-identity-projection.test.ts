import assert from "node:assert/strict";
import { createPass4644ProviderEvidenceReceipt } from "../../lib/market-integrity/provider-evidence-receipt";
import {
  buildCustomerReportSourceBinding,
  getPass4993SourceReceiptProjectionReadiness,
  verifyPass4993SourceReceiptProjection,
} from "../../lib/market-integrity/customer-report-source-binding";
import {
  buildPass4824FieldObservation,
  validatePass4824CanonicalFieldPacket,
} from "../../lib/reporting/canonical-field-registry";
import { buildPass4825CustomerReportFieldContract } from "../../lib/reporting/runtime-canonical-field-adapter";

const GENERATED_AT = "2026-07-18T12:00:00.000Z";
const OBSERVED_AT = "2026-07-18T11:59:30.000Z";
const SOURCE_DIGEST = `sha256:${"d".repeat(64)}`;
const OLD_SECRET = "old-source-receipt-projection-key-0000000000000000";
const NEW_SECRET = "new-source-receipt-projection-key-0000000000000000";
const oldEnv = {
  NODE_ENV: "test",
  VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT: OLD_SECRET,
  VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT: "old-key",
};
const rotatedEnv = {
  NODE_ENV: "production",
  VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT: NEW_SECRET,
  VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT: "new-key",
  VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_PREVIOUS: OLD_SECRET,
  VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_PREVIOUS: "old-key",
};

const checks: string[] = [];
function check(name: string, action: () => void) {
  action();
  checks.push(name);
}

function providerReceipt(symbol: string) {
  return createPass4644ProviderEvidenceReceipt({
    providerId: "yahoo_finance_quote",
    providerFamily: "yahoo",
    surface: "real_markets",
    verification: "normalized_response",
    requestedIdentity: symbol,
    resolvedSymbol: symbol,
    resolvedMarketId: `xnas:${symbol.toLowerCase()}`,
    identityMatched: true,
    capabilities: ["identity", "price", "quote", "volume"],
    timestampProvenance: "provider",
    observedAt: OBSERVED_AT,
    receivedAt: GENERATED_AT,
    ttlMs: 60_000,
    httpStatus: 200,
    latencyMs: 42,
    normalizedPayload: { symbol, price: symbol === "AAPL" ? 200 : 430, volume: 55_000_000 },
  });
}

const aapl = providerReceipt("AAPL");
const msft = providerReceipt("MSFT");
const binding = buildCustomerReportSourceBinding({
  providerEvidenceReceipts: [aapl, msft],
  observedSourceLabels: [],
  generatedAt: GENERATED_AT,
  expectedCanonicalIdentity: "equity:xnas:aapl",
  projectionEnv: oldEnv,
});

check("receipt selection is scoped to the expected canonical asset", () => {
  assert.equal(binding.contentBoundReceiptCount, 1);
  assert.equal(binding.rejectedProviderReceiptCount, 1);
  assert.equal(binding.receipts[0]?.targetCanonicalIdentity, "equity:xnas:aapl");
  assert.equal(binding.receipts[0]?.requestedCanonicalIdentity, "aapl");
  assert.equal(binding.receipts[0]?.resolvedCanonicalIdentity, "market:xnas:aapl");
  assert.equal(binding.receipts[0]?.resolvedIdentity?.symbol, "AAPL");
});

const signedReceipt = binding.receipts[0];
assert.ok(signedReceipt);

check("projection preserves transport and provider verification facts", () => {
  assert.equal(signedReceipt.receivedAt, GENERATED_AT);
  assert.equal(signedReceipt.expiresAt, "2026-07-18T12:00:30.000Z");
  assert.equal(signedReceipt.providerSurface, "real_markets");
  assert.equal(signedReceipt.providerVerification, "normalized_response");
  assert.equal(signedReceipt.projection?.algorithm, "HMAC-SHA256");
});

check("current signature verifies against the previous key after rotation", () => {
  const verified = verifyPass4993SourceReceiptProjection({
    receipt: signedReceipt,
    expectedCanonicalIdentity: "equity:xnas:aapl",
    atTime: GENERATED_AT,
    env: rotatedEnv,
  });
  assert.equal(verified.ok, true);
  if (verified.ok) assert.equal(verified.keySlot, "previous");
});

check("wrong expected asset fails even with an authentic signature", () => {
  const verified = verifyPass4993SourceReceiptProjection({
    receipt: signedReceipt,
    expectedCanonicalIdentity: "equity:xnas:msft",
    atTime: GENERATED_AT,
    env: rotatedEnv,
  });
  assert.deepEqual(verified, { ok: false, error: "source_receipt_projection_identity_mismatch" });
});

check("same symbol on a different canonical venue cannot reuse the projection", () => {
  const verified = verifyPass4993SourceReceiptProjection({
    receipt: signedReceipt,
    expectedCanonicalIdentity: "equity:xnys:aapl",
    atTime: GENERATED_AT,
    env: rotatedEnv,
  });
  assert.deepEqual(verified, { ok: false, error: "source_receipt_projection_identity_mismatch" });
});

check("tampered projection payload fails", () => {
  const tampered = structuredClone(signedReceipt);
  tampered.provider = "attacker-provider";
  const verified = verifyPass4993SourceReceiptProjection({
    receipt: tampered,
    expectedCanonicalIdentity: "equity:xnas:aapl",
    atTime: GENERATED_AT,
    env: rotatedEnv,
  });
  assert.equal(verified.ok, false);
  if (!verified.ok) assert.equal(verified.error, "source_receipt_projection_payload_digest_mismatch");
});

check("expired projection fails", () => {
  const verified = verifyPass4993SourceReceiptProjection({
    receipt: signedReceipt,
    expectedCanonicalIdentity: "equity:xnas:aapl",
    atTime: "2026-07-18T12:00:30.001Z",
    env: rotatedEnv,
  });
  assert.deepEqual(verified, { ok: false, error: "source_receipt_projection_expired_or_time_inconsistent" });
});

check("production has no previous-key-only recovery mode", () => {
  const previousOnly = {
    NODE_ENV: "production",
    VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_PREVIOUS: OLD_SECRET,
    VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_PREVIOUS: "old-key",
  };
  assert.equal(getPass4993SourceReceiptProjectionReadiness(previousOnly).ready, false);
  const verified = verifyPass4993SourceReceiptProjection({
    receipt: signedReceipt,
    expectedCanonicalIdentity: "equity:xnas:aapl",
    atTime: GENERATED_AT,
    env: previousOnly,
  });
  assert.deepEqual(verified, { ok: false, error: "source_receipt_projection_key_unavailable" });
});

check("missing expected identity and invalid generatedAt fail closed", () => {
  const missingExpected = buildCustomerReportSourceBinding({
    providerEvidenceReceipts: [aapl],
    observedSourceLabels: [],
    generatedAt: GENERATED_AT,
    projectionEnv: oldEnv,
  });
  assert.equal(missingExpected.contentBoundReceiptCount, 0);
  assert.ok(missingExpected.blockers.includes("expected_canonical_identity_missing"));

  const invalidTime = buildCustomerReportSourceBinding({
    providerEvidenceReceipts: [aapl],
    observedSourceLabels: [],
    generatedAt: "not-a-date",
    expectedCanonicalIdentity: "equity:xnas:aapl",
    projectionEnv: oldEnv,
  });
  assert.equal(invalidTime.contentBoundReceiptCount, 0);
  assert.ok(invalidTime.blockers.includes("generated_at_invalid"));
});

const identity = {
  canonicalId: "equity:xnas:aapl",
  symbol: "AAPL",
  assetClass: "stock",
  chainId: null,
  contractAddress: null,
};

check("runtime values cannot override identity observations", () => {
  assert.throws(() => buildPass4825CustomerReportFieldContract({
    reportId: "identity-override",
    module: "real_markets",
    tier: "basic",
    identity,
    generatedAt: GENERATED_AT,
    sourceDigest: SOURCE_DIGEST,
    riskScore: 20,
    confidenceScore: 80,
    missingEvidence: [],
    sourceQuorum: 1,
    values: { "identity.symbol": { value: "MSFT" } },
  }), /pass4825_runtime_identity_override_rejected:identity\.symbol/);
});

check("canonical validator compares identity observation value to packet.identity", () => {
  const built = buildPass4825CustomerReportFieldContract({
    reportId: "identity-validator",
    module: "real_markets",
    tier: "basic",
    identity,
    generatedAt: GENERATED_AT,
    sourceDigest: SOURCE_DIGEST,
    riskScore: 20,
    confidenceScore: 80,
    missingEvidence: [],
    sourceQuorum: 1,
  });
  const original = built.packet.observations.find((row) => row.fieldId === "identity.symbol");
  assert.ok(original);
  const forged = buildPass4824FieldObservation({
    fieldId: original.fieldId,
    value: "MSFT",
    rawValue: "MSFT",
    unit: original.unit,
    missingReason: original.missingReason,
    currency: original.currency,
    confidence: original.confidence,
    quality: original.quality,
    evidenceRefs: original.evidenceRefs,
    lineage: original.lineage,
    provenance: original.provenance,
  });
  const packet = structuredClone(built.packet);
  packet.observations = packet.observations.map((row) => row.fieldId === "identity.symbol" ? forged : row);
  const validation = validatePass4824CanonicalFieldPacket(packet);
  assert.equal(validation.status, "failed");
  assert.ok(validation.errors.includes("identity_observation_value_mismatch:identity.symbol"));
  assert.ok(validation.errors.includes("identity_observation_raw_value_mismatch:identity.symbol"));
});

process.stdout.write(`${JSON.stringify({
  schemaVersion: "pass4993_source_receipt_identity_projection_test_v1",
  status: "PASS",
  assertions: checks.length,
  checks,
}, null, 2)}\n`);
