import assert from "node:assert/strict";
import test from "node:test";
import {
  REQUIREMENT_IDS,
  WORLD_CLASS_EVIDENCE_INDEX_SCHEMA,
  WORLD_CLASS_EVIDENCE_SCHEMA,
  WORLD_CLASS_POLICY_SCHEMA,
  evaluateWorldClassGate,
  sealWorldClassEvidence,
  sealWorldClassGate,
  sha256,
  validateWorldClassGateReceipt,
} from "./world-class-gate-contract.mjs";

const SOURCE = "a".repeat(64);
const EVALUATION_TIME = "2026-07-17T12:00:00.000Z";
const policy = Object.freeze({
  schemaVersion: WORLD_CLASS_POLICY_SCHEMA,
  minimumRepeatedRuns: 10,
  minimumCleanRoomBuilders: 3,
  minimumDistinctBuilderInfrastructures: 2,
  requiredBuildEngines: ["webpack", "turbopack"],
  networkIsolationRequirement: "os_network_namespace",
  accessibilityRequiresZeroIncompleteRules: true,
  accessibilityRequiresZeroAllImpactViolations: true,
});

function claimsFor(id) {
  const browser = (engine) => ({
    engine,
    browserExecutionPassed: true,
    routeInventoryComplete: true,
    allLocalesCovered: true,
    criticalFlowsCovered: true,
    buildOutputBound: true,
    expectedJourneyCount: 42,
    executedJourneyCount: 42,
    failedJourneyCount: 0,
  });
  const pixel = (engine) => ({
    engine,
    pixelGatePassed: true,
    deterministicFixtureMode: true,
    timeFrozen: true,
    fontsPinned: true,
    animationsDisabled: true,
    fixtureDataSourceBound: true,
    baselineHumanApproved: true,
    buildOutputBound: true,
    expectedScreenshotCount: 42,
    comparedScreenshotCount: 42,
    changedPixelCount: 0,
  });
  return {
    full_product_coverage: {
      fullProductCoverageMeasured: true,
      completeActiveSourceInventory: true,
      coverageThresholdsMet: true,
      discoveredSourceFileCount: 100,
      instrumentedSourceFileCount: 100,
      uncoveredCriticalBoundaryCount: 0,
    },
    browser_webpack: browser("webpack"),
    browser_turbopack: browser("turbopack"),
    pixel_webpack: pixel("webpack"),
    pixel_turbopack: pixel("turbopack"),
    accessibility: {
      accessibilityGatePassed: true,
      fullRouteInventoryTested: true,
      keyboardAndFocusCovered: true,
      accessibilityEnginePinned: true,
      expectedJourneyCount: 84,
      executedJourneyCount: 84,
      seriousViolationCount: 0,
      criticalViolationCount: 0,
      moderateViolationCount: 0,
      minorViolationCount: 0,
      incompleteRuleCount: 0,
    },
    source_tree_binding: {
      sourceTreeBindingPassed: true,
      operationalTreeBound: true,
      packageJsonBound: true,
      lockfileBound: true,
      allExecutableOperatorFilesBound: true,
      webpackOutputBound: true,
      turbopackOutputBound: true,
      outputsUnchanged: true,
      deterministicReleasePackageVerified: true,
      releaseArchiveWholeHashBound: true,
      repoOwnedPackagerIncluded: true,
      physicalReleaseExclusionsVerified: true,
      discoveredSourceFileCount: 100,
      boundSourceFileCount: 100,
    },
    duplication_policy: {
      duplicationPolicyPassed: true,
      scanScopeComplete: true,
      baselineSourceBound: true,
      noGrowth: true,
      residualBudgetMet: true,
      acceptedExceptionsReviewed: true,
      unexpectedExactFullFileDuplicateCount: 0,
      unreviewedExceptionCount: 0,
    },
    suppressions_policy: {
      suppressionsPolicyPassed: true,
      lintScopeComplete: true,
      eslintZeroErrors: true,
      eslintZeroWarnings: true,
      allowlistSourceBound: true,
      unexpectedSuppressionCount: 0,
      expiredSuppressionCount: 0,
      missingJustificationCount: 0,
    },
    exact_runtime: {
      exactRuntimePassed: true,
      declaredRuntimeMatchesExecuted: true,
      lockfileFrozen: true,
      dependencyInstallOffline: true,
      browserBinariesPinnedBeforeAcquisition: true,
      browserBinariesUnchanged: true,
      node: "v24.18.0",
      requiredNode: "v24.18.0",
      npm: "11.16.0",
      requiredNpm: "11.16.0",
      requiredBrowserBinaryCount: 3,
      verifiedBrowserBinaryCount: 3,
    },
    repeated_run_determinism: {
      determinismPassed: true,
      allRunsPassed: true,
      sameEngineRepeated: true,
      seedsRecorded: true,
      executionOrderRecorded: true,
      requiredRunCount: 10,
      executedRunCount: 10,
      passedRunCount: 10,
      failedRunCount: 0,
      flakeCount: 0,
      uniqueSourceDigestCount: 1,
      uniqueOutputDigestCount: 1,
      uniqueReleaseDigestCount: 1,
    },
    os_network_isolation: {
      osNetworkIsolationPassed: true,
      isolationLayer: "os_network_namespace",
      namespaceCreated: true,
      outboundCanaryBlocked: true,
      dnsCanaryBlocked: true,
      childProcessesContained: true,
      networkAuditLogBound: true,
      processLevelPreloadActive: true,
      canaryAttemptCount: 4,
      blockedCanaryCount: 4,
    },
    clean_room_quorum: {
      cleanRoomQuorumPassed: true,
      trustedBuilderIdentities: true,
      isolatedWorkspaces: true,
      frozenInstall: true,
      builderCount: 3,
      successfulBuilderCount: 3,
      distinctInfrastructureCount: 2,
      uniqueSourceDigestCount: 1,
      uniqueOutputDigestCount: 1,
      uniqueReleaseDigestCount: 1,
    },
    license: {
      unrestrictedCommercialLicenseGatePassed: true,
      dependencyInventoryComplete: true,
      sourceAndLockfileBound: true,
      independentLegalReviewPassed: true,
      unknownLicenseCount: 0,
      reviewLicenseCount: 0,
      restrictedLicenseCount: 0,
    },
    malware: {
      productionMalwareProofPassed: true,
      independentMalwareEngineUsed: true,
      definitionsCurrent: true,
      artifactHashesBound: true,
      scannerSignatureVerified: true,
      expectedArtifactCount: 12,
      scannedArtifactCount: 12,
      malwareDetectedCount: 0,
      scanErrorCount: 0,
      unscannedArtifactCount: 0,
    },
    provenance: {
      productionProvenanceGatePassed: true,
      trustedOrganizationalIdentity: true,
      signatureVerified: true,
      officialSchemaValidationPassed: true,
      transparencyLogVerified: true,
      sourceBuildAndReleaseBound: true,
      provenanceLevelSatisfied: true,
    },
    database_live: {
      databaseLiveGatePassed: true,
      liveProductionExecuted: true,
      productionEnvironmentAttested: true,
      databaseConnectivityPassed: true,
      rlsBoundaryTestsPassed: true,
      migrationTestsPassed: true,
      backupRestoreDrillPassed: true,
      paymentAndProviderFlowsPassed: true,
      rollbackDrillPassed: true,
      testDataIsolated: true,
      liveReceiptsSignedAndBound: true,
    },
    external_certification: {
      externalCertificationPassed: true,
      independentAssessor: true,
      currentSourceAndReleaseInScope: true,
      releaseArtifactBound: true,
      signatureAndTrustRootVerified: true,
      openCriticalFindingCount: 0,
      openHighFindingCount: 0,
      validFrom: "2026-07-01T00:00:00.000Z",
      validUntil: "2027-07-01T00:00:00.000Z",
    },
  }[id];
}

