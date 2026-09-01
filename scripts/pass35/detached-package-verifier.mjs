#!/usr/bin/env node
import { createPublicKey, verify as verifySignature } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalJson,
  parseDeterministicZip,
  sha256,
} from "../pass4826/release-package-contract.mjs";

export const DETACHED_RECEIPT_SCHEMA = "velmere.pass35.detached-package-receipt.v2";
export const LEGACY_DETACHED_RECEIPT_SCHEMA = "velmere.pass35.detached-package-receipt.v1";
const DETACHED_RECEIPT_SCHEMAS = new Set([DETACHED_RECEIPT_SCHEMA, LEGACY_DETACHED_RECEIPT_SCHEMA]);
export const DETACHED_VERIFICATION_SCHEMA = "velmere.pass35.detached-package-verification.v1";
export const EXPECTED_CANDIDATE_ID = "VELMERE_PASS35_OFFLINE_CANDIDATE_R3";
export const SIGNED_PROMOTION_STATUS = "PASS_ORGANIZATIONALLY_SIGNED_INDEPENDENTLY_VERIFIED";

const ARCHIVE_POLICY = Object.freeze({
  source: Object.freeze({
    receiptKey: "sourceArchive",
    fileName: "VELMERE_PASS35_OFFLINE_CANDIDATE_SOURCE_ONLY.zip",
    kind: "SOURCE_ONLY",
    manifestPath: "_velmere/PASS35_SOURCE_ONLY_MANIFEST.json",
  }),
  evidence: Object.freeze({
    receiptKey: "evidenceArchive",
    fileName: "VELMERE_PASS35_EVIDENCE_HISTORY.zip",
    kind: "EVIDENCE_HISTORY",
    manifestPath: "_velmere/PASS35_EVIDENCE_HISTORY_MANIFEST.json",
  }),
});
const PROMOTION_STATUSES = new Set(["PASS_LOCAL_DETERMINISTIC_PACKAGING", SIGNED_PROMOTION_STATUS]);
const SOURCE_FORBIDDEN_ROLES = new Set(["EVIDENCE", "HISTORY", "QUARANTINE"]);
const SOURCE_ROLE_EXCEPTIONS = new Set(["_velmere/pass35/PASS35_OFFLINE_EXECUTION_RECEIPT.json"]);
const EVIDENCE_ALLOWED_ROLES = new Set(["EVIDENCE", "HISTORY", "QUARANTINE"]);
const DIGEST_PATTERN = /^[a-f0-9]{64}$/u;
const POLICY_SCHEMA = "velmere.pass35.detached-package-verification-policy.v1";

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDigest(value) {
  return DIGEST_PATTERN.test(String(value ?? ""));
}

function safeArchiveName(value, expected) {
  invariant(typeof value === "string" && value === path.basename(value), "detached_archive_filename_invalid");
  invariant(value === expected, `detached_archive_filename_unexpected:${value}`);
  return value;
}

function receiptCore(receipt) {
  const core = { ...receipt };
  delete core.receiptSha256;
  return core;
}

