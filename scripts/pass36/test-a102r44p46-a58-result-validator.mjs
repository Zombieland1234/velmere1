#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  INVALID_A58_POLICY_PROFILE,
  LEGACY_A58_POLICY_PROFILE,
  R44P46_A58_CHECK_IDS,
  R44P46_A58_POLICY_PROFILE,
  R44P46_A58_PASS_STATUS,
  R44P46_A58_RESULT_SCHEMA,
  a58PolicyRouterProfile,
} from "./r44p46-a58-release-integrity-lib.mjs";
import {
  a58ResultValidatorProfile,
  validateA58ResultForA60,
} from "./a58-result-validator.mjs";
import {
  PARENT_REVISION_ID,
  REVISION_ID,
  SOURCE_MANIFEST_PATH,
  SOURCE_MANIFEST_SCHEMA,
} from "./r44p46-packaging-lib.mjs";

const A58_REVISION_ID = "VELMERE_PASS36_A58R0_RELEASE_INTEGRITY_FINAL_BYTE_BINDING";
const R44_REVISION_ID = "VELMERE_PASS36_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF_NO_LIVE_CREDIT";
const R43_REVISION_ID = "VELMERE_PASS36_A102R43_ACTION_REQUIRED_FINAL_UI_UX_PERFORMANCE_HARDENING_AND_BLOCKED_FAULT_EMULATION_NO_LIVE_CREDIT";
const R44_MANIFEST_PATH = "config/pass36/a102r44-current-root-descendant-manifest.json";
const R44_ARCHIVE_PATH = "_velmere/PASS36_A102R44_SOURCE_ONLY_MANIFEST.json";
const R44_ARCHIVE_SCHEMA = "velmere.pass36.a102r44.source-only-package-manifest.v1";
const R46_AUTHORITY_VERIFIER = "scripts/pass36/verify-a102r44p46-current-source-authority.mjs";
const R46_AUTHORITY_STATUS = "PASS_A102R44P46_CURRENT_SOURCE_AUTHORITY_EXACT_NO_LIVE_OR_SALE_CREDIT";

function validFixture() {
  const manifestFileSha256 = "a".repeat(64);
  const manifestDigestSha256 = "b".repeat(64);
  const sourceFingerprint = "c".repeat(64);
  const pathSetSha256 = "d".repeat(64);
  const fileCount = 17;
  const payloadBytes = 4096;
  return {
    schemaVersion: R44P46_A58_RESULT_SCHEMA,
    revisionId: A58_REVISION_ID,
    sourceRevisionId: REVISION_ID,
    sourceParentRevisionId: PARENT_REVISION_ID,
    profile: "R44P46_SOURCE_ONLY_MANIFEST_V1",
    status: R44P46_A58_PASS_STATUS,
    passed: true,
    promotionAllowed: false,
    productionApproved: false,
    exactFinalByteBuildExecuted: false,
    browserExecuted: false,
    historicalArtifactRecoveryComplete: false,
    historicalRecoveryRequiredForCurrentSourceIntegrity: false,
    sourceAuthority: {
      passed: true,
      errorCode: null,
      mismatchIds: [],
      manifestPath: SOURCE_MANIFEST_PATH,
      manifestSchema: SOURCE_MANIFEST_SCHEMA,
      manifestFileSha256,
      manifestDigestSha256,
      sourceFingerprint,
      payload: {
        fileCount,
        byteLength: payloadBytes,
        pathSetSha256,
        aggregateSha256: sourceFingerprint,
      },
    },
    sourceRoot: {
      passed: true,
      errorCode: null,
      manifestPath: SOURCE_MANIFEST_PATH,
      manifestSchema: SOURCE_MANIFEST_SCHEMA,
      manifestFileSha256,
      manifestDigestSha256,
      sourceFingerprint,
      pathSetSha256,
      fileCount,
      payloadBytes,
      canonicalFileFields: ["path", "byteLength", "sha256"],
      legacyManifestShapeAccepted: false,
    },
    summary: {
      checks: R44P46_A58_CHECK_IDS.length,
      passed: R44P46_A58_CHECK_IDS.length,
      failed: 0,
      blockingFailed: 0,
    },
    checks: R44P46_A58_CHECK_IDS.map((id) => ({
      id,
      ok: true,
      blocking: true,
      detail: null,
    })),
    blockers: ["EXACT_FINAL_BYTE_BUILD_NOT_EXECUTED_BY_A58"],
    globalDecision: "NO_GO",
    live: false,
    liveProven: false,
    saleEnabled: false,
    worldClassProven: false,
  };
}

