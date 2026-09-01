#!/usr/bin/env node
import {
  A98BoundaryError,
  parseA98StrictJson,
  sha256Bytes,
  sha256Text,
  validateA98Url,
} from "./a98-email-storage-kms-boundary.mjs";

export const A99_BOUNDARY_ID = "velmere.pass36.a99.backup-restore-provider-loss-boundary.v1";
const HEX64 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,180}$/u;
const SAFE_MODE = /^[a-z][a-z0-9_-]{1,80}$/u;
const EXACT_RLS_CASES = 19;
const EXACT_OWNER_CASES = 13;
const EXACT_OPERATOR_CASES = 6;
const MAX_CLOCK_SKEW_MS = 60_000;
const MAX_ASSERTION_LIFETIME_MS = 10 * 60_000;
const MAX_RECENT_AUTH_AGE_MS = 5 * 60_000;

export class A99BoundaryError extends Error {
  constructor(code, detail = null, receipt = null) {
    super(detail == null ? code : `${code}:${String(detail)}`);
    this.name = "A99BoundaryError";
    this.code = code;
    this.detail = detail;
    this.receipt = receipt;
  }
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new A99BoundaryError(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new A99BoundaryError(code, JSON.stringify({ actual, expected: wanted }));
  }
}

function requireSafeId(value, code) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) throw new A99BoundaryError(code);
  return value;
}

function requireHex64(value, code) {
  if (typeof value !== "string" || !HEX64.test(value)) throw new A99BoundaryError(code);
  return value;
}

function requirePositiveSafeInt(value, code, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new A99BoundaryError(code);
  return value;
}

