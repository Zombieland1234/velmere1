#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const manifestPath = path.join(root, "config/pass35/a48-source-manifest.json");
if (!fs.existsSync(manifestPath)) { console.error("a48_source_manifest_missing"); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];
for (const row of manifest.files ?? []) {
  const absolute = path.join(root, row.path);
  if (!fs.existsSync(absolute)) { failures.push({ path: row.path, error: "missing" }); continue; }
  const stat = fs.statSync(absolute);
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
  if (stat.size !== row.bytes || sha256 !== row.sha256) failures.push({ path: row.path, error: "mismatch", expectedBytes: row.bytes, actualBytes: stat.size, expectedSha256: row.sha256, actualSha256: sha256 });
}
console.log(JSON.stringify({ files: manifest.files?.length ?? 0, passed: (manifest.files?.length ?? 0) - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 50), null, 2)); process.exit(1); }