function validateReceipt(receipt) {
  invariant(isObject(receipt), "detached_receipt_invalid");
  invariant(DETACHED_RECEIPT_SCHEMAS.has(receipt.schemaVersion), "detached_receipt_schema_mismatch");
  invariant(receipt.candidateId === EXPECTED_CANDIDATE_ID, "detached_receipt_candidate_mismatch");
  invariant(PROMOTION_STATUSES.has(receipt.status), "detached_receipt_status_invalid");
  invariant(typeof receipt.promotionAllowed === "boolean", "detached_receipt_promotion_flag_invalid");
  invariant(isDigest(receipt.receiptSha256), "detached_receipt_checksum_invalid");
  invariant(receipt.receiptSha256 === sha256(canonicalJson(receiptCore(receipt))), "detached_receipt_checksum_mismatch");
  for (const policy of Object.values(ARCHIVE_POLICY)) {
    const archive = receipt[policy.receiptKey];
    invariant(isObject(archive), `detached_receipt_archive_invalid:${policy.receiptKey}`);
    safeArchiveName(archive.fileName, policy.fileName);
    invariant(isDigest(archive.sha256), `detached_receipt_archive_digest_invalid:${policy.receiptKey}`);
    invariant(Number.isSafeInteger(archive.byteLength) && archive.byteLength > 0, `detached_receipt_archive_size_invalid:${policy.receiptKey}`);
    invariant(Number.isSafeInteger(archive.entryCount) && archive.entryCount > 0, `detached_receipt_archive_count_invalid:${policy.receiptKey}`);
    invariant(isDigest(archive.manifestSha256), `detached_receipt_manifest_digest_invalid:${policy.receiptKey}`);
  }
  if (receipt.schemaVersion === DETACHED_RECEIPT_SCHEMA) {
    invariant(receipt.sourceArchive.canonicalManifestProfile === "source-package", "detached_receipt_source_manifest_profile_invalid");
    invariant(isDigest(receipt.sourceArchive.canonicalManifestSetSha256), "detached_receipt_source_manifest_set_digest_invalid");
    invariant(typeof receipt.sourceArchive.unpackedSelfVerificationCommand === "string" && receipt.sourceArchive.unpackedSelfVerificationCommand.length > 0, "detached_receipt_source_self_verify_command_invalid");
    invariant(receipt.sourceArchive.unpackedSelfVerificationExpectedStatus === "PASS_LOCAL_SOURCE_PACKAGE_MANIFEST_SET_NO_PROMOTION", "detached_receipt_source_self_verify_status_invalid");
    invariant(receipt.sourceContainsNodeModules === false, "detached_receipt_source_node_modules_boundary_invalid");
    invariant(receipt.sourceContainsNextBuild === false, "detached_receipt_source_next_boundary_invalid");
    invariant(receipt.sourceContainsHistoricalArtifacts === false, "detached_receipt_source_history_boundary_invalid");
    if ("sourceContainsRecoveredHistoricalControlMetadata" in receipt) invariant(receipt.sourceContainsRecoveredHistoricalControlMetadata === true, "detached_receipt_source_recovered_control_metadata_invalid");
    invariant(receipt.sourceContainsCanonicalManifestSet === true, "detached_receipt_source_canonical_set_boundary_invalid");
    invariant(Array.isArray(receipt.sourceSupplementalCanonicalMetadata), "detached_receipt_source_canonical_metadata_invalid");
    invariant(Array.isArray(receipt.sourceSupplementalControlMetadata), "detached_receipt_source_control_metadata_invalid");
  }
  return receipt;
}

function validateVerificationPolicy(policy) {
  invariant(isObject(policy), "detached_policy_invalid");
  invariant(policy.schemaVersion === POLICY_SCHEMA, "detached_policy_schema_mismatch");
  invariant(policy.candidateId === EXPECTED_CANDIDATE_ID, "detached_policy_candidate_mismatch");
  invariant(Array.isArray(policy.trustedOrganizationalKeyFingerprints), "detached_policy_organizational_keys_invalid");
  invariant(Array.isArray(policy.trustedIndependentVerifierKeyFingerprints), "detached_policy_independent_keys_invalid");
  invariant(policy.trustedOrganizationalKeyFingerprints.every(isDigest), "detached_policy_organizational_fingerprint_invalid");
  invariant(policy.trustedIndependentVerifierKeyFingerprints.every(isDigest), "detached_policy_independent_fingerprint_invalid");
  invariant(policy.requireDistinctKeys === true, "detached_policy_distinct_keys_required");
  return policy;
}

export function loadDetachedVerificationPolicy(rootPath = process.cwd()) {
  const policyPath = path.join(path.resolve(rootPath), "config/pass35/detached-package-verification-policy.json");
  return validateVerificationPolicy(JSON.parse(readFileSync(policyPath, "utf8")));
}

function sourcePathForbidden(entryPath) {
  return /(?:^|\/)(?:\.git|node_modules|\.next(?:-[^/]*)?)(?:\/|$)/u.test(entryPath)
    || /(?:^|\/)artifacts\/release\/(?:history|quarantine)(?:\/|$)/u.test(entryPath)
    || /(?:^|\/)(?:history|quarantine)(?:\/|$)/u.test(entryPath);
}

