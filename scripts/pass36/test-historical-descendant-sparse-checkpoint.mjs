#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  canonicalJson,
  sha256,
  verifyHistoricalDescendantChain,
} from "./historical-descendant-chain-lib.mjs";

const START_REVISION = "VELMERE_PASS36_A89R0_TEST_PARENT";
const CURRENT_REVISION = "VELMERE_PASS36_A94R1_ACTION_REQUIRED_TEST_CHILD";
const START_PATH = "config/pass36/a89-current-root-descendant-manifest.json";
const CURRENT_PATH = "config/pass36/a94r1-current-root-descendant-manifest.json";
const failures = [];
let passed = 0;

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

function fixture(mutator = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-sparse-lineage-"));
  const parent = signed({
    revisionId: START_REVISION,
    parentRevisionId: "VELMERE_PASS36_A88R1_TEST_PARENT",
    claims: { liveProven: false, saleEnabled: false },
  });
  const childCore = {
    revisionId: CURRENT_REVISION,
    parentRevisionId: START_REVISION,
    parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    completedThrough: 89,
    claims: {
      a90PassCredit: false,
      a91PassCredit: false,
      a92PassCredit: false,
      a93PassCredit: false,
      a94PassCredit: false,
      liveProven: false,
      saleEnabled: false,
      productionApproved: false,
      worldClassProven: false,
    },
  };
  const state = {
    sourceRevisionId: CURRENT_REVISION,
    currentRootDescendantManifestPath: CURRENT_PATH,
  };
  const mutable = {
    parent,
    childCore,
    state,
    extraFiles: new Map(),
    tamperSignedChild: (child) => child,
  };
  mutator(mutable);
  writeJson(root, START_PATH, mutable.parent);
  writeJson(root, CURRENT_PATH, mutable.tamperSignedChild(signed(mutable.childCore)));
  writeJson(root, "config/pass35/current-revision.json", mutable.state);
  for (const [relativePath, value] of mutable.extraFiles) writeJson(root, relativePath, value);
  return root;
}

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

