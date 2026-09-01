#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  parseTrustedFingerprints,
  publicKeyFingerprint,
  readBoundedRegularFile,
  strictEd25519PublicKey,
  strictEd25519Signature,
} from "../lib/security/release-signature-trust-boundary.mjs";
import { verify as cryptoVerify } from "node:crypto";

const argv = process.argv.slice(2);
const values = (name) => argv.flatMap((value, index) => value === name ? [argv[index + 1]] : []).filter(Boolean);
const value = (name) => values(name)[0] ?? null;
const artifactPath = value("--attestation");
const publicKeyPath = value("--public-key");
const trusted = parseTrustedFingerprints(values("--trusted-fingerprint"));
const sha = (input) => createHash("sha256").update(input).digest("hex");
const blockers = [];
const ARTIFACT_KEYS = new Set(["schemaVersion", "payload", "signature", "attestationDigest"]);
const PAYLOAD_KEYS = new Set(["schemaVersion", "candidateId", "environment", "audienceHash", "deploymentFingerprint", "rollbackExecutionDigest", "incidentDigest", "qualityDigest", "capabilityDigest", "sourceSha256", "buildSha256", "buildIdHash", "exactCheckpoint", "recoveryProofDigest", "customerSmokeDigest", "providerSmokeDigest", "releaseCertificateDigest", "releaseBundleDigest", "keyId", "publicKeyFingerprint", "operatorHash", "reasonHash", "issuedAt", "expiresAt", "nonce", "manifestRoot"]);
const isRecord = (input) => Boolean(input) && typeof input === "object" && !Array.isArray(input);
try {
  if (!artifactPath || !publicKeyPath || trusted.size < 1) throw new Error("usage_requires_attestation_public_key_and_trusted_fingerprint");
  const artifact = JSON.parse(readBoundedRegularFile(artifactPath).toString("utf8"));
  const publicKeyPem = readBoundedRegularFile(publicKeyPath, 8192).toString("utf8");
  const publicKey = strictEd25519PublicKey(publicKeyPem);
  const fingerprint = publicKeyFingerprint(publicKeyPem);
  if (!trusted.has(fingerprint)) blockers.push("external_trust_anchor_mismatch");
  if (!isRecord(artifact) || artifact.schemaVersion !== "velmere.release-candidate-attestation.v1") blockers.push("schema_invalid");
  for (const key of Object.keys(artifact ?? {})) if (!ARTIFACT_KEYS.has(key)) blockers.push(`artifact_unknown_field:${key}`);
  if (!isRecord(artifact?.payload)) blockers.push("payload_invalid");
  for (const key of Object.keys(artifact?.payload ?? {})) if (!PAYLOAD_KEYS.has(key)) blockers.push(`payload_unknown_field:${key}`);
  if (artifact?.payload?.schemaVersion !== "velmere.release-candidate-attestation.v1") blockers.push("payload_schema_invalid");
  if (artifact?.payload?.publicKeyFingerprint !== fingerprint) blockers.push("public_key_fingerprint_mismatch");
  if (value("--environment") && artifact?.payload?.environment !== value("--environment")) blockers.push("environment_mismatch");
  if (value("--audience") && artifact?.payload?.audienceHash !== sha(value("--audience"))) blockers.push("audience_mismatch");
  const hashFields = ["audienceHash", "deploymentFingerprint", "rollbackExecutionDigest", "incidentDigest", "qualityDigest", "capabilityDigest", "sourceSha256", "buildSha256", "buildIdHash", "recoveryProofDigest", "customerSmokeDigest", "providerSmokeDigest", "releaseCertificateDigest", "releaseBundleDigest", "publicKeyFingerprint", "operatorHash", "reasonHash", "manifestRoot"];
  for (const field of hashFields) if (!/^[a-f0-9]{64}$/u.test(String(artifact?.payload?.[field] ?? ""))) blockers.push(`payload_hash_invalid:${field}`);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(artifact?.payload?.issuedAt) || !Number.isInteger(artifact?.payload?.expiresAt) || artifact.payload.issuedAt > now + 60 || artifact.payload.expiresAt <= now || artifact.payload.expiresAt - artifact.payload.issuedAt > 1800) blockers.push("freshness_invalid");
  const payload = JSON.stringify(artifact.payload);
  let signatureBytes = null;
  try { signatureBytes = strictEd25519Signature(artifact.signature); } catch { blockers.push("signature_encoding_invalid"); }
  if (signatureBytes && !cryptoVerify(null, Buffer.from(payload), publicKey, signatureBytes)) blockers.push("signature_invalid");
  const attestationDigest = sha(`${payload}.${String(artifact.signature ?? "")}`);
  if (artifact.attestationDigest !== attestationDigest) blockers.push("attestation_digest_mismatch");
  const result = { schemaVersion: "velmere.release-candidate-independent-verifier.v2", ok: blockers.length === 0, attestationDigest, manifestRoot: artifact?.payload?.manifestRoot ?? null, publicKeyFingerprint: fingerprint, externallyAnchored: trusted.has(fingerprint), environment: artifact?.payload?.environment ?? null, exactCheckpoint: artifact?.payload?.exactCheckpoint ?? null, blockers: [...new Set(blockers)].sort() };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  process.stdout.write(`${JSON.stringify({ schemaVersion: "velmere.release-candidate-independent-verifier.v2", ok: false, blockers: [error instanceof Error ? error.message : "verification_exception"] }, null, 2)}\n`);
  process.exit(1);
}
