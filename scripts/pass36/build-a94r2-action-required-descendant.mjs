#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  A94R2_MANIFEST_PATH,
  A94R2_PARENT,
  A94R2_PARENT_MANIFEST_DIGEST,
  A94R2_REVISION,
  buildA94R2Payload,
  canonicalJson,
  collectA94R2SourceRows,
  readJson,
  sha256,
} from "./a94r2-source-boundary.mjs";

const root = process.cwd();
const state = readJson(
  root,
  "config/pass36/a94r2-action-required-current-state.json",
);
if (state.revisionId !== A94R2_REVISION) {
  throw new Error("a94r2_state_revision_mismatch");
}
if (state.parentRevisionId !== A94R2_PARENT) {
  throw new Error("a94r2_state_parent_mismatch");
}
if (state.checkpointClass !== "ACTION_REQUIRED_NON_PASS") {
  throw new Error("a94r2_checkpoint_class_invalid");
}

const inventory = collectA94R2SourceRows(root);
if (inventory.rejected.length) {
  throw new Error(
    `a94r2_source_entries_rejected:${JSON.stringify(inventory.rejected)}`,
  );
}
const payload = buildA94R2Payload(inventory.rows);
const core = {
  schemaVersion:
    "velmere.pass36.a94r2.action-required-current-root-descendant-manifest.v1",
  revisionId: A94R2_REVISION,
  parentRevisionId: A94R2_PARENT,
  parentDescendantManifestDigestSha256:
    A94R2_PARENT_MANIFEST_DIGEST,
  generatedAt: state.generatedAt,
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "A90-A94_PARTIAL_PLUS_A94R2_LOCAL_CLOSURES",
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
    A94R2_MANIFEST_PATH,
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
  path.join(root, A94R2_MANIFEST_PATH),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      status: "BUILT_A94R2_ACTION_REQUIRED_DESCENDANT_NO_PASS_CREDIT",
      output: A94R2_MANIFEST_PATH,
      payload,
      manifestDigestSha256: manifest.manifestDigestSha256,
    },
    null,
    2,
  ),
);
