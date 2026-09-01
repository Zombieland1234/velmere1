#!/usr/bin/env node
import fs from "node:fs";
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { createHash } from "node:crypto";

const A81_REVISION = "VELMERE_PASS36_A81R0_CANONICAL_BASIC_PRO_ADVANCED_MEGA_MATRIX_ORCHESTRATOR";
const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const policy = readJson("config/pass36/a81-canonical-mega-matrix-orchestrator.json");
const parent = readJson(policy.parentDescendantManifestPath);
const parentCore = { ...parent }; delete parentCore.manifestDigestSha256;
if (parent.manifestDigestSha256 !== sha256(canonicalJson(parentCore))) throw new Error("a81_parent_descendant_manifest_invalid");
const excluded = new Set(policy.descendantManifestExclusions);
const inventory = collectPass35Inventory(root);
if (inventory.unknownCount !== 0) throw new Error(`a81_descendant_unknown_inventory:${inventory.unknownCount}`);
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
  schemaVersion: "velmere.pass36.a81.current-root-descendant-manifest.v1",
  revisionId: A81_REVISION,
  parentRevisionId: policy.parentRevisionId,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: policy.deterministicEpoch,
  payload,
  exclusions: [...excluded].sort(),
  claims: {
    canonicalMegaMatrixImplemented: true,
    canonicalProviderBoundOutputsExecuted: false,
    exactA80CandidateBound: false,
    customerPurchaseWorthinessProven: false,
    stagingProven: false,
    liveProven: false,
    saleEnabled: false
  }
};
const manifest = { ...core, manifestDigestSha256: sha256(canonicalJson(core)) };
fs.writeFileSync(policy.descendantManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS_A81_DESCENDANT_MANIFEST_BUILD", output: policy.descendantManifestPath, payload, manifestDigestSha256: manifest.manifestDigestSha256 }, null, 2));