function evidencePathForbidden(entryPath) {
  return /(?:^|\/)(?:\.git|node_modules|\.next(?:-[^/]*)?)(?:\/|$)/u.test(entryPath);
}

function validateEmbeddedManifest(parsed, policy, receiptArchive) {
  const manifestEntries = parsed.entries.filter((entry) => entry.path === policy.manifestPath);
  invariant(manifestEntries.length === 1, `detached_embedded_manifest_count:${policy.kind}`);
  let manifest;
  try { manifest = JSON.parse(manifestEntries[0].content.toString("utf8")); }
  catch { throw new Error(`detached_embedded_manifest_json:${policy.kind}`); }
  invariant(isObject(manifest), `detached_embedded_manifest_invalid:${policy.kind}`);
  invariant(manifest.schemaVersion === `velmere.pass35.${policy.kind.toLowerCase()}-manifest.v1`, `detached_embedded_manifest_schema:${policy.kind}`);
  invariant(manifest.candidateId === EXPECTED_CANDIDATE_ID, `detached_embedded_manifest_candidate:${policy.kind}`);
  invariant(manifest.kind === policy.kind, `detached_embedded_manifest_kind:${policy.kind}`);
  invariant(isDigest(manifest.manifestSha256), `detached_embedded_manifest_checksum_invalid:${policy.kind}`);
  const manifestCore = { ...manifest };
  delete manifestCore.manifestSha256;
  invariant(manifest.manifestSha256 === sha256(canonicalJson(manifestCore)), `detached_embedded_manifest_checksum:${policy.kind}`);
  invariant(manifest.manifestSha256 === receiptArchive.manifestSha256, `detached_receipt_manifest_binding:${policy.kind}`);
  invariant(Array.isArray(manifest.entries), `detached_embedded_manifest_entries:${policy.kind}`);
  invariant(manifest.entries.length === manifest.fileCount, `detached_embedded_manifest_file_count:${policy.kind}`);
  invariant(parsed.entries.length === manifest.fileCount + 1, `detached_archive_manifest_entry_count:${policy.kind}`);
  invariant(manifest.entries.reduce((sum, entry) => sum + entry.byteLength, 0) === manifest.byteLength, `detached_embedded_manifest_byte_length:${policy.kind}`);
  invariant(manifest.pathSetSha256 === sha256(manifest.entries.map((entry) => entry.path).join("\n")), `detached_embedded_manifest_path_set:${policy.kind}`);
  // PASS35 aggregateSha256 binds the richer pre-package inventory rows (which
  // also carry classification/reason fields). Those fields are intentionally
  // not duplicated inside entries, so the detached verifier binds the value
  // through manifestSha256 and independently binds every archived byte below.
  invariant(isDigest(manifest.aggregateSha256), `detached_embedded_manifest_aggregate_invalid:${policy.kind}`);
  invariant(new Set(manifest.entries.map((entry) => entry.path)).size === manifest.entries.length, `detached_embedded_manifest_duplicate:${policy.kind}`);

  const observed = new Map(parsed.entries
    .filter((entry) => entry.path !== policy.manifestPath)
    .map((entry) => [entry.path, entry]));
  invariant(observed.size === manifest.entries.length, `detached_archive_payload_count:${policy.kind}`);
  for (const expected of manifest.entries) {
    const actual = observed.get(expected.path);
    invariant(actual, `detached_archive_payload_missing:${expected.path}`);
    invariant(actual.byteLength === expected.byteLength, `detached_archive_payload_size:${expected.path}`);
    invariant(actual.sha256 === expected.sha256, `detached_archive_payload_sha:${expected.path}`);
    invariant(actual.mode === expected.mode, `detached_archive_payload_mode:${expected.path}`);
  }

  for (const entry of manifest.entries) {
    invariant(typeof entry.role === "string" && entry.role.length > 0, `detached_embedded_manifest_role:${entry.path}`);
    if (policy.kind === "SOURCE_ONLY") {
      invariant(!SOURCE_FORBIDDEN_ROLES.has(entry.role) || SOURCE_ROLE_EXCEPTIONS.has(entry.path), `detached_source_forbidden_role:${entry.path}`);
      invariant(!sourcePathForbidden(entry.path), `detached_source_forbidden_path:${entry.path}`);
    } else {
      invariant(EVIDENCE_ALLOWED_ROLES.has(entry.role), `detached_evidence_role_invalid:${entry.path}`);
      invariant(!evidencePathForbidden(entry.path), `detached_evidence_forbidden_path:${entry.path}`);
    }
  }
  return manifest;
}

