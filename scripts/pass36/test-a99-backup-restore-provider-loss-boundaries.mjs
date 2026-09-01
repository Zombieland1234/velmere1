#!/usr/bin/env node
import {
  A99BoundaryError,
  assertA99IndependentProviderPair,
  buildA99EnvironmentDigest,
  createA99Journal,
  executeA99RecoveryLifecycle,
  parseA99StrictJson,
  sha256Text,
  validateA99BackupReceipt,
  validateA99BridgeUrl,
  validateA99DeploymentState,
  validateA99DualControl,
  validateA99ProviderIdentity,
  validateA99RestoreReceipt,
} from "./a99-backup-restore-provider-loss-boundary.mjs";

let assertions = 0;
function ok(value, message) { assertions += 1; if (!value) throw new Error(`assertion_failed:${message}`); }
function equal(actual, expected, message) { assertions += 1; if (actual !== expected) throw new Error(`assertion_failed:${message}:actual=${JSON.stringify(actual)}:expected=${JSON.stringify(expected)}`); }
function expectCode(fn, code, message) {
  assertions += 1;
  try { fn(); } catch (error) {
    if (error instanceof A99BoundaryError && error.code === code) return error;
    throw new Error(`assertion_failed:${message}:expected=${code}:actual=${error?.code ?? error?.message}`, { cause: error });
  }
  throw new Error(`assertion_failed:${message}:no_error`);
}
async function expectAsyncCode(fn, code, message) {
  assertions += 1;
  try { await fn(); } catch (error) {
    if (error instanceof A99BoundaryError && error.code === code) return error;
    throw new Error(`assertion_failed:${message}:expected=${code}:actual=${error?.code ?? error?.message}`, { cause: error });
  }
  throw new Error(`assertion_failed:${message}:no_error`);
}

const REV = "VELMERE_PASS36_A99R0_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_AND_RESTORED_RLS_TRUTH_BOUNDARY";
const MANIFEST = sha256Text("a99-source-manifest");
const ARCHIVE = sha256Text("a99-source-archive");
const DB_HOST = sha256Text("a99-db-host");
const SOURCE_TARGET = sha256Text("a99-source-target");
const ENV_INPUT = {
  projectClass: "disposable_staging",
  stagingOrigin: "https://preview-a99.vercel.app/",
  databaseHostSha256: DB_HOST,
  sourceArchiveSha256: ARCHIVE,
  sourceManifestSha256: MANIFEST,
};
const ENV = buildA99EnvironmentDigest(ENV_INPUT);
const now = Date.now();
const iso = (delta = 0) => new Date(now + delta).toISOString();

