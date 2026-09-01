import assert from "node:assert/strict";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  PASS36_A71_RELEASE_SIGNATURE_BOUNDARY_ID,
  canonicalJson,
  parseTrustedFingerprints,
  publicKeyFingerprint,
  registryDigest,
  sha256Hex,
  strictEd25519PublicKey,
  strictEd25519Signature,
  validateKeyRegistry,
  verifyThresholdSignatures,
  verifyTrustCheckpointArtifact,
} from "../../lib/security/release-signature-trust-boundary.mjs";

const REVISION = "VELMERE_PASS36_A71R0_RELEASE_SIGNATURE_AND_TRUST_ANCHOR_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition, detail = null) => { const pass = Boolean(condition); checks.push({ id, pass, detail }); assert.ok(pass, id); };
const expectCode = (id, fn, code) => { try { fn(); check(id, false, "unexpected_success"); } catch (error) { check(id, String(error?.code ?? error?.message ?? error).includes(code), error?.message ?? String(error)); } };
const pair = (keyId) => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  return { keyId, publicKeyPem, privateKey, fingerprint: publicKeyFingerprint(publicKeyPem), status: "active" };
};
const sign = (privateKey, value) => cryptoSign(null, Buffer.from(value), privateKey).toString("base64url");
const nowMs = Date.now();
const nowSeconds = Math.floor(nowMs / 1000);
const keyA = pair("release-key-a");
const keyB = pair("release-key-b");
const keys = [keyA, keyB].map(({ privateKey: _privateKey, ...key }) => key);
const audience = "velmere:release:test";
const audienceHash = sha256Hex(audience);

