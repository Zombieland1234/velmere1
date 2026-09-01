#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { canonicalJson, sha256, writeDeterministicZip } from "../pass4826/release-package-contract.mjs";
import {
  DETACHED_RECEIPT_SCHEMA,
  EXPECTED_CANDIDATE_ID,
  SIGNED_PROMOTION_STATUS,
  loadDetachedVerificationPolicy,
  packageBindingSha256,
  verifyDetachedPackageSet,
} from "./detached-package-verifier.mjs";

const SOURCE_NAME = "VELMERE_PASS35_OFFLINE_CANDIDATE_SOURCE_ONLY.zip";
const EVIDENCE_NAME = "VELMERE_PASS35_EVIDENCE_HISTORY.zip";

function manifest(kind, rows, candidateId = EXPECTED_CANDIDATE_ID) {
  const entries = rows.map(({ path: entryPath, role, content, mode }) => ({
    path: entryPath,
    role,
    byteLength: content.length,
    sha256: sha256(content),
    mode,
  }));
  const core = {
    schemaVersion: `velmere.pass35.${kind.toLowerCase()}-manifest.v1`,
    candidateId,
    kind,
    fileCount: entries.length,
    byteLength: entries.reduce((sum, entry) => sum + entry.byteLength, 0),
    pathSetSha256: sha256(entries.map((entry) => entry.path).join("\n")),
    aggregateSha256: sha256(canonicalJson(entries)),
    entries,
    selfReferenceBoundary: "fixture manifest excludes itself",
  };
  return { ...core, manifestSha256: sha256(canonicalJson(core)) };
}

function writeArchive(directory, name, kind, manifestPath, rows, candidateId = EXPECTED_CANDIDATE_ID) {
  const embedded = manifest(kind, rows, candidateId);
  const result = writeDeterministicZip(path.join(directory, name), [
    ...rows.map((entry) => ({ path: entry.path, content: entry.content, mode: entry.mode })),
    { path: manifestPath, content: Buffer.from(`${JSON.stringify(embedded, null, 2)}\n`), mode: 0o100644 },
  ]);
  return { result, embedded };
}

function sealReceipt(receipt) {
  const core = { ...receipt };
  delete core.receiptSha256;
  return { ...core, receiptSha256: sha256(canonicalJson(core)) };
}

function fixture({ sourceRows = null, sourceCandidateId = EXPECTED_CANDIDATE_ID } = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "velmere-pass35-detached-"));
  const source = writeArchive(
    directory,
    SOURCE_NAME,
    "SOURCE_ONLY",
    "_velmere/PASS35_SOURCE_ONLY_MANIFEST.json",
    sourceRows ?? [{ path: "app/index.ts", role: "ACTIVE_SOURCE", content: Buffer.from("export {};\n"), mode: 0o100644 }],
    sourceCandidateId,
  );
  const evidence = writeArchive(
    directory,
    EVIDENCE_NAME,
    "EVIDENCE_HISTORY",
    "_velmere/PASS35_EVIDENCE_HISTORY_MANIFEST.json",
    [{ path: "artifacts/history.json", role: "HISTORY", content: Buffer.from("{}\n"), mode: 0o100644 }],
  );
  let receipt = sealReceipt({
    schemaVersion: DETACHED_RECEIPT_SCHEMA,
    candidateId: EXPECTED_CANDIDATE_ID,
    generatedAt: "2026-07-22T00:00:00.000Z",
    status: "PASS_LOCAL_DETERMINISTIC_PACKAGING",
    promotionAllowed: false,
    sourceArchive: {
      fileName: SOURCE_NAME,
      sha256: source.result.sha256,
      byteLength: source.result.byteLength,
      entryCount: source.result.entryCount,
      manifestSha256: source.embedded.manifestSha256,
      canonicalManifestProfile: "source-package",
      canonicalManifestSetSha256: sha256("fixture-source-package-manifest-set"),
      unpackedSelfVerificationCommand: "npm run pass35:verify-manifests",
      unpackedSelfVerificationExpectedStatus: "PASS_LOCAL_SOURCE_PACKAGE_MANIFEST_SET_NO_PROMOTION",
    },
    evidenceArchive: {
      fileName: EVIDENCE_NAME,
      sha256: evidence.result.sha256,
      byteLength: evidence.result.byteLength,
      entryCount: evidence.result.entryCount,
      manifestSha256: evidence.embedded.manifestSha256,
    },
    sourceContainsNodeModules: false,
    sourceContainsNextBuild: false,
    sourceContainsHistoricalArtifacts: false,
    sourceContainsCanonicalManifestSet: true,
    sourceSupplementalCanonicalMetadata: [],
    sourceSupplementalControlMetadata: [],
    organizationalSignature: null,
    independentVerifier: null,
    limitations: ["fixture is not production proof"],
  });
  const receiptPath = path.join(directory, "PASS35_DETACHED_PACKAGE_RECEIPT.json");
  const persist = () => writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  persist();
  return {
    directory,
    receiptPath,
    sourcePath: path.join(directory, SOURCE_NAME),
    evidencePath: path.join(directory, EVIDENCE_NAME),
    get receipt() { return receipt; },
    replaceReceipt(value) { receipt = value; persist(); },
  };
}

