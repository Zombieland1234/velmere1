#!/usr/bin/env node
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { digestValid, readJson, sha256, verifyCurrentAuthority, verifyHistoricalDescendantChain } from "./historical-descendant-chain-lib.mjs";
const root = process.cwd();
const REV = "VELMERE_PASS36_A85R0_SHIELD_PRO_AND_SHIELD_MAP_FULL_DEPTH_IDENTITY_ENTITLEMENT_MATRIX";
const policy = readJson(root, "config/pass36/a85-shield-pro-map-full-depth-policy.json");
const parent = readJson(root, policy.parentDescendantManifestPath);
const manifest = readJson(root, policy.descendantManifestPath);
const receipt = readJson(root, "config/pass36/a85-test-receipt.json");
const authority = verifyCurrentAuthority(root);
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("parent:digest", digestValid(parent), parent.manifestDigestSha256);
add("parent:revision", parent.revisionId === policy.parentRevisionId, parent.revisionId);
add("manifest:digest", digestValid(manifest), manifest.manifestDigestSha256);
add("manifest:revision", manifest.revisionId === REV, manifest.revisionId);
add("manifest:parent", manifest.parentDescendantManifestDigestSha256 === parent.manifestDigestSha256);
const d = receipt.fixtureDenominators;
add("receipt:pass", receipt.status === "PASS_A85_LOCAL_FULL_DEPTH_MATRIX_NO_PROMOTION" && receipt.summary?.failed === 0, receipt.status);
add("claims:denominators", manifest.claims?.activeAssets === 318 && manifest.claims?.tierPackets === 954 && manifest.claims?.surfaceProjections === 1908 && manifest.claims?.terminalTimeframeRows === 5724 && manifest.claims?.investigatorLaneRows === 5724 && manifest.claims?.semanticMutations === 15264 && manifest.claims?.mutationKilled === 15264, { claims: manifest.claims, receipt: d });
add("claims:no-credit", manifest.claims?.realFullCatalogCasesVerified === 0 && manifest.claims?.productionBrowserAssets === 0 && manifest.claims?.rightsApprovedAssets === 0 && manifest.claims?.serverEntitlementAssets === 0 && manifest.claims?.customerValueLabeledAssets === 0 && manifest.claims?.paidDeliveredPackets === 0 && manifest.claims?.exactA80CandidateBound === false && manifest.claims?.paidGateEligible === false && manifest.claims?.liveProven === false && manifest.claims?.saleEnabled === false, manifest.claims);
if (authority.current.sourceRevisionId === REV) {
  const excluded = new Set(policy.descendantManifestExclusions);
  const inv = collectPass35Inventory(root);
  const rows = inv.entries.filter((row) => row.sourceIncluded && !excluded.has(row.path)).map((row) => ({ path: row.path, byteLength: row.byteLength, sha256: row.sha256, mode: row.mode })).sort((a, b) => a.path.localeCompare(b.path, "en"));
  const observed = { fileCount: rows.length, byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0), pathSetSha256: sha256(rows.map((row) => row.path).join("\n")), aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")) };
  for (const key of Object.keys(observed)) add(`payload:${key}`, manifest.payload?.[key] === observed[key], { declared: manifest.payload?.[key], observed: observed[key] });
  add("inventory:unknown", inv.unknownCount === 0, inv.unknownCount);
} else {
  const chain = verifyHistoricalDescendantChain(root, policy.descendantManifestPath, authority.current.sourceRevisionId);
  for (const row of chain.checks) add(`historical:${row.id}`, row.passed, row.detail);
}
for (const row of authority.checks) add(row.id, row.passed, row.detail);
const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a85.current-root-descendant-verification.v2",
  revisionId: REV,
  status: failed.length ? "FAIL_A85_DESCENDANT" : "PASS_A85_HISTORICAL_OR_CURRENT_DESCENDANT_CHAIN",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  currentRevisionId: authority.current.sourceRevisionId,
  historicalPayloadRecomputedAgainstCurrentTree: false,
  realFullCatalogCasesVerified: 0,
  liveProven: false,
  saleEnabled: false,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
