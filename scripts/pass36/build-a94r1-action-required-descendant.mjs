#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  A94R1_MANIFEST_PATH,
  A94R1_PARENT,
  A94R1_PARENT_MANIFEST_DIGEST,
  A94R1_REVISION,
  buildA94R1Payload,
  canonicalJson,
  collectA94R1SourceRows,
  readJson,
  sha256,
} from "./a94r1-source-boundary.mjs";

const root = process.cwd();
const state = readJson(
  root,
  "config/pass36/a94r1-action-required-current-state.json",
);
if (state.revisionId !== A94R1_REVISION) {
  throw new Error("a94r1_state_revision_mismatch");
}
if (state.parentRevisionId !== A94R1_PARENT) {
  throw new Error("a94r1_state_parent_mismatch");
}
if (state.checkpointClass !== "ACTION_REQUIRED_NON_PASS") {
  throw new Error("a94r1_checkpoint_class_invalid");
}

const inventory = collectA94R1SourceRows(root);
if (inventory.rejected.length) {
  throw new Error(
    `a94r1_source_entries_rejected:${JSON.stringify(inventory.rejected)}`,
  );
}
const payload = buildA94R1Payload(inventory.rows);
const core = {
  schemaVersion:
    "velmere.pass36.a94r1.action-required-current-root-descendant-manifest.v1",
  revisionId: A94R1_REVISION,
  parentRevisionId: A94R1_PARENT,
  parentDescendantManifestDigestSha256:
    A94R1_PARENT_MANIFEST_DIGEST,
  generatedAt: state.generatedAt,
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "A90-A94_PARTIAL",
  payload,
  exclusions: [
    ".git/",
    ".velmere/",
    ".next/",
    ".next-*",
    ".turbo/",
    "_velmere/",
    "artifacts/",
    "coverage/",
    "node_modules/",
    ".env*",
    "*.log EXCEPT fixtures/pass35/a42/windows-global-json-crash.log",
    "*.db",
    "*.sqlite",
    "*.sqlite3",
    A94R1_MANIFEST_PATH,
  ],
  claims: {
    a90PassCredit: false,
    a91PassCredit: false,
    a92PassCredit: false,
    a93PassCredit: false,
    a94PassCredit: false,
    exactA77R1ToA80R1Credit: false,
    exactFinalByteBuildExecuted: false,
    currentRoot30Of30PassedOnFinalBytes: false,
    browserExecuted: false,
    stagingExecuted: false,
    realDataProven: false,
    providerRightsApproved: false,
    legalApproved: false,
    customerValueProven: false,
    independentlyAssured: false,
    liveProven: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  },
  denominators: state.denominators,
  skuDecisions: state.skuDecisions,
};
const manifest = {
  ...core,
  manifestDigestSha256: sha256(canonicalJson(core)),
};
writeFileSync(
  path.join(root, A94R1_MANIFEST_PATH),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      status: "BUILT_A94R1_ACTION_REQUIRED_DESCENDANT_NO_PASS_CREDIT",
      output: A94R1_MANIFEST_PATH,
      payload,
      manifestDigestSha256: manifest.manifestDigestSha256,
    },
    null,
    2,
  ),
);
