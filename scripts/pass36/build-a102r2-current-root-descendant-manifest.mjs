#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  REV,
  PARENT,
  MANIFEST,
  PARENT_MANIFEST,
  sha256,
  canonicalJson,
  readJson,
  collect,
  payload,
} from "./a102r2-source-boundary.mjs";

const root = process.cwd();
const state = readJson(root, "config/pass36/a102r2-action-required-current-state.json");
const parent = readJson(root, PARENT_MANIFEST);
if (state.revisionId !== REV || state.parentRevisionId !== PARENT) {
  throw new Error("a102r2_state_identity");
}
if (parent.revisionId !== PARENT || !parent.manifestDigestSha256) {
  throw new Error("a102r2_parent_manifest_identity");
}
const inventory = collect(root);
if (inventory.rejected.length) {
  throw new Error(`a102r2_rejected:${JSON.stringify(inventory.rejected)}`);
}
const passCredit = Object.fromEntries(
  Array.from({ length: 27 }, (_, index) => [`a${index + 90}PassCredit`, false]),
);
const claims = {
  ...passCredit,
  exactA77R1ToA80R1Credit: false,
  a88r2LocalBehavioralCredit: true,
  behavioralHandlerInvocations: 324,
  resignedSemanticMutantsKilled: 6480,
  resignedSemanticMutantsRequired: 6480,
  syntheticPdfGhostscriptDocuments: 450,
  realObservationRuns: 0,
  realEvidenceBound: false,
  productionSloProven: false,
  continuousMonitoringProven: false,
  stagingCredit: false,
  rightsApprovedProviders: 0,
  legalDecisionsSigned: 0,
  customerCohortsVerified: 0,
  independentAssuranceVerified: false,
  exactChromiumVerified: false,
  liveProven: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false
};
const core = {
  schemaVersion:
    "velmere.pass36.a102r2.action-required-current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: state.generatedAt,
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange:
    "A90-A102_LOCAL_SECURITY_PRIVACY_BEHAVIORAL_DATA_AND_RUNTIME_CLOSURE_NO_FORMAL_PASS_CREDIT",
  payload: payload(inventory.rows),
  claims,
  denominators: state.denominators,
  skuDecisions: state.skuDecisions
};
const output = {
  ...core,
  manifestDigestSha256: sha256(canonicalJson(core))
};
fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  status: "BUILT_A102R2_DESCENDANT_NO_PROMOTION",
  payload: output.payload,
  manifestDigestSha256: output.manifestDigestSha256
}, null, 2));
