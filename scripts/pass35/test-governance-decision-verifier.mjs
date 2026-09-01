#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJson, verifyGovernanceDecision } from "./governance-decision-verifier.mjs";

const policyBase = JSON.parse(readFileSync("config/pass35/governance-decision-policy.json", "utf8"));
const catalog = JSON.parse(readFileSync("config/pass35/product-cell-catalog.json", "utf8"));
const catalogIds = catalog.productCells.map((cell) => cell.productCellId);
const H = "a".repeat(64);
const H2 = "b".repeat(64);
const H3 = "c".repeat(64);
const H4 = "d".repeat(64);
const H5 = "e".repeat(64);
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
const fingerprint = createHash("sha256").update(publicKey.export({ type: "spki", format: "der" })).digest("hex");
const policy = { ...policyBase, trustedOrganizationalKeyFingerprints: [fingerprint] };
const now = new Date("2026-07-22T12:00:00.000Z");

function signed(packet) {
  const payload = Buffer.from(canonicalJson(packet));
  return {
    ...packet,
    signature: {
      algorithm: "Ed25519",
      payloadSha256: createHash("sha256").update(payload).digest("hex"),
      valueBase64: sign(null, payload, privateKey).toString("base64"),
    },
  };
}

function unsigned(packet) {
  const { signature: _signature, ...rest } = packet;
  return rest;
}

function common(gateId) {
  return {
    schemaVersion: "velmere.pass35.governance-decision-packet.v1",
    candidateId: policy.candidateId,
    gateId,
    decisionId: `${gateId.toLowerCase()}-decision-001`,
    issuedAt: "2026-07-22T10:00:00.000Z",
    validUntil: "2026-08-01T10:00:00.000Z",
    sourceArchiveSha256: H,
    evidenceIndexSha256: H2,
    signer: {
      organizationId: "example-independent-organization",
      signerIdHash: H3,
      publicKeyPem,
      publicKeyFingerprintSha256: fingerprint,
    },
  };
}

const fg00 = signed({
  ...common("FG00"),
  decision: "SELECT_FLAGSHIP",
  productCellId: "audit_evm_pro_automated_review",
  scope: { icp: "qualified security team", jtbd: "review an EVM release", region: "DE", language: "de", channel: "direct" },
  workflowEvidence: { observedCurrentWorkflow: true, independentParticipantCount: 2, costOfProblemDocumented: true, evidenceSha256: H4 },
  pilot: { preregistered: true, protocolSha256: H5, paidIntentThreshold: { currency: "EUR", amountMinor: 10000, minimumQualifiedIntents: 2 } },
  primaryOutcome: { metricId: "critical_findings_recall", direction: "HIGHER_IS_BETTER", threshold: 0.9, evidencePlanSha256: H4 },
  decisionRule: { current: "CONTINUE", continueCriteria: ["outcome threshold met"], pivotCriteria: ["intent threshold missed"], killCriteria: ["safety gate fails"] },
  execution: { ownerIdHash: H5, budget: { currency: "EUR", amountMinor: 500000 }, runwayDays: 90, capacityHoursPerWeek: 40 },
  nonSelectedCells: catalogIds.filter((id) => id !== "audit_evm_pro_automated_review").map((productCellId) => ({ productCellId, role: "PARKED", reason: "FG00 focus" })),
});

const fgPass = verifyGovernanceDecision({ packet: fg00, policy, catalogProductCellIds: catalogIds, now });
assert.equal(fgPass.verified, true);
assert.equal(fgPass.promotionCredit, 1);

const noTrust = verifyGovernanceDecision({ packet: fg00, policy: policyBase, catalogProductCellIds: catalogIds, now });
assert.equal(noTrust.verified, false);
assert(noTrust.errors.includes("organizational_trust_anchor_missing"));

const tamperedFg = { ...fg00, productCellId: "shield_pro_terminal_analysis" };
const tamperedResult = verifyGovernanceDecision({ packet: tamperedFg, policy, catalogProductCellIds: catalogIds, now });
assert.equal(tamperedResult.verified, false);
assert(tamperedResult.errors.includes("signature_payload_sha256_mismatch"));

const incompleteFocus = structuredClone(fg00);
incompleteFocus.nonSelectedCells.pop();
const incompleteResult = verifyGovernanceDecision({ packet: signed(unsigned(incompleteFocus)), policy, catalogProductCellIds: catalogIds, now });
assert.equal(incompleteResult.verified, false);
assert(incompleteResult.errors.includes("fg00_non_selected_cell_set_incomplete"));

function controlRecord(controlId) {
  return {
    controlId,
    responsibleIdHash: H,
    accountableIdHash: H2,
    consultedIdHashes: [H3],
    informedIdHashes: [H4],
    backupResponsibleIdHash: H3,
    signerIdHash: H2,
    evidenceStewardIdHash: H4,
    independentReviewerIdHash: H5,
    riskAcceptorIdHash: "f".repeat(64),
    reviewerIndependence: "EXTERNAL",
    conflictDeclarationSha256: H,
    escalationPath: "release board",
    responseSlaHours: 24,
    dueDate: "2026-08-01T00:00:00.000Z",
    budget: { currency: "EUR", amountMinor: 10000 },
    capacity: { hoursPerWeek: 4, maxConcurrentCases: 2 },
    dependencies: [],
    stopCondition: "required evidence becomes stale",
    evidenceOutput: `${controlId}.json`,
  };
}

const org00 = signed({
  ...common("ORG00"),
  decision: "APPROVE_OPERATING_MODEL",
  controlRecords: policy.requiredOrganizationControlIds.map(controlRecord),
  paymentSegregation: { chargeCreators: [H], entitlementGranters: [H2], refundReconcilers: [H3] },
  benchmarkSegregation: { modelAuthors: [H4], adjudicators: [H5] },
});

const orgPass = verifyGovernanceDecision({ packet: org00, policy, catalogProductCellIds: catalogIds, now });
assert.equal(orgPass.verified, true);
assert.equal(orgPass.externalWorkstreamId, "ORG00_SIGNED_OPERATING_RECORD");

const orgConflictUnsigned = { ...org00, paymentSegregation: { chargeCreators: [H], entitlementGranters: [H], refundReconcilers: [H3] } };
const orgConflict = verifyGovernanceDecision({ packet: signed(unsigned(orgConflictUnsigned)), policy, catalogProductCellIds: catalogIds, now });
assert.equal(orgConflict.verified, false);
assert(orgConflict.errors.includes("org00_charge_entitlement_conflict"));

const staleUnsigned = { ...fg00, validUntil: "2026-07-21T00:00:00.000Z" };
const stale = verifyGovernanceDecision({ packet: signed(unsigned(staleUnsigned)), policy, catalogProductCellIds: catalogIds, now });
assert.equal(stale.verified, false);
assert(stale.errors.includes("packet_expired"));

console.log(JSON.stringify({ status: "PASS", assertions: 14, cases: ["fg00", "trust-anchor", "tamper", "focus-set", "org00", "segregation", "expiry"] }, null, 2));
