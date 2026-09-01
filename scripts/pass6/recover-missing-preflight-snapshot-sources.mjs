#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const root = process.cwd();
const snapshotManifestPath = path.join(root, "config", "preflight-domain-snapshot-manifest.json");
const quarantineManifestRelative = ".velmere/orphan-quarantine-pass6.json";
const quarantineManifestPath = path.join(root, quarantineManifestRelative);
const archiveRootRelative = ".velmere/quarantine/pass6-domain-snapshot";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function safeRelative(value, label) {
  invariant(typeof value === "string" && value.length > 0, `${label}_missing`);
  invariant(!value.includes("\\") && !value.includes("\0"), `${label}_invalid:${value}`);
  invariant(!path.posix.isAbsolute(value), `${label}_absolute:${value}`);
  invariant(path.posix.normalize(value) === value, `${label}_not_normalized:${value}`);
  invariant(value !== "." && value !== ".." && !value.startsWith("../") && !value.includes("/../"), `${label}_traversal:${value}`);
  return value;
}

const snapshotManifest = JSON.parse(fs.readFileSync(snapshotManifestPath, "utf8"));
const { manifestSha256: snapshotManifestSha256, ...snapshotManifestCore } = snapshotManifest;
invariant(snapshotManifest.schemaVersion === "velmere.preflight-domain-snapshot-manifest.v1", "snapshot_manifest_schema_invalid");
invariant(
  snapshotManifestSha256 === sha256(JSON.stringify(snapshotManifestCore)),
  "snapshot_manifest_integrity_failed",
);

const recoveryEntries = [];
let activeSourceCount = 0;
let recoveredByteCount = 0;

for (const snapshot of snapshotManifest.snapshots ?? []) {
  safeRelative(snapshot.path, "snapshot_path");
  const compressed = fs.readFileSync(path.join(root, snapshot.path));
  invariant(sha256(compressed) === snapshot.compressedSha256, `snapshot_compressed_hash_failed:${snapshot.name}`);
  const raw = gunzipSync(compressed);
  invariant(sha256(raw) === snapshot.uncompressedSha256, `snapshot_payload_hash_failed:${snapshot.name}`);
  const payload = JSON.parse(raw.toString("utf8"));
  invariant(payload.schemaVersion === "velmere.preflight-domain-snapshot.v1", `snapshot_schema_invalid:${snapshot.name}`);
  invariant(payload.fileCount === snapshot.fileCount, `snapshot_file_count_mismatch:${snapshot.name}`);

  for (const entry of payload.entries ?? []) {
    const source = safeRelative(entry.path, "snapshot_source");
    const content = Buffer.from(String(entry.content ?? ""), "utf8");
    invariant(content.length === entry.bytes, `snapshot_embedded_size_mismatch:${source}`);
    invariant(sha256(content) === entry.sha256, `snapshot_embedded_hash_mismatch:${source}`);
    if (fs.existsSync(path.join(root, source))) {
      activeSourceCount += 1;
      continue;
    }

    const archive = safeRelative(`${archiveRootRelative}/${source}`, "archive_path");
    const archivePath = path.join(root, archive);
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });
    if (fs.existsSync(archivePath)) {
      const existing = fs.readFileSync(archivePath);
      invariant(existing.length === content.length, `archive_existing_size_mismatch:${archive}`);
      invariant(sha256(existing) === entry.sha256, `archive_existing_hash_mismatch:${archive}`);
    } else {
      fs.writeFileSync(archivePath, content, { flag: "wx", mode: 0o600 });
    }
    recoveryEntries.push({ source, archive, bytes: entry.bytes, sha256: entry.sha256 });
    recoveredByteCount += entry.bytes;
  }
}

recoveryEntries.sort((left, right) => left.source.localeCompare(right.source));
const aggregateSha256 = sha256(recoveryEntries.map((entry) => `${entry.source}\0${entry.archive}\0${entry.bytes}\0${entry.sha256}`).join("\n"));
const manifestCore = {
  schemaVersion: "velmere.pass6.preflight-snapshot-recovery.v1",
  generatedAt: snapshotManifest.generatedAt,
  recoveryBasis: "integrity-checked embedded content from the PASS5 preflight domain snapshots",
  sourceSnapshotManifestPath: "config/preflight-domain-snapshot-manifest.json",
  sourceSnapshotManifestSha256: snapshotManifestSha256,
  sourceSnapshotAggregateSha256: snapshotManifest.sourceAggregateSha256,
  activeSourceCount,
  entryCount: recoveryEntries.length,
  byteCount: recoveredByteCount,
  aggregateSha256,
  entries: recoveryEntries,
};
const recoveryManifest = { ...manifestCore, manifestSha256: sha256(JSON.stringify(manifestCore)) };
fs.mkdirSync(path.dirname(quarantineManifestPath), { recursive: true });
fs.writeFileSync(quarantineManifestPath, `${JSON.stringify(recoveryManifest, null, 2)}\n`);
fs.rmSync(path.join(root, ".velmere", "cache", "preflight-snapshot-validation.json"), { force: true });

console.log(JSON.stringify({
  status: "PASS_CONTENT_ADDRESSED_RECOVERY",
  quarantineManifest: quarantineManifestRelative,
  activeSourceCount,
  recoveredSourceCount: recoveryEntries.length,
  recoveredByteCount,
  aggregateSha256,
}, null, 2));
