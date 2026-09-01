import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { computePass4823SourceTree } from "../pass4823/typecheck-source-contract.mjs";
import { buildTruthBoundIndex } from "./build-world-class-evidence-index.mjs";
import {
  evaluateWorldClassRequirementEvidence,
  sealWorldClassEvidence,
} from "./world-class-gate-contract.mjs";
import {
  EVIDENCE_FILE_BLUEPRINTS,
  sealTruthBoundEvidenceIndex,
  verifyTruthBoundEvidenceIndex,
} from "./world-class-evidence-index-contract.mjs";

const projectRoot = process.cwd();
const fixtureWorkspaceRoot = process.env.PASS4826_FIXTURE_WORKSPACE_ROOT
  ? path.resolve(process.env.PASS4826_FIXTURE_WORKSPACE_ROOT)
  : mkdtempSync(path.join(tmpdir(), "velmere-pass4826-evidence-"));
const workspaceRoot = fixtureWorkspaceRoot;
const projectEvidenceRoot = path.join(fixtureWorkspaceRoot, "project-evidence");
const generatedAt = "2026-07-18T20:00:00.000Z";
const fixtureDigest = "a".repeat(64);
const forbiddenFixturePassMarker = ["PASS", "FIXTURE"].join("_");

function isPathInsideOrEqual(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === ""
    || (!path.isAbsolute(relative)
      && relative !== ".."
      && !relative.startsWith(`..${path.sep}`));
}

if (isPathInsideOrEqual(projectRoot, fixtureWorkspaceRoot)) {
  throw new Error("fixture_workspace_must_be_outside_project");
}

function canonicalEvidenceSnapshot() {
  return Object.fromEntries(EVIDENCE_FILE_BLUEPRINTS
    .filter((blueprint) => blueprint.rootClass === "project")
    .map((blueprint) => {
      const absolute = path.join(projectRoot, ...blueprint.path.split("/"));
      return [blueprint.path, existsSync(absolute)
        ? createHash("sha256").update(readFileSync(absolute)).digest("hex")
        : null];
    }));
}

const canonicalEvidenceBefore = canonicalEvidenceSnapshot();

function setValueAtPath(target, segments, value) {
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    current[segment] ??= {};
    current = current[segment];
  }
  current[segments.at(-1)] = value;
}

function fixtureValue(segments) {
  const key = segments.join(".");
  const leaf = segments.at(-1);
  if (/blockers|remainingReleaseBlockers/iu.test(leaf)) return [];
  if (/sha256|digest/iu.test(key)) return fixtureDigest;
  if (/byteLength|bytes|fileCount|entryCount|routeCount|stylesheetCount|suiteCount|passedSuiteCount|requiredSignedExternalControlCount/iu.test(key)) return 1;
  if (/^(files|prod|total|expectedJourneys|executedJourneys)$/iu.test(leaf)) return 1;
  if (/failedSuiteCount|signedExternalControlCount/iu.test(key)) return 0;
  if (/^(ok|dualBuildGatePassed|offlineReleaseCandidateEligible|sourceUnchanged|sourceTreeCurrent|completeReleaseTreeBound|physicalExclusionsVerified|deterministicZipStructureVerified|offlineImplementationPassed)$/u.test(leaf)) return true;
  if (/^(liveReleaseEligible|liveClaimed|releaseEligible|trustedBuilder|signatureIssued|localRuntimeVerified|browserE2EVerified|productionLiveVerified|pixelParityClaimed|browserRuntimeExecuted)$/u.test(leaf)) return false;
  if (leaf === "schemaVersion") return "velmere.fixture.schema.v1";
  if (leaf === "status" || leaf === "verdict") return "PASS";
  if (leaf === "engine") return "fixture";
  return "fixture";
}