function verifyArchive(archivePath, receiptArchive, policy) {
  invariant(path.basename(archivePath) === policy.fileName, `detached_archive_path_filename:${policy.kind}`);
  const metadata = statSync(archivePath);
  invariant(metadata.isFile(), `detached_archive_not_file:${policy.kind}`);
  invariant(metadata.size === receiptArchive.byteLength, `detached_archive_size_mismatch:${policy.kind}`);
  const parsed = parseDeterministicZip(archivePath);
  invariant(parsed.archiveSha256 === receiptArchive.sha256, `detached_archive_sha_mismatch:${policy.kind}`);
  invariant(parsed.byteLength === receiptArchive.byteLength, `detached_archive_bytes_mismatch:${policy.kind}`);
  invariant(parsed.entries.length === receiptArchive.entryCount, `detached_archive_entry_count_mismatch:${policy.kind}`);
  const manifest = validateEmbeddedManifest(parsed, policy, receiptArchive);
  return {
    fileName: policy.fileName,
    sha256: parsed.archiveSha256,
    byteLength: parsed.byteLength,
    entryCount: parsed.entries.length,
    manifestSha256: manifest.manifestSha256,
    candidateId: manifest.candidateId,
    forbiddenPathsAbsent: true,
  };
}

export function packageBindingSha256(receipt) {
  return sha256(canonicalJson({
    schemaVersion: "velmere.pass35.detached-package-binding.v1",
    candidateId: receipt.candidateId,
    sourceArchive: receipt.sourceArchive,
    evidenceArchive: receipt.evidenceArchive,
  }));
}

function signatureBytes(value, label) {
  invariant(typeof value === "string" && /^[A-Za-z0-9+/]+={0,2}$/u.test(value), `detached_${label}_signature_encoding`);
  const bytes = Buffer.from(value, "base64");
  invariant(bytes.length === 64 && bytes.toString("base64") === value, `detached_${label}_signature_length`);
  return bytes;
}

function validateSignatureRecord(record, { label, bindingSha256, identityKey, trustedFingerprints }) {
  if (record === null) return { present: false, valid: false, signerId: null, publicKeyFingerprint: null };
  invariant(isObject(record), `detached_${label}_invalid`);
  invariant(record.scheme === "ED25519_DETACHED_SHA256_BINDING_V1", `detached_${label}_scheme`);
  invariant(typeof record[identityKey] === "string" && record[identityKey].trim().length >= 3, `detached_${label}_identity`);
  invariant(record.signedPackageBindingSha256 === bindingSha256, `detached_${label}_binding`);
  invariant(typeof record.publicKeyPem === "string" && record.publicKeyPem.includes("BEGIN PUBLIC KEY"), `detached_${label}_public_key`);
  let publicKey;
  try { publicKey = createPublicKey(record.publicKeyPem); }
  catch { throw new Error(`detached_${label}_public_key_parse`); }
  invariant(publicKey.asymmetricKeyType === "ed25519", `detached_${label}_key_type`);
  const signature = signatureBytes(record.signatureBase64, label);
  invariant(verifySignature(null, Buffer.from(bindingSha256, "ascii"), publicKey, signature), `detached_${label}_signature_invalid`);
  const publicKeyFingerprint = sha256(publicKey.export({ type: "spki", format: "der" }));
  invariant(trustedFingerprints.includes(publicKeyFingerprint), `detached_${label}_trust_anchor_missing`);
  return {
    present: true,
    valid: true,
    signerId: record[identityKey],
    publicKeyFingerprint,
  };
}