function requireIso(value, code) {
  if (typeof value !== "string" || value.length > 64) throw new A99BoundaryError(code);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new A99BoundaryError(code);
  return parsed;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function buildA99EnvironmentDigest(value) {
  exactKeys(value, ["projectClass", "stagingOrigin", "databaseHostSha256", "sourceArchiveSha256", "sourceManifestSha256"], "a99_environment_fields_invalid");
  if (value.projectClass !== "disposable_staging") throw new A99BoundaryError("a99_project_class_invalid");
  const origin = validateA98Url(value.stagingOrigin, { profile: "staging", requireOriginOnly: true }).origin;
  requireHex64(value.databaseHostSha256, "a99_database_host_digest_invalid");
  requireHex64(value.sourceArchiveSha256, "a99_source_archive_digest_invalid");
  requireHex64(value.sourceManifestSha256, "a99_source_manifest_digest_invalid");
  return sha256Text(canonicalJson({ ...value, stagingOrigin: origin }));
}

export function validateA99BridgeUrl(raw, { trustedOrigin, allowedPath, fixtureMode = false } = {}) {
  if (typeof allowedPath !== "string" || !allowedPath.startsWith("/") || allowedPath.includes("..")) {
    throw new A99BoundaryError("a99_bridge_allowed_path_invalid");
  }
  try {
    return validateA98Url(raw, {
      profile: "staging",
      fixtureMode,
      trustedOrigin,
      allowedPaths: [allowedPath],
    });
  } catch (error) {
    if (error instanceof A98BoundaryError) throw new A99BoundaryError(error.code.replace(/^a98_/u, "a99_"), error.detail);
    throw error;
  }
}

export function validateA99BackupReceipt(value, expected) {
  exactKeys(value, [
    "schemaVersion", "operation", "requestId", "sourceRevisionId", "sourceManifestSha256",
    "environmentDigest", "backupId", "backupCreatedAt", "snapshotCutoffAt", "scope",
    "encrypted", "databaseDigest", "storageDigest", "backupManifestSha256", "backupBytes",
    "recordCount", "objectCount", "providerReceiptSha256",
  ], "a99_backup_receipt_fields_invalid");
  if (value.schemaVersion !== "velmere.a99.backup-receipt.v1" || value.operation !== "backup_create") throw new A99BoundaryError("a99_backup_receipt_schema_invalid");
  if (value.scope !== "bounded_application_state" || value.encrypted !== true) throw new A99BoundaryError("a99_backup_scope_or_encryption_invalid");
  requireSafeId(value.requestId, "a99_backup_request_id_invalid");
  requireSafeId(value.backupId, "a99_backup_id_invalid");
  requireHex64(value.sourceManifestSha256, "a99_backup_source_manifest_invalid");
  requireHex64(value.environmentDigest, "a99_backup_environment_digest_invalid");
  requireHex64(value.databaseDigest, "a99_backup_database_digest_invalid");
  requireHex64(value.storageDigest, "a99_backup_storage_digest_invalid");
  requireHex64(value.backupManifestSha256, "a99_backup_manifest_digest_invalid");
  requireHex64(value.providerReceiptSha256, "a99_backup_provider_receipt_invalid");
  requirePositiveSafeInt(value.backupBytes, "a99_backup_bytes_invalid", { max: 2 ** 40 });
  requirePositiveSafeInt(value.recordCount, "a99_backup_record_count_invalid", { min: 0, max: 2 ** 40 });
  requirePositiveSafeInt(value.objectCount, "a99_backup_object_count_invalid", { min: 0, max: 2 ** 40 });
  const createdAt = requireIso(value.backupCreatedAt, "a99_backup_created_at_invalid");
  const cutoffAt = requireIso(value.snapshotCutoffAt, "a99_backup_cutoff_invalid");
  if (cutoffAt > createdAt + MAX_CLOCK_SKEW_MS) throw new A99BoundaryError("a99_backup_cutoff_after_creation");
  if (expected) {
    if (value.requestId !== expected.requestId) throw new A99BoundaryError("a99_backup_request_binding_mismatch");
    if (value.sourceRevisionId !== expected.sourceRevisionId) throw new A99BoundaryError("a99_backup_source_revision_mismatch");
    if (value.sourceManifestSha256 !== expected.sourceManifestSha256) throw new A99BoundaryError("a99_backup_source_manifest_mismatch");
    if (value.environmentDigest !== expected.environmentDigest) throw new A99BoundaryError("a99_backup_environment_mismatch");
  }
  return Object.freeze({ ...value, createdAtMs: createdAt, cutoffAtMs: cutoffAt });
}

export function validateA99RestoreReceipt(value, expected) {
  exactKeys(value, [
    "schemaVersion", "operation", "requestId", "backupId", "backupManifestSha256", "environmentDigest",
    "restoreId", "restoreTargetClass", "restoreTargetDigest", "databaseDigest", "storageDigest",
    "restoredRecords", "restoredObjects", "rlsReceiptSha256", "rlsRevisionId", "casesPrepared",
    "casesExecuted", "casesPassed", "ownerCasesPassed", "operatorCasesPassed", "crossTenantReadsDenied",
    "sessionRevocationVerified", "restoreVerifiedAt", "providerReceiptSha256",
  ], "a99_restore_receipt_fields_invalid");
  if (value.schemaVersion !== "velmere.a99.restore-receipt.v1" || value.operation !== "restore_verify") throw new A99BoundaryError("a99_restore_receipt_schema_invalid");
  if (value.restoreTargetClass !== "disposable_restore") throw new A99BoundaryError("a99_restore_target_class_invalid");
  requireSafeId(value.requestId, "a99_restore_request_id_invalid");
  requireSafeId(value.backupId, "a99_restore_backup_id_invalid");
  requireSafeId(value.restoreId, "a99_restore_id_invalid");
  requireHex64(value.backupManifestSha256, "a99_restore_backup_manifest_invalid");
  requireHex64(value.environmentDigest, "a99_restore_environment_digest_invalid");
  requireHex64(value.restoreTargetDigest, "a99_restore_target_digest_invalid");
  requireHex64(value.databaseDigest, "a99_restore_database_digest_invalid");
  requireHex64(value.storageDigest, "a99_restore_storage_digest_invalid");
  requireHex64(value.rlsReceiptSha256, "a99_restore_rls_receipt_invalid");
  requireHex64(value.providerReceiptSha256, "a99_restore_provider_receipt_invalid");
  requirePositiveSafeInt(value.restoredRecords, "a99_restore_records_invalid", { min: 1, max: 2 ** 40 });
  requirePositiveSafeInt(value.restoredObjects, "a99_restore_objects_invalid", { min: 1, max: 2 ** 40 });
  if (value.rlsRevisionId !== "VELMERE_PASS36_A96R0_RLS_19_CASE_EXECUTABLE_REPLAY_AND_CUSTOMER_ARTIFACT_USER_CLIENT_BOUNDARY") throw new A99BoundaryError("a99_restore_rls_revision_invalid");
  if (value.casesPrepared !== EXACT_RLS_CASES || value.casesExecuted !== EXACT_RLS_CASES || value.casesPassed !== EXACT_RLS_CASES) throw new A99BoundaryError("a99_restore_rls_denominator_invalid");
  if (value.ownerCasesPassed !== EXACT_OWNER_CASES || value.operatorCasesPassed !== EXACT_OPERATOR_CASES) throw new A99BoundaryError("a99_restore_rls_partition_invalid");
  if (value.crossTenantReadsDenied !== true || value.sessionRevocationVerified !== true) throw new A99BoundaryError("a99_restore_tenant_or_session_invalid");
  requireIso(value.restoreVerifiedAt, "a99_restore_verified_at_invalid");
  if (expected) {
    if (value.requestId !== expected.requestId) throw new A99BoundaryError("a99_restore_request_binding_mismatch");
    if (value.backupId !== expected.backup.backupId || value.backupManifestSha256 !== expected.backup.backupManifestSha256) throw new A99BoundaryError("a99_restore_backup_binding_mismatch");
    if (value.environmentDigest !== expected.environmentDigest) throw new A99BoundaryError("a99_restore_environment_mismatch");
    if (value.databaseDigest !== expected.backup.databaseDigest || value.storageDigest !== expected.backup.storageDigest) throw new A99BoundaryError("a99_restore_digest_parity_failed");
    if (value.restoreTargetDigest === expected.sourceTargetDigest) throw new A99BoundaryError("a99_restore_target_not_isolated");
  }
  return Object.freeze({ ...value });
}

function validateAssertionTime(value, nowMs) {
  const issuedAtMs = requireIso(value.issuedAt, "a99_assertion_issued_at_invalid");
  const recentAuthAtMs = requireIso(value.recentAuthAt, "a99_assertion_recent_auth_invalid");
  const expiresAtMs = requireIso(value.expiresAt, "a99_assertion_expires_at_invalid");
  if (issuedAtMs > nowMs + MAX_CLOCK_SKEW_MS || recentAuthAtMs > nowMs + MAX_CLOCK_SKEW_MS) throw new A99BoundaryError("a99_assertion_future_timestamp");
  if (expiresAtMs <= nowMs || expiresAtMs <= issuedAtMs || expiresAtMs - issuedAtMs > MAX_ASSERTION_LIFETIME_MS) throw new A99BoundaryError("a99_assertion_expired_or_window_invalid");
  if (nowMs - recentAuthAtMs > MAX_RECENT_AUTH_AGE_MS || recentAuthAtMs > issuedAtMs + MAX_CLOCK_SKEW_MS) throw new A99BoundaryError("a99_assertion_recent_auth_stale");
}

export function validateA99DualControl({ primary, independent, action, nowMs = Date.now() } = {}) {
  const keys = [
    "schemaVersion", "assertionId", "actorIdHash", "sessionIdHash", "role", "mfaMethod", "environment",
    "scope", "method", "path", "bodySha256", "actionDigest", "issuedAt", "recentAuthAt", "expiresAt", "decision",
  ];
  exactKeys(primary, keys, "a99_primary_assertion_fields_invalid");
  exactKeys(independent, keys, "a99_independent_assertion_fields_invalid");
  for (const [label, value] of [["primary", primary], ["independent", independent]]) {
    if (value.schemaVersion !== "velmere.a99.operator-assertion.v1") throw new A99BoundaryError(`a99_${label}_assertion_schema_invalid`);
    requireSafeId(value.assertionId, `a99_${label}_assertion_id_invalid`);
    requireHex64(value.actorIdHash, `a99_${label}_actor_invalid`);
    requireHex64(value.sessionIdHash, `a99_${label}_session_invalid`);
    requireHex64(value.bodySha256, `a99_${label}_body_digest_invalid`);
    requireHex64(value.actionDigest, `a99_${label}_action_digest_invalid`);
    if (value.mfaMethod !== "webauthn" || value.environment !== "test_only" || value.method !== "POST" || value.decision !== "approve") throw new A99BoundaryError(`a99_${label}_assertion_policy_invalid`);
    if (!SAFE_MODE.test(value.scope) || typeof value.path !== "string" || !value.path.startsWith("/") || value.path.includes("..")) throw new A99BoundaryError(`a99_${label}_assertion_target_invalid`);
    validateAssertionTime(value, nowMs);
  }
  if (primary.role !== "operations_owner" || independent.role !== "independent_reviewer") throw new A99BoundaryError("a99_dual_control_roles_invalid");
  if (primary.actorIdHash === independent.actorIdHash || primary.sessionIdHash === independent.sessionIdHash) throw new A99BoundaryError("a99_dual_control_not_independent");
  const expectedBody = requireHex64(action.bodySha256, "a99_action_body_digest_invalid");
  const expectedDigest = sha256Text(canonicalJson({ scope: action.scope, method: "POST", path: action.path, bodySha256: expectedBody }));
  for (const value of [primary, independent]) {
    if (value.scope !== action.scope || value.path !== action.path || value.bodySha256 !== expectedBody || value.actionDigest !== expectedDigest) throw new A99BoundaryError("a99_dual_control_action_binding_mismatch");
  }
  return Object.freeze({ primaryAssertionIdHash: sha256Text(primary.assertionId), independentAssertionIdHash: sha256Text(independent.assertionId), actionDigest: expectedDigest });
}

export function validateA99DeploymentState(value, expected = {}) {
  exactKeys(value, ["schemaVersion", "sourceRevisionId", "sourceManifestSha256", "environmentDigest", "activeDeploymentId", "previousDeploymentId", "health", "smokePassed", "observedAt", "providerReceiptSha256"], "a99_deployment_state_fields_invalid");
  if (value.schemaVersion !== "velmere.a99.deployment-state.v1") throw new A99BoundaryError("a99_deployment_state_schema_invalid");
  requireSafeId(value.activeDeploymentId, "a99_active_deployment_invalid");
  requireSafeId(value.previousDeploymentId, "a99_previous_deployment_invalid");
  if (value.activeDeploymentId === value.previousDeploymentId) throw new A99BoundaryError("a99_deployment_ids_not_distinct");
  requireHex64(value.sourceManifestSha256, "a99_deployment_source_manifest_invalid");
  requireHex64(value.environmentDigest, "a99_deployment_environment_invalid");
  requireHex64(value.providerReceiptSha256, "a99_deployment_provider_receipt_invalid");
  requireIso(value.observedAt, "a99_deployment_observed_at_invalid");
  if (value.health !== "healthy" || value.smokePassed !== true) throw new A99BoundaryError("a99_deployment_unhealthy");
  if (expected.sourceRevisionId && value.sourceRevisionId !== expected.sourceRevisionId) throw new A99BoundaryError("a99_deployment_source_revision_mismatch");
  if (expected.sourceManifestSha256 && value.sourceManifestSha256 !== expected.sourceManifestSha256) throw new A99BoundaryError("a99_deployment_source_manifest_mismatch");
  if (expected.environmentDigest && value.environmentDigest !== expected.environmentDigest) throw new A99BoundaryError("a99_deployment_environment_mismatch");
  return Object.freeze({ ...value });
}

export function validateA99ProviderIdentity(value, expected = {}) {
  exactKeys(value, ["schemaVersion", "sourceRevisionId", "sourceManifestSha256", "environmentDigest", "providerId", "vendorFamily", "accountDigest", "region", "failureDomainDigest", "controlPlaneDigest", "credentialDigest", "mode", "observedAt", "providerReceiptSha256"], "a99_provider_identity_fields_invalid");
  if (value.schemaVersion !== "velmere.a99.provider-identity.v1") throw new A99BoundaryError("a99_provider_identity_schema_invalid");
  for (const key of ["providerId", "vendorFamily", "region", "mode"]) requireSafeId(value[key], `a99_provider_${key}_invalid`);
  for (const key of ["sourceManifestSha256", "environmentDigest", "accountDigest", "failureDomainDigest", "controlPlaneDigest", "credentialDigest", "providerReceiptSha256"]) requireHex64(value[key], `a99_provider_${key}_invalid`);
  requireIso(value.observedAt, "a99_provider_observed_at_invalid");
  if (expected.sourceRevisionId && value.sourceRevisionId !== expected.sourceRevisionId) throw new A99BoundaryError("a99_provider_source_revision_mismatch");
  if (expected.sourceManifestSha256 && value.sourceManifestSha256 !== expected.sourceManifestSha256) throw new A99BoundaryError("a99_provider_source_manifest_mismatch");
  if (expected.environmentDigest && value.environmentDigest !== expected.environmentDigest) throw new A99BoundaryError("a99_provider_environment_mismatch");
  return Object.freeze({ ...value });
}

export function assertA99IndependentProviderPair(primary, alternate) {
  const requiredDifferent = ["providerId", "vendorFamily", "accountDigest", "failureDomainDigest", "controlPlaneDigest", "credentialDigest"];
  const same = requiredDifferent.filter((key) => primary[key] === alternate[key]);
  if (same.length) throw new A99BoundaryError("a99_provider_failure_domains_not_independent", same.join(","));
  return Object.freeze({ independentDimensions: requiredDifferent.length, primaryDigest: sha256Text(canonicalJson(primary)), alternateDigest: sha256Text(canonicalJson(alternate)) });
}

export function createA99Journal() {
  const events = [];
  let previousDigest = "0".repeat(64);
  return {
    append(type, data = {}) {
      if (!SAFE_MODE.test(type)) throw new A99BoundaryError("a99_journal_event_type_invalid");
      const core = { sequence: events.length + 1, previousDigest, type, data };
      const digest = sha256Text(canonicalJson(core));
      const event = Object.freeze({ ...core, digest });
      events.push(event);
      previousDigest = digest;
      return event;
    },
    snapshot() { return Object.freeze({ events: [...events], finalDigest: previousDigest }); },
  };
}

export async function executeA99RecoveryLifecycle({
  backupCreate,
  backupVerify,
  restoreCreate,
  restoreVerify,
  deploymentStatus,
  deploymentRollback,
  providerStatus,
  providerControl,
  cleanupRestore,
  dualControl,
  expected,
} = {}) {
  const required = { backupCreate, backupVerify, restoreCreate, restoreVerify, deploymentStatus, deploymentRollback, providerStatus, providerControl, cleanupRestore };
  for (const [name, fn] of Object.entries(required)) if (typeof fn !== "function") throw new A99BoundaryError("a99_lifecycle_callback_missing", name);
  const journal = createA99Journal();
  const state = {
    mutationStarted: false,
    restoreCreated: false,
    deploymentRolledBack: false,
    providerOutageInduced: false,
    restoreCleanupAttempted: false,
    restoreCleanupSucceeded: false,
    deploymentForwardAttempted: false,
    deploymentForwardSucceeded: false,
    providerRestoreAttempted: false,
    providerRestoreSucceeded: false,
    failure: null,
  };
  let backup = null;
  let restore;
  let restoreSubject = null;
  let baselineDeployment = null;
  let primaryProvider = null;
  let failure = null;
  try {
    journal.append("preflight_passed", { environmentDigest: expected.environmentDigest });
    backup = validateA99BackupReceipt(await backupCreate(), expected);
    state.mutationStarted = true;
    journal.append("backup_created", { backupIdHash: sha256Text(backup.backupId), manifestSha256: backup.backupManifestSha256 });
    const verifiedBackup = validateA99BackupReceipt(await backupVerify(backup), expected);
    if (verifiedBackup.backupId !== backup.backupId || verifiedBackup.backupManifestSha256 !== backup.backupManifestSha256 || verifiedBackup.providerReceiptSha256 === backup.providerReceiptSha256) throw new A99BoundaryError("a99_backup_verify_not_independent");
    journal.append("backup_verified", { backupIdHash: sha256Text(backup.backupId) });

    restoreSubject = await restoreCreate(backup);
    if (!restoreSubject || typeof restoreSubject.restoreId !== "string") throw new A99BoundaryError("a99_restore_create_receipt_invalid");
    state.restoreCreated = true;
    journal.append("restore_created", { restoreIdHash: sha256Text(restoreSubject.restoreId) });
    restore = validateA99RestoreReceipt(await restoreVerify(restoreSubject, backup), { backup, environmentDigest: expected.environmentDigest, requestId: expected.restoreRequestId, sourceTargetDigest: expected.sourceTargetDigest });
    journal.append("restore_verified", { restoreIdHash: sha256Text(restore.restoreId), rlsReceiptSha256: restore.rlsReceiptSha256 });

    baselineDeployment = validateA99DeploymentState(await deploymentStatus(), expected);
    journal.append("deployment_baseline", { activeDeploymentHash: sha256Text(baselineDeployment.activeDeploymentId), previousDeploymentHash: sha256Text(baselineDeployment.previousDeploymentId) });
    validateA99DualControl({ primary: dualControl.rollback.primary, independent: dualControl.rollback.independent, action: dualControl.rollback.action });
    await deploymentRollback({ operation: "rollback", targetDeploymentId: baselineDeployment.previousDeploymentId, expectedCurrentDeploymentId: baselineDeployment.activeDeploymentId });
    state.deploymentRolledBack = true;
    journal.append("deployment_rollback_requested", { targetDeploymentHash: sha256Text(baselineDeployment.previousDeploymentId) });
    const rolled = validateA99DeploymentState(await deploymentStatus(), expected);
    if (rolled.activeDeploymentId !== baselineDeployment.previousDeploymentId || rolled.previousDeploymentId !== baselineDeployment.activeDeploymentId) throw new A99BoundaryError("a99_deployment_rollback_state_mismatch");
    journal.append("deployment_rollback_verified", { activeDeploymentHash: sha256Text(rolled.activeDeploymentId) });

    primaryProvider = validateA99ProviderIdentity(await providerStatus(), expected);
    if (!["primary", "normal"].includes(primaryProvider.mode)) throw new A99BoundaryError("a99_provider_primary_baseline_invalid");
    journal.append("provider_primary_baseline", { providerHash: sha256Text(primaryProvider.providerId) });
    validateA99DualControl({ primary: dualControl.providerOutage.primary, independent: dualControl.providerOutage.independent, action: dualControl.providerOutage.action });
    state.providerOutageInduced = true;
    await providerControl({ mode: "primary_down", expectedProviderId: primaryProvider.providerId });
    journal.append("provider_outage_induced", { providerHash: sha256Text(primaryProvider.providerId) });
    const alternate = validateA99ProviderIdentity(await providerStatus(), expected);
    if (!["failover", "degraded_failover"].includes(alternate.mode)) throw new A99BoundaryError("a99_provider_failover_mode_invalid");
    assertA99IndependentProviderPair(primaryProvider, alternate);
    journal.append("provider_failover_verified", { providerHash: sha256Text(alternate.providerId) });

    state.providerRestoreAttempted = true;
    await providerControl({ mode: "primary_up", expectedProviderId: primaryProvider.providerId });
    const restoredPrimary = validateA99ProviderIdentity(await providerStatus(), expected);
    state.providerRestoreSucceeded = restoredPrimary.providerId === primaryProvider.providerId && ["primary", "recovered"].includes(restoredPrimary.mode);
    if (!state.providerRestoreSucceeded) throw new A99BoundaryError("a99_provider_primary_restore_failed");
    state.providerOutageInduced = false;
    journal.append("provider_primary_restored", { providerHash: sha256Text(restoredPrimary.providerId) });

    validateA99DualControl({ primary: dualControl.restoreForward.primary, independent: dualControl.restoreForward.independent, action: dualControl.restoreForward.action });
    state.deploymentForwardAttempted = true;
    await deploymentRollback({ operation: "restore_forward", targetDeploymentId: baselineDeployment.activeDeploymentId, expectedCurrentDeploymentId: baselineDeployment.previousDeploymentId });
    const forwarded = validateA99DeploymentState(await deploymentStatus(), expected);
    state.deploymentForwardSucceeded = forwarded.activeDeploymentId === baselineDeployment.activeDeploymentId;
    if (!state.deploymentForwardSucceeded) throw new A99BoundaryError("a99_deployment_forward_restore_failed");
    state.deploymentRolledBack = false;
    journal.append("deployment_forward_restored", { activeDeploymentHash: sha256Text(forwarded.activeDeploymentId) });

    state.restoreCleanupAttempted = true;
    state.restoreCleanupSucceeded = await cleanupRestore({ restoreId: restore.restoreId, backupId: backup.backupId }) === true;
    if (!state.restoreCleanupSucceeded) throw new A99BoundaryError("a99_restore_cleanup_not_confirmed");
    state.restoreCreated = false;
    journal.append("restore_cleanup_confirmed", { restoreIdHash: sha256Text(restore.restoreId) });
    journal.append("completed", { safeBaseline: true });
  } catch (error) {
    failure = error;
    state.failure = error instanceof Error ? error.message : String(error);
    try { journal.append("failure", { code: error instanceof A99BoundaryError ? error.code : "a99_lifecycle_error" }); } catch {
      // Preserve the original lifecycle failure if the append-only journal is sealed.
    }
  }

  if (state.providerOutageInduced && primaryProvider) {
    state.providerRestoreAttempted = true;
    try {
      await providerControl({ mode: "primary_up", expectedProviderId: primaryProvider.providerId });
      const restored = validateA99ProviderIdentity(await providerStatus(), expected);
      state.providerRestoreSucceeded = restored.providerId === primaryProvider.providerId && ["primary", "recovered"].includes(restored.mode);
      if (state.providerRestoreSucceeded) state.providerOutageInduced = false;
      journal.append("emergency_provider_restore", { succeeded: state.providerRestoreSucceeded });
    } catch { state.providerRestoreSucceeded = false; }
  }
  if (state.deploymentRolledBack && baselineDeployment) {
    state.deploymentForwardAttempted = true;
    try {
      await deploymentRollback({ operation: "restore_forward", targetDeploymentId: baselineDeployment.activeDeploymentId, expectedCurrentDeploymentId: baselineDeployment.previousDeploymentId });
      const forwarded = validateA99DeploymentState(await deploymentStatus(), expected);
      state.deploymentForwardSucceeded = forwarded.activeDeploymentId === baselineDeployment.activeDeploymentId;
      if (state.deploymentForwardSucceeded) state.deploymentRolledBack = false;
      journal.append("emergency_deployment_forward", { succeeded: state.deploymentForwardSucceeded });
    } catch { state.deploymentForwardSucceeded = false; }
  }
  if (state.restoreCreated && restoreSubject) {
    state.restoreCleanupAttempted = true;
    try {
      state.restoreCleanupSucceeded = await cleanupRestore({ restoreId: restoreSubject.restoreId, backupId: backup?.backupId }) === true;
      if (state.restoreCleanupSucceeded) state.restoreCreated = false;
      journal.append("emergency_restore_cleanup", { succeeded: state.restoreCleanupSucceeded });
    } catch { state.restoreCleanupSucceeded = false; }
  }

  if (failure) {
    throw new A99BoundaryError("a99_lifecycle_failed", state.failure, { decision: "FIXTURE_FAIL", state: Object.freeze({ ...state }), journal: journal.snapshot() });
  }
  return Object.freeze({ decision: "FIXTURE_PASS", state: Object.freeze({ ...state }), journal: journal.snapshot() });
}

export function parseA99StrictJson(bytes, options = {}) {
  try { return parseA98StrictJson(bytes, options); }
  catch (error) {
    if (error instanceof A98BoundaryError) throw new A99BoundaryError(error.code.replace(/^a98_/u, "a99_"), error.detail);
    throw error;
  }
}

export { sha256Bytes, sha256Text };