function writeHermeticEvidenceFixtures() {
  for (const blueprint of EVIDENCE_FILE_BLUEPRINTS) {
    if (blueprint.optional) continue;
    const selectedRoot = blueprint.rootClass === "project" ? projectEvidenceRoot : fixtureWorkspaceRoot;
    const absolute = path.join(selectedRoot, ...blueprint.path.split("/"));
    mkdirSync(path.dirname(absolute), { recursive: true });
    if (blueprint.kind === "binary") {
      writeFileSync(absolute, Buffer.from("PK\u0005\u0006"));
      continue;
    }
    const fixture = {};
    if (blueprint.expectedSchemaVersion !== null) fixture.schemaVersion = blueprint.expectedSchemaVersion;
    for (const segments of blueprint.capturePaths) {
      setValueAtPath(fixture, segments, fixtureValue(segments));
    }
    writeFileSync(absolute, `${JSON.stringify(fixture)}\n`);
  }
}

writeHermeticEvidenceFixtures();

if (process.env.PASS4826_INTERRUPT_PROBE === "1") {
  process.exit(86);
}

after(() => {
  rmSync(fixtureWorkspaceRoot, { recursive: true, force: true });
});

function currentOperationalSource() {
  const current = computePass4823SourceTree(projectRoot);
  return {
    schemaVersion: current.schemaVersion,
    fileCount: current.fileCount,
    byteLength: current.totalBytes,
    sha256: current.sha256,
  };
}

function build() {
  return buildTruthBoundIndex({ projectRoot, workspaceRoot, projectEvidenceRoot, generatedAt });
}

function reseal(index, mutate) {
  const core = structuredClone(index);
  delete core.indexSha256;
  mutate(core);
  return sealTruthBoundEvidenceIndex(core);
}

function verify(index) {
  return verifyTruthBoundEvidenceIndex({
    index,
    projectRoot,
    workspaceRoot,
    projectEvidenceRoot,
    currentOperationalSource: currentOperationalSource(),
  });
}

test("hermetic evidence fixtures never write into canonical project artifacts or emit fixture-pass markers", () => {
  assert.equal(isPathInsideOrEqual(projectRoot, projectEvidenceRoot), false);
  for (const blueprint of EVIDENCE_FILE_BLUEPRINTS.filter((entry) => !entry.optional)) {
    const selectedRoot = blueprint.rootClass === "project" ? projectEvidenceRoot : fixtureWorkspaceRoot;
    const fixture = path.resolve(selectedRoot, ...blueprint.path.split("/"));
    assert(fixture.startsWith(`${path.resolve(selectedRoot)}${path.sep}`));
    assert.equal(existsSync(fixture), true);
    assert.equal(readFileSync(fixture).includes(forbiddenFixturePassMarker), false);
  }
  assert.deepEqual(canonicalEvidenceSnapshot(), canonicalEvidenceBefore);
});

test("abrupt fixture-process exit cannot modify canonical project artifacts or leave fixture-pass markers", () => {
  const interruptedWorkspaceRoot = mkdtempSync(path.join(tmpdir(), "velmere-pass4826-interrupted-"));
  const before = canonicalEvidenceSnapshot();
  try {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PASS4826_FIXTURE_WORKSPACE_ROOT: interruptedWorkspaceRoot,
        PASS4826_INTERRUPT_PROBE: "1",
      },
    });
    assert.equal(child.status, 86, child.stderr);
    assert.deepEqual(canonicalEvidenceSnapshot(), before);
    for (const blueprint of EVIDENCE_FILE_BLUEPRINTS.filter((entry) => !entry.optional)) {
      const selectedRoot = blueprint.rootClass === "project"
        ? path.join(interruptedWorkspaceRoot, "project-evidence")
        : interruptedWorkspaceRoot;
      const fixture = path.resolve(selectedRoot, ...blueprint.path.split("/"));
      assert.equal(existsSync(fixture), true);
      assert.equal(readFileSync(fixture).includes(forbiddenFixturePassMarker), false);
    }
  } finally {
    rmSync(interruptedWorkspaceRoot, { recursive: true, force: true });
  }
});

test("truth-bound index maps four inventory contracts and promotes only currently valid normalized evidence", () => {
  const index = build();
  const result = verify(index);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(Object.keys(index.scopeLedger), [
    "build_operational",
    "canonical_release",
    "supply_chain_source",
    "deterministic_package_payload",
  ]);
  assert(Object.values(index.scopeLedger).every((scope) => Number.isSafeInteger(scope.reportedFileCount) && scope.reportedFileCount > 0));
  assert(Object.values(index.scopeLedger).every((scope) => Number.isSafeInteger(scope.reportedByteLength) && scope.reportedByteLength > 0));
  assert(Object.values(index.scopeLedger).every((scope) => /^[a-f0-9]{64}$/u.test(scope.reportedDigest)));
  assert(Object.values(index.scopeLedger).every((scope) => scope.comparableToOtherScopeCounters === false));
  assert(result.normalizedReceiptReferenceCount >= 0 && result.normalizedReceiptReferenceCount <= 2);
  assert.equal(result.blockedRequirementCount, 18 - result.normalizedReceiptReferenceCount);
  assert.equal(index.worldClassGateEligible, false);
});

