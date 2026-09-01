#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { REV, PARENT, MANIFEST, sha256, canonicalJson, readJson, collect, payload } from "./a101-source-boundary.mjs";
const root = process.cwd();
const state = readJson(root, "config/pass36/a101-action-required-current-state.json");
const parent = readJson(root, "config/pass36/a100-current-root-descendant-manifest.json");
if (state.revisionId !== REV || state.parentRevisionId !== PARENT) throw new Error("a101_state_identity");
if (parent.revisionId !== PARENT) throw new Error("a101_parent_identity");
const inventory = collect(root);
if (inventory.rejected.length) throw new Error(`a101_rejected:${JSON.stringify(inventory.rejected)}`);
const core = {
  schemaVersion: "velmere.pass36.a101.action-required-current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: state.generatedAt,
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "A90-A101_LOCAL_HARDENING_NO_PASS_CREDIT",
  payload: payload(inventory.rows),
  claims: {
    a90PassCredit: false, a91PassCredit: false, a92PassCredit: false, a93PassCredit: false, a94PassCredit: false,
    a95PassCredit: false, a96PassCredit: false, a97PassCredit: false, a97r1PassCredit: false, a98PassCredit: false,
    a99PassCredit: false, a100PassCredit: false, a101PassCredit: false, exactA77R1ToA80R1Credit: false,
    sloErrorBudgetVendorExitRecoveryBoundaryImplemented: true,
    boundaryAssertions: 94, fixtureScenarios: 15,
    realSloWindows: 0, realVendorExitRuns: 0, realCredentialRevocationProbes: 0,
    realAlternateServiceProbeSets: 0, realPrimaryRestoreConfirmations: 0,
    productionSloProven: false, continuousMonitoringProven: false,
    stagingCredit: false, liveProven: false, saleEnabled: false, productionApproved: false, worldClassProven: false
  },
  denominators: state.denominators,
  skuDecisions: state.skuDecisions
};
const output = { ...core, manifestDigestSha256: sha256(canonicalJson(core)) };
fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: "BUILT_A101_DESCENDANT_NO_PASS_CREDIT", payload: output.payload, manifestDigestSha256: output.manifestDigestSha256 }, null, 2));
