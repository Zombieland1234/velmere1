#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { canonical, sha256 } from "./a102r44p27-trusted-external-evidence-lib.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;
const ENTRY_NAME = /^(\d{12})-([a-f0-9]{64})\.json$/u;
const HEADER_KEYS = new Set([
  "schemaVersion",
  "journalId",
  "revisionId",
  "sourceManifestSha256",
  "policySha256",
  "createdAt",
]);
const ENTRY_KEYS = new Set([
  "schemaVersion",
  "sequence",
  "revisionId",
  "sourceManifestSha256",
  "evidenceIdSha256",
  "nonceSha256",
  "envelopeSha256",
  "payloadSha256",
  "keyIdSha256",
  "programIdSha256",
  "executionIdSha256",
  "observedAt",
  "acceptedAt",
  "previousDigest",
  "digest",
]);

function ensure(condition, code) {
  if (!condition) throw new Error(code);
}

function exactKeys(object, allowed) {
  if (!object || typeof object !== "object" || Array.isArray(object)) return false;
  const keys = Object.keys(object);
  return keys.length === allowed.size && keys.every((key) => allowed.has(key));
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
}

function rejectSymlinkComponents(absolutePath, label) {
  const parsed = path.parse(absolutePath);
  let cursor = parsed.root;
  for (const component of absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    try {
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink()) throw new Error(`${label}_symlink_rejected`);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") return;
      throw error;
    }
  }
}

function assertPrivateDirectory(directory, label) {
  const stat = fs.lstatSync(directory);
  ensure(stat.isDirectory() && !stat.isSymbolicLink(), `${label}_not_private_directory`);
  if (typeof process.getuid === "function") ensure(stat.uid === process.getuid(), `${label}_owner_mismatch`);
  if (process.platform !== "win32") ensure((stat.mode & 0o077) === 0, `${label}_insecure_permissions`);
}

function assertPrivateRegularFile(filePath, label, maximumBytes) {
  const stat = fs.lstatSync(filePath);
  ensure(stat.isFile() && !stat.isSymbolicLink(), `${label}_not_regular`);
  ensure(stat.nlink === 1, `${label}_link_count_invalid`);
  ensure(stat.size <= maximumBytes, `${label}_too_large`);
  if (typeof process.getuid === "function") ensure(stat.uid === process.getuid(), `${label}_owner_mismatch`);
  if (process.platform !== "win32") ensure((stat.mode & 0o077) === 0, `${label}_insecure_permissions`);
}

function disjoint(left, right) {
  const a = path.relative(left, right);
  const b = path.relative(right, left);
  const rightInsideLeft = a === "" || (!a.startsWith(`..${path.sep}`) && !path.isAbsolute(a));
  const leftInsideRight = b === "" || (!b.startsWith(`..${path.sep}`) && !path.isAbsolute(b));
  return !rightInsideLeft && !leftInsideRight;
}

function atomicWriteNew(filePath, bytes) {
  const directory = path.dirname(filePath);
  const temporary = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(8).toString("hex")}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  try {
    fs.renameSync(temporary, filePath);
    fsyncDirectory(directory);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch { /* Best-effort cleanup; the original rename error is rethrown below. */ }
    throw error;
  }
}

function readStrictObject(filePath, maximumBytes, label) {
  assertPrivateRegularFile(filePath, label, maximumBytes);
  const before = fs.lstatSync(filePath);
  const noFollow = Number.isInteger(fs.constants.O_NOFOLLOW) ? fs.constants.O_NOFOLLOW : 0;
  const descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | noFollow);
  try {
    const descriptorStat = fs.fstatSync(descriptor);
    ensure(before.dev === descriptorStat.dev && before.ino === descriptorStat.ino, `${label}_descriptor_identity_mismatch`);
    const bytes = fs.readFileSync(descriptor);
    const after = fs.lstatSync(filePath);
    ensure(after.dev === descriptorStat.dev && after.ino === descriptorStat.ino && after.size === bytes.length, `${label}_changed_during_read`);
    return {
      bytes,
      value: parseStrictJsonCli(bytes.toString("utf8"), {
        maxBytes: Math.min(maximumBytes, 16 * 1024 * 1024),
        maxDepth: 64,
        maxNodes: 200000,
        requireObject: true,
      }),
    };
  } finally {
    fs.closeSync(descriptor);
  }
}

