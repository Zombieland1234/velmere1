import {
  PARENT_REVISION_ID,
  REVISION_ID,
  SOURCE_MANIFEST_PATH,
  SOURCE_MANIFEST_SCHEMA,
  verifySourceRoot,
} from "./r44p46-packaging-lib.mjs";
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";

export const R44P46_A58_RESULT_SCHEMA =
  "velmere.pass36.a58.r44p46-release-integrity-verification.v1";
export const R44P46_A58_PASS_STATUS =
  "PASS_R44P46_RELEASE_INTEGRITY_NO_PROMOTION";
export const R44P46_A58_FAIL_STATUS =
  "FAIL_R44P46_RELEASE_INTEGRITY";
export const R44P46_A58_CHECK_IDS = Object.freeze([
  "r44p46-policy-schema",
  "r44p46-policy-identity",
  "r44p46-policy-manifest-contract",
  "r44p46-policy-authority-verifier-contract",
  "r44p46-policy-truth-boundary",
  "r44p46-current-authority-exact",
  "r44p46-source-root-canonical-manifest",
  "r44p46-authority-source-root-binding",
  "r44p46-manifest-truth-boundary",
  "r44p46-source-fingerprint",
  "r44p46-no-legacy-manifest-shape",
]);

const A58_POLICY_SCHEMA = "velmere.pass36.a58.release-integrity-policy.v1";
const A58_REVISION_ID = "VELMERE_PASS36_A58R0_RELEASE_INTEGRITY_FINAL_BYTE_BINDING";
const AUTHORITY_VERIFIER_PATH =
  "scripts/pass36/verify-a102r44p46-current-source-authority.mjs";
const AUTHORITY_VERIFIER_STATUS =
  "PASS_A102R44P46_CURRENT_SOURCE_AUTHORITY_EXACT_NO_LIVE_OR_SALE_CREDIT";
const DIGEST = /^[a-f0-9]{64}$/u;
export const R44P46_A58_POLICY_PROFILE =
  "R44P46_CANONICAL_SOURCE_MANIFEST";
export const LEGACY_A58_POLICY_PROFILE = "LEGACY_R40_TO_R44_A58";
export const INVALID_A58_POLICY_PROFILE =
  "INVALID_OR_PARTIAL_CURRENT_SOURCE_PROFILE";

const exactArray = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const safeErrorCode = (error, fallback) => {
  const message = error instanceof Error ? error.message : String(error);
  const prefix = message.split(":", 1)[0] ?? "";
  return /^[a-z0-9_.-]{1,160}$/iu.test(prefix) ? prefix : fallback;
};

export function a58PolicyRouterProfile(policy) {
  const contract = policy?.archiveManifestContract;
  const exactR44P46 = policy?.schemaVersion === A58_POLICY_SCHEMA
    && policy?.revisionId === A58_REVISION_ID
    && policy?.currentCheckpointRevisionId === REVISION_ID
    && policy?.currentSourceRevisionId === REVISION_ID
    && policy?.currentCheckpointParentRevisionId === PARENT_REVISION_ID
    && policy?.currentDescendantManifestPath === SOURCE_MANIFEST_PATH
    && policy?.archiveManifestSchemaVersion === SOURCE_MANIFEST_SCHEMA
    && policy?.archiveManifestPath === SOURCE_MANIFEST_PATH
    && contract?.schemaVersion === SOURCE_MANIFEST_SCHEMA
    && contract?.revisionId === REVISION_ID
    && contract?.parentRevisionId === PARENT_REVISION_ID
    && contract?.path === SOURCE_MANIFEST_PATH
    && contract?.manifestPath === SOURCE_MANIFEST_PATH
    && policy?.currentAuthorityVerifierPath === AUTHORITY_VERIFIER_PATH
    && policy?.currentAuthorityVerifierExpectedStatus ===
      AUTHORITY_VERIFIER_STATUS;
  if (exactR44P46) return R44P46_A58_POLICY_PROFILE;

  const r44p46Signals = [
    policy?.currentCheckpointRevisionId === REVISION_ID,
    policy?.currentSourceRevisionId === REVISION_ID,
    policy?.currentCheckpointParentRevisionId === PARENT_REVISION_ID,
    policy?.currentDescendantManifestPath === SOURCE_MANIFEST_PATH,
    policy?.archiveManifestSchemaVersion === SOURCE_MANIFEST_SCHEMA,
    policy?.archiveManifestPath === SOURCE_MANIFEST_PATH,
    contract?.schemaVersion === SOURCE_MANIFEST_SCHEMA,
    contract?.revisionId === REVISION_ID,
    contract?.parentRevisionId === PARENT_REVISION_ID,
    contract?.path === SOURCE_MANIFEST_PATH,
    contract?.manifestPath === SOURCE_MANIFEST_PATH,
    policy?.currentAuthorityVerifierPath === AUTHORITY_VERIFIER_PATH,
    policy?.currentAuthorityVerifierExpectedStatus ===
      AUTHORITY_VERIFIER_STATUS,
  ];
  if (r44p46Signals.some(Boolean)) return INVALID_A58_POLICY_PROFILE;

  const nonEmptyString = (value) => typeof value === "string"
    && value.length > 0;
  const legacyCompatible = policy?.schemaVersion === A58_POLICY_SCHEMA
    && policy?.revisionId === A58_REVISION_ID
    && nonEmptyString(policy?.currentCheckpointRevisionId)
    && policy.currentSourceRevisionId === policy.currentCheckpointRevisionId
    && nonEmptyString(policy?.currentCheckpointParentRevisionId)
    && nonEmptyString(policy?.currentDescendantManifestPath)
    && nonEmptyString(policy?.archiveManifestSchemaVersion)
    && nonEmptyString(policy?.archiveManifestPath)
    && contract?.schemaVersion === policy.archiveManifestSchemaVersion
    && contract?.revisionId === policy.currentCheckpointRevisionId
    && contract?.path === policy.archiveManifestPath
    && nonEmptyString(policy?.currentAuthorityVerifierPath)
    && nonEmptyString(policy?.currentAuthorityVerifierExpectedStatus);
  return legacyCompatible
    ? LEGACY_A58_POLICY_PROFILE
    : INVALID_A58_POLICY_PROFILE;
}

