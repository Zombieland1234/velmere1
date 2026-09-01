#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  evaluateCriticalOfflineGateTruth,
  inspectCriticalOfflineCheckpointTruth,
} from "./run-critical-offline-gate.mjs";
import {
  canonicalJson,
  descendantManifestPathForRevision,
  sha256,
} from "../pass36/historical-descendant-chain-lib.mjs";

const REVISION = "VELMERE_PASS36_A94R1_ACTION_REQUIRED_TEST_CHECKPOINT";
const PARENT = "VELMERE_PASS36_A89R0_TEST_PARENT";
const MANIFEST_PATH = "config/pass36/a94r1-current-root-descendant-manifest.json";
const AUTHORITY_PATH = "config/pass36/current-release-authority.json";
function signed(document) {
  return {
    ...document,
    manifestDigestSha256: sha256(canonicalJson(document)),
  };
}

function writeJson(root, relativePath, value) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function actionRequiredFixture(mutator = () => {}, options = {}) {
  const revision = options.revision ?? REVISION;
  const parentRevision = options.parentRevision ?? PARENT;
  const manifestPath = options.manifestPath ?? MANIFEST_PATH;
  const currentPass = Number(revision.match(/PASS36_A(\d+)R/u)?.[1] ?? 94);
  const passClaims = Object.fromEntries(
    Array.from(
      { length: currentPass - 89 },
      (_, index) => [`a${index + 90}PassCredit`, false],
    ),
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-critical-gate-truth-"));
  const parent = signed(options.parentDocument ?? {
    revisionId: parentRevision,
    claims: { liveProven: false, saleEnabled: false },
  });
  const state = {
    sourceRevisionId: revision,
    parentSourceRevisionId: parentRevision,
    currentReleaseAuthorityPath: AUTHORITY_PATH,
    currentRootDescendantManifestPath: manifestPath,
    currentRootDescendantManifestRevisionId: revision,
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    checkpointCompletedThrough: 89,
    a90ToA94PassCredit: false,
    liveProven: false,
    saleEnabled: false,
    worldClassProven: false,
  };
  const authority = {
    authorityRevisionId: revision,
    currentSource: { revisionId: revision, parentRevisionId: parentRevision },
    planes: {
      localHardeningCheckpoint: {
        revisionId: revision,
        checkpointClass: "ACTION_REQUIRED_NON_PASS",
        completedThrough: 89,
        ...passClaims,
      },
    },
    claims: {
      checkpointClass: "ACTION_REQUIRED_NON_PASS",
      completedThrough: 89,
      a90ToA94PassCredit: false,
      decision: "NO_GO",
      liveProven: false,
      saleEnabled: false,
      productionApproved: false,
      worldClassProven: false,
    },
  };
  const manifest = {
    revisionId: revision,
    parentRevisionId: parentRevision,
    parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    completedThrough: 89,
    claims: {
      ...passClaims,
      liveProven: false,
      saleEnabled: false,
      productionApproved: false,
      worldClassProven: false,
    },
  };
  mutator({ state, authority, manifest, parent });
  writeJson(root, "config/pass35/current-revision.json", state);
  writeJson(root, AUTHORITY_PATH, authority);
  writeJson(root, descendantManifestPathForRevision(parentRevision), parent);
  writeJson(root, manifestPath, signed(manifest));
  return root;
}

function standardFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-critical-gate-standard-"));
  writeJson(root, "config/pass35/current-revision.json", {
    sourceRevisionId: "VELMERE_PASS36_A89R0_STANDARD_TEST",
    currentReleaseAuthorityPath: AUTHORITY_PATH,
    currentRootDescendantManifestPath: "config/pass36/a89-current-root-descendant-manifest.json",
  });
  writeJson(root, AUTHORITY_PATH, {
    authorityRevisionId: "VELMERE_PASS36_A89R0_STANDARD_TEST",
    claims: { liveProven: false, saleEnabled: false },
  });
  writeJson(root, "config/pass36/a89-current-root-descendant-manifest.json", {
    revisionId: "VELMERE_PASS36_A89R0_STANDARD_TEST",
    claims: { liveProven: false, saleEnabled: false },
  });
  return root;
}