function backupReceipt(overrides = {}) {
  return {
    schemaVersion: "velmere.a99.backup-receipt.v1",
    operation: "backup_create",
    requestId: "backup_req_a99_0001",
    sourceRevisionId: REV,
    sourceManifestSha256: MANIFEST,
    environmentDigest: ENV,
    backupId: "backup_a99_0001",
    backupCreatedAt: iso(-40_000),
    snapshotCutoffAt: iso(-45_000),
    scope: "bounded_application_state",
    encrypted: true,
    databaseDigest: sha256Text("db-state-a99"),
    storageDigest: sha256Text("storage-state-a99"),
    backupManifestSha256: sha256Text("backup-manifest-a99"),
    backupBytes: 8192,
    recordCount: 12,
    objectCount: 3,
    providerReceiptSha256: sha256Text("backup-provider-receipt-a99-create"),
    ...overrides,
  };
}
function restoreReceipt(backup, overrides = {}) {
  return {
    schemaVersion: "velmere.a99.restore-receipt.v1",
    operation: "restore_verify",
    requestId: "restore_req_a99_0001",
    backupId: backup.backupId,
    backupManifestSha256: backup.backupManifestSha256,
    environmentDigest: ENV,
    restoreId: "restore_a99_0001",
    restoreTargetClass: "disposable_restore",
    restoreTargetDigest: sha256Text("a99-isolated-restore-target"),
    databaseDigest: backup.databaseDigest,
    storageDigest: backup.storageDigest,
    restoredRecords: 12,
    restoredObjects: 3,
    rlsReceiptSha256: sha256Text("a96-real-rls-receipt"),
    rlsRevisionId: "VELMERE_PASS36_A96R0_RLS_19_CASE_EXECUTABLE_REPLAY_AND_CUSTOMER_ARTIFACT_USER_CLIENT_BOUNDARY",
    casesPrepared: 19,
    casesExecuted: 19,
    casesPassed: 19,
    ownerCasesPassed: 13,
    operatorCasesPassed: 6,
    crossTenantReadsDenied: true,
    sessionRevocationVerified: true,
    restoreVerifiedAt: iso(-20_000),
    providerReceiptSha256: sha256Text("restore-provider-receipt-a99"),
    ...overrides,
  };
}
function deployment(active, previous, overrides = {}) {
  return {
    schemaVersion: "velmere.a99.deployment-state.v1",
    sourceRevisionId: REV,
    sourceManifestSha256: MANIFEST,
    environmentDigest: ENV,
    activeDeploymentId: active,
    previousDeploymentId: previous,
    health: "healthy",
    smokePassed: true,
    observedAt: iso(-10_000),
    providerReceiptSha256: sha256Text(`deployment-${active}-${previous}`),
    ...overrides,
  };
}
function provider(id, mode, suffix, overrides = {}) {
  return {
    schemaVersion: "velmere.a99.provider-identity.v1",
    sourceRevisionId: REV,
    sourceManifestSha256: MANIFEST,
    environmentDigest: ENV,
    providerId: id,
    vendorFamily: `vendor_${suffix}`,
    accountDigest: sha256Text(`account-${suffix}`),
    region: suffix === "primary" ? "eu-central" : "eu-west",
    failureDomainDigest: sha256Text(`failure-${suffix}`),
    controlPlaneDigest: sha256Text(`control-${suffix}`),
    credentialDigest: sha256Text(`credential-${suffix}`),
    mode,
    observedAt: iso(-5_000),
    providerReceiptSha256: sha256Text(`provider-receipt-${id}-${mode}`),
    ...overrides,
  };
}
function action(scope, path, body) {
  const bodySha256 = sha256Text(body);
  const actionDigest = sha256Text(JSON.stringify({ bodySha256, method: "POST", path, scope }));
  // boundary canonical ordering is bodySha256,method,path,scope; JSON.stringify insertion below matches sorted canonical.
  return { scope, path, bodySha256, actionDigest };
}
function assertion(role, actor, session, actionInput, overrides = {}) {
  return {
    schemaVersion: "velmere.a99.operator-assertion.v1",
    assertionId: `assertion_${role}_${actor}`,
    actorIdHash: sha256Text(actor),
    sessionIdHash: sha256Text(session),
    role,
    mfaMethod: "webauthn",
    environment: "test_only",
    scope: actionInput.scope,
    method: "POST",
    path: actionInput.path,
    bodySha256: actionInput.bodySha256,
    actionDigest: actionInput.actionDigest,
    issuedAt: iso(-60_000),
    recentAuthAt: iso(-90_000),
    expiresAt: iso(240_000),
    decision: "approve",
    ...overrides,
  };
}
function dual(actionInput) {
  return {
    primary: assertion("operations_owner", "owner-a99", "session-owner-a99", actionInput),
    independent: assertion("independent_reviewer", "reviewer-a99", "session-reviewer-a99", actionInput),
    action: actionInput,
  };
}

// Environment and URL boundaries.
equal(ENV.length, 64, "environment digest length");
expectCode(() => buildA99EnvironmentDigest({ ...ENV_INPUT, projectClass: "production" }), "a99_project_class_invalid", "production project class rejected");
expectCode(() => buildA99EnvironmentDigest({ ...ENV_INPUT, sourceManifestSha256: "bad" }), "a99_source_manifest_digest_invalid", "bad source manifest rejected");
expectCode(() => buildA99EnvironmentDigest({ ...ENV_INPUT, extra: true }), "a99_environment_fields_invalid", "extra environment field rejected");
equal(validateA99BridgeUrl("https://preview-a99.vercel.app/backup/create", { trustedOrigin: "https://preview-a99.vercel.app/", allowedPath: "/backup/create" }).pathname, "/backup/create", "trusted bridge accepted");
expectCode(() => validateA99BridgeUrl("https://evil.example/backup/create", { trustedOrigin: "https://preview-a99.vercel.app/", allowedPath: "/backup/create" }), "a99_origin_mismatch", "cross-origin bridge rejected");
expectCode(() => validateA99BridgeUrl("https://preview-a99.vercel.app/backup/other", { trustedOrigin: "https://preview-a99.vercel.app/", allowedPath: "/backup/create" }), "a99_path_not_allowed", "wrong bridge path rejected");
expectCode(() => validateA99BridgeUrl("http://preview-a99.vercel.app/backup/create", { trustedOrigin: "https://preview-a99.vercel.app/", allowedPath: "/backup/create" }), "a99_https_required", "http bridge rejected");

