#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
const root = process.cwd();
const manifestPath = path.join(root, "config/pass35/a47-source-manifest.json");
if (!fs.existsSync(manifestPath)) throw new Error("a47_source_manifest_missing");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];
for (const row of manifest.entries ?? []) {
  const absolute = path.join(root, row.path);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) { failures.push({ path: row.path, error: "missing" }); continue; }
  const stat = fs.statSync(absolute);
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
  if (stat.size !== row.bytes || sha256 !== row.sha256) failures.push({ path: row.path, error: "mismatch", expectedBytes: row.bytes, actualBytes: stat.size, expectedSha256: row.sha256, actualSha256: sha256 });
}
const report = { schemaVersion: "velmere.pass35.a47.source-manifest-verification.v1", revisionId: manifest.revisionId, generatedAt: new Date().toISOString(), summary: { expected: manifest.entries?.length ?? 0, verified: (manifest.entries?.length ?? 0) - failures.length, failed: failures.length }, failures };
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 30), null, 2)); process.exit(1); }
