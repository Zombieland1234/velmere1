#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { canonicalSourceMode, loadSourceModePolicy } from "./source-mode-policy.mjs";

const sourceRoot = path.resolve(process.cwd());
const verifierPath = path.join(
  sourceRoot,
  "scripts/pass36/verify-a58-release-integrity.mjs",
);
const policyPath =
  "config/pass36/a58-release-integrity-policy.json";
const productionPolicy = JSON.parse(
  fs.readFileSync(path.join(sourceRoot, policyPath), "utf8"),
);
const fixtureRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "velmere-a58-behavior-"),
);
const rawCompare = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;
const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort(rawCompare)
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(value[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

let assertionCount = 0;
const expect = (condition, message) => {
  assertionCount += 1;
  assert.ok(condition, message);
};
const expectEqual = (actual, expected, message) => {
  assertionCount += 1;
  assert.equal(actual, expected, message);
};

function writeFixtureFile(
  relativePath,
  content,
  mode = 0o644,
) {
  const absolutePath = path.join(fixtureRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
  fs.chmodSync(absolutePath, mode);
}

function collectFixtureRows() {
  const rows = [];
  const sourceModePolicy = loadSourceModePolicy(fixtureRoot, productionPolicy.crossPlatformSourceModePolicyPath);
  function walk(directory, prefix = "") {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => rawCompare(left.name, right.name));
    for (const entry of entries) {
      const relativePath = prefix
        ? `${prefix}/${entry.name}`
        : entry.name;
      if (relativePath === productionPolicy.archiveManifestPath) {
        continue;
      }
      const absolutePath = path.join(directory, entry.name);
      const metadata = fs.lstatSync(absolutePath);
      if (metadata.isDirectory()) {
        walk(absolutePath, relativePath);
        continue;
      }
      assert.equal(metadata.isFile(), true);
      const bytes = fs.readFileSync(absolutePath);
      rows.push({
        path: relativePath,
        byteLength: bytes.length,
        sha256: sha256(bytes),
        mode: canonicalSourceMode(relativePath, sourceModePolicy),
      });
    }
  }
  walk(fixtureRoot);
  return rows.sort((left, right) =>
    rawCompare(left.path, right.path));
}

function refreshDerivedFields(manifest) {
  manifest.fileCount = manifest.entries.length;
  manifest.byteLength = manifest.entries.reduce(
    (sum, entry) => sum + entry.byteLength,
    0,
  );
  manifest.pathSetSha256 = sha256(
    manifest.entries.map((entry) => entry.path).join("\n"),
  );
  manifest.aggregateSha256 = sha256(
    manifest.entries
      .map(
        (entry) =>
          `${entry.path}\0${entry.byteLength}\0${entry.sha256}\0${entry.mode}`,
      )
      .join("\n"),
  );
  return manifest;
}

function resignAndWriteManifest(manifest) {
  const core = structuredClone(manifest);
  delete core.manifestSha256;
  const signed = {
    ...core,
    manifestSha256: sha256(canonical(core)),
  };
  writeFixtureFile(
    productionPolicy.archiveManifestPath,
    `${JSON.stringify(signed, null, 2)}\n`,
  );
  return signed;
}

function runVerifier() {
  const run = spawnSync(process.execPath, [verifierPath], {
    cwd: fixtureRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  let result = null;
  try {
    result = JSON.parse(run.stdout);
  } catch (error) {
    assert.fail(
      `a58 verifier returned non-JSON output: ${
        error instanceof Error ? error.message : String(error)
      }\nstdout=${run.stdout}\nstderr=${run.stderr}`,
    );
  }
  return { run, result };
}

function checkById(result, checkId) {
  return result.checks.find((check) => check.id === checkId);
}

const semanticMutations = [];
function expectResignedMutationBlocked(
  baselineManifest,
  id,
  mutate,
  expectedFailedChecks,
  { refreshDerived = false } = {},
) {
  const candidate = structuredClone(baselineManifest);
  delete candidate.manifestSha256;
  mutate(candidate);
  if (refreshDerived) refreshDerivedFields(candidate);
  resignAndWriteManifest(candidate);
  const { run, result } = runVerifier();
  expect(
    run.status !== 0,
    `${id}: verifier must fail closed`,
  );
  expectEqual(
    result.status,
    "FAIL_RELEASE_INTEGRITY",
    `${id}: failure status`,
  );
  expect(
    result.summary.blockingFailed > 0,
    `${id}: blocking failure required`,
  );
  expectEqual(
    result.promotionAllowed,
    false,
    `${id}: promotion remains disabled`,
  );
  for (const checkId of expectedFailedChecks) {
    const check = checkById(result, checkId);
    expect(check !== undefined, `${id}: missing check ${checkId}`);
    expectEqual(check.ok, false, `${id}: ${checkId} must fail`);
    expectEqual(
      check.blocking,
      true,
      `${id}: ${checkId} must be blocking`,
    );
  }
  semanticMutations.push({
    id,
    expectedFailedChecks,
    selfHashRecomputed: true,
    blocked: true,
  });
}

try {
  const fixturePolicy = {
    ...structuredClone(productionPolicy),
    currentAuthorityVerifierPath:
      "scripts/fixture/verify-current-authority.mjs",
    a57ManifestPath: "config/pass35/a57-source-manifest.json",
    removedLegacySupplements: [],
    currentA57Supplements: [],
    historicalArtifactBlockers: [],
    crossPlatformExecutablePathCount: 1,
  };
  writeFixtureFile(
    policyPath,
    `${JSON.stringify(fixturePolicy, null, 2)}\n`,
  );
  writeFixtureFile(
    fixturePolicy.crossPlatformSourceModePolicyPath,
    `${JSON.stringify({
      schemaVersion: "velmere.pass36.cross-platform-source-mode-policy.v1",
      revisionId: fixturePolicy.currentCheckpointRevisionId,
      parentRevisionId: fixturePolicy.currentCheckpointParentRevisionId,
      regularFileMode: 0o100644,
      executableFileMode: 0o100755,
      modeAuthority: "EXACT_PATH_ALLOWLIST",
      windowsFilesystemModeIsAuthority: false,
      posixFilesystemModeIsAuthority: true,
      processExecPathRequired: true,
      shellFalseRequired: true,
      executablePaths: ["scripts/fixture/verify-current-authority.mjs"],
      truthBoundary: "fixture",
    }, null, 2)}\n`,
  );

  writeFixtureFile(
    "config/pass35/current-revision.json",
    `${JSON.stringify(
      {
        sourceRevisionId:
          fixturePolicy.currentCheckpointRevisionId,
        releaseIntegrityRevisionId: fixturePolicy.revisionId,
        activeAcceptanceRevisionId:
          fixturePolicy.activeAcceptanceRevisionId,
        saleEnabled: false,
        liveProven: false,
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    "config/pass36/current-release-authority.json",
    `${JSON.stringify(
      {
        authorityRevisionId:
          fixturePolicy.currentCheckpointRevisionId,
        parentRevisionId:
          fixturePolicy.currentCheckpointParentRevisionId,
        currentSource: {
          revisionId: fixturePolicy.currentCheckpointRevisionId,
        },
        claims: {
          checkpointClass: "ACTION_REQUIRED_NON_PASS",
          decision: "NO_GO",
          saleEnabled: false,
          liveProven: false,
          productionApproved: false,
          worldClassProven: false,
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    "config/pass35/a57-source-manifest.json",
    '{\n  "files": []\n}\n',
  );
  writeFixtureFile(
    "VELMERE_ACTIVE_PASS.txt",
    `${fixturePolicy.currentCheckpointRevisionId}\n`,
  );
  writeFixtureFile(
    "scripts/fixture/verify-current-authority.mjs",
    `console.log(JSON.stringify({
  status: ${JSON.stringify(fixturePolicy.currentAuthorityVerifierExpectedStatus)},
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  failed: 0
}));\n`,
    0o755,
  );
  writeFixtureFile(
    "scripts/pass35/verify-a57-source-manifest.mjs",
    'console.log(JSON.stringify({ status: "PASS" }));\n',
  );
  writeFixtureFile("data/A.txt", "alpha\n");
  writeFixtureFile("data/B.txt", "bravo\n");

  const fixtureEntries = collectFixtureRows();
  const baselineCore = refreshDerivedFields({
    schemaVersion:
      fixturePolicy.archiveManifestContract.schemaVersion,
    revisionId: fixturePolicy.currentCheckpointRevisionId,
    parentRevisionId:
      fixturePolicy.currentCheckpointParentRevisionId,
    normalizedTimestamp:
      fixturePolicy.archiveManifestContract.normalizedTimestamp,
    fileCount: 0,
    byteLength: 0,
    pathSetSha256: "",
    aggregateSha256: "",
    entries: fixtureEntries,
    manifestPath: fixturePolicy.archiveManifestPath,
    manifestExcludedFromOwnInventory: true,
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    completedThrough:
      fixturePolicy.archiveManifestContract.completedThrough,
    [fixturePolicy.archiveManifestContract.passCreditField]: false,
    exactReleaseCredit: false,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  });
  const baselineManifest = resignAndWriteManifest(baselineCore);
  const baselineRun = runVerifier();
  expectEqual(
    baselineRun.run.status,
    0,
    baselineRun.run.stderr || baselineRun.run.stdout,
  );
  expectEqual(
    baselineRun.result.status,
    "PASS_RELEASE_INTEGRITY_NO_PROMOTION",
    "valid physical fixture must pass",
  );
  expectEqual(
    baselineRun.result.summary.blockingFailed,
    0,
    "valid fixture must have zero blocking failures",
  );
  for (const requiredCheck of [
    "cross-platform-source-mode-policy",
    "archive-manifest-schema",
    "archive-manifest-revision",
    "archive-manifest-parent",
    "archive-manifest-path",
    "archive-manifest-action-required",
    "archive-manifest-no-credit-truth",
    "archive-manifest-entry-fields-and-modes",
    "archive-manifest-paths-unique-raw",
    "archive-manifest-paths-unique-nfkc",
    "archive-manifest-paths-unique-casefold",
    "archive-manifest-paths-unique-separator",
    "archive-manifest-raw-canonical-order",
    "archive-manifest-count",
    "archive-manifest-byte-total",
    "archive-manifest-path-set",
    "archive-manifest-aggregate",
    "archive-manifest-exact-path-set",
    "archive-manifest-physical-file-count",
    "archive-manifest-physical-byte-total",
    "archive-manifest-physical-path-set",
    "archive-manifest-physical-aggregate",
    "archive-manifest-all-bytes",
  ]) {
    const check = checkById(baselineRun.result, requiredCheck);
    expect(check !== undefined, `baseline: missing ${requiredCheck}`);
    expectEqual(check.ok, true, `baseline: ${requiredCheck}`);
  }

  expectResignedMutationBlocked(
    baselineManifest,
    "schema",
    (manifest) => {
      manifest.schemaVersion = "velmere.invalid.v1";
    },
    ["archive-manifest-schema"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "revision",
    (manifest) => {
      manifest.revisionId = "VELMERE_WRONG_REVISION";
    },
    ["archive-manifest-revision"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "parent",
    (manifest) => {
      manifest.parentRevisionId = "VELMERE_WRONG_PARENT";
    },
    ["archive-manifest-parent"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "manifest-path",
    (manifest) => {
      manifest.manifestPath = "_velmere/WRONG.json";
    },
    ["archive-manifest-path"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "checkpoint-class",
    (manifest) => {
      manifest.checkpointClass = "PASS";
    },
    ["archive-manifest-action-required"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "completed-through",
    (manifest) => {
      manifest.completedThrough =
        fixturePolicy.archiveManifestContract.completedThrough + 1;
    },
    ["archive-manifest-action-required"],
  );
  for (const field of [
    fixturePolicy.archiveManifestContract.passCreditField,
    "exactReleaseCredit",
    "live",
    "saleEnabled",
    "productionApproved",
    "worldClassProven",
  ]) {
    expectResignedMutationBlocked(
      baselineManifest,
      `truth-${field}`,
      (manifest) => {
        manifest[field] = true;
      },
      ["archive-manifest-no-credit-truth"],
    );
  }
  expectResignedMutationBlocked(
    baselineManifest,
    "file-count",
    (manifest) => {
      manifest.fileCount += 1;
    },
    ["archive-manifest-count"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "byte-total",
    (manifest) => {
      manifest.byteLength += 1;
    },
    ["archive-manifest-byte-total"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "path-set",
    (manifest) => {
      manifest.pathSetSha256 = "0".repeat(64);
    },
    ["archive-manifest-path-set"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "aggregate",
    (manifest) => {
      manifest.aggregateSha256 = "0".repeat(64);
    },
    ["archive-manifest-aggregate"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "raw-duplicate",
    (manifest) => {
      manifest.entries[1].path = manifest.entries[0].path;
      manifest.entries.sort((left, right) =>
        rawCompare(left.path, right.path));
    },
    ["archive-manifest-paths-unique-raw"],
    { refreshDerived: true },
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "nfkc-duplicate",
    (manifest) => {
      manifest.entries[0].path = "data/café.txt";
      manifest.entries[1].path = "data/cafe\u0301.txt";
      manifest.entries.sort((left, right) =>
        rawCompare(left.path, right.path));
    },
    ["archive-manifest-paths-unique-nfkc"],
    { refreshDerived: true },
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "casefold-duplicate",
    (manifest) => {
      manifest.entries[0].path = "data/Case.txt";
      manifest.entries[1].path = "data/case.txt";
      manifest.entries.sort((left, right) =>
        rawCompare(left.path, right.path));
    },
    ["archive-manifest-paths-unique-casefold"],
    { refreshDerived: true },
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "separator-duplicate",
    (manifest) => {
      manifest.entries[0].path = "data/separator/file.txt";
      manifest.entries[1].path = "data/separator\\file.txt";
      manifest.entries.sort((left, right) =>
        rawCompare(left.path, right.path));
    },
    ["archive-manifest-paths-unique-separator"],
    { refreshDerived: true },
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "raw-order",
    (manifest) => {
      manifest.entries.reverse();
    },
    ["archive-manifest-raw-canonical-order"],
    { refreshDerived: true },
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "entry-byte-type",
    (manifest) => {
      manifest.entries[0].byteLength =
        String(manifest.entries[0].byteLength);
    },
    ["archive-manifest-entry-fields-and-modes"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "entry-mode",
    (manifest) => {
      manifest.entries[0].mode = 0o100600;
    },
    ["archive-manifest-entry-fields-and-modes"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "entry-extra-field",
    (manifest) => {
      manifest.entries[0].role = "ACTIVE_SOURCE";
    },
    ["archive-manifest-entry-fields-and-modes"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "manifest-extra-field",
    (manifest) => {
      manifest.unapprovedField = true;
    },
    ["archive-manifest-top-level-fields"],
  );
  expectResignedMutationBlocked(
    baselineManifest,
    "manifest-self-entry",
    (manifest) => {
      manifest.entries.push({
        path: fixturePolicy.archiveManifestPath,
        byteLength: 0,
        sha256: sha256(""),
        mode: 0o100644,
      });
      manifest.entries.sort((left, right) =>
        rawCompare(left.path, right.path));
    },
    ["archive-manifest-self-excluded"],
    { refreshDerived: true },
  );

  resignAndWriteManifest(baselineManifest);
  writeFixtureFile("data/A.txt", "alpha tampered\n");
  const physicalTamper = runVerifier();
  expect(
    physicalTamper.run.status !== 0,
    "physical byte tamper must fail closed",
  );
  for (const checkId of [
    "archive-manifest-physical-byte-total",
    "archive-manifest-physical-aggregate",
    "archive-manifest-all-bytes",
  ]) {
    const check = checkById(physicalTamper.result, checkId);
    expect(check !== undefined, `physical tamper: missing ${checkId}`);
    expectEqual(
      check.ok,
      false,
      `physical tamper: ${checkId} must fail`,
    );
  }
  writeFixtureFile("data/A.txt", "alpha\n");
  resignAndWriteManifest(baselineManifest);
  const restoredRun = runVerifier();
  expectEqual(
    restoredRun.run.status,
    0,
    "restored fixture must pass",
  );

  console.log(
    JSON.stringify(
      {
        status:
          "PASS_A58_RELEASE_INTEGRITY_BEHAVIORAL_MANIFEST_MATRIX",
        assertions: assertionCount,
        validFixturePassed: true,
        resignedSemanticMutations: semanticMutations.length,
        physicalTamperBlocked: true,
        mutationResults: semanticMutations,
        archiveManifestContract:
          fixturePolicy.archiveManifestContract,
        currentSourceRevisionId:
          fixturePolicy.currentCheckpointRevisionId,
        promotionAllowed: false,
        liveProven: false,
        saleEnabled: false,
        productionApproved: false,
      },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