test("candidate evidence file tampering fails even after the index is resealed", () => {
  const index = reseal(build(), (core) => {
    core.evidenceFiles.build_dual_gate.fileSha256 = "f".repeat(64);
  });
  const result = verify(index);
  assert.equal(result.ok, false);
  assert(result.errors.includes("evidence:build_dual_gate:file_digest_mismatch"));
});

test("candidate path traversal is rejected", () => {
  const index = reseal(build(), (core) => {
    core.evidenceFiles.package_receipt.path = "../deliverables/VELMERE_PASS6_PACKAGE_RECEIPT.json";
  });
  const result = verify(index);
  assert.equal(result.ok, false);
  assert(result.errors.some((entry) => entry.startsWith("evidence:package_receipt:")));
});

test("a normalized receipt cannot be inserted while the index still claims all requirements blocked", () => {
  const index = reseal(build(), (core) => {
    core.requirements.license.receipts.push({
      path: "artifacts/pass4826/not-a-real-world-class-receipt.json",
      fileSha256: "a".repeat(64),
    });
  });
  const result = verify(index);
  assert.equal(result.ok, false);
  assert(result.errors.includes("requirement:license:entry_mismatch"));
  assert(result.errors.includes("summary_normalized_receipt_count_mismatch"));
});

function suppressionReceipt(sourceTreeSha256) {
  return sealWorldClassEvidence({
    schemaVersion: "velmere.pass4826.world-class-evidence.v1",
    requirementId: "suppressions_policy",
    status: "PASS",
    passed: true,
    sourceTreeSha256,
    postRunSourceTreeSha256: sourceTreeSha256,
    sourceUnchanged: true,
    claims: {
      suppressionsPolicyPassed: true,
      lintScopeComplete: true,
      eslintZeroErrors: true,
      eslintZeroWarnings: true,
      allowlistSourceBound: true,
      unexpectedSuppressionCount: 0,
      expiredSuppressionCount: 0,
      missingJustificationCount: 0,
    },
  });
}

function evaluateSuppression(receipt) {
  const bytes = Buffer.from(JSON.stringify(receipt));
  const fileSha256 = createHash("sha256").update(bytes).digest("hex");
  const source = currentOperationalSource().sha256;
  const policy = JSON.parse(readFileSync("scripts/pass4826/world-class-policy.json", "utf8"));
  return evaluateWorldClassRequirementEvidence({
    id: "suppressions_policy",
    entry: { receipts: [{ path: "artifacts/pass4826/suppression.json", fileSha256 }] },
    records: [{
      path: "artifacts/pass4826/suppression.json",
      expectedFileSha256: fileSha256,
      actualFileSha256: fileSha256,
      value: receipt,
      error: null,
    }],
    currentSourceTreeSha256: source,
    policy,
    evaluationTime: generatedAt,
  });
}

test("normalized receipt promotion uses the full world-class claim contract", () => {
  assert.equal(evaluateSuppression(suppressionReceipt(currentOperationalSource().sha256)).passed, true);
});

test("tampered normalized receipt is not promotable", () => {
  const receipt = suppressionReceipt(currentOperationalSource().sha256);
  receipt.claims.eslintZeroErrors = false;
  const result = evaluateSuppression(receipt);
  assert.equal(result.passed, false);
  assert(result.errors.includes("receipt_checksum_mismatch"));
});

test("stale but correctly resealed normalized receipt is not promotable", () => {
  const result = evaluateSuppression(suppressionReceipt("b".repeat(64)));
  assert.equal(result.passed, false);
  assert(result.errors.includes("receipt_source_not_current"));
  assert(result.errors.includes("receipt_post_source_not_current"));
});
