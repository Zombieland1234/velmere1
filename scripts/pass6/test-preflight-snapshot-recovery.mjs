#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const root = process.cwd();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const snapshotManifest = JSON.parse(fs.readFileSync(path.join(root, "config/preflight-domain-snapshot-manifest.json"), "utf8"));
const recovery = JSON.parse(fs.readFileSync(path.join(root, ".velmere", "orphan-quarantine-pass6.json"), "utf8"));
const failures = [];
const check = (condition, code) => { if (!condition) failures.push(code); };

const { manifestSha256: snapshotManifestSha256, ...snapshotCore } = snapshotManifest;
const { manifestSha256: recoveryManifestSha256, ...recoveryCore } = recovery;
check(snapshotManifestSha256 === sha256(JSON.stringify(snapshotCore)), "snapshot_manifest_integrity");
check(recovery.schemaVersion === "velmere.pass6.preflight-snapshot-recovery.v1", "recovery_schema");
check(recoveryManifestSha256 === sha256(JSON.stringify(recoveryCore)), "recovery_manifest_integrity");
check(recovery.sourceSnapshotManifestSha256 === snapshotManifestSha256, "snapshot_manifest_binding");
check(recovery.sourceSnapshotAggregateSha256 === snapshotManifest.sourceAggregateSha256, "snapshot_aggregate_binding");
check(recovery.entryCount === recovery.entries?.length, "recovery_entry_count");

const expectedMissing = new Map();
for (const snapshot of snapshotManifest.snapshots ?? []) {
  const compressed = fs.readFileSync(path.join(root, snapshot.path));
  check(sha256(compressed) === snapshot.compressedSha256, `compressed_hash:${snapshot.name}`);
  const raw = gunzipSync(compressed);
  check(sha256(raw) === snapshot.uncompressedSha256, `payload_hash:${snapshot.name}`);
  const payload = JSON.parse(raw.toString("utf8"));
  for (const entry of payload.entries ?? []) {
    if (!fs.existsSync(path.join(root, entry.path))) expectedMissing.set(entry.path, entry);
  }
}

let archiveBytes = 0;
for (const entry of recovery.entries ?? []) {
  const expected = expectedMissing.get(entry.source);
  check(Boolean(expected), `unexpected_recovery_entry:${entry.source}`);
  check(entry.archive === `.velmere/quarantine/pass6-domain-snapshot/${entry.source}`, `archive_binding:${entry.source}`);
  const archivePath = path.join(root, entry.archive);
  check(fs.existsSync(archivePath), `archive_missing:${entry.source}`);
  if (!fs.existsSync(archivePath)) continue;
  const content = fs.readFileSync(archivePath);
  archiveBytes += content.length;
  check(content.length === entry.bytes && content.length === expected?.bytes, `archive_size:${entry.source}`);
  check(sha256(content) === entry.sha256 && entry.sha256 === expected?.sha256, `archive_hash:${entry.source}`);
}

const aggregate = sha256((recovery.entries ?? []).map((entry) => `${entry.source}\0${entry.archive}\0${entry.bytes}\0${entry.sha256}`).join("\n"));
check(expectedMissing.size === recovery.entryCount, "missing_source_coverage");
check(archiveBytes === recovery.byteCount, "archive_byte_count");
check(aggregate === recovery.aggregateSha256, "archive_aggregate");
const negativeSample = Buffer.from(fs.readFileSync(path.join(root, recovery.entries[0].archive)));
negativeSample[0] ^= 0x01;
check(sha256(negativeSample) !== recovery.entries[0].sha256, "tamper_negative_control");

const receipt = {
  schemaVersion: "velmere.pass6.preflight-snapshot-recovery-test.v1",
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? "PASS_OFFLINE" : "BLOCKED",
  snapshotManifestBound: recovery.sourceSnapshotManifestSha256 === snapshotManifestSha256,
  expectedMissingSourceCount: expectedMissing.size,
  verifiedArchiveCount: recovery.entries?.length ?? 0,
  verifiedArchiveBytes: archiveBytes,
  aggregateSha256: aggregate,
  negativeTamperDetected: sha256(negativeSample) !== recovery.entries[0].sha256,
  externalCalls: 0,
  failures,
};
fs.mkdirSync(path.join(root, "artifacts", "pass6"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts", "pass6", "PASS6_PREFLIGHT_SNAPSHOT_RECOVERY.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`PASS6 preflight snapshot recovery: ${receipt.verifiedArchiveCount}/${receipt.expectedMissingSourceCount} verified · ${receipt.status}`);
if (failures.length > 0) {
  console.error(JSON.stringify(receipt, null, 2));
  process.exitCode = 1;
}