function validLegacyFixture() {
  const expectedFailedIds = [
    "a57-historical-manifest-verifies",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_LOCAL_PDF_QA_SUMMARY.json",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_LOCAL_PRODUCT_QUALITY_RECEIPT.json",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_READINESS_DASHBOARD.json",
    "historical-exact-byte-recovery:.velmere/orphan-quarantine-pass6.json",
    "historical-exact-byte-recovery:_velmere/VLM_PASS5_RELEASE_MANIFEST.json",
  ];
  const checks = [
    ...Array.from({ length: 38 }, (_, index) => ({
      id: `positive-${index + 1}`,
      ok: true,
      blocking: index === 0,
    })),
    ...expectedFailedIds.map((id) => ({ id, ok: false, blocking: false })),
  ];
  return {
    schemaVersion: "velmere.pass36.a58.release-integrity-verification.v1",
    revisionId: A58_REVISION_ID,
    status: "PASS_RELEASE_INTEGRITY_NO_PROMOTION",
    checks,
    summary: { checks: 45, passed: 38, failed: 7, blockingFailed: 0 },
    historicalArtifactRecoveryComplete: false,
    promotionAllowed: false,
    productionApproved: false,
    saleEnabled: false,
    liveProven: false,
    worldClassProven: false,
  };
}

function canonicalR44P46A58Policy() {
  return {
    schemaVersion: "velmere.pass36.a58.release-integrity-policy.v1",
    revisionId: A58_REVISION_ID,
    currentCheckpointRevisionId: REVISION_ID,
    currentSourceRevisionId: REVISION_ID,
    currentCheckpointParentRevisionId: PARENT_REVISION_ID,
    currentDescendantManifestPath: SOURCE_MANIFEST_PATH,
    archiveManifestPath: SOURCE_MANIFEST_PATH,
    archiveManifestSchemaVersion: SOURCE_MANIFEST_SCHEMA,
    archiveManifestContract: {
      schemaVersion: SOURCE_MANIFEST_SCHEMA,
      revisionId: REVISION_ID,
      parentRevisionId: PARENT_REVISION_ID,
      path: SOURCE_MANIFEST_PATH,
      manifestPath: SOURCE_MANIFEST_PATH,
    },
    currentAuthorityVerifierPath: R46_AUTHORITY_VERIFIER,
    currentAuthorityVerifierExpectedStatus: R46_AUTHORITY_STATUS,
  };
}

function canonicalLegacyA58Policy() {
  return {
    schemaVersion: "velmere.pass36.a58.release-integrity-policy.v1",
    revisionId: A58_REVISION_ID,
    currentCheckpointRevisionId: R44_REVISION_ID,
    currentSourceRevisionId: R44_REVISION_ID,
    currentCheckpointParentRevisionId: R43_REVISION_ID,
    currentDescendantManifestPath: R44_MANIFEST_PATH,
    archiveManifestPath: R44_ARCHIVE_PATH,
    archiveManifestSchemaVersion: R44_ARCHIVE_SCHEMA,
    archiveManifestContract: {
      schemaVersion: R44_ARCHIVE_SCHEMA,
      revisionId: R44_REVISION_ID,
      path: R44_ARCHIVE_PATH,
    },
    currentAuthorityVerifierPath:
      "scripts/pass36/verify-a102r44-final-ui-polish-authority.mjs",
    currentAuthorityVerifierExpectedStatus:
      "PASS_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_AUTHORITY_NO_LIVE_CREDIT",
  };
}