// Strict JSON.
equal(parseA99StrictJson(Buffer.from('{"ok":true}'), { requireObject: true }).ok, true, "strict JSON accepted");
expectCode(() => parseA99StrictJson(Buffer.from('{"x":1,"x":2}'), { requireObject: true }), "a99_json_duplicate_key", "duplicate JSON rejected");
expectCode(() => parseA99StrictJson(Buffer.from('{"constructor":1}'), { requireObject: true }), "a99_json_forbidden_key", "dangerous JSON rejected");

// Backup receipt.
const backup = validateA99BackupReceipt(backupReceipt(), { requestId: "backup_req_a99_0001", sourceRevisionId: REV, sourceManifestSha256: MANIFEST, environmentDigest: ENV });
equal(backup.backupId, "backup_a99_0001", "backup receipt accepted");
expectCode(() => validateA99BackupReceipt(backupReceipt({ encrypted: false })), "a99_backup_scope_or_encryption_invalid", "unencrypted backup rejected");
expectCode(() => validateA99BackupReceipt(backupReceipt({ snapshotCutoffAt: iso(120_000) })), "a99_backup_cutoff_after_creation", "future cutoff rejected");
expectCode(() => validateA99BackupReceipt(backupReceipt({ sourceRevisionId: "OTHER" }), { requestId: "backup_req_a99_0001", sourceRevisionId: REV, sourceManifestSha256: MANIFEST, environmentDigest: ENV }), "a99_backup_source_revision_mismatch", "backup source drift rejected");
expectCode(() => validateA99BackupReceipt(backupReceipt({ environmentDigest: sha256Text("other-env") }), { requestId: "backup_req_a99_0001", sourceRevisionId: REV, sourceManifestSha256: MANIFEST, environmentDigest: ENV }), "a99_backup_environment_mismatch", "backup environment drift rejected");
expectCode(() => validateA99BackupReceipt({ ...backupReceipt(), extra: true }), "a99_backup_receipt_fields_invalid", "backup extra field rejected");
expectCode(() => validateA99BackupReceipt(backupReceipt({ providerReceiptSha256: "bad" })), "a99_backup_provider_receipt_invalid", "backup provider digest rejected");

// Restore receipt and exact RLS.
const restore = validateA99RestoreReceipt(restoreReceipt(backup), { backup, environmentDigest: ENV, requestId: "restore_req_a99_0001", sourceTargetDigest: SOURCE_TARGET });
equal(restore.casesPassed, 19, "restore receipt accepted");
expectCode(() => validateA99RestoreReceipt(restoreReceipt(backup, { casesExecuted: 18 })), "a99_restore_rls_denominator_invalid", "structural RLS false credit rejected");
expectCode(() => validateA99RestoreReceipt(restoreReceipt(backup, { ownerCasesPassed: 12 })), "a99_restore_rls_partition_invalid", "RLS owner partition rejected");
expectCode(() => validateA99RestoreReceipt(restoreReceipt(backup, { crossTenantReadsDenied: false })), "a99_restore_tenant_or_session_invalid", "cross-tenant leak rejected");
expectCode(() => validateA99RestoreReceipt(restoreReceipt(backup, { sessionRevocationVerified: false })), "a99_restore_tenant_or_session_invalid", "session revocation missing rejected");
expectCode(() => validateA99RestoreReceipt(restoreReceipt(backup, { databaseDigest: sha256Text("wrong-db") }), { backup, environmentDigest: ENV, requestId: "restore_req_a99_0001", sourceTargetDigest: SOURCE_TARGET }), "a99_restore_digest_parity_failed", "database drift rejected");
expectCode(() => validateA99RestoreReceipt(restoreReceipt(backup, { restoreTargetDigest: SOURCE_TARGET }), { backup, environmentDigest: ENV, requestId: "restore_req_a99_0001", sourceTargetDigest: SOURCE_TARGET }), "a99_restore_target_not_isolated", "restore into source target rejected");
expectCode(() => validateA99RestoreReceipt({ ...restoreReceipt(backup), unknown: true }), "a99_restore_receipt_fields_invalid", "restore extra field rejected");

