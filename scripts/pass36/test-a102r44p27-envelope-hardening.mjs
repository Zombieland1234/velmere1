#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonical,
  createEnvelope,
  publicKeyRecord,
  verifyTrustedEnvelope,
} from "./a102r44p27-trusted-external-evidence-lib.mjs";

const revision = "VELMERE_PASS36_A102R44P27_ACTION_REQUIRED_DURABLE_EXTERNAL_EVIDENCE_REPLAY_JOURNAL_ATOMIC_ADMISSION_AND_ENVELOPE_TIME_HARDENING_NO_LIVE_CREDIT";
const source = "e".repeat(64);
const now = new Date("2026-08-07T12:00:00.000Z");
const trusted = crypto.generateKeyPairSync("ed25519");
const attacker = crypto.generateKeyPairSync("ed25519");
const keyId = "staging-operator-key-0001";
const policy = {
  requiredAlgorithm: "Ed25519",
  allowEmbeddedPublicKeyAuthority: false,
  productionTrustedKeys: [publicKeyRecord({
    keyId,
    publicKey: trusted.publicKey,
    validFrom: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
  })],
};

const make = (options = {}) => createEnvelope({
  claims: options.claims ?? {
    programId: "program-0001",
    executionId: "execution-0001",
    syntheticFixture: false,
    tracks: {},
    artifacts: [],
  },
  privateKey: options.privateKey ?? trusted.privateKey,
  keyId: options.keyId ?? keyId,
  revisionId: revision,
  sourceManifestSha256: source,
  evidenceId: options.evidenceId ?? "r44p27-evidence-0001",
  nonce: options.nonce ?? "nonce-r44p27-0001",
  observedAt: options.observedAt ?? "2026-08-07T11:59:00.000Z",
  expiresAt: options.expiresAt ?? "2026-08-07T12:04:00.000Z",
});

const rows = [];
function check(id, envelopeFactory, mutate, expected, options = {}) {
  const envelope = envelopeFactory();
  mutate(envelope);
  const result = verifyTrustedEnvelope(envelope, {
    expectedRevisionId: revision,
    expectedSourceManifestSha256: source,
    trustPolicy: options.policy ?? policy,
    now,
    maxAgeMs: 10 * 60 * 1000,
    maximumEnvelopeLifetimeMs: 10 * 60 * 1000,
    seenEvidenceIds: options.seenEvidenceIds ?? new Set(),
    seenNonces: options.seenNonces ?? new Set(),
  });
  assert.equal(result.failed === 0, expected, id);
  rows.push({ id, ok: true });
}

check("valid", () => make(), () => {}, true);
check("attacker", () => make({ privateKey: attacker.privateKey, keyId: "attacker-key-0001" }), () => {}, false);
check("attacker-reuses-trusted-id", () => make({ privateKey: attacker.privateKey }), () => {}, false);
check("extra-envelope-field", () => make(), (e) => { e.untrusted = true; }, false);
check("extra-signature-field", () => make(), (e) => { e.signature.publicKeySpkiDerBase64 = "AA=="; }, false);
check("timeline-reversed", () => make(), (e) => { e.expiresAt = "2026-08-07T11:58:59.000Z"; }, false);
check("lifetime-too-long", () => make(), (e) => { e.expiresAt = "2026-08-07T12:30:00.000Z"; }, false);
check("future-observation", () => make(), (e) => { e.observedAt = "2026-08-07T12:02:00.000Z"; }, false);
check("stale-observation", () => make(), (e) => { e.observedAt = "2026-08-07T10:00:00.000Z"; }, false);
check("expired", () => make(), (e) => { e.expiresAt = "2026-08-07T11:59:30.000Z"; }, false);
check("key-not-active-at-observation", () => make({ observedAt: "2026-07-31T23:59:59.000Z", expiresAt: "2026-08-01T00:04:00.000Z" }), () => {}, false);
const expiredPolicy = {
  ...policy,
  productionTrustedKeys: [{ ...policy.productionTrustedKeys[0], expiresAt: "2026-08-07T11:59:30.000Z" }],
};
check("key-not-active-now", () => make(), () => {}, false, { policy: expiredPolicy });
const duplicatePolicy = {
  ...policy,
  productionTrustedKeys: [policy.productionTrustedKeys[0], { ...policy.productionTrustedKeys[0] }],
};
check("duplicate-key-id", () => make(), () => {}, false, { policy: duplicatePolicy });
const wrongAlgorithmPolicy = {
  ...policy,
  productionTrustedKeys: [{ ...policy.productionTrustedKeys[0], algorithm: "RSA" }],
};
check("key-algorithm-mismatch", () => make(), () => {}, false, { policy: wrongAlgorithmPolicy });
check("signature-base64-invalid", () => make(), (e) => { e.signature.signatureBase64 = "!!!!"; }, false);
check("evidence-replay-advisory", () => make(), () => {}, false, { seenEvidenceIds: new Set(["r44p27-evidence-0001"]) });
check("nonce-replay-advisory", () => make(), () => {}, false, { seenNonces: new Set(["nonce-r44p27-0001"]) });
check("payload-tamper", () => make(), (e) => { e.claims.programId = "tampered-program"; }, false);
check("wrong-source", () => make(), (e) => { e.sourceManifestSha256 = "f".repeat(64); }, false);
check("wrong-revision", () => make(), (e) => { e.revisionId = "wrong-revision"; }, false);

assert.throws(() => canonical({ x: Number.NaN }), /canonical_non_finite_number/u);
rows.push({ id: "canonical-nan-rejected", ok: true });
assert.throws(() => canonical({ x: undefined }), /canonical_unsupported_type/u);
rows.push({ id: "canonical-undefined-rejected", ok: true });
const cyclic = {}; cyclic.self = cyclic;
assert.throws(() => canonical(cyclic), /canonical_cycle/u);
rows.push({ id: "canonical-cycle-rejected", ok: true });
const forbidden = Object.create(null); forbidden.__proto__ = "x";
assert.throws(() => canonical(forbidden), /canonical_forbidden_key/u);
rows.push({ id: "canonical-forbidden-key-rejected", ok: true });

console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p27.envelope-hardening-test.v1",
  status: "PASS",
  checks: rows.length,
  passed: rows.length,
  failed: 0,
  rows,
}, null, 2));