export function runR44P46A58ResultValidatorCases() {
  const policy = {
    currentSourceProfile: "R44P46_SOURCE_ONLY_MANIFEST_V1",
    sourceManifestSchema: SOURCE_MANIFEST_SCHEMA,
    currentSourceRevisionId: REVISION_ID,
    currentSourceParentRevisionId: PARENT_REVISION_ID,
    sourceManifestPath: SOURCE_MANIFEST_PATH,
  };
  const cases = [];
  const add = (id, expected, mutate = null) => {
    const fixture = validFixture();
    if (mutate) mutate(fixture);
    const observed = validateA58ResultForA60(fixture, policy);
    cases.push({ id, passed: observed === expected, expected, observed });
  };
  add("accept-canonical-r44p46", true);
  add("reject-schema-tamper", false, (value) => {
    value.schemaVersion = "velmere.pass36.a58.release-integrity-verification.v1";
  });
  add("reject-legacy-status", false, (value) => {
    value.status = "PASS_RELEASE_INTEGRITY_NO_PROMOTION";
  });
  add("reject-missing-check", false, (value) => {
    value.checks.pop();
    value.summary.checks -= 1;
    value.summary.passed -= 1;
  });
  add("reject-duplicate-check", false, (value) => {
    value.checks.at(-1).id = value.checks[0].id;
  });
  add("reject-failed-check", false, (value) => {
    value.checks[0].ok = false;
    value.summary.passed -= 1;
    value.summary.failed += 1;
    value.summary.blockingFailed += 1;
  });
  add("reject-summary-forgery", false, (value) => {
    value.summary.checks += 1;
    value.summary.passed += 1;
  });
  add("reject-manifest-binding-tamper", false, (value) => {
    value.sourceRoot.manifestFileSha256 = "e".repeat(64);
  });
  add("reject-fingerprint-tamper", false, (value) => {
    value.sourceRoot.sourceFingerprint = "f".repeat(64);
  });
  add("reject-promotion-tamper", false, (value) => {
    value.saleEnabled = true;
  });
  add("reject-legacy-manifest-shape-acceptance", false, (value) => {
    value.sourceRoot.legacyManifestShapeAccepted = true;
  });
  const legacyPolicy = {
    currentSourceRevisionId: R44_REVISION_ID,
    currentSourceParentRevisionId: R43_REVISION_ID,
    sourceManifestPath: R44_MANIFEST_PATH,
  };
  const legacyProfile = a58ResultValidatorProfile(legacyPolicy);
  cases.push({
    id: "legacy-r40-r44-branch-retained",
    passed: legacyProfile.id === "LEGACY_R40_TO_R44_A58"
      && legacyProfile.legacyFixedCountContract === true
      && validateA58ResultForA60(validLegacyFixture(), legacyPolicy) === true,
    expected: true,
    observed: legacyProfile,
  });
  for (const [id, partialPolicy, parsed] of [
    ["reject-partial-r46-schema-tamper", { ...policy, sourceManifestSchema: "stale.schema" }, validFixture()],
    ["reject-partial-r46-schema-tamper-legacy-receipt", { ...policy, sourceManifestSchema: "stale.schema" }, validLegacyFixture()],
    ["reject-partial-r46-missing-schema", { ...policy, sourceManifestSchema: undefined }, validFixture()],
    ["reject-partial-r46-profile-tamper", { ...policy, currentSourceProfile: "stale-profile" }, validFixture()],
    ["reject-r46-revision-with-legacy-discriminators", {
      ...legacyPolicy,
      currentSourceRevisionId: REVISION_ID,
    }, validLegacyFixture()],
    ["reject-missing-validator-policy", undefined, validLegacyFixture()],
  ]) {
    const observedProfile = a58ResultValidatorProfile(partialPolicy);
    cases.push({
      id,
      passed: observedProfile.id === "INVALID_OR_PARTIAL_CURRENT_SOURCE_PROFILE"
        && validateA58ResultForA60(parsed, partialPolicy) === false,
      expected: false,
      observed: observedProfile,
    });
  }
  const canonicalA58Policy = canonicalR44P46A58Policy();
  for (const [id, candidate, expectedProfile] of [
    ["a58-verifier-router-accept-canonical-r46", canonicalA58Policy, R44P46_A58_POLICY_PROFILE],
    ["a58-verifier-router-reject-partial-r46", {
      ...canonicalA58Policy,
      archiveManifestSchemaVersion: "stale.schema",
    }, INVALID_A58_POLICY_PROFILE],
    ["a58-verifier-router-retain-coherent-legacy", canonicalLegacyA58Policy(), LEGACY_A58_POLICY_PROFILE],
  ]) {
    const observed = a58PolicyRouterProfile(candidate);
    cases.push({
      id,
      passed: observed === expectedProfile,
      expected: expectedProfile,
      observed,
    });
  }
  const profile = a58ResultValidatorProfile(policy);
  const failed = cases.filter((row) => !row.passed);
  return {
    schemaVersion:
      "velmere.pass36.a102r44p46.a58-result-validator-test.v1",
    status: failed.length === 0
      ? "PASS_A102R44P46_A58_RESULT_VALIDATOR_TAMPER_SUITE_NO_PROMOTION"
      : "FAIL_A102R44P46_A58_RESULT_VALIDATOR_TAMPER_SUITE",
    profile,
    checks: cases.length,
    passed: cases.length - failed.length,
    failed: failed.length,
    cases,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  const result = runR44P46A58ResultValidatorCases();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exit(1);
}