// Deployment and provider identity.
equal(validateA99DeploymentState(deployment("deploy-current", "deploy-prev"), { sourceRevisionId: REV, sourceManifestSha256: MANIFEST, environmentDigest: ENV }).health, "healthy", "deployment accepted");
expectCode(() => validateA99DeploymentState(deployment("same", "same")), "a99_deployment_ids_not_distinct", "same deployment IDs rejected");
expectCode(() => validateA99DeploymentState(deployment("deploy-current", "deploy-prev", { health: "degraded" })), "a99_deployment_unhealthy", "unhealthy deployment rejected");
expectCode(() => validateA99DeploymentState(deployment("deploy-current", "deploy-prev", { environmentDigest: sha256Text("wrong") }), { environmentDigest: ENV }), "a99_deployment_environment_mismatch", "deployment environment drift rejected");
const primary = validateA99ProviderIdentity(provider("provider-primary", "primary", "primary"), { sourceRevisionId: REV, sourceManifestSha256: MANIFEST, environmentDigest: ENV });
const alternate = validateA99ProviderIdentity(provider("provider-alt", "failover", "alternate"), { sourceRevisionId: REV, sourceManifestSha256: MANIFEST, environmentDigest: ENV });
equal(assertA99IndependentProviderPair(primary, alternate).independentDimensions, 6, "independent provider pair accepted");
expectCode(() => assertA99IndependentProviderPair(primary, provider("provider-alt", "failover", "alternate", { failureDomainDigest: primary.failureDomainDigest })), "a99_provider_failure_domains_not_independent", "shared failure domain rejected");
expectCode(() => assertA99IndependentProviderPair(primary, provider("provider-alt", "failover", "alternate", { controlPlaneDigest: primary.controlPlaneDigest })), "a99_provider_failure_domains_not_independent", "shared control plane rejected");
expectCode(() => validateA99ProviderIdentity({ ...provider("provider-alt", "failover", "alternate"), extra: true }), "a99_provider_identity_fields_invalid", "provider extra field rejected");

// Dual control.
const rollbackAction = action("deployment_rollback", "/deployment/rollback", '{"operation":"rollback"}');
const rollbackDual = dual(rollbackAction);
equal(validateA99DualControl(rollbackDual).actionDigest, rollbackAction.actionDigest, "dual control accepted");
expectCode(() => validateA99DualControl({ ...rollbackDual, independent: { ...rollbackDual.independent, actorIdHash: rollbackDual.primary.actorIdHash } }), "a99_dual_control_not_independent", "self approval rejected");
expectCode(() => validateA99DualControl({ ...rollbackDual, independent: { ...rollbackDual.independent, sessionIdHash: rollbackDual.primary.sessionIdHash } }), "a99_dual_control_not_independent", "same session rejected");
expectCode(() => validateA99DualControl({ ...rollbackDual, primary: { ...rollbackDual.primary, mfaMethod: "totp" } }), "a99_primary_assertion_policy_invalid", "non-WebAuthn rejected");
expectCode(() => validateA99DualControl({ ...rollbackDual, primary: { ...rollbackDual.primary, bodySha256: sha256Text("tampered") } }), "a99_dual_control_action_binding_mismatch", "body substitution rejected");
expectCode(() => validateA99DualControl({ ...rollbackDual, independent: { ...rollbackDual.independent, expiresAt: iso(-1) } }), "a99_assertion_expired_or_window_invalid", "expired approval rejected");
expectCode(() => validateA99DualControl({ ...rollbackDual, primary: { ...rollbackDual.primary, recentAuthAt: iso(-10 * 60_000) } }), "a99_assertion_recent_auth_stale", "stale recent auth rejected");
expectCode(() => validateA99DualControl({ ...rollbackDual, independent: { ...rollbackDual.independent, role: "operations_owner" } }), "a99_dual_control_roles_invalid", "wrong independent role rejected");

// Journal tamper-evident chain.
const journal = createA99Journal();
const j1 = journal.append("started", { x: 1 });
const j2 = journal.append("completed", { x: 2 });
equal(j1.sequence, 1, "journal first sequence");
equal(j2.previousDigest, j1.digest, "journal digest chain");
equal(journal.snapshot().finalDigest, j2.digest, "journal final digest");
expectCode(() => journal.append("INVALID TYPE", {}), "a99_journal_event_type_invalid", "invalid journal type rejected");