export function isR44P46A58Policy(policy) {
  return a58PolicyRouterProfile(policy) === R44P46_A58_POLICY_PROFILE;
}

export function verifyR44P46A58(root, policy) {
  const checks = [];
  const add = (id, ok, detail = null) =>
    checks.push({ id, ok: Boolean(ok), blocking: true, detail });

  let authority = null;
  let authorityErrorCode = null;
  try {
    authority = validateCurrentSourceAuthorityExact(root, {
      expectedRevisionId: REVISION_ID,
    });
  } catch (error) {
    authorityErrorCode = safeErrorCode(error, "r44p46_current_authority_error");
  }

  let sourceRoot = null;
  let sourceRootErrorCode = null;
  try {
    sourceRoot = verifySourceRoot(root);
  } catch (error) {
    sourceRootErrorCode = safeErrorCode(error, "r44p46_source_root_error");
  }

  const contract = policy?.archiveManifestContract;
  const manifest = sourceRoot?.manifest ?? null;
  const authorityMismatchIds = Array.isArray(authority?.mismatches)
    ? authority.mismatches.map((row) => row?.id).filter((id) => typeof id === "string")
    : [];
  const authorityPayload = authority?.payload ?? null;

  add(
    "r44p46-policy-schema",
    policy?.schemaVersion === A58_POLICY_SCHEMA,
    { observed: policy?.schemaVersion ?? null, expected: A58_POLICY_SCHEMA },
  );
  add(
    "r44p46-policy-identity",
    policy?.revisionId === A58_REVISION_ID
      && policy?.currentCheckpointRevisionId === REVISION_ID
      && policy?.currentSourceRevisionId === REVISION_ID
      && policy?.currentCheckpointParentRevisionId === PARENT_REVISION_ID,
    {
      revisionId: policy?.revisionId ?? null,
      currentCheckpointRevisionId: policy?.currentCheckpointRevisionId ?? null,
      currentSourceRevisionId: policy?.currentSourceRevisionId ?? null,
      currentCheckpointParentRevisionId:
        policy?.currentCheckpointParentRevisionId ?? null,
    },
  );
  add(
    "r44p46-policy-manifest-contract",
    policy?.currentDescendantManifestPath === SOURCE_MANIFEST_PATH
      && policy?.archiveManifestPath === SOURCE_MANIFEST_PATH
      && policy?.archiveManifestSchemaVersion === SOURCE_MANIFEST_SCHEMA
      && contract?.schemaVersion === SOURCE_MANIFEST_SCHEMA
      && contract?.revisionId === REVISION_ID
      && contract?.parentRevisionId === PARENT_REVISION_ID
      && contract?.path === SOURCE_MANIFEST_PATH
      && contract?.manifestPath === SOURCE_MANIFEST_PATH
      && contract?.manifestExcludedFromOwnInventory === true
      && exactArray(contract?.fileFields, ["path", "byteLength", "sha256"])
      && contract?.sourceFingerprintField === "sourceAggregateSha256"
      && contract?.selfDigestField === "manifestSha256"
      && contract?.checkpointClass === "ACTION_REQUIRED_NON_PASS",
    {
      manifestPath: policy?.archiveManifestPath ?? null,
      schemaVersion: policy?.archiveManifestSchemaVersion ?? null,
      fileFields: contract?.fileFields ?? null,
    },
  );
  add(
    "r44p46-policy-authority-verifier-contract",
    policy?.currentAuthorityVerifierPath === AUTHORITY_VERIFIER_PATH
      && policy?.currentAuthorityVerifierExpectedStatus ===
        AUTHORITY_VERIFIER_STATUS,
    {
      verifierPath: policy?.currentAuthorityVerifierPath ?? null,
      expectedStatus: policy?.currentAuthorityVerifierExpectedStatus ?? null,
    },
  );
  add(
    "r44p46-policy-truth-boundary",
    typeof policy?.truthBoundary === "string"
      && policy.truthBoundary.includes("does not grant exact build")
      && policy.truthBoundary.includes("LIVE")
      && policy.truthBoundary.includes("sale credit"),
    { truthBoundaryPresent: typeof policy?.truthBoundary === "string" },
  );
  add(
    "r44p46-current-authority-exact",
    authorityErrorCode === null
      && authority?.passed === true
      && authorityMismatchIds.length === 0
      && authority?.revisionId === REVISION_ID
      && authority?.parentRevisionId === PARENT_REVISION_ID
      && authority?.manifestPath === SOURCE_MANIFEST_PATH
      && authority?.manifestSchema === SOURCE_MANIFEST_SCHEMA,
    {
      errorCode: authorityErrorCode,
      passed: authority?.passed ?? false,
      mismatchIds: authorityMismatchIds,
    },
  );
  add(
    "r44p46-source-root-canonical-manifest",
    sourceRootErrorCode === null
      && sourceRoot !== null
      && manifest?.schemaVersion === SOURCE_MANIFEST_SCHEMA
      && manifest?.revisionId === REVISION_ID
      && manifest?.parentSourceRevisionId === PARENT_REVISION_ID
      && manifest?.parentCheckpointRevisionId === PARENT_REVISION_ID
      && manifest?.manifestPath === SOURCE_MANIFEST_PATH
      && manifest?.manifestExcludedFromOwnInventory === true,
    {
      errorCode: sourceRootErrorCode,
      schemaVersion: manifest?.schemaVersion ?? null,
      revisionId: manifest?.revisionId ?? null,
    },
  );
  add(
    "r44p46-authority-source-root-binding",
    authority?.manifestSha256 === sourceRoot?.manifestFileSha256
      && authority?.manifestDigestSha256 === manifest?.manifestSha256
      && authority?.sourceFingerprint === sourceRoot?.sourceFingerprint
      && authorityPayload?.fileCount === sourceRoot?.fileCount
      && authorityPayload?.byteLength === sourceRoot?.payloadBytes
      && authorityPayload?.pathSetSha256 === manifest?.pathSetSha256
      && authorityPayload?.aggregateSha256 === manifest?.sourceAggregateSha256,
    {
      authorityManifestFileSha256: authority?.manifestSha256 ?? null,
      sourceManifestFileSha256: sourceRoot?.manifestFileSha256 ?? null,
      authoritySourceFingerprint: authority?.sourceFingerprint ?? null,
      sourceRootFingerprint: sourceRoot?.sourceFingerprint ?? null,
    },
  );
  add(
    "r44p46-manifest-truth-boundary",
    manifest?.checkpointClass === "ACTION_REQUIRED_NON_PASS"
      && manifest?.globalDecision === "NO_GO"
      && manifest?.live === false
      && manifest?.saleEnabled === false
      && manifest?.productionApproved === false
      && manifest?.worldClassProven === false,
    {
      checkpointClass: manifest?.checkpointClass ?? null,
      globalDecision: manifest?.globalDecision ?? null,
      live: manifest?.live ?? null,
      saleEnabled: manifest?.saleEnabled ?? null,
      productionApproved: manifest?.productionApproved ?? null,
      worldClassProven: manifest?.worldClassProven ?? null,
    },
  );
  add(
    "r44p46-source-fingerprint",
    DIGEST.test(String(sourceRoot?.manifestFileSha256 ?? ""))
      && DIGEST.test(String(manifest?.manifestSha256 ?? ""))
      && DIGEST.test(String(sourceRoot?.sourceFingerprint ?? ""))
      && DIGEST.test(String(manifest?.pathSetSha256 ?? ""))
      && Number.isSafeInteger(sourceRoot?.fileCount)
      && sourceRoot.fileCount > 0
      && Number.isSafeInteger(sourceRoot?.payloadBytes)
      && sourceRoot.payloadBytes > 0,
    {
      fileCount: sourceRoot?.fileCount ?? null,
      payloadBytes: sourceRoot?.payloadBytes ?? null,
    },
  );
  add(
    "r44p46-no-legacy-manifest-shape",
    manifest !== null
      && Array.isArray(manifest.files)
      && !("entries" in manifest)
      && !("normalizedTimestamp" in manifest)
      && !("byteLength" in manifest)
      && !("aggregateSha256" in manifest)
      && !("completedThrough" in manifest)
      && manifest.files.every(
        (row) => row !== null
          && typeof row === "object"
          && exactArray(Object.keys(row).sort(), ["byteLength", "path", "sha256"])
          && !("mode" in row),
      ),
    {
      filesField: Array.isArray(manifest?.files),
      legacyEntriesField: manifest !== null && "entries" in manifest,
      legacyNormalizedTimestampField:
        manifest !== null && "normalizedTimestamp" in manifest,
    },
  );

  const blockingFailures = checks.filter((row) => row.blocking && !row.ok);
  const passed = blockingFailures.length === 0;
  return {
    schemaVersion: R44P46_A58_RESULT_SCHEMA,
    revisionId: A58_REVISION_ID,
    sourceRevisionId: REVISION_ID,
    sourceParentRevisionId: PARENT_REVISION_ID,
    profile: "R44P46_SOURCE_ONLY_MANIFEST_V1",
    status: passed ? R44P46_A58_PASS_STATUS : R44P46_A58_FAIL_STATUS,
    passed,
    promotionAllowed: false,
    productionApproved: false,
    exactFinalByteBuildExecuted: false,
    browserExecuted: false,
    historicalArtifactRecoveryComplete: false,
    historicalRecoveryRequiredForCurrentSourceIntegrity: false,
    sourceAuthority: {
      passed: authority?.passed === true,
      errorCode: authorityErrorCode,
      mismatchIds: authorityMismatchIds,
      manifestPath: authority?.manifestPath ?? SOURCE_MANIFEST_PATH,
      manifestSchema: authority?.manifestSchema ?? SOURCE_MANIFEST_SCHEMA,
      manifestFileSha256: authority?.manifestSha256 ?? null,
      manifestDigestSha256: authority?.manifestDigestSha256 ?? null,
      sourceFingerprint: authority?.sourceFingerprint ?? null,
      payload: authorityPayload,
    },
    sourceRoot: {
      passed: sourceRootErrorCode === null && sourceRoot !== null,
      errorCode: sourceRootErrorCode,
      manifestPath: SOURCE_MANIFEST_PATH,
      manifestSchema: manifest?.schemaVersion ?? SOURCE_MANIFEST_SCHEMA,
      manifestFileSha256: sourceRoot?.manifestFileSha256 ?? null,
      manifestDigestSha256: manifest?.manifestSha256 ?? null,
      sourceFingerprint: sourceRoot?.sourceFingerprint ?? null,
      pathSetSha256: manifest?.pathSetSha256 ?? null,
      fileCount: sourceRoot?.fileCount ?? null,
      payloadBytes: sourceRoot?.payloadBytes ?? null,
      canonicalFileFields: ["path", "byteLength", "sha256"],
      legacyManifestShapeAccepted: false,
    },
    summary: {
      checks: checks.length,
      passed: checks.filter((row) => row.ok).length,
      failed: checks.filter((row) => !row.ok).length,
      blockingFailed: blockingFailures.length,
    },
    checks,
    blockers: [
      "EXACT_FINAL_BYTE_BUILD_NOT_EXECUTED_BY_A58",
      "BROWSER_NOT_EXECUTED_BY_A58",
      "EXTERNAL_PRODUCTION_AND_SALE_GATES_NOT_PROVEN",
    ],
    globalDecision: "NO_GO",
    live: false,
    liveProven: false,
    saleEnabled: false,
    worldClassProven: false,
    truthBoundary:
      "This R44P46 A58 adapter proves only the canonical current SOURCE root and manifest binding. It grants no exact build, Browser, LIVE, production, sale, external, or historical recovery credit.",
  };
}

