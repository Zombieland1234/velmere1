#!/usr/bin/env node
import fs from "node:fs";
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { canonicalJson, digestValid, readJson, sha256 } from "./historical-descendant-chain-lib.mjs";
const root = process.cwd();
const REV = "VELMERE_PASS36_A86R0_REAL_MARKETS_CROSS_ASSET_FULL_MATRIX_AND_DATA_RIGHTS_TRUTH_LEDGER";
const policy = readJson(root, "config/pass36/a86-real-markets-cross-asset-policy.json");
const parent = readJson(root, policy.parentDescendantManifestPath);
if (!digestValid(parent)) throw new Error("a86_parent_manifest_invalid");
if (parent.revisionId !== policy.parentRevisionId) throw new Error(`a86_parent_revision:${parent.revisionId}`);
const excluded = new Set(policy.descendantManifestExclusions);
const inv = collectPass35Inventory(root);
if (inv.unknownCount !== 0) throw new Error(`a86_unknown_inventory:${inv.unknownCount}`);
const rows = inv.entries.filter((row) => row.sourceIncluded && !excluded.has(row.path)).map((row) => ({ path: row.path, byteLength: row.byteLength, sha256: row.sha256, mode: row.mode })).sort((a, b) => a.path.localeCompare(b.path, "en"));
const payload = {
  fileCount: rows.length,
  byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
  pathSetSha256: sha256(rows.map((row) => row.path).join("\n")),
  aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")),
};
const receipt = readJson(root, "config/pass36/a86-test-receipt.json");
if (receipt.status !== "PASS_A86_LOCAL_CROSS_ASSET_MATRIX_NO_PROMOTION" || receipt.summary?.failed !== 0) throw new Error("a86_receipt_not_pass");
const d = receipt.denominators;
const core = {
  schemaVersion: "velmere.pass36.a86.current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: policy.parentRevisionId,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: policy.deterministicEpoch,
  payload,
  exclusions: [...excluded].sort(),
  claims: {
    realMarketsCrossAssetMatrixImplemented: true,
    totalInstruments: d.instruments,
    fieldRows: d.fieldRows,
    tierPackets: d.tierPackets,
    channelProjections: d.channelProjections,
    semanticMutations: d.semanticMutations,
    mutationKilled: d.mutationKilled,
    realEvidenceRowsVerified: 0,
    currentProviderEvidenceRows: 0,
    rightsApprovedRows: 0,
    productionBrowserRows: 0,
    customerValueLabeledRows: 0,
    paidDeliveredPackets: 0,
    exactA80CandidateBound: false,
    paidGateEligible: false,
    liveProven: false,
    saleEnabled: false,
  },
};
const manifest = { ...core, manifestDigestSha256: sha256(canonicalJson(core)) };
fs.writeFileSync(policy.descendantManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS_A86_DESCENDANT_MANIFEST_BUILD", output: policy.descendantManifestPath, payload, manifestDigestSha256: manifest.manifestDigestSha256 }, null, 2));
