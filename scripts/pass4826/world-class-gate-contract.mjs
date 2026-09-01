import { createHash } from "node:crypto";

export const WORLD_CLASS_POLICY_SCHEMA = "velmere.pass4826.world-class-policy.v1";
export const WORLD_CLASS_EVIDENCE_INDEX_SCHEMA = "velmere.pass4826.world-class-evidence-index.v1";
export const WORLD_CLASS_EVIDENCE_SCHEMA = "velmere.pass4826.world-class-evidence.v1";
export const WORLD_CLASS_GATE_SCHEMA = "velmere.pass4826.fail-closed-world-class-gate.v1";

export const REQUIREMENT_IDS = Object.freeze([
  "full_product_coverage",
  "browser_webpack",
  "browser_turbopack",
  "pixel_webpack",
  "pixel_turbopack",
  "accessibility",
  "source_tree_binding",
  "duplication_policy",
  "suppressions_policy",
  "exact_runtime",
  "repeated_run_determinism",
  "os_network_isolation",
  "clean_room_quorum",
  "license",
  "malware",
  "provenance",
  "database_live",
  "external_certification",
]);

export const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isDigest = (value) => /^[a-f0-9]{64}$/u.test(String(value ?? "").replace(/^sha256:/u, ""));
const normalizedDigest = (value) => String(value ?? "").replace(/^sha256:/u, "");
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const own = (value, key) => isObject(value) && Object.prototype.hasOwnProperty.call(value, key);

function receiptCore(receipt) {
  const core = { ...receipt };
  delete core.receiptSha256;
  return core;
}

export function sealWorldClassEvidence(core) {
  return { ...core, receiptSha256: sha256(canonicalJson(core)) };
}

export function sealWorldClassGate(core) {
  return { ...core, receiptSha256: sha256(canonicalJson(core)) };
}

function push(errors, condition, code) {
  if (!condition) errors.push(code);
}

function claimTrue(claims, errors, field) {
  push(errors, own(claims, field), `claim_missing:${field}`);
  if (own(claims, field)) push(errors, claims[field] === true, `claim_not_true:${field}`);
}

function claimZero(claims, errors, field) {
  push(errors, own(claims, field), `claim_missing:${field}`);
  if (own(claims, field)) push(errors, claims[field] === 0, `claim_not_zero:${field}`);
}

function claimString(claims, errors, field, expected = null) {
  push(errors, own(claims, field), `claim_missing:${field}`);
  if (!own(claims, field)) return;
  push(errors, typeof claims[field] === "string" && claims[field].length > 0, `claim_string_invalid:${field}`);
  if (expected !== null) push(errors, claims[field] === expected, `claim_value_mismatch:${field}`);
}

function claimPositiveInteger(claims, errors, field) {
  push(errors, own(claims, field), `claim_missing:${field}`);
  if (own(claims, field)) {
    push(errors, Number.isInteger(claims[field]) && claims[field] > 0, `claim_positive_integer_invalid:${field}`);
  }
}

function claimEqual(claims, errors, left, right) {
  push(errors, own(claims, left), `claim_missing:${left}`);
  push(errors, own(claims, right), `claim_missing:${right}`);
  if (own(claims, left) && own(claims, right)) {
    push(errors, claims[left] === claims[right], `claim_equality_mismatch:${left}:${right}`);
  }
}

function validateCoverage(claims, errors) {
  for (const field of ["fullProductCoverageMeasured", "completeActiveSourceInventory", "coverageThresholdsMet"]) {
    claimTrue(claims, errors, field);
  }
  claimPositiveInteger(claims, errors, "discoveredSourceFileCount");
  claimPositiveInteger(claims, errors, "instrumentedSourceFileCount");
  claimEqual(claims, errors, "discoveredSourceFileCount", "instrumentedSourceFileCount");
  claimZero(claims, errors, "uncoveredCriticalBoundaryCount");
}

function validateBrowser(claims, errors, engine) {
  claimString(claims, errors, "engine", engine);
  for (const field of [
    "browserExecutionPassed",
    "routeInventoryComplete",
    "allLocalesCovered",
    "criticalFlowsCovered",
    "buildOutputBound",
  ]) claimTrue(claims, errors, field);
  claimPositiveInteger(claims, errors, "expectedJourneyCount");
  claimPositiveInteger(claims, errors, "executedJourneyCount");
  claimEqual(claims, errors, "expectedJourneyCount", "executedJourneyCount");
  claimZero(claims, errors, "failedJourneyCount");
}