function verify(current, policy = null) {
  return verifyDetachedPackageSet({ receiptPath: current.receiptPath, policy });
}

function cleanup(current) {
  rmSync(current.directory, { recursive: true, force: true });
}

function publicPem(publicKey) {
  return publicKey.export({ type: "spki", format: "pem" });
}

function keyFingerprint(publicKey) {
  return createHash("sha256").update(publicKey.export({ type: "spki", format: "der" })).digest("hex");
}

function trustedPolicy(organization, independent) {
  return {
    ...loadDetachedVerificationPolicy(),
    trustedOrganizationalKeyFingerprints: [keyFingerprint(organization.publicKey)],
    trustedIndependentVerifierKeyFingerprints: [keyFingerprint(independent.publicKey)],
  };
}

function signatureRecord(identityKey, identity, keyPair, binding, extra = {}) {
  return {
    scheme: "ED25519_DETACHED_SHA256_BINDING_V1",
    [identityKey]: identity,
    signedPackageBindingSha256: binding,
    publicKeyPem: publicPem(keyPair.publicKey),
    signatureBase64: sign(null, Buffer.from(binding, "ascii"), keyPair.privateKey).toString("base64"),
    ...extra,
  };
}

test("unsigned local package is coherent but cannot promote", () => {
  const current = fixture();
  try {
    const result = verify(current);
    assert.equal(result.status, "PASS_COHERENT_NO_PROMOTION");
    assert.equal(result.coherent, true);
    assert.equal(result.promotionAllowed, false);
    assert.deepEqual(result.blockers, [
      "organizational_signature_missing",
      "independent_verifier_missing",
      "receipt_promotion_not_allowed",
      "signed_promotion_status_missing",
    ]);
  } finally { cleanup(current); }
});

test("receipt byte mutation is rejected by its detached checksum", () => {
  const current = fixture();
  try {
    const receipt = JSON.parse(readFileSync(current.receiptPath, "utf8"));
    receipt.generatedAt = "2026-07-23T00:00:00.000Z";
    current.replaceReceipt(receipt);
    assert.throws(() => verify(current), /detached_receipt_checksum_mismatch/u);
  } finally { cleanup(current); }
});

test("receipt SHA, size, and entry-count mutations fail closed", async (context) => {
  for (const [name, mutate, expected] of [
    ["sha", (receipt) => { receipt.sourceArchive.sha256 = "f".repeat(64); }, /detached_archive_sha_mismatch/u],
    ["size", (receipt) => { receipt.sourceArchive.byteLength += 1; }, /detached_archive_size_mismatch/u],
    ["count", (receipt) => { receipt.sourceArchive.entryCount += 1; }, /detached_archive_entry_count_mismatch/u],
  ]) {
    await context.test(name, () => {
      const current = fixture();
      try {
        const receipt = structuredClone(current.receipt);
        mutate(receipt);
        current.replaceReceipt(sealReceipt(receipt));
        assert.throws(() => verify(current), expected);
      } finally { cleanup(current); }
    });
  }
});

test("archive byte mutation is rejected by ZIP CRC/content validation", () => {
  const current = fixture();
  try {
    const bytes = readFileSync(current.sourcePath);
    const offset = bytes.indexOf(Buffer.from("export {};\n"));
    assert.ok(offset >= 0);
    bytes[offset] ^= 1;
    writeFileSync(current.sourcePath, bytes);
    assert.throws(() => verify(current), /release_zip_crc_mismatch/u);
  } finally { cleanup(current); }
});

test("embedded candidate mismatch is rejected even when ZIP and receipt hashes are resealed", () => {
  const current = fixture({ sourceCandidateId: "VELMERE_OTHER_CANDIDATE" });
  try {
    assert.throws(() => verify(current), /detached_embedded_manifest_candidate:SOURCE_ONLY/u);
  } finally { cleanup(current); }
});

test("receipt candidate mutation is rejected even after recomputing the receipt checksum", () => {
  const current = fixture();
  try {
    const receipt = structuredClone(current.receipt);
    receipt.candidateId = "VELMERE_OTHER_CANDIDATE";
    current.replaceReceipt(sealReceipt(receipt));
    assert.throws(() => verify(current), /detached_receipt_candidate_mismatch/u);
  } finally { cleanup(current); }
});