function buildFixture() {
  const evidenceIndex = { schemaVersion: WORLD_CLASS_EVIDENCE_INDEX_SCHEMA, requirements: {} };
  const evidenceByRequirement = {};
  for (const id of REQUIREMENT_IDS) {
    const receipt = sealWorldClassEvidence({
      schemaVersion: WORLD_CLASS_EVIDENCE_SCHEMA,
      requirementId: id,
      status: "PASS",
      passed: true,
      sourceTreeSha256: SOURCE,
      postRunSourceTreeSha256: SOURCE,
      sourceUnchanged: true,
      claims: claimsFor(id),
    });
    const path = `artifacts/pass4826/${id}.json`;
    const fileSha256 = sha256(JSON.stringify(receipt));
    evidenceIndex.requirements[id] = { receipts: [{ path, fileSha256 }] };
    evidenceByRequirement[id] = [{
      path,
      expectedFileSha256: fileSha256,
      actualFileSha256: fileSha256,
      value: receipt,
      error: null,
    }];
  }
  return { evidenceIndex, evidenceByRequirement };
}

function evaluate(fixture, overrides = {}) {
  return evaluateWorldClassGate({
    currentSourceTreeSha256: SOURCE,
    policy,
    evaluationTime: EVALUATION_TIME,
    ...fixture,
    ...overrides,
  });
}

