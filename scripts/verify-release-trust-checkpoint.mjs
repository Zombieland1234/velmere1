#!/usr/bin/env node
import {
  canonicalJson,
  parseTrustedFingerprints,
  readBoundedRegularFile,
  sha256Hex,
  validateKeyRegistry,
  verifyThresholdSignatures,
  verifyTrustCheckpointArtifact,
} from "../lib/security/release-signature-trust-boundary.mjs";

const argv = process.argv.slice(2);
const one = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : null; };
const all = (name) => argv.flatMap((value, index) => value === name ? [argv[index + 1]] : []).filter(Boolean);
const fail = (message) => { console.error(message); process.exit(1); };
const checkpointFile = one("--checkpoint");
const packageFile = one("--package");
if (!checkpointFile || !packageFile) fail("usage_requires_checkpoint_and_package");
try {
  const checkpoint = JSON.parse(readBoundedRegularFile(checkpointFile, 16 * 1024 * 1024).toString("utf8"));
  const pkg = JSON.parse(readBoundedRegularFile(packageFile, 16 * 1024 * 1024).toString("utf8"));
  const previous = one("--previous-checkpoint") ? JSON.parse(readBoundedRegularFile(one("--previous-checkpoint"), 16 * 1024 * 1024).toString("utf8")) : null;
  const trustedFingerprints = parseTrustedFingerprints(all("--trusted-fingerprint"));
  const trustedCheckpointDigests = all("--trusted-checkpoint-digest").map((value) => String(value).toLowerCase());
  const verified = verifyTrustCheckpointArtifact(checkpoint, { previousCheckpoint: previous, trustedFingerprints: [...trustedFingerprints], trustedCheckpointDigests, expectedEnvironment: one("--environment") ?? undefined, expectedAudience: one("--audience") ?? undefined, nowSeconds: Math.floor(Number(checkpoint?.payload?.issuedAt ?? Date.now()) / 1000) });
  if (pkg?.schemaVersion !== "velmere.release-proof-package.v1" || !pkg.payload) throw new Error("checkpoint_package_schema_invalid");
  if (pkg.packageDigest !== checkpoint.payload.latestPackageDigest || pkg.payload.sequence !== checkpoint.payload.latestPackageSequence || pkg.payload.environment !== checkpoint.payload.environment || pkg.payload.audienceHash !== checkpoint.payload.audienceHash) throw new Error("checkpoint_package_binding_mismatch");
  validateKeyRegistry(pkg.payload.keys, { nowSeconds: Math.floor(Number(pkg.payload.issuedAt) / 1000) });
  verifyThresholdSignatures({ payload: pkg.payload, signatures: pkg.signatures, keys: pkg.payload.keys, threshold: pkg.payload.signatureThreshold, nowSeconds: Math.floor(Number(pkg.payload.issuedAt) / 1000), requiredRole: "release_package", domain: "checkpoint_package" });
  const packageDigest = sha256Hex(canonicalJson({ payload: pkg.payload, signatures: [...pkg.signatures].sort((a, b) => String(a.keyId).localeCompare(String(b.keyId))) }));
  if (packageDigest !== pkg.packageDigest) throw new Error("checkpoint_package_digest_invalid");
  const current = new Map(verified.registry.map((key) => [key.keyId, key]));
  for (const signature of pkg.signatures) {
    const key = current.get(signature.keyId);
    if (!key || key.status !== "active" || !key.currentlyValid) throw new Error("checkpoint_package_signer_not_current");
  }
  console.log(JSON.stringify({ schemaVersion: "velmere.release-trust-checkpoint-independent-verifier.v2", ok: true, checkpointDigest: checkpoint.checkpointDigest, latestPackageDigest: checkpoint.payload.latestPackageDigest, sequence: checkpoint.payload.sequence, trustEpoch: checkpoint.payload.trustEpoch, activeKeyCount: verified.registry.filter((key) => key.status === "active" && key.currentlyValid).length, revokedKeyCount: checkpoint.payload.revokedKeyFingerprints.length, externallyAnchored: checkpoint.payload.sequence > 1 || trustedFingerprints.size > 0 || trustedCheckpointDigests.includes(checkpoint.checkpointDigest) }, null, 2));
} catch (error) { fail(error instanceof Error ? error.message : "checkpoint_verification_failed"); }