export function resolveAdmissionCoordinates({
  sourceRoot,
  admissionRoot,
  revisionId,
  sourceManifestSha256,
  policySha256,
}) {
  ensure(typeof revisionId === "string" && revisionId.length >= 16, "admission_revision_invalid");
  ensure(SHA256.test(sourceManifestSha256 ?? ""), "admission_source_sha256_invalid");
  ensure(SHA256.test(policySha256 ?? ""), "admission_policy_sha256_invalid");
  const source = fs.realpathSync(path.resolve(sourceRoot));
  const requested = path.resolve(admissionRoot ?? path.join(os.tmpdir(), "velmere-external-evidence-admission-v1"));
  ensure(path.isAbsolute(requested), "admission_root_absolute_required");
  rejectSymlinkComponents(requested, "admission_root");
  fs.mkdirSync(requested, { recursive: true, mode: 0o700 });
  fs.chmodSync(requested, 0o700);
  assertPrivateDirectory(requested, "admission_root");
  ensure(disjoint(source, requested), "admission_root_must_be_outside_source");
  const journalId = sha256(`velmere.r44p27.admission.v1\0${revisionId}\0${sourceManifestSha256}\0${policySha256}`);
  const namespace = path.join(requested, journalId);
  const entries = path.join(namespace, "entries");
  fs.mkdirSync(entries, { recursive: true, mode: 0o700 });
  fs.chmodSync(namespace, 0o700);
  fs.chmodSync(entries, 0o700);
  assertPrivateDirectory(namespace, "admission_namespace");
  assertPrivateDirectory(entries, "admission_entries");
  return {
    sourceRoot: source,
    admissionRoot: requested,
    journalId,
    namespace,
    entries,
    headerPath: path.join(namespace, "journal-header.json"),
    lockPath: path.join(namespace, "admission.lock"),
  };
}

function acquireLock(coordinates, { maximumWaitMs = 5000, retryMs = 20 } = {}) {
  const deadline = Date.now() + maximumWaitMs;
  while (true) {
    const token = crypto.randomBytes(32).toString("hex");
    let descriptor;
    try {
      descriptor = fs.openSync(coordinates.lockPath, "wx", 0o600);
      const metadata = {
        schemaVersion: "velmere.pass36.a102r44p27.admission-lock.v1",
        pid: process.pid,
        ppid: process.ppid,
        journalId: coordinates.journalId,
        token,
        acquiredAt: new Date().toISOString(),
      };
      fs.writeFileSync(descriptor, `${JSON.stringify(metadata)}\n`);
      fs.fsyncSync(descriptor);
      const stat = fs.fstatSync(descriptor);
      return { descriptor, token, dev: stat.dev, ino: stat.ino, metadata };
    } catch (error) {
      if (descriptor !== undefined) fs.closeSync(descriptor);
      if (!(error && typeof error === "object" && error.code === "EEXIST")) throw error;
      if (Date.now() >= deadline) throw new Error("admission_lock_timeout", { cause: error });
      sleep(retryMs);
    }
  }
}

function inspectLock(coordinates, lock) {
  assertPrivateRegularFile(coordinates.lockPath, "admission_lock", 64 * 1024);
  const stat = fs.lstatSync(coordinates.lockPath);
  ensure(stat.dev === lock.dev && stat.ino === lock.ino, "admission_lock_physical_identity_changed");
  const parsed = JSON.parse(fs.readFileSync(coordinates.lockPath, "utf8"));
  ensure(parsed.token === lock.token && parsed.pid === process.pid && parsed.journalId === coordinates.journalId, "admission_lock_owner_mismatch");
}

function releaseLock(coordinates, lock) {
  inspectLock(coordinates, lock);
  fs.closeSync(lock.descriptor);
  fs.unlinkSync(coordinates.lockPath);
  fsyncDirectory(coordinates.namespace);
}

function ensureHeader(coordinates, { revisionId, sourceManifestSha256, policySha256, now }) {
  if (!fs.existsSync(coordinates.headerPath)) {
    const header = {
      schemaVersion: "velmere.pass36.a102r44p27.admission-journal-header.v1",
      journalId: coordinates.journalId,
      revisionId,
      sourceManifestSha256,
      policySha256,
      createdAt: now.toISOString(),
    };
    atomicWriteNew(coordinates.headerPath, Buffer.from(`${canonical(header)}\n`, "utf8"));
  }
  const { value, bytes } = readStrictObject(coordinates.headerPath, 64 * 1024, "admission_header");
  ensure(bytes.equals(Buffer.from(`${canonical(value)}\n`, "utf8")), "admission_header_noncanonical_bytes");
  ensure(exactKeys(value, HEADER_KEYS), "admission_header_keys_invalid");
  ensure(value.schemaVersion === "velmere.pass36.a102r44p27.admission-journal-header.v1", "admission_header_schema_invalid");
  ensure(value.journalId === coordinates.journalId, "admission_header_journal_mismatch");
  ensure(value.revisionId === revisionId, "admission_header_revision_mismatch");
  ensure(value.sourceManifestSha256 === sourceManifestSha256, "admission_header_source_mismatch");
  ensure(value.policySha256 === policySha256, "admission_header_policy_mismatch");
  ensure(Number.isFinite(Date.parse(value.createdAt)), "admission_header_time_invalid");
  return value;
}