function validatePixel(claims, errors, engine) {
  claimString(claims, errors, "engine", engine);
  for (const field of [
    "pixelGatePassed",
    "deterministicFixtureMode",
    "timeFrozen",
    "fontsPinned",
    "animationsDisabled",
    "fixtureDataSourceBound",
    "baselineHumanApproved",
    "buildOutputBound",
  ]) claimTrue(claims, errors, field);
  claimPositiveInteger(claims, errors, "expectedScreenshotCount");
  claimPositiveInteger(claims, errors, "comparedScreenshotCount");
  claimEqual(claims, errors, "expectedScreenshotCount", "comparedScreenshotCount");
  claimZero(claims, errors, "changedPixelCount");
}

function validateAccessibility(claims, errors, policy) {
  for (const field of [
    "accessibilityGatePassed",
    "fullRouteInventoryTested",
    "keyboardAndFocusCovered",
    "accessibilityEnginePinned",
  ]) claimTrue(claims, errors, field);
  claimPositiveInteger(claims, errors, "expectedJourneyCount");
  claimPositiveInteger(claims, errors, "executedJourneyCount");
  claimEqual(claims, errors, "expectedJourneyCount", "executedJourneyCount");
  for (const field of ["seriousViolationCount", "criticalViolationCount"]) claimZero(claims, errors, field);
  if (policy.accessibilityRequiresZeroAllImpactViolations === true) {
    for (const field of ["moderateViolationCount", "minorViolationCount"]) claimZero(claims, errors, field);
  }
  if (policy.accessibilityRequiresZeroIncompleteRules === true) claimZero(claims, errors, "incompleteRuleCount");
}

function validateSourceBinding(claims, errors) {
  for (const field of [
    "sourceTreeBindingPassed",
    "operationalTreeBound",
    "packageJsonBound",
    "lockfileBound",
    "allExecutableOperatorFilesBound",
    "webpackOutputBound",
    "turbopackOutputBound",
    "outputsUnchanged",
    "deterministicReleasePackageVerified",
    "releaseArchiveWholeHashBound",
    "repoOwnedPackagerIncluded",
    "physicalReleaseExclusionsVerified",
  ]) claimTrue(claims, errors, field);
  claimPositiveInteger(claims, errors, "discoveredSourceFileCount");
  claimPositiveInteger(claims, errors, "boundSourceFileCount");
  claimEqual(claims, errors, "discoveredSourceFileCount", "boundSourceFileCount");
}

function validateDuplication(claims, errors) {
  for (const field of [
    "duplicationPolicyPassed",
    "scanScopeComplete",
    "baselineSourceBound",
    "noGrowth",
    "residualBudgetMet",
    "acceptedExceptionsReviewed",
  ]) claimTrue(claims, errors, field);
  claimZero(claims, errors, "unexpectedExactFullFileDuplicateCount");
  claimZero(claims, errors, "unreviewedExceptionCount");
}

function validateSuppressions(claims, errors) {
  for (const field of [
    "suppressionsPolicyPassed",
    "lintScopeComplete",
    "eslintZeroErrors",
    "eslintZeroWarnings",
    "allowlistSourceBound",
  ]) claimTrue(claims, errors, field);
  for (const field of ["unexpectedSuppressionCount", "expiredSuppressionCount", "missingJustificationCount"]) {
    claimZero(claims, errors, field);
  }
}

function validateRuntime(claims, errors) {
  for (const field of [
    "exactRuntimePassed",
    "declaredRuntimeMatchesExecuted",
    "lockfileFrozen",
    "dependencyInstallOffline",
    "browserBinariesPinnedBeforeAcquisition",
    "browserBinariesUnchanged",
  ]) claimTrue(claims, errors, field);
  for (const field of ["node", "requiredNode", "npm", "requiredNpm"]) claimString(claims, errors, field);
  claimEqual(claims, errors, "node", "requiredNode");
  claimEqual(claims, errors, "npm", "requiredNpm");
  claimPositiveInteger(claims, errors, "requiredBrowserBinaryCount");
  claimPositiveInteger(claims, errors, "verifiedBrowserBinaryCount");
  claimEqual(claims, errors, "requiredBrowserBinaryCount", "verifiedBrowserBinaryCount");
}

