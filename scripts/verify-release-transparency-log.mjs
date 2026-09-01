#!/usr/bin/env node
import {
  canonicalJson,
  parseTrustedFingerprints,
  readBoundedRegularFile,
  sha256Hex,
  verifyThresholdSignatures,
  verifyTrustCheckpointArtifact,
} from "../lib/security/release-signature-trust-boundary.mjs";

const argv = process.argv.slice(2);
const one = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : null; };
const all = (name) => argv.flatMap((value, index) => value === name ? [argv[index + 1]] : []).filter(Boolean);
const fail = (message) => { console.error(message); process.exit(1); };
if (!one("--entries") || !one("--checkpoints")) fail("usage_requires_entries_and_checkpoints");
try {
  const entries = JSON.parse(readBoundedRegularFile(one("--entries"), 64 * 1024 * 1024).toString("utf8"));
  const checkpoints = JSON.parse(readBoundedRegularFile(one("--checkpoints"), 64 * 1024 * 1024).toString("utf8"));
  if (!Array.isArray(entries) || entries.length < 1 || !Array.isArray(checkpoints) || checkpoints.length < 1) throw new Error("transparency_input_invalid");
  const trustedFingerprints = parseTrustedFingerprints(all("--trusted-fingerprint"));
  const trustedCheckpointDigests = all("--trusted-checkpoint-digest").map((value) => String(value).toLowerCase());
  if (trustedFingerprints.size < 1 && trustedCheckpointDigests.length < 1) throw new Error("transparency_external_anchor_required");
  const orderedCheckpoints = [...checkpoints].sort((a, b) => a.payload.sequence - b.payload.sequence);
  const verifiedByDigest = new Map();
  let previousCheckpoint = null;
  for (const checkpoint of orderedCheckpoints) {
    if (verifiedByDigest.has(checkpoint.checkpointDigest)) throw new Error("transparency_duplicate_checkpoint_digest");
    const verified = verifyTrustCheckpointArtifact(checkpoint, { previousCheckpoint, trustedFingerprints: [...trustedFingerprints], trustedCheckpointDigests, expectedEnvironment: one("--environment") ?? undefined, expectedAudience: one("--audience") ?? undefined, nowSeconds: Math.floor(Number(checkpoint?.payload?.issuedAt ?? Date.now()) / 1000) });
    verifiedByDigest.set(checkpoint.checkpointDigest, verified);
    previousCheckpoint = checkpoint;
  }
  let previousEntry = null;
  for (const artifact of entries) {
    if (artifact?.schemaVersion !== "velmere.release-transparency-entry.v1" || !artifact.payload) throw new Error("transparency_schema_invalid");
    const payload = artifact.payload;
    if (one("--environment") && payload.environment !== one("--environment")) throw new Error("transparency_environment_mismatch");
    if (one("--audience") && payload.audience !== one("--audience")) throw new Error("transparency_audience_mismatch");
    if (payload.audienceHash !== sha256Hex(String(payload.audience ?? ""))) throw new Error("transparency_audience_hash_invalid");
    if (previousEntry) {
      if (payload.sequence !== previousEntry.payload.sequence + 1 || payload.previousEntryDigest !== previousEntry.entryDigest || payload.previousLogRoot !== previousEntry.payload.logRoot) throw new Error("transparency_chain_gap");
    } else if (payload.sequence !== 1 || payload.previousEntryDigest !== null || payload.previousLogRoot !== null) throw new Error("transparency_genesis_invalid");
    const trust = verifiedByDigest.get(payload.trustCheckpointDigest);
    if (!trust) throw new Error("transparency_checkpoint_unverified");
    verifyThresholdSignatures({ payload, signatures: artifact.signatures, keys: trust.checkpoint.payload.keys, threshold: payload.signatureThreshold, nowSeconds: Math.floor(Number(payload.issuedAt) / 1000), requiredRole: "transparency_entry", domain: "transparency" });
    const leafCore = { ...payload }; delete leafCore.entryLeafDigest; delete leafCore.logRoot;
    if (sha256Hex(canonicalJson(leafCore)) !== payload.entryLeafDigest) throw new Error("transparency_leaf_invalid");
    const root = sha256Hex(canonicalJson({ previousLogRoot: payload.previousLogRoot, entryLeafDigest: payload.entryLeafDigest, sequence: payload.sequence, environment: payload.environment, audienceHash: payload.audienceHash }));
    if (root !== payload.logRoot) throw new Error("transparency_root_invalid");
    const digest = sha256Hex(canonicalJson({ payload, signatures: [...artifact.signatures].sort((a, b) => String(a.keyId).localeCompare(String(b.keyId))) }));
    if (digest !== artifact.entryDigest) throw new Error("transparency_entry_digest_invalid");
    previousEntry = artifact;
  }
  if (one("--latest-root") && previousEntry.payload.logRoot !== one("--latest-root")) throw new Error("transparency_latest_root_mismatch");
  console.log(JSON.stringify({ schemaVersion: "velmere.release-transparency-independent-verifier.v2", ok: true, entries: entries.length, verifiedTrustCheckpoints: verifiedByDigest.size, fromSequence: entries[0].payload.sequence, toSequence: previousEntry.payload.sequence, latestLogRoot: previousEntry.payload.logRoot, externallyAnchored: true }, null, 2));
} catch (error) { fail(error instanceof Error ? error.message : "transparency_verification_failed"); }
