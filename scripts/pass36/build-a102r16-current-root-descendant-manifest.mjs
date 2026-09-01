#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { REV, PARENT, MANIFEST, PARENT_MANIFEST, STATE, RECEIPT, sha256, canonicalJson, readJson, collect, payload } from "./a102r16-source-boundary.mjs";
const root = process.cwd();
const state = readJson(root, STATE);
const parent = readJson(root, PARENT_MANIFEST);
const receipt = readJson(root, RECEIPT);
if (state.revisionId !== REV || state.parentRevisionId !== PARENT) throw new Error("a102r16_state_identity");
if (parent.revisionId !== PARENT || !parent.manifestDigestSha256) throw new Error("a102r16_parent_manifest_identity");
if (receipt.revisionId !== REV || receipt.status !== "PASS_A102R16_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION") throw new Error("a102r16_receipt_identity");
const inventory = collect(root);
if (inventory.rejected.length) throw new Error(`a102r16_rejected:${JSON.stringify(inventory.rejected)}`);
const passCredit = Object.fromEntries(Array.from({ length: 27 }, (_, index) => [`a${index + 90}PassCredit`, false]));
const claims = {
  ...passCredit, exactA77R1ToA80R1Credit: false, freshExactBuildBrowserCredit: false,
  cookieConsentBoundaryChecks: 62,
  granularAnalyticsAndMarketingChoice: true,
  analyticsDefaultOff: true,
  marketingDefaultOff: true,
  exactConsentExpiryRequired: true,
  strictJsonRequired: true,
  legacyConsentPurgedWithoutMigration: true,
  storageFailureKeepsDialogVisible: true,
  localStorageLegalProof: false,
  serverConsentLedgerRows: 0,
  realGranularConsentBrowserRows: 0,
  roadmapProgramAuthorityDriftRepaired: true,
  realObservationRuns: 0, stagingCredit: false,
  liveProven: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
};
const core = {
  schemaVersion: "velmere.pass36.a102r16.action-required-current-root-descendant-manifest.v1",
  revisionId: REV, parentRevisionId: PARENT, parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: state.generatedAt, checkpointClass: "ACTION_REQUIRED_NON_PASS", completedThrough: 89,
  coveredWorkRange: "A90-A102_LOCAL_COOKIE_CONSENT_GRANULAR_EXPIRY_STRICT_JSON_NO_FORMAL_PASS_CREDIT",
  payload: payload(inventory.rows), localRegressionReceiptSha256: sha256(fs.readFileSync(path.join(root, RECEIPT))),
  claims, denominators: state.denominators ?? state.realDenominators, skuDecisions: state.skuDecisions,
};
const output = { ...core, manifestDigestSha256: sha256(canonicalJson(core)) };
fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: "BUILT_A102R16_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION", payload: output.payload, manifestDigestSha256: output.manifestDigestSha256 }, null, 2));
