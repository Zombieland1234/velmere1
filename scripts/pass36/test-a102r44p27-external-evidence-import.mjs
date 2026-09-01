#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createEnvelope, publicKeyRecord, sha256 } from "./a102r44p27-trusted-external-evidence-lib.mjs";
import { readAdmissionSnapshot } from "./a102r44p27-external-evidence-admission-journal.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const revision = "VELMERE_PASS36_A102R44P27_ACTION_REQUIRED_DURABLE_EXTERNAL_EVIDENCE_REPLAY_JOURNAL_ATOMIC_ADMISSION_AND_ENVELOPE_TIME_HARDENING_NO_LIVE_CREDIT";
const source = "d".repeat(64);
const semanticPolicyTemplate = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p27-staging-semantic-policy.json"), "utf8"));
const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const keyId = "test-external-key-0001";

function makeSemanticClaims(now) {
  const artifactHash = "0".repeat(64);
  const makeRow = (caseId, actual = "PASS", extra = {}) => ({
    caseId,
    expected: actual,
    actual,
    artifactPath: `receipts/${caseId}.json`,
    artifactSha256: artifactHash,
    artifactBytes: 0,
    ...extra,
  });
  const tracks = {};
  for (const [trackId, policy] of Object.entries(semanticPolicyTemplate.tracks)) {
    tracks[trackId] = { rows: policy.requiredCaseIds.map((caseId) => makeRow(caseId)) };
  }
  tracks.RLS_19.rows = tracks.RLS_19.rows.map((row, index) => {
    const denied = row.caseId.includes("deny") || row.caseId.includes("revoked");
    const isOperator = row.caseId.startsWith("operator");
    const isCrossTenant = row.caseId.startsWith("cross-tenant") || row.caseId === "operator-cross-tenant-deny";
    const subjectTenantHash = index % 2 === 0 ? "tenant-a" : "tenant-b";
    const resourceTenantHash = isCrossTenant ? (subjectTenantHash === "tenant-a" ? "tenant-b" : "tenant-a") : subjectTenantHash;
    return {
      ...row,
      expected: denied ? "DENY" : "ALLOW",
      actual: denied ? "DENY" : "ALLOW",
      subjectTenantHash,
      resourceTenantHash,
      role: isOperator ? "operator" : "owner",
    };
  });
  tracks.STRIPE_TEST_12.rows = tracks.STRIPE_TEST_12.rows.map((row, index) => ({
    ...row,
    expected: row.caseId === "replay-rejected" ? "DENY" : "PASS",
    actual: row.caseId === "replay-rejected" ? "DENY" : "PASS",
    mode: "TEST",
    eventId: `evt_test_${String(index).padStart(3, "0")}`,
    amount: 4999,
    currency: "eur",
  }));
  tracks.STORAGE_KMS_EMAIL_10.rows = tracks.STORAGE_KMS_EMAIL_10.rows.map((row) => ({
    ...row,
    expected: row.caseId === "wrong-account-denied" ? "DENY" : "PASS",
    actual: row.caseId === "wrong-account-denied" ? "DENY" : "PASS",
    contextSha256: "a".repeat(64),
    inboxProof: false,
  }));
  tracks.BACKUP_RESTORE_10.rows = tracks.BACKUP_RESTORE_10.rows.map((row) => ({
    ...row,
    ...(row.caseId === "independent-backup-verifier" ? { independent: true } : {}),
    ...(row.caseId === "restored-rls19" ? { rlsCases: 19 } : {}),
  }));
  tracks.INCIDENT_8.rows = tracks.INCIDENT_8.rows.map((row) => ({
    ...row,
    ...(row.caseId === "customer-communication-pl-en-de" ? { locales: ["pl", "en", "de"] } : {}),
  }));
  const base = now.getTime() - 80 * 60 * 60 * 1000;
  tracks.TIMEBOUND_72H_3 = {
    clockMode: "REAL_WALL_CLOCK",
    rows: semanticPolicyTemplate.tracks.TIMEBOUND_72H_3.requiredCaseIds.map((caseId, index) => makeRow(caseId, "PASS", {
      observedAt: new Date(base + index * 39.5 * 60 * 60 * 1000).toISOString(),
    })),
  };
  const artifacts = Object.values(tracks).flatMap((track) => track.rows.map((row) => ({
    path: row.artifactPath,
    sha256: row.artifactSha256,
    byteLength: row.artifactBytes,
  })));
  return {
    programId: "program-r44p27-0001",
    executionId: "execution-r44p27-0001",
    syntheticFixture: false,
    tracks,
    artifacts,
  };
}