export function verifyDetachedPackageSet({ receiptPath, sourceArchivePath = null, evidenceArchivePath = null, policy = null }) {
  const activePolicy = validateVerificationPolicy(policy ?? loadDetachedVerificationPolicy());
  const absoluteReceipt = path.resolve(receiptPath);
  let receipt;
  try { receipt = JSON.parse(readFileSync(absoluteReceipt, "utf8")); }
  catch { throw new Error("detached_receipt_json_invalid"); }
  validateReceipt(receipt);
  const directory = path.dirname(absoluteReceipt);
  const sourcePath = path.resolve(sourceArchivePath ?? path.join(directory, receipt.sourceArchive.fileName));
  const evidencePath = path.resolve(evidenceArchivePath ?? path.join(directory, receipt.evidenceArchive.fileName));
  const sourceArchive = verifyArchive(sourcePath, receipt.sourceArchive, ARCHIVE_POLICY.source);
  const evidenceArchive = verifyArchive(evidencePath, receipt.evidenceArchive, ARCHIVE_POLICY.evidence);
  const bindingSha256 = packageBindingSha256(receipt);
  const organizationalSignature = validateSignatureRecord(receipt.organizationalSignature, {
    label: "organizational_signature",
    bindingSha256,
    identityKey: "signerId",
    trustedFingerprints: activePolicy.trustedOrganizationalKeyFingerprints,
  });
  const independentVerifier = validateSignatureRecord(receipt.independentVerifier, {
    label: "independent_verifier",
    bindingSha256,
    identityKey: "verifierId",
    trustedFingerprints: activePolicy.trustedIndependentVerifierKeyFingerprints,
  });
  if (independentVerifier.present) {
    invariant(receipt.independentVerifier.organizationIndependent === true, "detached_independent_verifier_not_independent");
    invariant(independentVerifier.publicKeyFingerprint !== organizationalSignature.publicKeyFingerprint, "detached_independent_verifier_key_reuse");
  }
  const signaturesValid = organizationalSignature.valid && independentVerifier.valid;
  invariant(!receipt.promotionAllowed || signaturesValid, "detached_receipt_promotion_claim_unproven");
  invariant(!receipt.promotionAllowed || receipt.status === SIGNED_PROMOTION_STATUS, "detached_receipt_promotion_status_mismatch");
  invariant(receipt.status !== SIGNED_PROMOTION_STATUS || signaturesValid, "detached_receipt_signed_status_unproven");
  const promotionAllowed = receipt.promotionAllowed && receipt.status === SIGNED_PROMOTION_STATUS && signaturesValid;
  const blockers = [];
  if (!organizationalSignature.valid) blockers.push("organizational_signature_missing");
  if (!independentVerifier.valid) blockers.push("independent_verifier_missing");
  if (!receipt.promotionAllowed) blockers.push("receipt_promotion_not_allowed");
  if (receipt.status !== SIGNED_PROMOTION_STATUS) blockers.push("signed_promotion_status_missing");
  return {
    schemaVersion: DETACHED_VERIFICATION_SCHEMA,
    candidateId: receipt.candidateId,
    status: promotionAllowed ? "PASS_PROMOTION_PREREQUISITES" : "PASS_COHERENT_NO_PROMOTION",
    coherent: true,
    promotionAllowed,
    packageBindingSha256: bindingSha256,
    sourceArchive,
    evidenceArchive,
    organizationalSignature,
    independentVerifier,
    blockers,
    limitationsPreserved: receipt.limitations ?? [],
  };
}

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  invariant(value && !value.startsWith("--"), `detached_argument_missing:${name}`);
  return value;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const receiptPath = argument("--receipt", path.resolve(process.cwd(), "../deliverables/PASS35_DETACHED_PACKAGE_RECEIPT.json"));
  const verification = verifyDetachedPackageSet({
    receiptPath,
    sourceArchivePath: argument("--source"),
    evidenceArchivePath: argument("--evidence"),
    policy: argument("--policy")
      ? JSON.parse(readFileSync(path.resolve(argument("--policy")), "utf8"))
      : null,
  });
  const output = argument("--output");
  if (output) writeFileSync(path.resolve(output), `${JSON.stringify(verification, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(verification, null, 2));
}
