import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  assertPass6PaidCommercialCompleteness,
  buildPass6CommercialFieldCompletenessReceipt,
} from "../../lib/reporting/commercial-field-completeness";
import {
  getPass4824VisibleFieldDefinitions,
  type Pass4824DataModule,
  type Pass4824DataTier,
  type Pass4824FieldDefinition,
} from "../../lib/reporting/canonical-field-registry";
import {
  buildPass4825RuntimeCanonicalFieldPacket,
  type Pass4825RuntimeFieldValue,
} from "../../lib/reporting/runtime-canonical-field-adapter";
import type { SourceReceipt, VelmereSourceFamily } from "../../lib/market-integrity/top1-risk-foundation";
import { pass4644FieldValueHash } from "../../lib/market-integrity/provider-evidence-receipt";
import { canonicalJson } from "../../lib/security/canonical-json";
import { sha256Digest } from "../../lib/security/cryptographic-digest";

const NOW = "2026-07-18T14:00:00.000Z";
const SOURCE_DIGEST = `sha256:${"f".repeat(64)}`;
const PROJECTION_SECRET = "pass6-matrix-test-source-receipt-projection-secret-20260718";
process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = PROJECTION_SECRET;
process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = "pass6-matrix-current";
const CAPABILITIES = [
  "identity", "evidence", "pair_identity", "price", "quote", "history", "ohlcv", "volume", "liquidity",
  "depth", "orderbook", "slippage", "spread", "imbalance", "scenario", "stress", "simulation",
  "holders", "holder", "permissions", "contract_permissions", "source_code", "verified_source", "abi",
  "fundamentals", "company_facts", "macro_series", "unlock", "supply", "tokenomics", "emission",
  "monitoring", "revalidation", "manual_review", "review", "signoff",
];