function verify(root) {
  try {
    return verifyHistoricalDescendantChain(root, START_PATH, CURRENT_REVISION);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

check("admits an exact authority-declared sparse non-pass child without fabricated base manifests", () => {
  const report = verify(fixture());
  assert.equal(report.ok, true);
  assert.equal(report.current.revisionId, CURRENT_REVISION);
  assert.ok(report.checks.some((row) => row.id === "chain:step-1:transition" && row.passed));
});

for (const [name, mutate] of [
  ["rejects parent revision tamper", (fixtureState) => {
    fixtureState.childCore.parentRevisionId = "VELMERE_PASS36_A89R0_WRONG_PARENT";
  }],
  ["rejects parent digest tamper", (fixtureState) => {
    fixtureState.childCore.parentDescendantManifestDigestSha256 = "0".repeat(64);
  }],
  ["rejects completed-through inflation", (fixtureState) => {
    fixtureState.childCore.completedThrough = 90;
  }],
  ["rejects omitted pass credit", (fixtureState) => {
    fixtureState.childCore.claims.a92PassCredit = true;
  }],
  ["rejects missing omitted pass credit", (fixtureState) => {
    delete fixtureState.childCore.claims.a93PassCredit;
  }],
  ["rejects promotion claim", (fixtureState) => {
    fixtureState.childCore.claims.productionApproved = true;
  }],
  ["rejects a missing promotion claim", (fixtureState) => {
    delete fixtureState.childCore.claims.worldClassProven;
  }],
  ["rejects a tampered current digest", (fixtureState) => {
    fixtureState.tamperSignedChild = (child) => ({
      ...child,
      completedThrough: 90,
    });
  }],
  ["rejects mixed sparse and base lineage", (fixtureState) => {
    fixtureState.extraFiles.set(
      "config/pass36/a92-current-root-descendant-manifest.json",
      signed({
        revisionId: "VELMERE_PASS36_A92R0_UNEXPECTED_BASE",
        claims: { liveProven: false, saleEnabled: false },
      }),
    );
  }],
  ["rejects an orphan intermediate patch manifest", (fixtureState) => {
    fixtureState.extraFiles.set(
      "config/pass36/a92r1-current-root-descendant-manifest.json",
      signed({
        revisionId: "VELMERE_PASS36_A92R1_ORPHAN_PATCH",
        claims: { liveProven: false, saleEnabled: false },
      }),
    );
  }],
  ["rejects an ambiguous second exact child", (fixtureState) => {
    fixtureState.extraFiles.set(
      "config/pass36/a94r2-current-root-descendant-manifest.json",
      signed({
        revisionId: "VELMERE_PASS36_A94R2_AMBIGUOUS_CHILD",
        parentRevisionId: START_REVISION,
        parentDescendantManifestDigestSha256: fixtureState.parent.manifestDigestSha256,
        checkpointClass: "ACTION_REQUIRED_NON_PASS",
        completedThrough: 89,
        claims: {
          a90PassCredit: false,
          a91PassCredit: false,
          a92PassCredit: false,
          a93PassCredit: false,
          a94PassCredit: false,
          liveProven: false,
          saleEnabled: false,
          productionApproved: false,
          worldClassProven: false,
        },
      }),
    );
  }],
  ["rejects a filename and revision ambiguity", (fixtureState) => {
    fixtureState.extraFiles.set(
      "config/pass36/a94-current-root-descendant-manifest.json",
      signed({
        ...fixtureState.childCore,
        revisionId: CURRENT_REVISION,
      }),
    );
  }],
  ["rejects a non-action-required checkpoint", (fixtureState) => {
    fixtureState.childCore.checkpointClass = "PASS";
  }],
  ["rejects an undeclared current manifest", (fixtureState) => {
    fixtureState.state.currentRootDescendantManifestPath = "config/pass36/missing.json";
  }],
  ["rejects an authority revision mismatch", (fixtureState) => {
    fixtureState.state.sourceRevisionId = "VELMERE_PASS36_A94R1_WRONG_AUTHORITY";
  }],
  ["rejects a traversal manifest path", (fixtureState) => {
    fixtureState.state.currentRootDescendantManifestPath = "../../a94r1-current-root-descendant-manifest.json";
  }],
]) {
  check(name, () => {
    const report = verify(fixture(mutate));
    assert.equal(report.ok, false);
  });
}

check("preserves the contiguous base-pass path", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-contiguous-lineage-"));
  try {
    const parent = signed({
      revisionId: START_REVISION,
      claims: { liveProven: false, saleEnabled: false },
    });
    const child = signed({
      revisionId: "VELMERE_PASS36_A90R0_TEST_CHILD",
      parentRevisionId: START_REVISION,
      parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
      claims: { liveProven: false, saleEnabled: false },
    });
    writeJson(root, START_PATH, parent);
    writeJson(root, "config/pass36/a90-current-root-descendant-manifest.json", child);
    writeJson(root, "config/pass35/current-revision.json", {
      sourceRevisionId: child.revisionId,
      currentRootDescendantManifestPath: "config/pass36/a90-current-root-descendant-manifest.json",
    });
    const report = verifyHistoricalDescendantChain(root, START_PATH, child.revisionId);
    assert.equal(report.ok, true);
    assert.equal(report.current.revisionId, child.revisionId);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

check("rejects a re-signed gap inside an action-required checkpoint chain", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-gap-lineage-"));
  try {
    const parent = signed({
      revisionId: START_REVISION,
      claims: { liveProven: false, saleEnabled: false },
    });
    const a94 = signed({
      revisionId: CURRENT_REVISION,
      parentRevisionId: START_REVISION,
      parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
      checkpointClass: "ACTION_REQUIRED_NON_PASS",
      completedThrough: 89,
      claims: {
        a90PassCredit: false,
        a91PassCredit: false,
        a92PassCredit: false,
        a93PassCredit: false,
        a94PassCredit: false,
        liveProven: false,
        saleEnabled: false,
        productionApproved: false,
        worldClassProven: false,
      },
    });
    const gapRevision = "VELMERE_PASS36_A96R0_RE_SIGNED_GAP_CHILD";
    const a96 = signed({
      revisionId: gapRevision,
      parentRevisionId: CURRENT_REVISION,
      parentDescendantManifestDigestSha256: a94.manifestDigestSha256,
      checkpointClass: "ACTION_REQUIRED_NON_PASS",
      completedThrough: 89,
      claims: {
        a90PassCredit: false,
        a91PassCredit: false,
        a92PassCredit: false,
        a93PassCredit: false,
        a94PassCredit: false,
        a95PassCredit: false,
        a96PassCredit: false,
        liveProven: false,
        saleEnabled: false,
        productionApproved: false,
        worldClassProven: false,
      },
    });
    writeJson(root, START_PATH, parent);
    writeJson(root, CURRENT_PATH, a94);
    writeJson(root, "config/pass36/a96-current-root-descendant-manifest.json", a96);
    writeJson(root, "config/pass35/current-revision.json", {
      sourceRevisionId: gapRevision,
      currentRootDescendantManifestPath: "config/pass36/a96-current-root-descendant-manifest.json",
    });
    const report = verifyHistoricalDescendantChain(root, START_PATH, gapRevision);
    assert.equal(report.ok, false);
    assert.ok(report.checks.some((row) => row.id === "chain:step-2:transition" && !row.passed));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const report = {
  schemaVersion: "velmere.pass36.historical-descendant-sparse-checkpoint-test.v1",
  status: failures.length === 0 ? "PASS" : "FAIL",
  checks: passed + failures.length,
  passed,
  failed: failures.length,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