function resealRecord(fixture, id, mutate) {
  const record = fixture.evidenceByRequirement[id][0];
  const core = { ...structuredClone(record.value) };
  delete core.receiptSha256;
  mutate(core);
  record.value = sealWorldClassEvidence(core);
  const digest = sha256(JSON.stringify(record.value));
  record.actualFileSha256 = digest;
  record.expectedFileSha256 = digest;
  fixture.evidenceIndex.requirements[id].receipts[0].fileSha256 = digest;
}

test("complete, source-bound evidence passes every world-class requirement", () => {
  const result = evaluate(buildFixture());
  assert.equal(result.strictWorldClassGatePassed, true);
  assert.equal(result.blockers.length, 0);
  const receipt = sealWorldClassGate(result);
  assert.equal(validateWorldClassGateReceipt(receipt), receipt);
});

test("missing requirement entry is a blocker", () => {
  const fixture = buildFixture();
  delete fixture.evidenceIndex.requirements.full_product_coverage;
  delete fixture.evidenceByRequirement.full_product_coverage;
  const result = evaluate(fixture);
  assert.equal(result.ok, false);
  assert(result.blockers.includes("full_product_coverage:evidence_index_entry_missing"));
});

test("false claim is a blocker even when receipt and file digests are resealed", () => {
  const fixture = buildFixture();
  resealRecord(fixture, "browser_webpack", (core) => { core.claims.browserExecutionPassed = false; });
  const result = evaluate(fixture);
  assert(result.blockers.includes("browser_webpack:claim_not_true:browserExecutionPassed"));
});

test("missing claim field fails closed", () => {
  const fixture = buildFixture();
  resealRecord(fixture, "suppressions_policy", (core) => { delete core.claims.missingJustificationCount; });
  const result = evaluate(fixture);
  assert(result.blockers.includes("suppressions_policy:claim_missing:missingJustificationCount"));
});

test("tampered receipt is rejected by its canonical checksum", () => {
  const fixture = buildFixture();
  const record = fixture.evidenceByRequirement.license[0];
  record.value.claims.unrestrictedCommercialLicenseGatePassed = false;
  const newFileDigest = sha256(JSON.stringify(record.value));
  record.actualFileSha256 = newFileDigest;
  record.expectedFileSha256 = newFileDigest;
  fixture.evidenceIndex.requirements.license.receipts[0].fileSha256 = newFileDigest;
  const result = evaluate(fixture);
  assert(result.blockers.includes("license:receipt_checksum_mismatch"));
});

test("tampered evidence file is rejected by the evidence index digest", () => {
  const fixture = buildFixture();
  fixture.evidenceByRequirement.malware[0].actualFileSha256 = "b".repeat(64);
  const result = evaluate(fixture);
  assert(result.blockers.some((entry) => entry.startsWith("malware:file_digest_mismatch:")));
});

test("contract rejects evidence records substituted behind a valid index", () => {
  const fixture = buildFixture();
  fixture.evidenceByRequirement.malware[0].path = "artifacts/pass4826/substituted.json";
  const result = evaluate(fixture);
  assert(result.blockers.includes("malware:evidence_record_path_mismatch:0"));
});

test("stale source binding remains a blocker after a valid reseal", () => {
  const fixture = buildFixture();
  resealRecord(fixture, "provenance", (core) => {
    core.sourceTreeSha256 = "c".repeat(64);
    core.postRunSourceTreeSha256 = "c".repeat(64);
  });
  const result = evaluate(fixture);
  assert(result.blockers.includes("provenance:receipt_source_not_current"));
  assert(result.blockers.includes("provenance:receipt_post_source_not_current"));
});

test("process-level preload cannot impersonate OS network isolation", () => {
  const fixture = buildFixture();
  resealRecord(fixture, "os_network_isolation", (core) => {
    core.claims.isolationLayer = "process_preload_only";
    core.claims.osNetworkIsolationPassed = false;
  });
  const result = evaluate(fixture);
  assert(result.blockers.includes("os_network_isolation:claim_value_mismatch:isolationLayer"));
  assert(result.blockers.includes("os_network_isolation:claim_not_true:osNetworkIsolationPassed"));
});

test("repeated-run and clean-room minima come from versioned policy", () => {
  const fixture = buildFixture();
  resealRecord(fixture, "repeated_run_determinism", (core) => {
    core.claims.requiredRunCount = 9;
    core.claims.executedRunCount = 9;
    core.claims.passedRunCount = 9;
  });
  const result = evaluate(fixture);
  assert(result.blockers.includes("repeated_run_determinism:claim_below_policy:executedRunCount"));
});

test("gate receipt mutation is rejected", () => {
  const receipt = sealWorldClassGate(evaluate(buildFixture()));
  receipt.ok = false;
  assert.throws(() => validateWorldClassGateReceipt(receipt), /world_class_gate_checksum_mismatch/u);
});