function lifecycleFixture({
  backupMutation = {},
  restoreMutation = {},
  providerAlternateMutation = {},
  cleanupResult = true,
  failStage = null,
  forwardStateWrong = false,
} = {}) {
  const backupBase = backupReceipt(backupMutation);
  const restoreBase = restoreReceipt(backupBase, restoreMutation);
  let deploymentPhase = "baseline";
  let providerPhase = "primary";
  let cleanupCalls = 0;
  let rollbackCalls = 0;
  let providerControlCalls = 0;
  const deploymentCurrent = "deploy-current-a99";
  const deploymentPrevious = "deploy-previous-a99";
  const expected = { requestId: backupBase.requestId, restoreRequestId: restoreBase.requestId, sourceRevisionId: REV, sourceManifestSha256: MANIFEST, environmentDigest: ENV, sourceTargetDigest: SOURCE_TARGET };
  const rollbackAction2 = action("deployment_rollback", "/deployment/rollback", '{"operation":"rollback"}');
  const providerAction2 = action("provider_outage", "/provider/control", '{"mode":"primary_down"}');
  const forwardAction2 = action("deployment_restore_forward", "/deployment/rollback", '{"operation":"restore_forward"}');
  return {
    callbacks: {
      backupCreate: async () => { if (failStage === "backup_create") throw new Error("backup_create_failed"); return backupBase; },
      backupVerify: async () => ({ ...backupBase, providerReceiptSha256: sha256Text("backup-provider-receipt-a99-verify") }),
      restoreCreate: async () => ({ restoreId: restoreBase.restoreId }),
      restoreVerify: async () => { if (failStage === "restore_verify") throw new Error("restore_verify_failed"); return restoreBase; },
      deploymentStatus: async () => {
        if (deploymentPhase === "baseline") return deployment(deploymentCurrent, deploymentPrevious);
        if (deploymentPhase === "rolled") return deployment(deploymentPrevious, deploymentCurrent);
        return forwardStateWrong ? deployment(deploymentPrevious, deploymentCurrent) : deployment(deploymentCurrent, deploymentPrevious);
      },
      deploymentRollback: async ({ operation }) => {
        rollbackCalls += 1;
        if (operation === "rollback") { deploymentPhase = "rolled"; if (failStage === "rollback") throw new Error("rollback_failed"); }
        else { deploymentPhase = "forward"; if (failStage === "restore_forward") throw new Error("forward_failed"); }
        return { accepted: true };
      },
      providerStatus: async () => providerPhase === "primary"
        ? provider("provider-primary", "primary", "primary")
        : provider("provider-alt", "failover", "alternate", providerAlternateMutation),
      providerControl: async ({ mode }) => {
        providerControlCalls += 1;
        if (mode === "primary_down") { providerPhase = "alternate"; if (failStage === "provider_down") throw new Error("provider_down_failed"); }
        if (mode === "primary_up") { providerPhase = "primary"; if (failStage === "provider_restore") throw new Error("provider_restore_failed"); }
        return { accepted: true };
      },
      cleanupRestore: async () => { cleanupCalls += 1; if (failStage === "cleanup") throw new Error("cleanup_failed"); return cleanupResult; },
      dualControl: { rollback: dual(rollbackAction2), providerOutage: dual(providerAction2), restoreForward: dual(forwardAction2) },
      expected,
    },
    counters: () => ({ cleanupCalls, rollbackCalls, providerControlCalls, deploymentPhase, providerPhase }),
  };
}

