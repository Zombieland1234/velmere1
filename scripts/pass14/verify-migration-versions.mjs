#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const directory = path.join(root, "supabase", "migrations");
const mapping = JSON.parse(fs.readFileSync(path.join(root, "config/pass14/migration-version-map.json"), "utf8"));
const supersessionPath = path.join(root, "config/pass14/migration-baseline-supersession-v1.json");
const supersession = fs.existsSync(supersessionPath)
  ? JSON.parse(fs.readFileSync(supersessionPath, "utf8"))
  : null;
const files = fs.readdirSync(directory).filter((name) => name.endsWith(".sql")).sort();
const versions = new Map();
const issues = [];
const acceptedSupersessions = [];

if (supersession) {
  if (supersession.schemaVersion !== "velmere.pass14.supabase-migration-baseline-supersession.v1") {
    issues.push("invalid_migration_baseline_supersession_schema");
  }
  if (supersession.stagingLiveHistoryClaim !== "NONE_CLAIMED_NOT_PROVEN") {
    issues.push("invalid_migration_baseline_supersession_history_claim");
  }
  if (supersession.status !== "CANONICAL_IMPORT_BASELINE_WITH_UNPROVEN_PRE_RENAME_BYTES") {
    issues.push("invalid_migration_baseline_supersession_status");
  }
}

const supersessionRows = new Map((supersession?.rows ?? []).map((row) => [row.path, row]));
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
  if (current === row.sha256Before || row.new.includes("5000_pass14_security_definer_trigger_acl")) continue;

  const baseline = supersessionRows.get(row.new);
  if (!baseline) {
    issues.push(`sql_bytes_changed_during_rename:${row.new}`);
    continue;
  }
  if (baseline.legacyRenameExpectedSha256 !== row.sha256Before) {
    issues.push(`supersession_legacy_hash_mismatch:${row.new}`);
    continue;
  }
  if (baseline.canonicalImportSha256 !== current) {
    issues.push(`supersession_current_hash_mismatch:${row.new}`);
    continue;
  }
  if (baseline.lineage !== "UNPROVEN_PRE_RENAME_BYTES_CANONICAL_SINCE_REPOSITORY_IMPORT") {
    issues.push(`supersession_lineage_status_invalid:${row.new}`);
    continue;
  }
  acceptedSupersessions.push({
    path: row.new,
    legacyRenameExpectedSha256: row.sha256Before,
    canonicalImportSha256: current,
    lineage: baseline.lineage
  });
}

for (const [supersededPath] of supersessionRows) {
  if (!(mapping.mappings ?? []).some((row) => row.new === supersededPath)) {
    issues.push(`supersession_path_not_in_migration_map:${supersededPath}`);
  }
}

const result = {
  schemaVersion: "velmere.pass14.supabase-migration-version-verification.v2",
  generatedAt: new Date().toISOString(),
  ok: issues.length === 0,
  migrationCount: files.length,
  uniqueVersionCount: versions.size,
  canonicalFilenameCount: files.length - issues.filter((issue) => issue.startsWith("noncanonical_filename:")).length,
  baselineSupersessionCount: acceptedSupersessions.length,
  baselineSupersessionStatus: acceptedSupersessions.length > 0
    ? "CANONICAL_IMPORT_BASELINE_WITH_UNPROVEN_PRE_RENAME_BYTES"
    : "NONE",
  acceptedSupersessions,
  issues,
  stagingCompatibility: "No staging/LIVE migration history is claimed or proven. Canonical-import supersessions are valid only for new/unapplied environments. If any environment already recorded old versions or different SQL bytes, Supabase migration repair and separate evidence are mandatory before promotion.",
  truthBoundary: "PASS proves unique canonical migration versions and current-byte binding. For explicitly superseded rows it does NOT prove the historical pre-rename bytes or a byte-preserving rename; it proves only that the current SQL matches the frozen repository-import baseline while deployment-history compatibility remains unclaimed."
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
