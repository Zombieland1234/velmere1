#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  commitEvidenceAdmission,
  readAdmissionSnapshot,
  resolveAdmissionCoordinates,
} from "./a102r44p27-external-evidence-admission-journal.mjs";

const revision = "VELMERE_PASS36_A102R44P27_ACTION_REQUIRED_DURABLE_EXTERNAL_EVIDENCE_REPLAY_JOURNAL_ATOMIC_ADMISSION_AND_ENVELOPE_TIME_HARDENING_NO_LIVE_CREDIT";
const source = "a".repeat(64);
const policy = "b".repeat(64);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p27-journal-"));
const sourceRoot = path.join(temp, "source");
const admissionRoot = path.join(temp, "admission");
fs.mkdirSync(sourceRoot, { mode: 0o700 });
fs.writeFileSync(path.join(sourceRoot, "sentinel.txt"), "source", { mode: 0o600 });
const rows = [];
const pass = (id) => rows.push({ id, ok: true });
const base = {
  sourceRoot,
  admissionRoot,
  revisionId: revision,
  sourceManifestSha256: source,
  policySha256: policy,
  envelopeSha256: "c".repeat(64),
  payloadSha256: "d".repeat(64),
  keyId: "trusted-key-0001",
  programId: "program-0001",
  executionId: "execution-0001",
  observedAt: "2026-08-07T11:59:00.000Z",
  now: new Date("2026-08-07T12:00:00.000Z"),
};

try {
  const before = readAdmissionSnapshot({
    sourceRoot,
    admissionRoot,
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
  });
  assert.equal(before.sequence, 0);
  assert.equal(before.initialized, false);
  pass("uninitialized-empty-snapshot");

  const first = commitEvidenceAdmission({
    ...base,
    evidenceId: "evidence-0001",
    nonce: "nonce-0001",
  });
  assert.equal(first.sequence, 1);
  assert.equal(first.rawIdentifiersStored, false);
  pass("first-commit");

  const afterFirst = readAdmissionSnapshot({
    sourceRoot,
    admissionRoot,
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
    allowUninitialized: false,
  });
  assert.equal(afterFirst.sequence, 1);
  assert.equal(afterFirst.finalDigest, first.entryDigest);
  pass("first-snapshot-chain");

  assert.throws(() => commitEvidenceAdmission({
    ...base,
    evidenceId: "evidence-0001",
    nonce: "nonce-0002",
  }), /admission_evidence_replay/u);
  pass("duplicate-evidence-id-rejected");

  assert.throws(() => commitEvidenceAdmission({
    ...base,
    evidenceId: "evidence-0002",
    nonce: "nonce-0001",
  }), /admission_nonce_replay/u);
  pass("duplicate-nonce-rejected");

  const second = commitEvidenceAdmission({
    ...base,
    evidenceId: "evidence-0002",
    nonce: "nonce-0002",
    envelopeSha256: "e".repeat(64),
    payloadSha256: "f".repeat(64),
    executionId: "execution-0002",
  });
  assert.equal(second.sequence, 2);
  pass("second-distinct-commit");

  const snapshot = readAdmissionSnapshot({
    sourceRoot,
    admissionRoot,
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
    allowUninitialized: false,
  });
  assert.equal(snapshot.sequence, 2);
  assert.equal(snapshot.entries[1].previousDigest, snapshot.entries[0].digest);
  assert.equal(snapshot.entries[1].digest, second.entryDigest);
  pass("two-entry-hash-chain");

  const coordinates = resolveAdmissionCoordinates({
    sourceRoot,
    admissionRoot,
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
  });
  const files = fs.readdirSync(coordinates.entries).sort();
  assert.equal(files.length, 2);
  const bytes = files.map((name) => fs.readFileSync(path.join(coordinates.entries, name), "utf8")).join("\n");
  assert.equal(bytes.includes("evidence-0001"), false);
  assert.equal(bytes.includes("nonce-0001"), false);
  assert.equal(bytes.includes("program-0001"), false);
  assert.equal(bytes.includes("execution-0001"), false);
  pass("raw-identifiers-not-stored");

  if (process.platform !== "win32") {
    const rootMode = fs.lstatSync(coordinates.admissionRoot).mode & 0o777;
    const namespaceMode = fs.lstatSync(coordinates.namespace).mode & 0o777;
    const entryMode = fs.lstatSync(path.join(coordinates.entries, files[0])).mode & 0o777;
    assert.equal(rootMode, 0o700);
    assert.equal(namespaceMode, 0o700);
    assert.equal(entryMode, 0o600);
    pass("private-permissions");
  }

  const originalEntry = fs.readFileSync(path.join(coordinates.entries, files[0]));
  fs.appendFileSync(path.join(coordinates.entries, files[0]), " ");
  assert.throws(() => readAdmissionSnapshot({
    sourceRoot,
    admissionRoot,
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
    allowUninitialized: false,
  }), /strict_json_invalid|admission_entry_digest_invalid|admission_entry_noncanonical_bytes/u);
  fs.writeFileSync(path.join(coordinates.entries, files[0]), originalEntry, { mode: 0o600 });
  pass("tampered-entry-rejected");

  fs.writeFileSync(path.join(coordinates.entries, ".orphan.tmp"), "orphan", { mode: 0o600 });
  assert.throws(() => readAdmissionSnapshot({
    sourceRoot,
    admissionRoot,
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
    allowUninitialized: false,
  }), /admission_entries_unexpected_file/u);
  fs.unlinkSync(path.join(coordinates.entries, ".orphan.tmp"));
  pass("orphan-temp-fails-closed");

  fs.writeFileSync(path.join(coordinates.namespace, "unexpected.txt"), "x", { mode: 0o600 });
  assert.throws(() => readAdmissionSnapshot({
    sourceRoot,
    admissionRoot,
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
    allowUninitialized: false,
  }), /admission_namespace_unexpected_file/u);
  fs.unlinkSync(path.join(coordinates.namespace, "unexpected.txt"));
  pass("unexpected-namespace-file-rejected");

  fs.writeFileSync(coordinates.lockPath, "{}\n", { mode: 0o600 });
  assert.throws(() => commitEvidenceAdmission({
    ...base,
    evidenceId: "evidence-0003",
    nonce: "nonce-0003",
    maximumWaitMs: 40,
  }), /admission_lock_timeout/u);
  fs.unlinkSync(coordinates.lockPath);
  pass("existing-lock-blocks-writer");

  const separate = readAdmissionSnapshot({
    sourceRoot,
    admissionRoot,
    revisionId: `${revision}-OTHER`,
    sourceManifestSha256: source,
    policySha256: policy,
  });
  assert.equal(separate.sequence, 0);
  assert.notEqual(separate.coordinates.journalId, coordinates.journalId);
  pass("revision-namespaced-journal");

  assert.throws(() => resolveAdmissionCoordinates({
    sourceRoot,
    admissionRoot: path.join(sourceRoot, "inside"),
    revisionId: revision,
    sourceManifestSha256: source,
    policySha256: policy,
  }), /admission_root_must_be_outside_source/u);
  pass("journal-root-inside-source-rejected");

  console.log(JSON.stringify({
    schemaVersion: "velmere.pass36.a102r44p27.admission-journal-test.v1",
    status: "PASS",
    checks: rows.length,
    passed: rows.length,
    failed: 0,
    rows,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
