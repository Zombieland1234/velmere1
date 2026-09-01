#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
const root = process.cwd();
const manifestPath = path.join(root, "config/preflight-domain-snapshot-manifest.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const { manifestSha256, ...manifestCore } = manifest;
if (manifestSha256 !== sha256(JSON.stringify(manifestCore))) throw new Error("snapshot_manifest_integrity_failed_before_reseal");
const changed = [];
let sourceFileCount = 0;
let sourceTotalBytes = 0;
const allSourceRows = [];
for (const snapshot of manifest.snapshots) {
  const file = path.join(root, snapshot.path);
  const compressedBefore = fs.readFileSync(file);
  if (sha256(compressedBefore) !== snapshot.compressedSha256) throw new Error(`snapshot_compressed_hash_failed:${snapshot.name}`);
  const payload = JSON.parse(gunzipSync(compressedBefore).toString("utf8"));
  for (const entry of payload.entries) {
    const active = path.join(root, entry.path);
    if (!fs.existsSync(active)) continue;
    const bytes = fs.readFileSync(active);
    const digest = sha256(bytes);
    if (bytes.length !== entry.bytes || digest !== entry.sha256 || bytes.toString("utf8") !== entry.content) {
      changed.push({ snapshot: snapshot.name, path: entry.path, beforeSha256: entry.sha256, afterSha256: digest });
      entry.bytes = bytes.length;
      entry.sha256 = digest;
      entry.content = bytes.toString("utf8");
    }
  }
  payload.entries.sort((a,b)=>a.path.localeCompare(b.path));
  payload.fileCount = payload.entries.length;
  payload.totalBytes = payload.entries.reduce((sum,e)=>sum+e.bytes,0);
  payload.filesSha256 = sha256(payload.entries.map((e)=>`${e.path}\0${e.sha256}`).join("\n"));
  const raw = Buffer.from(JSON.stringify(payload));
  const compressed = gzipSync(raw, { level: 9, mtime: 0 });
  fs.writeFileSync(file, compressed);
  Object.assign(snapshot, {
    fileCount: payload.fileCount, totalBytes: payload.totalBytes, filesSha256: payload.filesSha256,
    uncompressedBytes: raw.length, uncompressedSha256: sha256(raw), compressedBytes: compressed.length, compressedSha256: sha256(compressed),
  });
  sourceFileCount += payload.fileCount;
  sourceTotalBytes += payload.totalBytes;
  allSourceRows.push(...payload.entries.map((e)=>`${e.path}\0${e.sha256}`));
}
manifest.sourceFileCount = sourceFileCount;
manifest.sourceTotalBytes = sourceTotalBytes;
manifest.sourceAggregateSha256 = sha256(allSourceRows.sort().join("\n"));
const { manifestSha256: ignored, ...nextCore } = manifest;
manifest.manifestSha256 = sha256(JSON.stringify(nextCore));
const temp = `${manifestPath}.${process.pid}.tmp`;
fs.writeFileSync(temp, `${JSON.stringify(manifest,null,2)}\n`);
fs.renameSync(temp, manifestPath);
fs.rmSync(path.join(root, ".velmere/cache/preflight-snapshot-validation.json"), { force: true });
console.log(JSON.stringify({ schemaVersion:"velmere.preflight-snapshot-reseal.v1", status:"OFFLINE-PROVEN", changedEntryCount:changed.length, changed, manifestSha256:manifest.manifestSha256, truthBoundary:"Only existing active files were resealed. Missing historical entries retained their embedded content." },null,2));
