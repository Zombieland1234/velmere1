#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  REV,
  PARENT,
  MANIFEST,
  PARENT_MANIFEST,
  STATE,
  RECEIPT,
  MODE_POLICY,
  sha256,
  canonicalJson,
  readJson,
  collect,
  payload,
} from "./a102r39-source-boundary.mjs";

const root = process.cwd();
const state = readJson(root, STATE);
const parent = readJson(root, PARENT_MANIFEST);
const receipt = readJson(root, RECEIPT);
const modePolicy = readJson(root, MODE_POLICY);
if (state.revisionId !== REV || state.parentRevisionId !== PARENT) throw new Error("a102r39_state_identity");
if (parent.revisionId !== PARENT || !parent.manifestDigestSha256) throw new Error("a102r39_parent_manifest_identity");
if (receipt.revisionId !== REV || receipt.status !== "PASS_A102R39_CROSS_PLATFORM_SOURCE_MODE_AND_RELEASE_INTEGRITY_REGRESSION_ACTION_REQUIRED_NO_FRESH_WINDOWS_BUILD_BROWSER_CREDIT") throw new Error("a102r39_receipt_identity");
if (modePolicy.revisionId !== REV || modePolicy.parentRevisionId !== PARENT) throw new Error("a102r39_mode_policy_identity");
const inventory = collect(root);
if (inventory.rejected.length) throw new Error(`a102r39_rejected:${JSON.stringify(inventory.rejected)}`);
const windowsInventory = collect(root, { platform: "win32" });
if (windowsInventory.rejected.length) throw new Error(`a102r39_windows_rejected:${JSON.stringify(windowsInventory.rejected)}`);
const posixPayload = payload(inventory.rows);
const windowsPayload = payload(windowsInventory.rows);
if (canonicalJson(posixPayload) !== canonicalJson(windowsPayload)) throw new Error("a102r39_cross_platform_payload_drift");
const claims = {};
for (let index = 90; index <= 116; index += 1) claims[`a${index}PassCredit`] = false;
Object.assign(claims, {
  exactA77R1ToA80R1Credit: false,
  a102r39ModePolicyChecks: 21,
  a58CrossPlatformChecks: 45,
  executablePathDenominator: modePolicy.executablePaths.length,
  canonicalModes: [modePolicy.regularFileMode, modePolicy.executableFileMode],
  windowsFilesystemModeAuthority: false,
  posixExactPermissionParity: true,
  crossPlatformPayloadParity: true,
  sourceAuthorityReconciled: true,
  formalRemainingEntries: 31,
  planningMinimum: 11,
  planningMostLikely: 23,
  planningWithRevisions: 39,
  realBrowserRows: 0,
  stagingCredit: false,
  exactWindowsBuildBrowserCredit: false,
  liveProven: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
});
const output = {
  schemaVersion: "velmere.pass36.a102r39.current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: "2026-08-01T05:30:00+02:00",
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "A102R39_CROSS_PLATFORM_SOURCE_MODE_IDENTITY_WINDOWS_UNPACK_AND_POSIX_EXECUTABLE_POLICY_LOCAL_ONLY_NO_FORMAL_PASS_CREDIT",
  payload: posixPayload,
  windowsCanonicalPayload: windowsPayload,
  localRegressionReceiptSha256: sha256(fs.readFileSync(path.join(root, RECEIPT))),
  sourceModePolicySha256: sha256(fs.readFileSync(path.join(root, MODE_POLICY))),
  claims,
  denominators: state.realDenominators,
  skuDecisions: state.skuDecisions,
};
output.manifestDigestSha256 = sha256(canonicalJson(output));
fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  status: "BUILT_A102R39_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION",
  payload: output.payload,
  windowsCanonicalPayload: output.windowsCanonicalPayload,
  manifestDigestSha256: output.manifestDigestSha256,
}, null, 2));
