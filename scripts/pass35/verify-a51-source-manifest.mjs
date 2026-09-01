#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const file = path.join(root, "config/pass35/a51-source-manifest.json");
if (!fs.existsSync(file)) { console.error("a51 source manifest missing"); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
const failures = [];
for (const row of manifest.files ?? []) {
  const absolute = path.join(root, row.path);
  if (!fs.existsSync(absolute)) { failures.push({ path: row.path, error: "missing" }); continue; }
  const bytes = fs.readFileSync(absolute);
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  if (digest !== row.sha256 || bytes.byteLength !== row.bytes) failures.push({ path: row.path, error: "mismatch" });
}
console.log(JSON.stringify({ revisionId: manifest.revisionId, files: manifest.files?.length ?? 0, passed: (manifest.files?.length ?? 0) - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 50), null, 2)); process.exit(1); }
