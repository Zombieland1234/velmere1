#!/usr/bin/env node
import fs from "node:fs";
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { A80_REVISION, canonicalJson, readJson, sha256 } from "./a80-release-candidate-freeze-lib.mjs";
const root = process.cwd();
const policy = readJson(root, "config/pass36/a80-frozen-local-release-candidate-admission.json");
const parent = readJson(root, policy.parentDescendantManifestPath);
const parentCore = { ...parent }; delete parentCore.manifestDigestSha256;
if (parent.manifestDigestSha256 !== sha256(canonicalJson(parentCore))) throw new Error("a80_parent_descendant_manifest_invalid");
const excluded = new Set(policy.descendantManifestExclusions);
const inventory = collectPass35Inventory(root);
if (inventory.unknownCount !== 0) throw new Error(`a80_descendant_unknown_inventory:${inventory.unknownCount}`);
const rows = inventory.entries.filter((row) => row.sourceIncluded && !excluded.has(row.path)).map((row) => ({ path: row.path, byteLength: row.byteLength, sha256: row.sha256, mode: row.mode })).sort((a, b) => a.path.localeCompare(b.path, "en"));
const payload = { fileCount: rows.length, byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0), pathSetSha256: sha256(rows.map((row) => row.path).join("\n")), aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")) };
const core = {
  schemaVersion: "velmere.pass36.a80.current-root-descendant-manifest.v1",
  revisionId: A80_REVISION,
  parentRevisionId: policy.parentRevisionId,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: policy.deterministicEpoch,
  payload,
  exclusions: [...excluded].sort(),
  claims: { exactToolchainVerified: false, exactBuildVerified: false, exactBrowserVerified: false, frozenReleaseCandidateVerified: false, stagingProven: false, liveProven: false, saleEnabled: false }
};
const manifest = { ...core, manifestDigestSha256: sha256(canonicalJson(core)) };
fs.writeFileSync(policy.descendantManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS_A80_DESCENDANT_MANIFEST_BUILD", output: policy.descendantManifestPath, payload, manifestDigestSha256: manifest.manifestDigestSha256 }, null, 2));