function setup({ evidenceId = "r44p27-evidence-0001", nonce = "nonce-r44p27-0001", executionId = "execution-r44p27-0001" } = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p27-import-"));
  const artifactRoot = path.join(temp, "artifacts");
  const admissionRoot = path.join(temp, "admission");
  fs.mkdirSync(path.join(artifactRoot, "receipts"), { recursive: true, mode: 0o700 });
  const now = new Date();
  const claims = makeSemanticClaims(now);
  claims.executionId = executionId;
  const semanticRows = Object.values(claims.tracks).flatMap((track) => track.rows);
  for (const row of semanticRows) {
    const full = path.join(artifactRoot, row.artifactPath);
    const bytes = Buffer.from(`${JSON.stringify({ caseId: row.caseId, actual: row.actual })}\n`, "utf8");
    fs.writeFileSync(full, bytes, { mode: 0o600 });
    row.artifactSha256 = sha256(bytes);
    row.artifactBytes = bytes.length;
  }
  claims.artifacts = semanticRows.map((row) => ({ path: row.artifactPath, sha256: row.artifactSha256, byteLength: row.artifactBytes }));
  const trust = {
    requiredAlgorithm: "Ed25519",
    allowEmbeddedPublicKeyAuthority: false,
    productionTrustedKeys: [publicKeyRecord({
      keyId,
      publicKey,
      validFrom: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    })],
  };
  const semanticPolicy = { ...semanticPolicyTemplate, revisionId: revision };
  const admissionPolicy = {
    schemaVersion: "velmere.pass36.a102r44p27.external-evidence-admission-policy.v1",
    revisionId: revision,
    sourceBinding: {
      providedAtRuntime: true,
      exactSha256Required: true,
      selfReferenceForbidden: true,
    },
    envelope: { maximumAgeMs: 600000, maximumLifetimeMs: 600000 },
    replayJournal: {
      required: true,
      atomicCommitRequired: true,
      singleWriterLockRequired: true,
      storeRawEvidenceIdOrNonce: false,
      maximumEntries: 100000,
      maximumEntryBytes: 131072,
      maximumLockWaitMs: 10000,
    },
  };
  const envelope = createEnvelope({
    claims,
    privateKey,
    keyId,
    revisionId: revision,
    sourceManifestSha256: source,
    evidenceId,
    nonce,
    observedAt: new Date(now.getTime() - 60_000).toISOString(),
    expiresAt: new Date(now.getTime() + 4 * 60_000).toISOString(),
  });
  for (const [name, value] of [
    ["envelope.json", envelope],
    ["trust.json", trust],
    ["semantic.json", semanticPolicy],
    ["admission.json", admissionPolicy],
  ]) fs.writeFileSync(path.join(temp, name), `${JSON.stringify(value)}\n`, { mode: 0o600 });
  return { temp, artifactRoot, admissionRoot, claims };
}

function run(setupResult) {
  return spawnSync(process.execPath, [
    "scripts/pass36/a102r44p27-import-external-staging-evidence.mjs",
    "--envelope", path.join(setupResult.temp, "envelope.json"),
    "--trust-policy", path.join(setupResult.temp, "trust.json"),
    "--semantic-policy", path.join(setupResult.temp, "semantic.json"),
    "--admission-policy", path.join(setupResult.temp, "admission.json"),
    "--artifact-root", setupResult.artifactRoot,
    "--admission-root", setupResult.admissionRoot,
    "--expected-revision", revision,
    "--expected-source", source,
  ], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 64 * 1024 * 1024,
  });
}

const rows = [];
function check(id, callback) {
  callback();
  rows.push({ id, ok: true });
}