test("history/quarantine content cannot be smuggled into SOURCE_ONLY", () => {
  const current = fixture({
    sourceRows: [{ path: "history/retired.txt", role: "HISTORY", content: Buffer.from("retired\n"), mode: 0o100644 }],
  });
  try {
    assert.throws(() => verify(current), /detached_source_forbidden_role|detached_source_forbidden_path/u);
  } finally { cleanup(current); }
});

test("a syntactically present but invalid signature cannot enable promotion", () => {
  const current = fixture();
  try {
    const organization = generateKeyPairSync("ed25519");
    const independent = generateKeyPairSync("ed25519");
    const receipt = structuredClone(current.receipt);
    const binding = packageBindingSha256(receipt);
    receipt.status = SIGNED_PROMOTION_STATUS;
    receipt.promotionAllowed = true;
    receipt.organizationalSignature = signatureRecord("signerId", "release-board", organization, binding);
    receipt.independentVerifier = signatureRecord("verifierId", "external-reviewer", independent, binding, { organizationIndependent: true });
    receipt.independentVerifier.signatureBase64 = Buffer.alloc(64).toString("base64");
    current.replaceReceipt(sealReceipt(receipt));
    assert.throws(() => verify(current, trustedPolicy(organization, independent)), /detached_independent_verifier_signature_invalid/u);
  } finally { cleanup(current); }
});

test("organizational and independent Ed25519 signatures over exact package binding unlock only promotion prerequisites", () => {
  const current = fixture();
  try {
    const organization = generateKeyPairSync("ed25519");
    const independent = generateKeyPairSync("ed25519");
    const receipt = structuredClone(current.receipt);
    const binding = packageBindingSha256(receipt);
    receipt.status = SIGNED_PROMOTION_STATUS;
    receipt.promotionAllowed = true;
    receipt.organizationalSignature = signatureRecord("signerId", "release-board", organization, binding);
    receipt.independentVerifier = signatureRecord("verifierId", "external-reviewer", independent, binding, { organizationIndependent: true });
    current.replaceReceipt(sealReceipt(receipt));
    const result = verify(current, trustedPolicy(organization, independent));
    assert.equal(result.status, "PASS_PROMOTION_PREREQUISITES");
    assert.equal(result.promotionAllowed, true);
    assert.deepEqual(result.blockers, []);
    assert.equal(result.organizationalSignature.valid, true);
    assert.equal(result.independentVerifier.valid, true);
  } finally { cleanup(current); }
});

test("locally generated self-signed keys are rejected when no external trust anchors are provisioned", () => {
  const current = fixture();
  try {
    const organization = generateKeyPairSync("ed25519");
    const independent = generateKeyPairSync("ed25519");
    const receipt = structuredClone(current.receipt);
    const binding = packageBindingSha256(receipt);
    receipt.status = SIGNED_PROMOTION_STATUS;
    receipt.promotionAllowed = true;
    receipt.organizationalSignature = signatureRecord("signerId", "local-release-board", organization, binding);
    receipt.independentVerifier = signatureRecord("verifierId", "local-reviewer", independent, binding, { organizationIndependent: true });
    current.replaceReceipt(sealReceipt(receipt));
    assert.throws(() => verify(current), /detached_organizational_signature_trust_anchor_missing/u);
  } finally { cleanup(current); }
});

test("independent verifier cannot reuse the organizational signing key", () => {
  const current = fixture();
  try {
    const shared = generateKeyPairSync("ed25519");
    const receipt = structuredClone(current.receipt);
    const binding = packageBindingSha256(receipt);
    receipt.status = SIGNED_PROMOTION_STATUS;
    receipt.promotionAllowed = true;
    receipt.organizationalSignature = signatureRecord("signerId", "release-board", shared, binding);
    receipt.independentVerifier = signatureRecord("verifierId", "not-independent", shared, binding, { organizationIndependent: true });
    current.replaceReceipt(sealReceipt(receipt));
    assert.throws(() => verify(current, trustedPolicy(shared, shared)), /detached_independent_verifier_key_reuse/u);
  } finally { cleanup(current); }
});

test("promotionAllowed cannot be asserted under the local-only status", () => {
  const current = fixture();
  try {
    const organization = generateKeyPairSync("ed25519");
    const independent = generateKeyPairSync("ed25519");
    const receipt = structuredClone(current.receipt);
    const binding = packageBindingSha256(receipt);
    receipt.promotionAllowed = true;
    receipt.organizationalSignature = signatureRecord("signerId", "release-board", organization, binding);
    receipt.independentVerifier = signatureRecord("verifierId", "external-reviewer", independent, binding, { organizationIndependent: true });
    current.replaceReceipt(sealReceipt(receipt));
    assert.throws(() => verify(current, trustedPolicy(organization, independent)), /detached_receipt_promotion_status_mismatch/u);
  } finally { cleanup(current); }
});