function verifyEntry(value, expectedSequence, expectedPreviousDigest, { revisionId, sourceManifestSha256 }) {
  ensure(exactKeys(value, ENTRY_KEYS), "admission_entry_keys_invalid");
  ensure(value.schemaVersion === "velmere.pass36.a102r44p27.admission-journal-entry.v1", "admission_entry_schema_invalid");
  ensure(value.sequence === expectedSequence, "admission_entry_sequence_invalid");
  ensure(value.revisionId === revisionId, "admission_entry_revision_invalid");
  ensure(value.sourceManifestSha256 === sourceManifestSha256, "admission_entry_source_invalid");
  for (const key of ["evidenceIdSha256", "nonceSha256", "envelopeSha256", "payloadSha256", "keyIdSha256", "programIdSha256", "executionIdSha256", "previousDigest", "digest"]) {
    ensure(SHA256.test(value[key] ?? ""), `admission_entry_${key}_invalid`);
  }
  ensure(value.previousDigest === expectedPreviousDigest, "admission_entry_previous_digest_invalid");
  ensure(Number.isFinite(Date.parse(value.observedAt)), "admission_entry_observed_time_invalid");
  ensure(Number.isFinite(Date.parse(value.acceptedAt)), "admission_entry_accepted_time_invalid");
  const { digest, ...unsigned } = value;
  ensure(digest === sha256(canonical(unsigned)), "admission_entry_digest_invalid");
  return value;
}

export function readAdmissionSnapshot({
  sourceRoot,
  admissionRoot,
  revisionId,
  sourceManifestSha256,
  policySha256,
  maximumEntries = 100000,
  maximumEntryBytes = 128 * 1024,
  allowUninitialized = true,
}) {
  const coordinates = resolveAdmissionCoordinates({ sourceRoot, admissionRoot, revisionId, sourceManifestSha256, policySha256 });
  const unexpectedNamespaceFiles = fs.readdirSync(coordinates.namespace).filter((name) => !["entries", "journal-header.json", "admission.lock"].includes(name));
  ensure(unexpectedNamespaceFiles.length === 0, "admission_namespace_unexpected_file");
  const entryNames = fs.readdirSync(coordinates.entries).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  ensure(entryNames.length <= maximumEntries, "admission_entry_limit_exceeded");
  for (const name of entryNames) ensure(ENTRY_NAME.test(name), "admission_entries_unexpected_file");
  if (!fs.existsSync(coordinates.headerPath)) {
    ensure(allowUninitialized && entryNames.length === 0, "admission_header_missing");
    return {
      coordinates,
      initialized: false,
      sequence: 0,
      finalDigest: "0".repeat(64),
      evidenceIdHashes: new Set(),
      nonceHashes: new Set(),
      entries: [],
    };
  }
  const header = ensureHeader(coordinates, { revisionId, sourceManifestSha256, policySha256, now: new Date() });
  const entries = [];
  const evidenceIdHashes = new Set();
  const nonceHashes = new Set();
  let previousDigest = "0".repeat(64);
  for (let index = 0; index < entryNames.length; index += 1) {
    const name = entryNames[index];
    const match = name.match(ENTRY_NAME);
    ensure(Boolean(match), "admission_entry_name_invalid");
    const expectedSequence = index + 1;
    ensure(Number(match[1]) === expectedSequence, "admission_entry_filename_sequence_invalid");
    const full = path.join(coordinates.entries, name);
    const { value, bytes } = readStrictObject(full, maximumEntryBytes, "admission_entry");
    ensure(bytes.equals(Buffer.from(`${canonical(value)}\n`, "utf8")), "admission_entry_noncanonical_bytes");
    verifyEntry(value, expectedSequence, previousDigest, { revisionId, sourceManifestSha256 });
    ensure(match[2] === value.digest, "admission_entry_filename_digest_invalid");
    ensure(!evidenceIdHashes.has(value.evidenceIdSha256), "admission_duplicate_evidence_hash");
    ensure(!nonceHashes.has(value.nonceSha256), "admission_duplicate_nonce_hash");
    evidenceIdHashes.add(value.evidenceIdSha256);
    nonceHashes.add(value.nonceSha256);
    previousDigest = value.digest;
    entries.push(value);
  }
  return {
    coordinates,
    initialized: true,
    header,
    sequence: entries.length,
    finalDigest: previousDigest,
    evidenceIdHashes,
    nonceHashes,
    entries,
  };
}

