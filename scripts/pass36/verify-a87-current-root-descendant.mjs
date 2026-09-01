#!/usr/bin/env node
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { digestValid, readJson, sha256, verifyCurrentAuthority, verifyHistoricalDescendantChain } from "./historical-descendant-chain-lib.mjs";
const root = process.cwd();
const REV = "VELMERE_PASS36_A87R0_MARKET_IMPACT_WHALE_WATCH_COMMON_DENOMINATOR_AND_REAL_EVIDENCE_TRUTH_LEDGER";
const policy = readJson(root, "config/pass36/a87-market-impact-whale-watch-policy.json");
const parent = readJson(root, policy.parentDescendantManifestPath);
const manifest = readJson(root, policy.descendantManifestPath);
const receipt = readJson(root, "config/pass36/a87-test-receipt.json");
const authority = verifyCurrentAuthority(root);
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("parent:digest", digestValid(parent), parent.manifestDigestSha256);
add("parent:revision", parent.revisionId === policy.parentRevisionId, parent.revisionId);
add("manifest:digest", digestValid(manifest), manifest.manifestDigestSha256);
add("manifest:revision", manifest.revisionId === REV, manifest.revisionId);
add("manifest:parent", manifest.parentDescendantManifestDigestSha256 === parent.manifestDigestSha256, manifest.parentDescendantManifestDigestSha256);
let observed = null;
if (authority.current.sourceRevisionId === REV) {
  const excluded = new Set(policy.descendantManifestExclusions);
  const inv = collectPass35Inventory(root);
  const rows = inv.entries.filter((row) => row.sourceIncluded && !excluded.has(row.path)).map((row) => ({ path: row.path, byteLength: row.byteLength, sha256: row.sha256, mode: row.mode })).sort((a, b) => a.path.localeCompare(b.path, "en"));
  observed = { fileCount: rows.length, byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0), pathSetSha256: sha256(rows.map((row) => row.path).join("\n")), aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")) };
  for (const key of Object.keys(observed)) add(`payload:${key}`, manifest.payload?.[key] === observed[key], { declared: manifest.payload?.[key], observed: observed[key] });
  add("inventory:unknown", inv.unknownCount === 0, inv.unknownCount);
} else {
  const chain = verifyHistoricalDescendantChain(root, policy.descendantManifestPath, authority.current.sourceRevisionId);
  for (const row of chain.checks) add(`historical:${row.id}`, row.passed, row.detail);
}
const d = receipt.denominators;
add("receipt:pass", receipt.status === "PASS_A87_LOCAL_COMMON_DENOMINATOR_NO_PROMOTION" && receipt.summary?.failed === 0, receipt.status);
add("claims:denominators", manifest.claims?.activeAssets === 318 && manifest.claims?.tierPackets === 1908 && manifest.claims?.channelProjections === 7632 && manifest.claims?.semanticMutations === 34344 && manifest.claims?.mutationKilled === 34344 && manifest.claims?.marketImpactReplayPairs === 308 && manifest.claims?.whaleHolderRows === 4600 && manifest.claims?.whaleTransferRows === 7200 && manifest.claims?.walletLabelArtifacts === 1200, { claims: manifest.claims, receipt: d });
add("claims:no-credit", manifest.claims?.realEvidenceRowsVerified === 0 && manifest.claims?.currentProviderEvidenceRows === 0 && manifest.claims?.rightsApprovedRows === 0 && manifest.claims?.realizedSlippageRows === 0 && manifest.claims?.continuousMonitoringRows === 0 && manifest.claims?.productionBrowserRows === 0 && manifest.claims?.customerValueLabeledRows === 0 && manifest.claims?.paidDeliveredPackets === 0 && manifest.claims?.exactA80CandidateBound === false && manifest.claims?.paidGateEligible === false && manifest.claims?.liveProven === false && manifest.claims?.saleEnabled === false, manifest.claims);
for (const row of authority.checks) add(row.id, row.passed, row.detail);
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a87.current-root-descendant-verification.v2", revisionId: REV, status: failed.length ? "FAIL_A87_DESCENDANT" : "PASS_A87_HISTORICAL_OR_CURRENT_DESCENDANT_CHAIN", checks: checks.length, passed: checks.length - failed.length, failed: failed.length, failures: failed, currentRevisionId: authority.current.sourceRevisionId, historicalPayloadRecomputedAgainstCurrentTree: false, payload: observed, claims: manifest.claims, liveProven: false, saleEnabled: false }, null, 2));
if (failed.length) process.exit(1);