function validateDeterminism(claims, errors, policy) {
  for (const field of [
    "determinismPassed",
    "allRunsPassed",
    "sameEngineRepeated",
    "seedsRecorded",
    "executionOrderRecorded",
  ]) claimTrue(claims, errors, field);
  for (const field of ["requiredRunCount", "executedRunCount", "passedRunCount"]) claimPositiveInteger(claims, errors, field);
  claimEqual(claims, errors, "requiredRunCount", "executedRunCount");
  claimEqual(claims, errors, "executedRunCount", "passedRunCount");
  if (Number.isInteger(claims.executedRunCount)) {
    push(errors, claims.executedRunCount >= policy.minimumRepeatedRuns, "claim_below_policy:executedRunCount");
  }
  claimZero(claims, errors, "failedRunCount");
  claimZero(claims, errors, "flakeCount");
  for (const field of ["uniqueSourceDigestCount", "uniqueOutputDigestCount", "uniqueReleaseDigestCount"]) {
    push(errors, own(claims, field), `claim_missing:${field}`);
    if (own(claims, field)) push(errors, claims[field] === 1, `claim_not_one:${field}`);
  }
}

function validateNetworkIsolation(claims, errors, policy) {
  claimTrue(claims, errors, "osNetworkIsolationPassed");
  claimString(claims, errors, "isolationLayer", policy.networkIsolationRequirement);
  for (const field of [
    "namespaceCreated",
    "outboundCanaryBlocked",
    "dnsCanaryBlocked",
    "childProcessesContained",
    "networkAuditLogBound",
    "processLevelPreloadActive",
  ]) claimTrue(claims, errors, field);
  claimPositiveInteger(claims, errors, "canaryAttemptCount");
  claimPositiveInteger(claims, errors, "blockedCanaryCount");
  claimEqual(claims, errors, "canaryAttemptCount", "blockedCanaryCount");
}

function validateCleanRoom(claims, errors, policy) {
  for (const field of [
    "cleanRoomQuorumPassed",
    "trustedBuilderIdentities",
    "isolatedWorkspaces",
    "frozenInstall",
  ]) claimTrue(claims, errors, field);
  for (const field of ["builderCount", "successfulBuilderCount", "distinctInfrastructureCount"]) {
    claimPositiveInteger(claims, errors, field);
  }
  claimEqual(claims, errors, "builderCount", "successfulBuilderCount");
  if (Number.isInteger(claims.builderCount)) {
    push(errors, claims.builderCount >= policy.minimumCleanRoomBuilders, "claim_below_policy:builderCount");
  }
  if (Number.isInteger(claims.distinctInfrastructureCount)) {
    push(
      errors,
      claims.distinctInfrastructureCount >= policy.minimumDistinctBuilderInfrastructures,
      "claim_below_policy:distinctInfrastructureCount",
    );
  }
  for (const field of ["uniqueSourceDigestCount", "uniqueOutputDigestCount", "uniqueReleaseDigestCount"]) {
    push(errors, own(claims, field), `claim_missing:${field}`);
    if (own(claims, field)) push(errors, claims[field] === 1, `claim_not_one:${field}`);
  }
}

function validateLicense(claims, errors) {
  for (const field of [
    "unrestrictedCommercialLicenseGatePassed",
    "dependencyInventoryComplete",
    "sourceAndLockfileBound",
    "independentLegalReviewPassed",
  ]) claimTrue(claims, errors, field);
  for (const field of ["unknownLicenseCount", "reviewLicenseCount", "restrictedLicenseCount"]) claimZero(claims, errors, field);
}

function validateMalware(claims, errors) {
  for (const field of [
    "productionMalwareProofPassed",
    "independentMalwareEngineUsed",
    "definitionsCurrent",
    "artifactHashesBound",
    "scannerSignatureVerified",
  ]) claimTrue(claims, errors, field);
  claimPositiveInteger(claims, errors, "expectedArtifactCount");
  claimPositiveInteger(claims, errors, "scannedArtifactCount");
  claimEqual(claims, errors, "expectedArtifactCount", "scannedArtifactCount");
  for (const field of ["malwareDetectedCount", "scanErrorCount", "unscannedArtifactCount"]) claimZero(claims, errors, field);
}

