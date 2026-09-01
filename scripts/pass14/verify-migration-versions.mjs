#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const directory = path.join(root, "supabase", "migrations");
const mapping = JSON.parse(fs.readFileSync(path.join(root, "config/pass14/migration-version-map.json"), "utf8"));
const files = fs.readdirSync(directory).filter((name) => name.endsWith(".sql")).sort();
const versions = new Map();
const issues = [];
for (const file of files) {
  const match = file.match(/^(\d{14})_(.+)\.sql$/u);
  if (!match) {
    issues.push(`noncanonical_filename:${file}`);
    continue;
  }
  const version = match[1];
  if (versions.has(version)) issues.push(`duplicate_version:${version}:${versions.get(version)}:${file}`);
  versions.set(version, file);
}
for (const row of mapping.mappings ?? []) {
  const file = path.join(directory, row.new);
  if (!fs.existsSync(file)) {
    issues.push(`mapped_file_missing:${row.new}`);
    continue;
  }
  const current = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (current !== row.sha256Before && !row.new.includes("5000_pass14_security_definer_trigger_acl")) {
    issues.push(`sql_bytes_changed_during_rename:${row.new}`);
  }
}
const result = {
  schemaVersion: "velmere.pass14.supabase-migration-version-verification.v1",
  generatedAt: new Date().toISOString(),
  ok: issues.length === 0,
  migrationCount: files.length,
  uniqueVersionCount: versions.size,
  canonicalFilenameCount: files.length - issues.filter((issue) => issue.startsWith("noncanonical_filename:")).length,
  issues,
  stagingCompatibility: "No staging/LIVE migration history is claimed. If an environment already recorded old versions, migration repair is mandatory."
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
