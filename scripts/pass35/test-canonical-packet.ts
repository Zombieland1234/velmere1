import assert from "node:assert/strict";
import { assertPass35ArtifactParity, buildPass35CanonicalPacket, type Pass35CanonicalPacketInput } from "../../lib/worldclass/pass35-canonical-packet";

const h = (value: string) => value.repeat(64).slice(0, 64);
const base: Pass35CanonicalPacketInput = {
  productCellId: "audit.evm.pro.eu.en.ethereum.web.pass35",
  skuId: "audit_evm_pro_automated_review",
  tier: "pro",
  releaseId: "VELMERE_PASS35_OFFLINE_CANDIDATE_R3",
  sourceSha256: h("a"), artifactSha256: h("b"), configSha256: h("c"), accountIdHash: h("d"), caseIdHash: h("e"),
  providerHashes: [h("1")], dataHashes: [h("2")], modelHash: null, promptHash: null, reviewerHashes: [], policyHashes: [h("3")],
  provenance: [{ fieldId: "source.identity", providerId: "fixture", providerFamily: "fixture", observedAt: "2026-07-22T00:00:00.000Z", maxAgeMs: 60000, rightsState: "UNVERIFIED", sourceReceiptSha256: h("4") }],
  claims: [{ claimId: "finding.proxy", kind: "FINDING", text: "Proxy pattern detected; implementation was not fully reviewed.", severity: "medium", confidence: 0.8, evidenceIds: ["source.identity"] }],
  contradictions: [], missingProof: ["deployed_bytecode_reproduction"], methodology: ["static_identity_prescreen"], uncertainty: "Material code paths remain untested.", abstained: false,
  humanReview: { required: false, completed: false, reviewerIdHash: null, conflictDeclarationSha256: null },
  commercialRefs: { paymentReceiptHash: null, entitlementIdHash: null, deliveryReceiptHash: null, refundPolicyVersion: "blocked-no-charge" },
  packetState: "ORIGINAL", fallbackReason: null, supersedesPacketHash: null,
  createdAt: "2026-07-22T00:00:00.000Z", validUntil: "2026-07-23T00:00:00.000Z", invalidationTriggers: ["source_change", "rights_change"],
};

const first = buildPass35CanonicalPacket(base);
const second = buildPass35CanonicalPacket(JSON.parse(JSON.stringify(base)));
assert.equal(first.packetHash, second.packetHash);
assert.equal(first.packetId, `pkt_${first.packetHash}`);
assert(Object.isFrozen(first));
assert(Object.isFrozen(first.claims));
assert.throws(() => buildPass35CanonicalPacket({ ...base, packetState: "EXPLICIT_FALLBACK", fallbackReason: null }), /fallback_reason_missing/);
assert.throws(() => buildPass35CanonicalPacket({ ...base, humanReview: { required: true, completed: false, reviewerIdHash: null, conflictDeclarationSha256: null } }), /required_human_review_missing/);
assert.throws(() => buildPass35CanonicalPacket({ ...base, sourceSha256: "not-a-hash" }), /source_hash_invalid/);
assertPass35ArtifactParity(first, [
  { channel: "api", packetId: first.packetId, packetHash: first.packetHash, factsHash: first.factsHash },
  { channel: "pdf", packetId: first.packetId, packetHash: first.packetHash, factsHash: first.factsHash },
]);
assert.throws(() => assertPass35ArtifactParity(first, [{ channel: "ui", packetId: first.packetId, packetHash: h("f"), factsHash: first.factsHash }]), /parity_mismatch/);
console.log("PASS PASS35 immutable canonical packet, explicit fallback/correction, human-review and channel-parity gates");