function validateProvenance(claims, errors) {
  for (const field of [
    "productionProvenanceGatePassed",
    "trustedOrganizationalIdentity",
    "signatureVerified",
    "officialSchemaValidationPassed",
    "transparencyLogVerified",
    "sourceBuildAndReleaseBound",
    "provenanceLevelSatisfied",
  ]) claimTrue(claims, errors, field);
}

function validateDatabaseLive(claims, errors) {
  for (const field of [
    "databaseLiveGatePassed",
    "liveProductionExecuted",
    "productionEnvironmentAttested",
    "databaseConnectivityPassed",
    "rlsBoundaryTestsPassed",
    "migrationTestsPassed",
    "backupRestoreDrillPassed",
    "paymentAndProviderFlowsPassed",
    "rollbackDrillPassed",
    "testDataIsolated",
    "liveReceiptsSignedAndBound",
  ]) claimTrue(claims, errors, field);
}

function validateExternalCertification(claims, errors, _policy, evaluationTime) {
  for (const field of [
    "externalCertificationPassed",
    "independentAssessor",
    "currentSourceAndReleaseInScope",
    "releaseArtifactBound",
    "signatureAndTrustRootVerified",
  ]) claimTrue(claims, errors, field);
  claimZero(claims, errors, "openCriticalFindingCount");
  claimZero(claims, errors, "openHighFindingCount");
  claimString(claims, errors, "validFrom");
  claimString(claims, errors, "validUntil");
  const now = Date.parse(evaluationTime);
  const from = Date.parse(claims.validFrom);
  const until = Date.parse(claims.validUntil);
  push(errors, Number.isFinite(from), "claim_date_invalid:validFrom");
  push(errors, Number.isFinite(until), "claim_date_invalid:validUntil");
  if (Number.isFinite(now) && Number.isFinite(from) && Number.isFinite(until)) {
    push(errors, from <= now && now <= until, "external_certification_outside_validity_window");
  }
}

const VALIDATORS = Object.freeze({
  full_product_coverage: validateCoverage,
  browser_webpack: (claims, errors) => validateBrowser(claims, errors, "webpack"),
  browser_turbopack: (claims, errors) => validateBrowser(claims, errors, "turbopack"),
  pixel_webpack: (claims, errors) => validatePixel(claims, errors, "webpack"),
  pixel_turbopack: (claims, errors) => validatePixel(claims, errors, "turbopack"),
  accessibility: validateAccessibility,
  source_tree_binding: validateSourceBinding,
  duplication_policy: validateDuplication,
  suppressions_policy: validateSuppressions,
  exact_runtime: validateRuntime,
  repeated_run_determinism: validateDeterminism,
  os_network_isolation: validateNetworkIsolation,
  clean_room_quorum: validateCleanRoom,
  license: validateLicense,
  malware: validateMalware,
  provenance: validateProvenance,
  database_live: validateDatabaseLive,
  external_certification: validateExternalCertification,
});

export function validateWorldClassPolicy(policy) {
  const errors = [];
  push(errors, isObject(policy), "policy_invalid");
  if (!isObject(policy)) return errors;
  push(errors, policy.schemaVersion === WORLD_CLASS_POLICY_SCHEMA, "policy_schema_mismatch");
  for (const field of ["minimumRepeatedRuns", "minimumCleanRoomBuilders", "minimumDistinctBuilderInfrastructures"]) {
    push(errors, Number.isInteger(policy[field]) && policy[field] >= 2, `policy_integer_invalid:${field}`);
  }
  push(
    errors,
    Array.isArray(policy.requiredBuildEngines)
      && ["webpack", "turbopack"].every((engine) => policy.requiredBuildEngines.includes(engine)),
    "policy_build_engines_incomplete",
  );
  push(errors, policy.networkIsolationRequirement === "os_network_namespace", "policy_network_isolation_weakened");
  push(errors, policy.accessibilityRequiresZeroIncompleteRules === true, "policy_a11y_incomplete_not_strict");
  push(errors, policy.accessibilityRequiresZeroAllImpactViolations === true, "policy_a11y_impacts_not_strict");
  return errors;
}