export function validateR44P46A58Result(parsed) {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return false;
  }
  if (!Array.isArray(parsed.checks) || parsed.checks.length === 0) return false;
  const ids = parsed.checks.map((row) => row?.id);
  const exactChecks = exactArray(ids, R44P46_A58_CHECK_IDS)
    && new Set(ids).size === R44P46_A58_CHECK_IDS.length
    && parsed.checks.every(
      (row) => row !== null
        && typeof row === "object"
        && row.ok === true
        && row.blocking === true,
    );
  const manifestBindings = [
    parsed.sourceAuthority?.manifestFileSha256,
    parsed.sourceAuthority?.manifestDigestSha256,
    parsed.sourceAuthority?.sourceFingerprint,
    parsed.sourceAuthority?.payload?.pathSetSha256,
    parsed.sourceAuthority?.payload?.aggregateSha256,
    parsed.sourceRoot?.manifestFileSha256,
    parsed.sourceRoot?.manifestDigestSha256,
    parsed.sourceRoot?.sourceFingerprint,
    parsed.sourceRoot?.pathSetSha256,
  ];
  const bindingsExact = manifestBindings.every((value) => DIGEST.test(String(value ?? "")))
    && parsed.sourceAuthority.manifestFileSha256 === parsed.sourceRoot.manifestFileSha256
    && parsed.sourceAuthority.manifestDigestSha256 === parsed.sourceRoot.manifestDigestSha256
    && parsed.sourceAuthority.sourceFingerprint === parsed.sourceRoot.sourceFingerprint
    && parsed.sourceAuthority.payload.pathSetSha256 === parsed.sourceRoot.pathSetSha256
    && parsed.sourceAuthority.payload.fileCount === parsed.sourceRoot.fileCount
    && parsed.sourceAuthority.payload.byteLength === parsed.sourceRoot.payloadBytes
    && parsed.sourceAuthority.payload.aggregateSha256 === parsed.sourceRoot.sourceFingerprint;
  return parsed.schemaVersion === R44P46_A58_RESULT_SCHEMA
    && parsed.revisionId === A58_REVISION_ID
    && parsed.sourceRevisionId === REVISION_ID
    && parsed.sourceParentRevisionId === PARENT_REVISION_ID
    && parsed.profile === "R44P46_SOURCE_ONLY_MANIFEST_V1"
    && parsed.status === R44P46_A58_PASS_STATUS
    && parsed.passed === true
    && exactChecks
    && parsed.summary?.checks === R44P46_A58_CHECK_IDS.length
    && parsed.summary?.passed === R44P46_A58_CHECK_IDS.length
    && parsed.summary?.failed === 0
    && parsed.summary?.blockingFailed === 0
    && parsed.sourceAuthority?.passed === true
    && parsed.sourceAuthority?.errorCode === null
    && exactArray(parsed.sourceAuthority?.mismatchIds, [])
    && parsed.sourceAuthority?.manifestPath === SOURCE_MANIFEST_PATH
    && parsed.sourceAuthority?.manifestSchema === SOURCE_MANIFEST_SCHEMA
    && parsed.sourceRoot?.passed === true
    && parsed.sourceRoot?.errorCode === null
    && parsed.sourceRoot?.manifestPath === SOURCE_MANIFEST_PATH
    && parsed.sourceRoot?.manifestSchema === SOURCE_MANIFEST_SCHEMA
    && exactArray(
      parsed.sourceRoot?.canonicalFileFields,
      ["path", "byteLength", "sha256"],
    )
    && parsed.sourceRoot?.legacyManifestShapeAccepted === false
    && Number.isSafeInteger(parsed.sourceRoot?.fileCount)
    && parsed.sourceRoot.fileCount > 0
    && Number.isSafeInteger(parsed.sourceRoot?.payloadBytes)
    && parsed.sourceRoot.payloadBytes > 0
    && bindingsExact
    && parsed.promotionAllowed === false
    && parsed.productionApproved === false
    && parsed.exactFinalByteBuildExecuted === false
    && parsed.browserExecuted === false
    && parsed.historicalArtifactRecoveryComplete === false
    && parsed.historicalRecoveryRequiredForCurrentSourceIntegrity === false
    && parsed.globalDecision === "NO_GO"
    && parsed.live === false
    && parsed.liveProven === false
    && parsed.saleEnabled === false
    && parsed.worldClassProven === false;
}