function signReceiptProjection(receipt: SourceReceipt): SourceReceipt {
  const { projection: _projection, ...unsigned } = receipt;
  const payload = canonicalJson(unsigned);
  return {
    ...unsigned,
    projection: {
      schemaVersion: "pass4993_source_receipt_projection_v1",
      algorithm: "HMAC-SHA256",
      keyId: "pass6-matrix-current",
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
  if (fieldId.startsWith("market.")) return "orderbook";
  if (fieldId === "source.independent_quorum") return "identity";
  if (fieldId.startsWith("scenario.")) return "scenario";
  if (fieldId.startsWith("holder.")) return "holders";
  if (fieldId.startsWith("contract.")) return "contract_permissions";
  if (fieldId.startsWith("fundamentals.")) return "fundamentals";
  if (fieldId.startsWith("macro.")) return "macro_series";
  if (fieldId === "audit.permission_summary") return "permissions";
  if (fieldId === "audit.liquidity_evidence") return "liquidity";
  if (fieldId === "audit.holder_evidence") return "holders";
  if (fieldId === "audit.manual_review_state") return "manual_review";
  if (fieldId.startsWith("audit.")) return "review";
  if (fieldId === "lens.orderbook_context") return "orderbook";
  if (fieldId === "lens.holder_context") return "holders";
  if (fieldId === "lens.unlock_context") return "unlock";
  if (fieldId === "lens.contract_context") return "permissions";
  if (fieldId === "lens.scenario_analysis") return "scenario";
  if (fieldId.startsWith("lens.")) return "identity";
  throw new Error(`matrix_fixture_capability_missing:${fieldId}`);
}

function identityProjection(canonicalIdentity: string) {
  const address = canonicalIdentity.match(/0x[a-f0-9]{40}/i)?.[0]?.toLowerCase() ?? null;
  return {
    targetCanonicalIdentity: canonicalIdentity,
    requestedCanonicalIdentity: canonicalIdentity,
    resolvedCanonicalIdentity: canonicalIdentity,
    resolvedIdentity: {
      symbol: address ? "0x1111111111" : "MATRIX",
      marketId: address ? null : canonicalIdentity.replace(/^market:/, ""),
      address,
      chainId: address ? "1" : null,
    },
  };
}

function sourceReceipt(index: number, family: VelmereSourceFamily, canonicalIdentity: string, rawValues: Record<string, unknown>): SourceReceipt {
  const digestCharacter = (index + 1).toString(16);
  const digest = `sha256:${digestCharacter.repeat(64)}`;
  return signReceiptProjection({
    receiptId: `matrix-receipt-${family}-${index}`,
    providerReceiptId: `provider-matrix-${family}-${index}`,
    provider: `matrix-provider-${index}`,
    sourceFamily: family,
    upstreamRoot: `matrix-upstream-${index}`,
    dataType: CAPABILITIES.join(" "),
    usedInLanes: [...CAPABILITIES],
    observedAt: NOW,
    ageSeconds: 0,
    freshnessStatus: "fresh",
    qualityScore: 96,
    evidenceState: "content_bound",
    payloadDigest: digest,
    identityMatched: true,
    commercialEvidenceEligible: true,
    providerReceiptCanonicalDigest: digest,
    providerReceiptIntegrityVerified: true,
    timestampProvenance: "provider",
    fieldEvidence: Object.entries(rawValues).map(([fieldId, value]) => ({
      fieldPath: fieldId,
      capability: capabilityForField(fieldId),
      valueHash: pass4644FieldValueHash(value),
    })),
    ...identityProjection(canonicalIdentity),
    receivedAt: NOW,
    expiresAt: NOW,
    providerSurface: family === "scanner" ? "contract_audit" : "real_markets",
    providerVerification: "normalized_response",
    projection: null,
  });
}

function manualReviewReceipt(canonicalIdentity: string, rawValues: Record<string, unknown>): SourceReceipt {
  return signReceiptProjection({
    receiptId: "matrix-manual-review",
    providerReceiptId: "provider-matrix-manual-review",
    provider: "verified-dual-control-review",
    sourceFamily: "manual_review",
    upstreamRoot: null,
    dataType: "manual_review review signoff",
    usedInLanes: ["manual_review", "review", "signoff"],
    observedAt: NOW,
    ageSeconds: 0,
    freshnessStatus: "fresh",
    qualityScore: 100,
    evidenceState: "content_bound",
    payloadDigest: `sha256:${"e".repeat(64)}`,
    identityMatched: true,
    commercialEvidenceEligible: true,
    providerReceiptCanonicalDigest: `sha256:${"e".repeat(64)}`,
    providerReceiptIntegrityVerified: true,
    timestampProvenance: "provider",
    fieldEvidence: Object.entries(rawValues)
      .filter(([fieldId]) => fieldId === "audit.manual_review_state"
        || /^audit\.(?:monitoring_state|revalidation_plan|finding_evidence_graph|false_positive_review)$/.test(fieldId))
      .map(([fieldId, value]) => ({
        fieldPath: fieldId,
        capability: capabilityForField(fieldId),
        valueHash: pass4644FieldValueHash(value),
      })),
    ...identityProjection(canonicalIdentity),
    receivedAt: NOW,
    expiresAt: NOW,
    providerSurface: "contract_audit",
    providerVerification: "raw_response",
    projection: null,
  });
}

function valueFor(definition: Pass4824FieldDefinition, upstreamCount: number): unknown {
  if (definition.fieldId === "risk.score") return 22;
  if (definition.fieldId === "risk.confidence") return 95;
  if (definition.fieldId === "evidence.missing") return [];
  if (definition.fieldId === "evidence.gap_count") return 0;
  if (definition.fieldId === "evidence.primary_gap") return "none";
  if (definition.fieldId === "source.independent_quorum") return upstreamCount;
  if (definition.fieldId === "audit.manual_review_state") return "verified";
  if (definition.fieldId === "audit.monitoring_state") return "configured";
  if (definition.fieldId === "macro.regime") return "evidence_bound_neutral";
  if (definition.fieldId === "evidence.claim_ledger") return {
    state: "verified",
    claims: [{ id: "matrix-claim", state: "confirmed", evidenceCount: upstreamCount }],
    blocked: [],
    unresolved: [],
  };
  if (definition.valueKind === "number") return definition.zeroPolicy === "forbidden" ? 1 : 0;
  if (definition.valueKind === "integer") return 1;
  if (definition.valueKind === "timestamp") return NOW;
  if (definition.valueKind === "string_array") return ["receipt_bound_action"];
  if (definition.valueKind === "record") return { state: "verified", evidence: "content_bound_receipt" };
  return "verified";
}

function buildCase(
  module: Pass4824DataModule,
  tier: Pass4824DataTier,
  valueOverrides: Readonly<Record<string, unknown>> = {},
) {
  const requiredUpstreams = module === "audit"
    ? tier === "advanced" ? 4 : tier === "pro" ? 3 : 1
    : tier === "advanced" ? 3 : tier === "pro" ? 2 : 1;
  const family: VelmereSourceFamily = module === "audit" ? "scanner" : "yahoo_stooq";
  const canonicalIdentity = module === "audit" ? `eip155:1:0x${"1".repeat(40)}` : `market:${module}:matrix`;
  const values: Record<string, Pass4825RuntimeFieldValue> = {};
  for (const definition of getPass4824VisibleFieldDefinitions(module, tier)) {
    if (definition.fieldId.startsWith("identity.")) continue;
    const hasOverride = Object.prototype.hasOwnProperty.call(valueOverrides, definition.fieldId);
    values[definition.fieldId] = {
      value: hasOverride ? valueOverrides[definition.fieldId] : valueFor(definition, requiredUpstreams),
      mode: definition.fieldId === "audit.manual_review_state" ? "manual_review" : "derived_from_observations",
      observedAt: NOW,
      receivedAt: NOW,
      confidence: 96,
      quality: 96,
      ...(definition.currencyPolicy === "required_iso_4217" ? { currency: "USD" } : {}),
    };
  }
  const rawValues: Record<string, unknown> = {
    "identity.canonical_id": canonicalIdentity,
    "identity.symbol": module === "audit" ? "0x1111111111" : "MATRIX",
    "identity.asset_class": module === "audit" ? "erc20" : "equity",
    ...(module === "audit" ? { "identity.chain_id": "1", "identity.contract_address": `0x${"1".repeat(40)}` } : {}),
    ...Object.fromEntries(Object.entries(values).map(([fieldId, configured]) => [fieldId, configured.value])),
  };
  const receipts: SourceReceipt[] = Array.from(
    { length: requiredUpstreams },
    (_, index) => sourceReceipt(index, family, canonicalIdentity, rawValues),
  );
  if (module === "audit" && tier === "advanced") receipts.push(manualReviewReceipt(canonicalIdentity, rawValues));
  const packet = buildPass4825RuntimeCanonicalFieldPacket({
    caseId: `pass6-matrix-${module}-${tier}`,
    module,
    tier,
    identity: {
      canonicalId: canonicalIdentity,
      symbol: module === "audit" ? "0x1111111111" : "MATRIX",
      assetClass: module === "audit" ? "erc20" : "equity",
      chainId: module === "audit" ? "1" : null,
      contractAddress: module === "audit" ? `0x${"1".repeat(40)}` : null,
    },
    generatedAt: NOW,
    sourceId: `pass6-matrix-${module}-${tier}`,
    sourceFamily: "pass6-tier-matrix",
    sourceDigest: SOURCE_DIGEST,
    sourceReceipts: receipts,
    values,
  }).packet;
  const completeness = buildPass6CommercialFieldCompletenessReceipt({ packet, sourceReceipts: receipts, requestedTier: tier });
  const tierLabel = tier === "advanced" ? "Advanced" : tier === "pro" ? "Pro" : "Basic";
  const deliveryPolicy = tier === "basic"
    ? { status: "ready_basic", visibleTier: "Basic", paidEvidenceAllowed: false }
    : { status: "ready_paid", visibleTier: tierLabel, paidEvidenceAllowed: true };
  return { module, tier, tierLabel, receipts, packet, completeness, deliveryPolicy };
}

const rows: Array<Record<string, unknown>> = [];
let assertions = 0;
for (const module of ["shield", "real_markets", "audit"] as const) {
  for (const tier of ["basic", "pro", "advanced"] as const) {
    const item = buildCase(module, tier);
    const dualControlAuthorityRequired = module === "audit" && tier === "advanced";
    if (dualControlAuthorityRequired) {
      assert.ok(item.completeness.completenessBps < 10_000); assertions += 1;
      assert.equal(item.completeness.status, "blocked"); assertions += 1;
      assert.equal(item.completeness.paidDeliveryEligible, false); assertions += 1;
      assert.equal(item.completeness.manualReviewAuthorityVerified, false); assertions += 1;
      assert.ok(item.completeness.blockers.includes("manual_review_authority:missing")); assertions += 1;
      assert.throws(() => assertPass6PaidCommercialCompleteness({
        deliveryPolicy: item.deliveryPolicy,
        pass6CommercialFieldCompleteness: item.completeness,
        pass4824CanonicalFieldPacket: item.packet,
        receipts: item.receipts,
      }, item.tierLabel), /critical_fields_incomplete/); assertions += 1;
    } else {
      assert.equal(item.completeness.completenessBps, 10_000); assertions += 1;
      assert.equal(item.completeness.status, "complete"); assertions += 1;
      assert.equal(item.completeness.paidDeliveryEligible, item.tier !== "basic"); assertions += 1;
      assert.doesNotThrow(() => assertPass6PaidCommercialCompleteness({
        deliveryPolicy: item.deliveryPolicy,
        pass6CommercialFieldCompleteness: item.completeness,
        pass4824CanonicalFieldPacket: item.packet,
        receipts: item.receipts,
      }, item.tierLabel)); assertions += 1;
    }

    const removedFieldPacket = structuredClone(item.packet);
    const removedField = removedFieldPacket.observations.at(-1)?.fieldId;
    removedFieldPacket.observations = removedFieldPacket.observations.slice(0, -1);
    const removedFieldCompleteness = buildPass6CommercialFieldCompletenessReceipt({
      packet: removedFieldPacket,
      sourceReceipts: item.receipts,
      requestedTier: tier,
    });
    if (tier === "basic") {
      assert.equal(removedFieldCompleteness.status, "preview_only"); assertions += 1;
      assert.throws(() => assertPass6PaidCommercialCompleteness({
        deliveryPolicy: item.deliveryPolicy,
        pass6CommercialFieldCompleteness: removedFieldCompleteness,
        pass4824CanonicalFieldPacket: removedFieldPacket,
        receipts: item.receipts,
      }, item.tierLabel), /basic_preview_canonical_packet_invalid/); assertions += 1;
    } else {
      assert.equal(removedFieldCompleteness.paidDeliveryEligible, false); assertions += 1;
      assert.throws(() => assertPass6PaidCommercialCompleteness({
        deliveryPolicy: item.deliveryPolicy,
        pass6CommercialFieldCompleteness: removedFieldCompleteness,
        pass4824CanonicalFieldPacket: removedFieldPacket,
        receipts: item.receipts,
      }, item.tierLabel), /critical_fields_incomplete/); assertions += 1;
    }
    rows.push({
      module,
      tier,
      fullCompletenessBps: item.completeness.completenessBps,
      fullExport: dualControlAuthorityRequired
        ? "blocked_pending_signed_dual_control_authority"
        : tier === "basic" ? "basic_preview_ready" : "paid_export_ready",
      removedField,
      removedFieldResult: tier === "basic" ? "malformed_preview_export_blocked" : "paid_export_blocked",
      requiredIndependentUpstreams: item.completeness.requiredIndependentUpstreamCount,
    });
  }
}

const forgedIndependentQuorum = buildCase("audit", "pro", { "source.independent_quorum": 999 });
assert.equal(forgedIndependentQuorum.completeness.paidDeliveryEligible, false); assertions += 1;
assert.ok(forgedIndependentQuorum.completeness.derivationMismatchFields.includes("source.independent_quorum")); assertions += 1;

const malformedClaimLedger = buildCase("shield", "advanced", {
  "evidence.claim_ledger": {
    state: "verified",
    claims: [{ id: "forged-claim", state: "confirmed", evidenceCount: -1 }],
    blocked: [],
    unresolved: [],
  },
});
assert.equal(malformedClaimLedger.completeness.paidDeliveryEligible, false); assertions += 1;
assert.ok(malformedClaimLedger.completeness.derivationMismatchFields.includes("evidence.claim_ledger")); assertions += 1;

console.log(JSON.stringify({
  schemaVersion: "pass6-tier-export-completeness-matrix-v1",
  status: "PASS",
  assertions,
  rows,
  adversarial: ["forged_independent_quorum", "malformed_claim_ledger"],
  rule: "Basic remains an explicitly non-paid preview. Pro requires 10000/10000 and tier quorum; Advanced Audit additionally requires a separately signed dual-control authority receipt.",
}, null, 2));
