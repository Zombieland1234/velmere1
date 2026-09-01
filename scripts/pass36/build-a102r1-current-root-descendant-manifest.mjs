#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  REV,
  PARENT,
  MANIFEST,
  sha256,
  canonicalJson,
  readJson,
  collect,
  payload,
} from "./a102r1-source-boundary.mjs";

const root = process.cwd();
const state = readJson(root, "config/pass36/a102r1-action-required-current-state.json");
const parent = readJson(root, "config/pass36/a102-current-root-descendant-manifest.json");
if (state.revisionId !== REV || state.parentRevisionId !== PARENT) {
  throw new Error("a102r1_state_identity");
}
if (parent.revisionId !== PARENT || parent.sourceBytesRecovered !== false) {
  throw new Error("a102r1_rejected_draft_parent_identity");
}
const inventory = collect(root);
if (inventory.rejected.length) {
  throw new Error(`a102r1_rejected:${JSON.stringify(inventory.rejected)}`);
}
const claims = Object.fromEntries(
  Array.from({ length: 13 }, (_, index) => [`a${index + 90}PassCredit`, false]),
);
Object.assign(claims, {
  exactA77R1ToA80R1Credit: false,
  a102r1SyntheticBoundaryImplemented: true,
  structuralAssertions: 37,
  realObservationRuns: 0,
  realEvidenceBound: false,
  productionSloProven: false,
  continuousMonitoringProven: false,
  stagingCredit: false,
  liveProven: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
});
const core = {
  schemaVersion:
    "velmere.pass36.a102r1.action-required-current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: state.generatedAt,
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "A90-A102_LOCAL_HARDENING_NO_FORMAL_PASS_CREDIT",
  payload: payload(inventory.rows),
  claims,
  denominators: state.denominators,
  skuDecisions: state.skuDecisions,
};
const output = {
  ...core,
  manifestDigestSha256: sha256(canonicalJson(core)),
};
fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  status: "BUILT_A102R1_DESCENDANT_NO_PASS_CREDIT",
  payload: output.payload,
  manifestDigestSha256: output.manifestDigestSha256,
}, null, 2));