function buildIndex() {
  const entries = [{ path: "release.json", sha256: "1".repeat(64), sizeBytes: 123, mediaType: "application/json" }];
  const leaves = entries.map((entry) => sha256Hex(JSON.stringify({ path: entry.path, sha256: entry.sha256, sizeBytes: entry.sizeBytes, mediaType: entry.mediaType })));
  const artifactsRoot = sha256Hex(JSON.stringify({ schemaVersion: "velmere.release-provenance-artifacts-root.v1", leaves }));
  const candidateAttestationDigest = "2".repeat(64);
  const chainRoot = sha256Hex(JSON.stringify({ schemaVersion: "velmere.release-provenance-chain-root.v1", previousIndexDigest: null, sequence: 1, artifactsRoot, candidateAttestationDigest }));
  const base = {
    environment: "staging", audienceHash, previousIndexDigest: null, sequence: 1, artifactsRoot, chainRoot,
    candidateAttestationDigest, entries, threshold: 2, issuedAt: nowMs, expiresAt: nowMs + 600_000, nonce: "index-nonce-12345",
  };
  const signerSetDigest = sha256Hex(canonicalJson(keys.map(({ publicKeyPem: _pem, ...key }) => key)));
  const payload = { ...base, signerSetDigest };
  const signatures = [
    { keyId: keyA.keyId, signature: sign(keyA.privateKey, JSON.stringify(base)) },
    { keyId: keyB.keyId, signature: sign(keyB.privateKey, JSON.stringify(base)) },
  ];
  return { schemaVersion: "velmere.release-provenance-index.v1", payload, signatures, indexDigest: sha256Hex(JSON.stringify({ payload, signatures })) };
}
function buildPackage(overrides = {}) {
  const payload = {
    packageId: "release-package-0001", environment: "staging", audience, audienceHash, sequence: 1, previousPackageDigest: null,
    provenanceIndex: buildIndex(), keys, keyRegistryDigest: registryDigest(keys), signatureThreshold: 2,
    issuedAt: nowMs, expiresAt: nowMs + 600_000, nonce: "package-nonce-12345", ...overrides,
  };
  const signatures = [
    { keyId: keyA.keyId, signature: sign(keyA.privateKey, canonicalJson(payload)) },
    { keyId: keyB.keyId, signature: sign(keyB.privateKey, canonicalJson(payload)) },
  ];
  return { schemaVersion: "velmere.release-proof-package.v1", payload, signatures, packageDigest: sha256Hex(canonicalJson({ payload, signatures })) };
}
function buildCheckpoint(overrides = {}) {
  const pkg = buildPackage();
  const payload = {
    checkpointId: "trust-checkpoint-0001", environment: "staging", audience, audienceHash, sequence: 1, previousCheckpointDigest: null,
    latestPackageDigest: pkg.packageDigest, latestPackageSequence: 1, trustEpoch: 1, keys, keyRegistryDigest: registryDigest(keys),
    revokedKeyFingerprints: [], supersededPackageDigests: [], signatureThreshold: 2, issuedAt: nowMs, expiresAt: nowMs + 600_000,
    nonce: "checkpoint-nonce-12345", ...overrides,
  };
  const signatures = [
    { keyId: keyA.keyId, signature: sign(keyA.privateKey, canonicalJson(payload)) },
    { keyId: keyB.keyId, signature: sign(keyB.privateKey, canonicalJson(payload)) },
  ];
  return { pkg, checkpoint: { schemaVersion: "velmere.release-trust-checkpoint.v1", payload, signatures, checkpointDigest: sha256Hex(canonicalJson({ payload, signatures })) } };
}
function buildEntry(checkpoint) {
  const core = {
    entryId: "transparency-entry-0001", environment: "staging", audience, audienceHash, sequence: 1, previousEntryDigest: null, previousLogRoot: null,
    trustCheckpointDigest: checkpoint.checkpointDigest, trustCheckpointSequence: 1, trustEpoch: 1, consistencyProofDigest: "3".repeat(64),
    provenanceIndexDigest: "4".repeat(64), proofPackageDigest: checkpoint.payload.latestPackageDigest, releaseCandidateAttestationDigest: "5".repeat(64),
    sourceSha256: "6".repeat(64), buildSha256: "7".repeat(64), exactCheckpoint: 5000, signatureThreshold: 2,
    issuedAt: nowMs, expiresAt: nowMs + 600_000, nonce: "entry-nonce-12345",
  };
  const entryLeafDigest = sha256Hex(canonicalJson(core));
  const logRoot = sha256Hex(canonicalJson({ previousLogRoot: null, entryLeafDigest, sequence: 1, environment: "staging", audienceHash }));
  const payload = { ...core, entryLeafDigest, logRoot };
  const signatures = [
    { keyId: keyA.keyId, signature: sign(keyA.privateKey, canonicalJson(payload)) },
    { keyId: keyB.keyId, signature: sign(keyB.privateKey, canonicalJson(payload)) },
  ];
  return { schemaVersion: "velmere.release-transparency-entry.v1", payload, signatures, entryDigest: sha256Hex(canonicalJson({ payload, signatures })) };
}
function buildCandidate() {
  const payload = {
    schemaVersion: "velmere.release-candidate-attestation.v1", candidateId: "candidate-0001", environment: "staging", audienceHash,
    deploymentFingerprint: "8".repeat(64), rollbackExecutionDigest: "9".repeat(64), incidentDigest: "a".repeat(64), qualityDigest: "b".repeat(64), capabilityDigest: "c".repeat(64),
    sourceSha256: "d".repeat(64), buildSha256: "e".repeat(64), buildIdHash: "f".repeat(64), exactCheckpoint: 5000,
    recoveryProofDigest: "1".repeat(64), customerSmokeDigest: "2".repeat(64), providerSmokeDigest: "3".repeat(64), releaseCertificateDigest: "4".repeat(64), releaseBundleDigest: "5".repeat(64),
    keyId: keyA.keyId, publicKeyFingerprint: keyA.fingerprint, operatorHash: "6".repeat(64), reasonHash: "7".repeat(64), issuedAt: nowSeconds, expiresAt: nowSeconds + 600,
    nonce: "candidate-nonce-12345", manifestRoot: "8".repeat(64),
  };
  const signature = sign(keyA.privateKey, JSON.stringify(payload));
  return { schemaVersion: "velmere.release-candidate-attestation.v1", payload, signature, attestationDigest: sha256Hex(`${JSON.stringify(payload)}.${signature}`) };
}
const tmp = mkdtempSync(path.join(os.tmpdir(), "velmere-a71-"));
const write = (name, value) => { const target = path.join(tmp, name); writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`); return target; };
const run = (script, args) => spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: "utf8" });

check("boundary_id_exact", PASS36_A71_RELEASE_SIGNATURE_BOUNDARY_ID === "velmere.pass36.a71.release-signature-trust-boundary.v1");
check("fingerprint_exact", /^[a-f0-9]{64}$/u.test(keyA.fingerprint));
check("trusted_list_parsed", parseTrustedFingerprints([keyA.fingerprint]).has(keyA.fingerprint));
check("public_key_ed25519", strictEd25519PublicKey(keyA.publicKeyPem).asymmetricKeyType === "ed25519");
const sampleSignature = sign(keyA.privateKey, "sample");
check("signature_exact_64_bytes", strictEd25519Signature(sampleSignature).length === 64);
expectCode("signature_padding_rejected", () => strictEd25519Signature(`${sampleSignature}=`), "signature_encoding_invalid");
expectCode("duplicate_key_id_rejected", () => validateKeyRegistry([keys[0], { ...keys[1], keyId: keys[0].keyId }]), "key_id_invalid_or_duplicate");
expectCode("duplicate_key_fingerprint_rejected", () => validateKeyRegistry([keys[0], { ...keys[0], keyId: "other-key" }]), "key_fingerprint_duplicate");
expectCode("fingerprint_mismatch_rejected", () => validateKeyRegistry([{ ...keys[0], fingerprint: "0".repeat(64) }]), "key_fingerprint_mismatch");
const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ type: "spki", format: "pem" }).toString();
expectCode("non_ed25519_rejected", () => strictEd25519PublicKey(rsa), "public_key_not_ed25519");
const thresholdPayload = { test: true };
const thresholdSignatures = [
  { keyId: keyA.keyId, signature: sign(keyA.privateKey, canonicalJson(thresholdPayload)) },
  { keyId: keyB.keyId, signature: sign(keyB.privateKey, canonicalJson(thresholdPayload)) },
];
check("qualified_threshold_passes", verifyThresholdSignatures({ payload: thresholdPayload, signatures: thresholdSignatures, keys, threshold: 2, nowSeconds }).qualified === 2);
expectCode("duplicate_signer_rejected", () => verifyThresholdSignatures({ payload: thresholdPayload, signatures: [thresholdSignatures[0], thresholdSignatures[0]], keys, threshold: 2, nowSeconds }), "duplicate_signer");
expectCode("retiring_signer_not_threshold", () => verifyThresholdSignatures({ payload: thresholdPayload, signatures: thresholdSignatures, keys: [{ ...keys[0], status: "retiring" }, keys[1]], threshold: 2, nowSeconds }), "threshold_exceeds_eligible_keys");
expectCode("expired_signer_rejected", () => verifyThresholdSignatures({ payload: thresholdPayload, signatures: thresholdSignatures, keys: [{ ...keys[0], notAfter: nowSeconds - 1 }, keys[1]], threshold: 2, nowSeconds }), "threshold_exceeds_eligible_keys");
const roleKeys = keys.map((key) => ({ ...key, roles: ["other_role"] }));
expectCode("wrong_role_rejected", () => verifyThresholdSignatures({ payload: thresholdPayload, signatures: thresholdSignatures, keys: roleKeys, threshold: 2, nowSeconds, requiredRole: "release_package" }), "threshold_exceeds_eligible_keys");

const { checkpoint, pkg } = buildCheckpoint();
check("checkpoint_anchored_passes", verifyTrustCheckpointArtifact(checkpoint, { trustedFingerprints: [keyA.fingerprint], nowSeconds: Math.floor(nowMs / 1000) }).digest === checkpoint.checkpointDigest);
expectCode("checkpoint_self_signed_without_anchor_rejected", () => verifyTrustCheckpointArtifact(checkpoint, { nowSeconds }), "external_anchor_required");
expectCode("checkpoint_wrong_anchor_rejected", () => verifyTrustCheckpointArtifact(checkpoint, { trustedFingerprints: ["0".repeat(64)], nowSeconds }), "external_anchor_required");
const duplicateCheckpoint = structuredClone(checkpoint); duplicateCheckpoint.payload.keys[1].keyId = duplicateCheckpoint.payload.keys[0].keyId;
expectCode("checkpoint_duplicate_key_rejected", () => verifyTrustCheckpointArtifact(duplicateCheckpoint, { trustedFingerprints: [keyA.fingerprint], nowSeconds }), "key_id_invalid_or_duplicate");
const tamperedCheckpoint = structuredClone(checkpoint); tamperedCheckpoint.checkpointDigest = "0".repeat(64);
expectCode("checkpoint_digest_tamper_rejected", () => verifyTrustCheckpointArtifact(tamperedCheckpoint, { trustedFingerprints: [keyA.fingerprint], nowSeconds }), "checkpoint_digest_invalid");

const candidate = buildCandidate();
const candidateFile = write("candidate.json", candidate);
const publicFile = write("candidate-public.pem", keyA.publicKeyPem);
let result = run("scripts/verify-release-candidate-attestation.mjs", ["--attestation", candidateFile, "--public-key", publicFile, "--trusted-fingerprint", keyA.fingerprint, "--environment", "staging", "--audience", audience]);
check("candidate_cli_valid", result.status === 0, result.stderr || result.stdout);
result = run("scripts/verify-release-candidate-attestation.mjs", ["--attestation", candidateFile, "--public-key", publicFile]);
check("candidate_cli_anchor_required", result.status === 1 && result.stdout.includes("trusted_fingerprint"), result.stdout);
result = run("scripts/verify-release-candidate-attestation.mjs", ["--attestation", candidateFile, "--public-key", publicFile, "--trusted-fingerprint", "0".repeat(64)]);
check("candidate_cli_wrong_anchor_rejected", result.status === 1 && result.stdout.includes("external_trust_anchor_mismatch"), result.stdout);
const candidateUnknown = structuredClone(candidate); candidateUnknown.payload.untrusted = true;
result = run("scripts/verify-release-candidate-attestation.mjs", ["--attestation", write("candidate-unknown.json", candidateUnknown), "--public-key", publicFile, "--trusted-fingerprint", keyA.fingerprint]);
check("candidate_unknown_field_rejected", result.status === 1 && result.stdout.includes("payload_unknown_field"), result.stdout);
const candidateTampered = structuredClone(candidate); { const index = 10; const replacement = candidateTampered.signature[index] === "A" ? "B" : "A"; candidateTampered.signature = `${candidateTampered.signature.slice(0, index)}${replacement}${candidateTampered.signature.slice(index + 1)}`; }
result = run("scripts/verify-release-candidate-attestation.mjs", ["--attestation", write("candidate-tampered.json", candidateTampered), "--public-key", publicFile, "--trusted-fingerprint", keyA.fingerprint]);
check("candidate_signature_tamper_rejected", result.status === 1 && result.stdout.includes("signature_invalid"), result.stdout);

const packageFile = write("package.json", pkg);
result = run("scripts/verify-release-proof-package.mjs", ["--package", packageFile, "--trusted-fingerprint", keyA.fingerprint, "--environment", "staging", "--audience", audience]);
check("package_cli_valid", result.status === 0, result.stderr || result.stdout);
result = run("scripts/verify-release-proof-package.mjs", ["--package", packageFile]);
check("package_cli_anchor_required", result.status === 1 && result.stderr.includes("external_anchor_required"), result.stderr);
const packageTampered = structuredClone(pkg); packageTampered.signatures[0].signature = packageTampered.signatures[1].signature;
result = run("scripts/verify-release-proof-package.mjs", ["--package", write("package-tampered.json", packageTampered), "--trusted-fingerprint", keyA.fingerprint]);
check("package_signature_tamper_rejected", result.status === 1, result.stderr);
const packageDuplicate = structuredClone(pkg); packageDuplicate.signatures[1].keyId = packageDuplicate.signatures[0].keyId;
result = run("scripts/verify-release-proof-package.mjs", ["--package", write("package-duplicate.json", packageDuplicate), "--trusted-fingerprint", keyA.fingerprint]);
check("package_duplicate_signer_rejected", result.status === 1 && result.stderr.includes("duplicate_signer"), result.stderr);

const checkpointFile = write("checkpoint.json", checkpoint);
result = run("scripts/verify-release-trust-checkpoint.mjs", ["--checkpoint", checkpointFile, "--package", packageFile, "--trusted-fingerprint", keyA.fingerprint, "--environment", "staging", "--audience", audience]);
check("checkpoint_cli_valid", result.status === 0, result.stderr || result.stdout);
result = run("scripts/verify-release-trust-checkpoint.mjs", ["--checkpoint", checkpointFile, "--package", packageFile]);
check("checkpoint_cli_anchor_required", result.status === 1 && result.stderr.includes("external_anchor_required"), result.stderr);
const badPackageForCheckpoint = structuredClone(pkg); badPackageForCheckpoint.packageDigest = "0".repeat(64);
result = run("scripts/verify-release-trust-checkpoint.mjs", ["--checkpoint", checkpointFile, "--package", write("checkpoint-bad-package.json", badPackageForCheckpoint), "--trusted-fingerprint", keyA.fingerprint]);
check("checkpoint_package_binding_tamper_rejected", result.status === 1, result.stderr);

const entry = buildEntry(checkpoint);
const entriesFile = write("entries.json", [entry]);
const checkpointsFile = write("checkpoints.json", [checkpoint]);
result = run("scripts/verify-release-transparency-log.mjs", ["--entries", entriesFile, "--checkpoints", checkpointsFile, "--trusted-fingerprint", keyA.fingerprint, "--environment", "staging", "--audience", audience]);
check("transparency_cli_valid", result.status === 0, result.stderr || result.stdout);
result = run("scripts/verify-release-transparency-log.mjs", ["--entries", entriesFile, "--checkpoints", checkpointsFile]);
check("transparency_cli_anchor_required", result.status === 1 && result.stderr.includes("external_anchor_required"), result.stderr);
const duplicateCheckpoints = write("checkpoints-duplicate.json", [checkpoint, checkpoint]);
result = run("scripts/verify-release-transparency-log.mjs", ["--entries", entriesFile, "--checkpoints", duplicateCheckpoints, "--trusted-fingerprint", keyA.fingerprint]);
check("transparency_duplicate_checkpoint_rejected", result.status === 1, result.stderr);
const entryTampered = structuredClone(entry); entryTampered.payload.sourceSha256 = "0".repeat(64);
result = run("scripts/verify-release-transparency-log.mjs", ["--entries", write("entries-tampered.json", [entryTampered]), "--checkpoints", checkpointsFile, "--trusted-fingerprint", keyA.fingerprint]);
check("transparency_entry_tamper_rejected", result.status === 1, result.stderr);
const entryUnknownCheckpoint = structuredClone(entry); entryUnknownCheckpoint.payload.trustCheckpointDigest = "0".repeat(64);
result = run("scripts/verify-release-transparency-log.mjs", ["--entries", write("entries-unknown-checkpoint.json", [entryUnknownCheckpoint]), "--checkpoints", checkpointsFile, "--trusted-fingerprint", keyA.fingerprint]);
check("transparency_unverified_checkpoint_rejected", result.status === 1 && result.stderr.includes("checkpoint_unverified"), result.stderr);

const receipt = {
  schemaVersion: "velmere.pass36.a71.release-signature-trust-boundary-test-receipt.v1",
  revisionId: REVISION,
  status: "PASS_LOCAL_RELEASE_SIGNATURE_AND_EXTERNAL_TRUST_ANCHOR_BOUNDARY_ONLY_NO_EXTERNAL_SIGNATURE_OR_PROMOTION_CREDIT",
  checks: checks.map(({ id, pass }) => ({ id, pass })),
  counts: { total: checks.length, passed: checks.filter((item) => item.pass).length, failed: checks.filter((item) => !item.pass).length },
  externalSignaturesVerified: false,
  productionTransparencyLogVerified: false,
  saleEnabled: false,
  liveProven: false,
  truthBoundary: "This receipt proves the local verifier rejects circular self-trust, unanchored public-key replacement, duplicate key identities, non-Ed25519 keys, malformed signatures, inactive/expired threshold members and unverified transparency checkpoints. Generated fixture keys are not external assurance or production signatures.",
};
writeFileSync("config/pass36/a71-release-signature-trust-boundary-test-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
