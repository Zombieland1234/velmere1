#!/usr/bin/env node
import { verify as cryptoVerify } from "node:crypto";
import {
  canonicalJson,
  parseTrustedFingerprints,
  readBoundedRegularFile,
  registryDigest,
  sha256Hex,
  strictEd25519PublicKey,
  strictEd25519Signature,
  validateKeyRegistry,
  verifyThresholdSignatures,
} from "../lib/security/release-signature-trust-boundary.mjs";

const argv = process.argv.slice(2);
const one = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : null; };
const all = (name) => argv.flatMap((value, index) => value === name ? [argv[index + 1]] : []).filter(Boolean);
const fail = (message) => { console.error(message); process.exit(1); };
const file = one("--package");
if (!file) fail("missing --package");
try {
  const artifact = JSON.parse(readBoundedRegularFile(file, 16 * 1024 * 1024).toString("utf8"));
  if (artifact?.schemaVersion !== "velmere.release-proof-package.v1" || !artifact.payload) throw new Error("package_schema_invalid");
  const payload = artifact.payload;
  if (one("--environment") && payload.environment !== one("--environment")) throw new Error("package_environment_mismatch");
  if (one("--audience") && payload.audience !== one("--audience")) throw new Error("package_audience_mismatch");
  if (payload.audienceHash !== sha256Hex(String(payload.audience ?? ""))) throw new Error("package_audience_hash_invalid");
  const trusted = parseTrustedFingerprints(all("--trusted-fingerprint"));
  const previousFile = one("--previous-package");
  if (!previousFile && trusted.size < 1) throw new Error("package_external_anchor_required");
  const keys = validateKeyRegistry(payload.keys, { nowSeconds: Math.floor(Number(payload.issuedAt) / 1000) });
  if (registryDigest(payload.keys) !== payload.keyRegistryDigest) throw new Error("package_key_registry_digest_invalid");
  if (trusted.size && !keys.some((key) => key.status === "active" && trusted.has(key.fingerprint))) throw new Error("package_trusted_fingerprint_missing");
  const index = payload.provenanceIndex;
  if (index?.schemaVersion !== "velmere.release-provenance-index.v1" || !index.payload || !Array.isArray(index.signatures)) throw new Error("package_index_invalid");
  if (index.payload.environment !== payload.environment || index.payload.audienceHash !== payload.audienceHash) throw new Error("package_index_binding_mismatch");
  if (index.indexDigest !== sha256Hex(JSON.stringify({ payload: index.payload, signatures: index.signatures }))) throw new Error("package_index_digest_invalid");
  const leaves = index.payload.entries.map((entry) => sha256Hex(JSON.stringify({ path: entry.path, sha256: entry.sha256, sizeBytes: entry.sizeBytes, mediaType: entry.mediaType })));
  if (index.payload.artifactsRoot !== sha256Hex(JSON.stringify({ schemaVersion: "velmere.release-provenance-artifacts-root.v1", leaves }))) throw new Error("package_artifacts_root_invalid");
  const chain = sha256Hex(JSON.stringify({ schemaVersion: "velmere.release-provenance-chain-root.v1", previousIndexDigest: index.payload.previousIndexDigest, sequence: index.payload.sequence, artifactsRoot: index.payload.artifactsRoot, candidateAttestationDigest: index.payload.candidateAttestationDigest }));
  if (index.payload.chainRoot !== chain) throw new Error("package_chain_root_invalid");
  const { signerSetDigest: _ignored, ...indexBase } = index.payload;
  const byId = new Map(keys.map((key) => [key.keyId, key]));
  const seenIndex = new Set(); let qualifiedIndex = 0;
  for (const signature of index.signatures) {
    if (seenIndex.has(signature.keyId)) throw new Error("package_index_duplicate_signer");
    seenIndex.add(signature.keyId);
    const key = byId.get(signature.keyId);
    if (!key || key.status !== "active" || !key.currentlyValid) throw new Error("package_index_signer_not_qualified");
    if (!cryptoVerify(null, Buffer.from(JSON.stringify(indexBase)), strictEd25519PublicKey(key.publicKeyPem), strictEd25519Signature(signature.signature))) throw new Error("package_index_signature_invalid");
    qualifiedIndex += 1;
  }
  if (!Number.isInteger(index.payload.threshold) || qualifiedIndex < index.payload.threshold) throw new Error("package_index_threshold_invalid");
  verifyThresholdSignatures({ payload, signatures: artifact.signatures, keys: payload.keys, threshold: payload.signatureThreshold, nowSeconds: Math.floor(Number(payload.issuedAt) / 1000), requiredRole: "release_package", domain: "package" });
  const digest = sha256Hex(canonicalJson({ payload, signatures: [...artifact.signatures].sort((a, b) => String(a.keyId).localeCompare(String(b.keyId))) }));
  if (digest !== artifact.packageDigest) throw new Error("package_digest_invalid");
  if (payload.sequence === 1 && payload.previousPackageDigest) throw new Error("package_genesis_previous_forbidden");
  if (payload.sequence > 1 && !/^[a-f0-9]{64}$/u.test(String(payload.previousPackageDigest ?? ""))) throw new Error("package_previous_digest_missing");
  if (previousFile) {
    const previous = JSON.parse(readBoundedRegularFile(previousFile, 16 * 1024 * 1024).toString("utf8"));
    if (payload.sequence !== previous?.payload?.sequence + 1 || payload.previousPackageDigest !== previous.packageDigest) throw new Error("package_chain_mismatch");
  }
  console.log(JSON.stringify({ schemaVersion: "velmere.release-proof-package-independent-verifier.v2", ok: true, packageDigest: artifact.packageDigest, indexDigest: index.indexDigest, sequence: payload.sequence, keyRegistryDigest: payload.keyRegistryDigest, signatureCount: artifact.signatures.length, threshold: payload.signatureThreshold, externallyAnchored: trusted.size > 0 }, null, 2));
} catch (error) { fail(error instanceof Error ? error.message : "package_verification_failed"); }