export function commitEvidenceAdmission({
  sourceRoot,
  admissionRoot,
  revisionId,
  sourceManifestSha256,
  policySha256,
  evidenceId,
  nonce,
  envelopeSha256,
  payloadSha256,
  keyId,
  programId,
  executionId,
  observedAt,
  now = new Date(),
  maximumEntries = 100000,
  maximumEntryBytes = 128 * 1024,
  maximumWaitMs = 5000,
}) {
  ensure(typeof evidenceId === "string" && evidenceId.length >= 8, "admission_evidence_id_invalid");
  ensure(typeof nonce === "string" && nonce.length >= 8, "admission_nonce_invalid");
  for (const [label, value] of [["envelope", envelopeSha256], ["payload", payloadSha256]]) ensure(SHA256.test(value ?? ""), `admission_${label}_sha256_invalid`);
  ensure(typeof keyId === "string" && keyId.length >= 8, "admission_key_id_invalid");
  ensure(typeof programId === "string" && programId.length >= 8, "admission_program_id_invalid");
  ensure(typeof executionId === "string" && executionId.length >= 8, "admission_execution_id_invalid");
  ensure(Number.isFinite(Date.parse(observedAt ?? "")), "admission_observed_at_invalid");

  const coordinates = resolveAdmissionCoordinates({ sourceRoot, admissionRoot, revisionId, sourceManifestSha256, policySha256 });
  const lock = acquireLock(coordinates, { maximumWaitMs });
  try {
    inspectLock(coordinates, lock);
    ensureHeader(coordinates, { revisionId, sourceManifestSha256, policySha256, now });
    const snapshot = readAdmissionSnapshot({
      sourceRoot,
      admissionRoot,
      revisionId,
      sourceManifestSha256,
      policySha256,
      maximumEntries,
      maximumEntryBytes,
      allowUninitialized: false,
    });
    const evidenceIdSha256 = sha256(evidenceId);
    const nonceSha256 = sha256(nonce);
    ensure(!snapshot.evidenceIdHashes.has(evidenceIdSha256), "admission_evidence_replay");
    ensure(!snapshot.nonceHashes.has(nonceSha256), "admission_nonce_replay");
    ensure(snapshot.sequence < maximumEntries, "admission_entry_limit_exceeded");
    const unsigned = {
      schemaVersion: "velmere.pass36.a102r44p27.admission-journal-entry.v1",
      sequence: snapshot.sequence + 1,
      revisionId,
      sourceManifestSha256,
      evidenceIdSha256,
      nonceSha256,
      envelopeSha256,
      payloadSha256,
      keyIdSha256: sha256(keyId),
      programIdSha256: sha256(programId),
      executionIdSha256: sha256(executionId),
      observedAt,
      acceptedAt: now.toISOString(),
      previousDigest: snapshot.finalDigest,
    };
    const entry = { ...unsigned, digest: sha256(canonical(unsigned)) };
    const bytes = Buffer.from(`${canonical(entry)}\n`, "utf8");
    ensure(bytes.length <= maximumEntryBytes, "admission_entry_too_large");
    const finalName = `${String(entry.sequence).padStart(12, "0")}-${entry.digest}.json`;
    const finalPath = path.join(coordinates.entries, finalName);
    ensure(!fs.existsSync(finalPath), "admission_entry_already_exists");
    atomicWriteNew(finalPath, bytes);
    const after = readAdmissionSnapshot({
      sourceRoot,
      admissionRoot,
      revisionId,
      sourceManifestSha256,
      policySha256,
      maximumEntries,
      maximumEntryBytes,
      allowUninitialized: false,
    });
    ensure(after.sequence === entry.sequence && after.finalDigest === entry.digest, "admission_commit_verification_failed");
    return {
      schemaVersion: "velmere.pass36.a102r44p27.admission-commit-receipt.v1",
      status: "PASS_DURABLE_ATOMIC_ADMISSION_NO_STAGING_OR_SALE_CREDIT",
      journalId: coordinates.journalId,
      sequence: entry.sequence,
      entryDigest: entry.digest,
      evidenceIdSha256,
      nonceSha256,
      envelopeSha256,
      payloadSha256,
      sourceManifestSha256,
      sourceImmutable: true,
      rawIdentifiersStored: false,
      stagingCredit: false,
      saleCredit: false,
      liveCredit: false,
    };
  } finally {
    releaseLock(coordinates, lock);
  }
}
