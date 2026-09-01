#!/usr/bin/env node
import fs from "node:fs";
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { canonicalJson, digestValid, readJson, sha256 } from "./historical-descendant-chain-lib.mjs";
const root = process.cwd();
const REV = "VELMERE_PASS36_A87R0_MARKET_IMPACT_WHALE_WATCH_COMMON_DENOMINATOR_AND_REAL_EVIDENCE_TRUTH_LEDGER";
const policy = readJson(root, "config/pass36/a87-market-impact-whale-watch-policy.json");
const parent = readJson(root, policy.parentDescendantManifestPath);
if (!digestValid(parent)) throw new Error("a87_parent_manifest_invalid");
if (parent.revisionId !== policy.parentRevisionId) throw new Error(`a87_parent_revision:${parent.revisionId}`);
const excluded = new Set(policy.descendantManifestExclusions);
const inv = collectPass35Inventory(root);
if (inv.unknownCount !== 0) throw new Error(`a87_unknown_inventory:${inv.unknownCount}`);
const rows = inv.entries.filter((row) => row.sourceIncluded && !excluded.has(row.path)).map((row) => ({ path: row.path, byteLength: row.byteLength, sha256: row.sha256, mode: row.mode })).sort((a, b) => a.path.localeCompare(b.path, "en"));
const payload = {
  fileCount: rows.length,
  byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
  pathSetSha256: sha256(rows.map((row) => row.path).join("\n")),
  aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")),
};
const receipt = readJson(root, "config/pass36/a87-test-receipt.json");
if (receipt.status !== "PASS_A87_LOCAL_COMMON_DENOMINATOR_NO_PROMOTION" || receipt.summary?.failed !== 0) throw new Error("a87_receipt_not_pass");
const d = receipt.denominators;
const core = {
  schemaVersion: "velmere.pass36.a87.current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: policy.parentRevisionId,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: policy.deterministicEpoch,
  payload,
  exclusions: [...excluded].sort(),
  claims: {
    marketImpactWhaleWatchCommonDenominatorImplemented: true,
    activeAssets: d.activeAssets,
    tierPackets: d.tierPackets,
    channelProjections: d.channelProjections,
    semanticMutations: d.semanticMutations,
    mutationKilled: d.mutationKilled,
    marketImpactReplayPairs: d.marketImpactReplayPairs,
    whaleHolderRows: d.whaleHolderRows,
    whaleTransferRows: d.whaleTransferRows,
    walletLabelArtifacts: d.walletLabelArtifacts,
    realEvidenceRowsVerified: 0,
    currentProviderEvidenceRows: 0,
    rightsApprovedRows: 0,
    realizedSlippageRows: 0,
    continuousMonitoringRows: 0,
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
console.log(JSON.stringify({ status: "PASS_A87_DESCENDANT_MANIFEST_BUILD", output: policy.descendantManifestPath, payload, manifestDigestSha256: manifest.manifestDigestSha256 }, null, 2));
