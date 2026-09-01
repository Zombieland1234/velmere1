#!/usr/bin/env node
import fs from "node:fs";
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { A79_REVISION, canonicalJson, readJson, sha256 } from "./a79-exact-build-browser-lib.mjs";

const root = process.cwd();
const policy = readJson(root, "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json");
const parent = readJson(root, policy.parentDescendantManifestPath);
const parentCore = { ...parent }; delete parentCore.manifestDigestSha256;
if (parent.manifestDigestSha256 !== sha256(canonicalJson(parentCore))) throw new Error("a79_parent_descendant_manifest_invalid");
const excluded = new Set(policy.descendantManifestExclusions);
const inventory = collectPass35Inventory(root);
if (inventory.unknownCount !== 0) throw new Error(`a79_descendant_unknown_inventory:${inventory.unknownCount}`);
const rows = inventory.entries
  .filter((row) => row.sourceIncluded && !excluded.has(row.path))
  .map((row) => ({ path: row.path, byteLength: row.byteLength, sha256: row.sha256, mode: row.mode }))
  .sort((a, b) => a.path.localeCompare(b.path, "en"));
const payload = {
  fileCount: rows.length,
  byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
  pathSetSha256: sha256(rows.map((row) => row.path).join("\n")),
  aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")),
};
const core = {
  schemaVersion: "velmere.pass36.a79.current-root-descendant-manifest.v1",
  revisionId: A79_REVISION,
  parentRevisionId: policy.parentRevisionId,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: policy.deterministicEpoch,
  payload,
  exclusions: [...excluded].sort(),
  claims: {
    a78ExactToolchainVerified: false,
    exactBuildVerified: false,
    exactBrowserVerified: false,
    stagingProven: false,
    liveProven: false,
    saleEnabled: false
  }
};
const manifest = { ...core, manifestDigestSha256: sha256(canonicalJson(core)) };
fs.writeFileSync(policy.descendantManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS_A79_DESCENDANT_MANIFEST_BUILD", output: policy.descendantManifestPath, payload, manifestDigestSha256: manifest.manifestDigestSha256 }, null, 2));