// Full lifecycle success.
{
  const fixture = lifecycleFixture();
  const result = await executeA99RecoveryLifecycle(fixture.callbacks);
  equal(result.decision, "FIXTURE_PASS", "full lifecycle passes");
  ok(result.state.restoreCleanupSucceeded, "restore cleanup confirmed");
  ok(result.state.deploymentForwardSucceeded, "deployment restored forward");
  ok(result.state.providerRestoreSucceeded, "provider restored");
  ok(result.journal.events.length >= 12, "journal records lifecycle");
  equal(fixture.counters().cleanupCalls, 1, "one normal cleanup");
}
// Restore digest mismatch fails before rollback and cleans restore target in finally.
{
  const fixture = lifecycleFixture({ restoreMutation: { storageDigest: sha256Text("wrong-storage") } });
  const caught = await expectAsyncCode(() => executeA99RecoveryLifecycle(fixture.callbacks), "a99_lifecycle_failed", "restore digest mismatch lifecycle");
  equal(fixture.counters().rollbackCalls, 0, "restore mismatch performs no deployment mutation");
  equal(fixture.counters().cleanupCalls, 1, "restore mismatch cleans restore target");
  ok(caught.receipt.state.restoreCleanupSucceeded, "restore mismatch cleanup confirmed");
}
// RLS 18/19 is blocked and cleaned.
{
  const fixture = lifecycleFixture({ restoreMutation: { casesPassed: 18 } });
  const caught = await expectAsyncCode(() => executeA99RecoveryLifecycle(fixture.callbacks), "a99_lifecycle_failed", "RLS 18/19 lifecycle");
  equal(fixture.counters().rollbackCalls, 0, "RLS false credit performs no rollback");
  ok(caught.receipt.state.restoreCleanupSucceeded, "RLS false credit cleanup confirmed");
}
// Alternate provider with shared control plane is rejected, then provider/deployment restored and target cleaned.
{
  const shared = sha256Text("control-primary");
  const fixture = lifecycleFixture({ providerAlternateMutation: { controlPlaneDigest: shared } });
  // primary helper uses control-primary digest.
  const caught = await expectAsyncCode(() => executeA99RecoveryLifecycle(fixture.callbacks), "a99_lifecycle_failed", "provider independence lifecycle");
  ok(caught.receipt.state.providerRestoreAttempted, "provider emergency restore attempted");
  ok(caught.receipt.state.deploymentForwardAttempted, "deployment emergency forward attempted");
  ok(caught.receipt.state.restoreCleanupAttempted, "restore emergency cleanup attempted");
}
// Cleanup failure remains explicit.
{
  const fixture = lifecycleFixture({ cleanupResult: false });
  const caught = await expectAsyncCode(() => executeA99RecoveryLifecycle(fixture.callbacks), "a99_lifecycle_failed", "cleanup failure lifecycle");
  ok(caught.receipt.state.restoreCleanupSucceeded === false, "cleanup failure not hidden");
}
// Transport failure after outage triggers emergency provider/deployment restore and cleanup.
{
  const fixture = lifecycleFixture({ failStage: "provider_down" });
  const caught = await expectAsyncCode(() => executeA99RecoveryLifecycle(fixture.callbacks), "a99_lifecycle_failed", "provider control transport failure lifecycle");
  ok(caught.receipt.state.providerRestoreAttempted, "transport failure provider restore attempted");
  ok(caught.receipt.state.deploymentForwardAttempted, "transport failure deployment forward attempted");
  ok(caught.receipt.state.restoreCleanupAttempted, "transport failure cleanup attempted");
}
// Forward restore mismatch remains failure and still cleanup.
{
  const fixture = lifecycleFixture({ forwardStateWrong: true });
  const caught = await expectAsyncCode(() => executeA99RecoveryLifecycle(fixture.callbacks), "a99_lifecycle_failed", "forward mismatch lifecycle");
  ok(caught.receipt.state.deploymentForwardSucceeded === false, "forward mismatch explicit");
  ok(caught.receipt.state.restoreCleanupAttempted, "forward mismatch cleanup attempted");
}
// Backup create failure starts no mutation and performs no compensating actions.
{
  const fixture = lifecycleFixture({ failStage: "backup_create" });
  const caught = await expectAsyncCode(() => executeA99RecoveryLifecycle(fixture.callbacks), "a99_lifecycle_failed", "backup pre-mutation failure");
  ok(caught.receipt.state.mutationStarted === false, "backup failure no mutation started");
  equal(fixture.counters().cleanupCalls, 0, "backup failure no cleanup mutation");
  equal(fixture.counters().rollbackCalls, 0, "backup failure no rollback mutation");
  equal(fixture.counters().providerControlCalls, 0, "backup failure no provider mutation");
}

ok(assertions >= 77, `assertion denominator floor (${assertions})`);
console.log(JSON.stringify({
  status: "PASS_A99_BACKUP_RESTORE_PROVIDER_LOSS_BOUNDARY_LOCAL_ONLY",
  assertions,
  fixtureScenarios: 8,
  realBackups: 0,
  realRestores: 0,
  realRestoredRlsCasesPassed: 0,
  realDeploymentRollbacks: 0,
  realProviderOutages: 0,
  realRestoreCleanupConfirmations: 0,
  stagingCredit: false,
  saleEnabled: false,
}, null, 2));