function evaluateRequirement({ id, entry, records, currentSourceTreeSha256, policy, evaluationTime }) {
  const errors = [];
  if (!isObject(entry)) return { id, passed: false, evidence: [], errors: ["evidence_index_entry_missing"] };
  push(errors, Array.isArray(entry.receipts) && entry.receipts.length > 0, "evidence_receipt_reference_missing");
  if (Array.isArray(entry.receipts)) {
    push(errors, Array.isArray(records) && records.length === entry.receipts.length, "evidence_record_count_mismatch");
    const referencedPaths = entry.receipts.map((reference) => reference?.path);
    push(
      errors,
      referencedPaths.every((referencedPath) => typeof referencedPath === "string" && referencedPath.length > 0),
      "evidence_reference_path_invalid",
    );
    push(errors, new Set(referencedPaths).size === referencedPaths.length, "evidence_reference_path_duplicate");
    for (const [index, reference] of entry.receipts.entries()) {
      const record = records?.[index];
      push(errors, record?.path === reference?.path, `evidence_record_path_mismatch:${index}`);
      push(
        errors,
        record?.expectedFileSha256 === reference?.fileSha256,
        `evidence_record_expected_digest_mismatch:${index}`,
      );
    }
  }
  const evidence = Array.isArray(records) ? records.map((record) => ({
    path: record.path ?? null,
    expectedFileSha256: record.expectedFileSha256 ?? null,
    actualFileSha256: record.actualFileSha256 ?? null,
    observedSchemaVersion: record.value?.schemaVersion ?? null,
    readError: record.error ?? null,
  })) : [];
  if (!Array.isArray(records) || records.length === 0) errors.push("receipt_missing");
  for (const record of records ?? []) {
    push(errors, record.error === null || record.error === undefined, `receipt_read_error:${record.path ?? "unknown"}`);
    if (record.error) continue;
    push(errors, isDigest(record.expectedFileSha256), `file_digest_missing_or_invalid:${record.path}`);
    if (isDigest(record.expectedFileSha256)) {
      push(
        errors,
        normalizedDigest(record.expectedFileSha256) === normalizedDigest(record.actualFileSha256),
        `file_digest_mismatch:${record.path}`,
      );
    }
  }
  const receipt = records?.length === 1 ? records[0]?.value : null;
  push(errors, records?.length === 1, "exactly_one_normalized_receipt_required");
  push(errors, isObject(receipt), "receipt_json_invalid");
  if (isObject(receipt)) {
    push(errors, receipt.schemaVersion === WORLD_CLASS_EVIDENCE_SCHEMA, "receipt_schema_mismatch");
    push(errors, receipt.requirementId === id, "receipt_requirement_mismatch");
    push(errors, receipt.status === "PASS", "receipt_status_not_pass");
    push(errors, receipt.passed === true, "receipt_passed_not_true");
    push(errors, isDigest(receipt.receiptSha256), "receipt_checksum_missing_or_invalid");
    if (isDigest(receipt.receiptSha256)) {
      push(
        errors,
        normalizedDigest(receipt.receiptSha256) === sha256(canonicalJson(receiptCore(receipt))),
        "receipt_checksum_mismatch",
      );
    }
    push(errors, isDigest(receipt.sourceTreeSha256), "receipt_source_digest_invalid");
    push(errors, receipt.sourceTreeSha256 === currentSourceTreeSha256, "receipt_source_not_current");
    push(errors, receipt.postRunSourceTreeSha256 === currentSourceTreeSha256, "receipt_post_source_not_current");
    push(errors, receipt.sourceUnchanged === true, "receipt_source_unchanged_not_true");
    push(errors, isObject(receipt.claims), "receipt_claims_missing");
    if (isObject(receipt.claims)) VALIDATORS[id](receipt.claims, errors, policy, evaluationTime);
  }
  return { id, passed: errors.length === 0, evidence, errors: [...new Set(errors)] };
}

export function evaluateWorldClassRequirementEvidence({
  id,
  entry,
  records,
  currentSourceTreeSha256,
  policy,
  evaluationTime = new Date().toISOString(),
}) {
  if (!REQUIREMENT_IDS.includes(id)) throw new Error(`world_class_requirement_unknown:${id}`);
  return evaluateRequirement({
    id,
    entry,
    records,
    currentSourceTreeSha256,
    policy,
    evaluationTime,
  });
}