function inspectFixture(root) {
  try {
    return inspectCriticalOfflineCheckpointTruth(root, { lineageMode: "current-root" });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const failures = [];
let passed = 0;
function check(name, action) {
  try {
    action();
    passed += 1;
  } catch (error) {
    failures.push({
      name,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

const exactPassingExecution = {
  advisoryCodeOnlyPassed: true,
  exactNodeRuntime: true,
  genuineRuntimePackagesAvailable: true,
};

check("valid action-required checkpoint preserves exact execution without release-candidate credit", () => {
  const checkpointTruth = inspectFixture(actionRequiredFixture());
  assert.equal(checkpointTruth.valid, true);
  assert.equal(checkpointTruth.mode, "ACTION_REQUIRED_NON_PASS");
  const result = evaluateCriticalOfflineGateTruth({
    ...exactPassingExecution,
    checkpointTruth,
  });
  assert.equal(result.status, "PASS_CODE_ONLY_ACTION_REQUIRED_CHECKPOINT");
  assert.equal(result.exactExecutionPassed, true);
  assert.equal(result.executionAccepted, true);
  assert.equal(result.offlineReleaseCandidateEligible, false);
});

check("explicit rejected-draft tombstone may bridge lineage without fabricating source bytes", () => {
  const parentRevision =
    "VELMERE_PASS36_A102R0_REJECTED_DRAFT_TEST_TOMBSTONE";
  const checkpointTruth = inspectFixture(actionRequiredFixture(
    () => {},
    {
      revision: "VELMERE_PASS36_A102R1_ACTION_REQUIRED_TEST_CHECKPOINT",
      parentRevision,
      manifestPath:
        "config/pass36/a102r1-current-root-descendant-manifest.json",
      parentDocument: {
        revisionId: parentRevision,
        parentRevisionId: "VELMERE_PASS36_A101R0_TEST_PARENT",
        checkpointClass: "REJECTED_DRAFT_NO_SOURCE_AUTHORITY",
        completedThrough: 89,
        payloadIdentityAvailable: false,
        sourceBytesRecovered: false,
        reason: "Rejected before a source checkpoint was issued.",
        claims: {
          realEvidenceBound: false,
          stagingCredit: false,
          liveProven: false,
          saleEnabled: false,
          productionApproved: false,
          worldClassProven: false,
        },
      },
    },
  ));
  assert.equal(checkpointTruth.valid, true);
  assert.equal(checkpointTruth.mode, "ACTION_REQUIRED_NON_PASS");
  assert.equal(checkpointTruth.lineageParentPass, 102);
});

for (const [name, mutateParent] of [
  [
    "rejected-draft tombstone with claimed source recovery fails closed",
    (parent) => { parent.sourceBytesRecovered = true; },
  ],
  [
    "rejected-draft tombstone with promotion claim fails closed",
    (parent) => { parent.claims.saleEnabled = true; },
  ],
]) {
  check(name, () => {
    const parentRevision =
      "VELMERE_PASS36_A102R0_REJECTED_DRAFT_TEST_TOMBSTONE";
    const root = actionRequiredFixture(
      ({ parent }) => { mutateParent(parent); },
      {
        revision: "VELMERE_PASS36_A102R1_ACTION_REQUIRED_TEST_CHECKPOINT",
        parentRevision,
        manifestPath:
          "config/pass36/a102r1-current-root-descendant-manifest.json",
        parentDocument: {
          revisionId: parentRevision,
          parentRevisionId: "VELMERE_PASS36_A101R0_TEST_PARENT",
          checkpointClass: "REJECTED_DRAFT_NO_SOURCE_AUTHORITY",
          completedThrough: 89,
          payloadIdentityAvailable: false,
          sourceBytesRecovered: false,
          reason: "Rejected before a source checkpoint was issued.",
          claims: {
            realEvidenceBound: false,
            stagingCredit: false,
            liveProven: false,
            saleEnabled: false,
            productionApproved: false,
            worldClassProven: false,
          },
        },
      },
    );
    const checkpointTruth = inspectFixture(root);
    assert.equal(checkpointTruth.valid, false);
    assert.ok(
      checkpointTruth.blockers.includes(
        "lineage_parent_checkpoint_class_invalid",
      ),
    );
  });
}

check("standard current-root checkpoint preserves prior offline candidate behavior", () => {
  const checkpointTruth = inspectFixture(standardFixture());
  assert.equal(checkpointTruth.valid, true);
  assert.equal(checkpointTruth.mode, "STANDARD");
  const result = evaluateCriticalOfflineGateTruth({
    ...exactPassingExecution,
    checkpointTruth,
  });
  assert.equal(result.status, "PASS_OFFLINE_RELEASE_CANDIDATE");
  assert.equal(result.executionAccepted, true);
  assert.equal(result.offlineReleaseCandidateEligible, true);
});

for (const [name, mutate, expectedBlocker] of [
  [
    "missing checkpoint class fails closed",
    ({ manifest }) => { delete manifest.checkpointClass; },
    "manifest_checkpoint_class_not_action_required_non_pass",
  ],
  [
    "wrong checkpoint class fails closed",
    ({ authority }) => { authority.claims.checkpointClass = "PASS"; },
    "authority_checkpoint_class_not_action_required_non_pass",
  ],
  [
    "missing no-credit truth fails closed",
    ({ authority }) => { delete authority.claims.a90ToA94PassCredit; },
    "authority_omitted_pass_credit_not_false",
  ],
  [
    "promotion truth fails closed",
    ({ manifest }) => { manifest.claims.productionApproved = true; },
    "manifest_production_approved_not_false",
  ],
  [
    "parent digest mismatch fails closed",
    ({ manifest }) => { manifest.parentDescendantManifestDigestSha256 = "0".repeat(64); },
    "manifest_parent_digest_mismatch",
  ],
  [
    "last completed canonical pass inflation fails closed",
    ({ state }) => { state.checkpointCompletedThrough = 94; },
    "checkpoint_last_completed_canonical_pass_invalid",
  ],
]) {
  check(name, () => {
    const checkpointTruth = inspectFixture(actionRequiredFixture(mutate));
    assert.equal(checkpointTruth.valid, false);
    assert.ok(checkpointTruth.blockers.includes(expectedBlocker));
    const result = evaluateCriticalOfflineGateTruth({
      ...exactPassingExecution,
      checkpointTruth,
    });
    assert.equal(result.status, "BLOCKED_CHECKPOINT_TRUTH");
    assert.equal(result.executionAccepted, false);
    assert.equal(result.offlineReleaseCandidateEligible, false);
  });
}

check("failed suites remain blocked for an otherwise valid action-required checkpoint", () => {
  const checkpointTruth = inspectFixture(actionRequiredFixture());
  const result = evaluateCriticalOfflineGateTruth({
    ...exactPassingExecution,
    advisoryCodeOnlyPassed: false,
    checkpointTruth,
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.executionAccepted, false);
  assert.equal(result.offlineReleaseCandidateEligible, false);
});

check("wrong exact runtime preserves the standard advisory status and nonzero admission", () => {
  const checkpointTruth = inspectFixture(standardFixture());
  const result = evaluateCriticalOfflineGateTruth({
    ...exactPassingExecution,
    exactNodeRuntime: false,
    checkpointTruth,
  });
  assert.equal(result.status, "PASS_ADVISORY_WRONG_NODE_RUNTIME");
  assert.equal(result.executionAccepted, false);
  assert.equal(result.offlineReleaseCandidateEligible, false);
});

const report = {
  schemaVersion: "velmere.pass6.critical-offline-gate-checkpoint-truth-test.v1",
  status: failures.length === 0 ? "PASS" : "FAIL",
  checks: passed + failures.length,
  passed,
  failed: failures.length,
  failures,
  truthBoundary:
    "A valid ACTION_REQUIRED_NON_PASS checkpoint may retain exact suite-execution credit and exit successfully, but can never receive offline release-candidate, LIVE or sale credit.",
};
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