const first = setup();
try {
  check("valid-first-admission", () => {
    const result = run(first);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.acceptedForIndependentReview, true);
    assert.equal(parsed.durableAdmission.sequenceAfter, 1);
    assert.equal(parsed.artifactVerification.exactSemanticArtifactBijection, true);
  });
  check("same-envelope-replay-rejected", () => {
    const result = run(first);
    assert.equal(result.status, 4);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.durableAdmission.error, /admission_evidence_replay/u);
  });

  const sameNonce = setup({ evidenceId: "r44p27-evidence-0002", nonce: "nonce-r44p27-0001", executionId: "execution-r44p27-0002" });
  try {
    fs.rmSync(sameNonce.admissionRoot, { recursive: true, force: true });
    fs.cpSync(first.admissionRoot, sameNonce.admissionRoot, { recursive: true, preserveTimestamps: true });
    check("nonce-replay-rejected", () => {
      const result = run(sameNonce);
      assert.equal(result.status, 4);
      const parsed = JSON.parse(result.stdout);
      assert.match(parsed.durableAdmission.error, /admission_nonce_replay/u);
    });
  } finally { fs.rmSync(sameNonce.temp, { recursive: true, force: true }); }

  const tampered = setup({ evidenceId: "r44p27-evidence-0003", nonce: "nonce-r44p27-0003", executionId: "execution-r44p27-0003" });
  try {
    fs.rmSync(tampered.admissionRoot, { recursive: true, force: true });
    fs.cpSync(first.admissionRoot, tampered.admissionRoot, { recursive: true, preserveTimestamps: true });
    fs.appendFileSync(path.join(tampered.artifactRoot, tampered.claims.artifacts[0].path), "tamper");
    check("artifact-tamper-no-journal-mutation", () => {
      const result = run(tampered);
      assert.equal(result.status, 3);
      const policyBytes = fs.readFileSync(path.join(tampered.temp, "admission.json"));
      const snapshot = readAdmissionSnapshot({
        sourceRoot: root,
        admissionRoot: tampered.admissionRoot,
        revisionId: revision,
        sourceManifestSha256: source,
        policySha256: sha256(policyBytes),
        allowUninitialized: false,
      });
      assert.equal(snapshot.sequence, 1);
    });
  } finally { fs.rmSync(tampered.temp, { recursive: true, force: true }); }

  const missingIndex = setup({ evidenceId: "r44p27-evidence-0004", nonce: "nonce-r44p27-0004", executionId: "execution-r44p27-0004" });
  try {
    fs.rmSync(missingIndex.admissionRoot, { recursive: true, force: true });
    fs.cpSync(first.admissionRoot, missingIndex.admissionRoot, { recursive: true, preserveTimestamps: true });
    const envelopePath = path.join(missingIndex.temp, "envelope.json");
    const envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));
    envelope.claims.artifacts.pop();
    // Re-sign after the intentional structural mutation.
    const updated = createEnvelope({
      claims: envelope.claims,
      privateKey,
      keyId,
      revisionId: revision,
      sourceManifestSha256: source,
      evidenceId: envelope.evidenceId,
      nonce: envelope.nonce,
      observedAt: envelope.observedAt,
      expiresAt: envelope.expiresAt,
    });
    fs.writeFileSync(envelopePath, `${JSON.stringify(updated)}\n`);
    check("missing-artifact-index-row-rejected", () => {
      const result = run(missingIndex);
      assert.equal(result.status, 3);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.artifactVerification.exactSemanticArtifactBijection, false);
    });
  } finally { fs.rmSync(missingIndex.temp, { recursive: true, force: true }); }

  const extraIndex = setup({ evidenceId: "r44p27-evidence-0005", nonce: "nonce-r44p27-0005", executionId: "execution-r44p27-0005" });
  try {
    fs.rmSync(extraIndex.admissionRoot, { recursive: true, force: true });
    fs.cpSync(first.admissionRoot, extraIndex.admissionRoot, { recursive: true, preserveTimestamps: true });
    const extraPath = path.join(extraIndex.artifactRoot, "receipts/extra.json");
    const extraBytes = Buffer.from("{}\n");
    fs.writeFileSync(extraPath, extraBytes);
    const envelopePath = path.join(extraIndex.temp, "envelope.json");
    const envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));
    envelope.claims.artifacts.push({ path: "receipts/extra.json", sha256: sha256(extraBytes), byteLength: extraBytes.length });
    const updated = createEnvelope({
      claims: envelope.claims,
      privateKey,
      keyId,
      revisionId: revision,
      sourceManifestSha256: source,
      evidenceId: envelope.evidenceId,
      nonce: envelope.nonce,
      observedAt: envelope.observedAt,
      expiresAt: envelope.expiresAt,
    });
    fs.writeFileSync(envelopePath, `${JSON.stringify(updated)}\n`);
    check("extra-artifact-index-row-rejected", () => {
      const result = run(extraIndex);
      assert.equal(result.status, 3);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.artifactVerification.exactSemanticArtifactBijection, false);
    });
  } finally { fs.rmSync(extraIndex.temp, { recursive: true, force: true }); }

  const second = setup({ evidenceId: "r44p27-evidence-0006", nonce: "nonce-r44p27-0006", executionId: "execution-r44p27-0006" });
  try {
    fs.rmSync(second.admissionRoot, { recursive: true, force: true });
    fs.cpSync(first.admissionRoot, second.admissionRoot, { recursive: true, preserveTimestamps: true });
    check("second-distinct-admission", () => {
      const result = run(second);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.durableAdmission.sequenceAfter, 2);
    });
  } finally { fs.rmSync(second.temp, { recursive: true, force: true }); }

  console.log(JSON.stringify({
    schemaVersion: "velmere.pass36.a102r44p27.external-evidence-import-test.v1",
    status: "PASS",
    checks: rows.length,
    passed: rows.length,
    failed: 0,
    rows,
  }, null, 2));
} finally {
  fs.rmSync(first.temp, { recursive: true, force: true });
}