export function evaluateWorldClassGate({
  currentSourceTreeSha256,
  policy,
  evidenceIndex,
  evidenceByRequirement,
  evaluationTime = new Date().toISOString(),
}) {
  const globalErrors = [];
  push(globalErrors, isDigest(currentSourceTreeSha256), "current_source_digest_invalid");
  globalErrors.push(...validateWorldClassPolicy(policy));
  push(globalErrors, isObject(evidenceIndex), "evidence_index_invalid");
  if (isObject(evidenceIndex)) {
    push(globalErrors, evidenceIndex.schemaVersion === WORLD_CLASS_EVIDENCE_INDEX_SCHEMA, "evidence_index_schema_mismatch");
    push(globalErrors, isObject(evidenceIndex.requirements), "evidence_index_requirements_invalid");
    if (isObject(evidenceIndex.requirements)) {
      for (const id of Object.keys(evidenceIndex.requirements)) {
        if (!REQUIREMENT_IDS.includes(id)) globalErrors.push(`evidence_index_unexpected_requirement:${id}`);
      }
    }
  }
  push(globalErrors, Number.isFinite(Date.parse(evaluationTime)), "evaluation_time_invalid");
  const entries = isObject(evidenceIndex?.requirements) ? evidenceIndex.requirements : {};
  const results = REQUIREMENT_IDS.map((id) => evaluateRequirement({
    id,
    entry: entries[id],
    records: evidenceByRequirement?.[id],
    currentSourceTreeSha256,
    policy: isObject(policy) ? policy : {},
    evaluationTime,
  }));
  const blockers = [
    ...globalErrors.map((error) => `global:${error}`),
    ...results.flatMap((result) => result.errors.map((error) => `${result.id}:${error}`)),
  ];
  const passedRequirementCount = results.filter((result) => result.passed).length;
  const strictWorldClassGatePassed = blockers.length === 0 && passedRequirementCount === REQUIREMENT_IDS.length;
  return {
    schemaVersion: WORLD_CLASS_GATE_SCHEMA,
    evidenceClass: "fail_closed_world_class_release_gate",
    status: strictWorldClassGatePassed ? "PASS" : "FAIL",
    ok: strictWorldClassGatePassed,
    strictWorldClassGatePassed,
    currentSourceTreeSha256,
    evaluationTime,
    requiredRequirementCount: REQUIREMENT_IDS.length,
    passedRequirementCount,
    failedRequirementCount: REQUIREMENT_IDS.length - passedRequirementCount,
    globalErrors: [...new Set(globalErrors)],
    blockers: [...new Set(blockers)],
    requirements: results,
    assuranceBoundary: {
      processNetworkPreloadIsAirGap: false,
      osNetworkIsolationRequired: true,
      internalEvidenceIsExternalCertification: false,
    },
  };
}

export function validateWorldClassGateReceipt(receipt) {
  if (!isObject(receipt)) throw new Error("world_class_gate_receipt_invalid");
  if (receipt.schemaVersion !== WORLD_CLASS_GATE_SCHEMA) throw new Error("world_class_gate_schema_mismatch");
  if (!isDigest(receipt.receiptSha256)) throw new Error("world_class_gate_checksum_invalid");
  if (normalizedDigest(receipt.receiptSha256) !== sha256(canonicalJson(receiptCore(receipt)))) {
    throw new Error("world_class_gate_checksum_mismatch");
  }
  if (!Array.isArray(receipt.requirements) || receipt.requirements.length !== REQUIREMENT_IDS.length) {
    throw new Error("world_class_gate_requirement_count_mismatch");
  }
  if (JSON.stringify(receipt.requirements.map(({ id }) => id)) !== JSON.stringify(REQUIREMENT_IDS)) {
    throw new Error("world_class_gate_requirement_order_mismatch");
  }
  const passed = receipt.requirements.filter((entry) => entry.passed === true).length;
  if (receipt.passedRequirementCount !== passed) throw new Error("world_class_gate_passed_count_mismatch");
  const expected = receipt.blockers.length === 0 && passed === REQUIREMENT_IDS.length;
  if (receipt.strictWorldClassGatePassed !== expected || receipt.ok !== expected) {
    throw new Error("world_class_gate_verdict_mismatch");
  }
  if (receipt.assuranceBoundary?.processNetworkPreloadIsAirGap !== false) {
    throw new Error("world_class_gate_process_preload_boundary_mismatch");
  }
  return receipt;
}
