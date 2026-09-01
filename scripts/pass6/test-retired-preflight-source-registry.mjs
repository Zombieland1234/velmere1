#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const registry = JSON.parse(fs.readFileSync(path.join(root, "config/retired-preflight-missing-sources-pass6.json"), "utf8"));
const { registrySha256, ...core } = registry;
const merkle = JSON.parse(fs.readFileSync(path.join(root, registry.releaseInputMerkle.path), "utf8"));
const releaseBytes = fs.readFileSync(path.join(root, registry.pass5ReleaseManifest.path));
const release = JSON.parse(releaseBytes);
const merkleEntries = new Map(merkle.entries.map((entry) => [entry.path, entry]));
const releasePaths = new Set(release.files.map((entry) => entry.path));
const failures = [];
const check = (condition, code) => { if (!condition) failures.push(code); };

check(registry.schemaVersion === "velmere.pass6.retired-preflight-missing-source-registry.v1", "schema");
check(registrySha256 === sha256(JSON.stringify(core)), "registry_integrity");
check(registry.entryCount === registry.entries?.length && registry.entryCount === 18, "entry_count");
check(registry.pass5ReleaseManifest.fileSha256 === sha256(releaseBytes), "pass5_release_binding");
check(registry.releaseInputMerkle.manifestSha256 === merkle.manifestSha256, "merkle_manifest_binding");
check(registry.releaseInputMerkle.merkleRootSha256 === merkle.merkleRootSha256, "merkle_root_binding");

for (const entry of registry.entries ?? []) {
  const historical = merkleEntries.get(entry.sourcePath);
  check(Boolean(historical), `merkle_entry:${entry.sourcePath}`);
  check(historical?.bytes === entry.historicalBytes && historical?.sha256 === entry.historicalSha256 && historical?.leafSha256 === entry.historicalLeafSha256, `merkle_values:${entry.sourcePath}`);
  check(sha256(`leaf\0${entry.sourcePath}\0${entry.historicalBytes}\0${entry.historicalSha256}`) === entry.historicalLeafSha256, `leaf_digest:${entry.sourcePath}`);
  check(!releasePaths.has(entry.sourcePath), `pass5_release_omission:${entry.sourcePath}`);
  check(!fs.existsSync(path.join(root, entry.sourcePath)), `historical_source_absent:${entry.sourcePath}`);
  for (const replacement of [...entry.replacementPaths, ...entry.replacementGates]) {
    check(fs.existsSync(path.join(root, replacement)), `replacement_exists:${entry.sourcePath}:${replacement}`);
  }
}

const entriesAggregate = sha256((registry.entries ?? []).map((entry) => `${entry.sourcePath}\0${entry.historicalBytes}\0${entry.historicalSha256}\0${entry.historicalLeafSha256}`).join("\n"));
check(entriesAggregate === registry.entriesSha256, "entries_aggregate");
const receipt = {
  schemaVersion: "velmere.pass6.retired-preflight-missing-source-registry-test.v1",
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? "PASS_OFFLINE" : "BLOCKED",
  entryCount: registry.entryCount,
  currentReplacementBindingVerified: failures.every((failure) => !failure.startsWith("replacement_exists:")),
  historicalMerkleBindingVerified: failures.every((failure) => !failure.startsWith("merkle_") && !failure.startsWith("leaf_digest:")),
  pass5ReleaseOmissionVerified: failures.every((failure) => !failure.startsWith("pass5_release_")),
  runtimeClaimsSatisfiedByRegistry: false,
  externalCalls: 0,
  failures,
};
fs.mkdirSync(path.join(root, "artifacts", "pass6"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts", "pass6", "PASS6_RETIRED_PREFLIGHT_SOURCE_REGISTRY.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`PASS6 retired preflight sources: ${registry.entryCount}/${registry.entryCount} bound · ${receipt.status}`);
if (failures.length > 0) {
  console.error(JSON.stringify(receipt, null, 2));
  process.exitCode = 1;
}
