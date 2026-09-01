#!/usr/bin/env node
import crypto from "node:crypto";
import { createA99Journal, validateA99DualControl } from "./a99-backup-restore-provider-loss-boundary.mjs";

export const A100_BOUNDARY_ID = "velmere.pass36.a100.incident-kill-switch-customer-communication-boundary.v1";
const HEX64 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,180}$/u;
const STATES = ["ready", "open", "contained", "recovering", "resolved", "closed"];
const SEVERITIES = ["SEV1", "SEV2", "SEV3"];
const REQUIRED_PLAYBOOK_ACTIONS = ["triage", "containment", "customer_notice", "recovery_validation", "closure_review"];
const ALERT_SLA_MS = 60_000;
const ACK_SLA_MS = 300_000;

export class A100BoundaryError extends Error {
  constructor(code, detail = null, receipt = null) {
    super(detail == null ? code : `${code}:${String(detail)}`);
    this.name = "A100BoundaryError";
    this.code = code;
    this.detail = detail;
    this.receipt = receipt;
  }
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new A100BoundaryError(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new A100BoundaryError(code, JSON.stringify({ actual, expected: wanted }));
  }
}

function safeId(value, code) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) throw new A100BoundaryError(code);
  return value;
}

function hex64(value, code) {
  if (typeof value !== "string" || !HEX64.test(value)) throw new A100BoundaryError(code);
  return value;
}

function isoMs(value, code) {
  if (typeof value !== "string" || value.length > 64) throw new A100BoundaryError(code);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new A100BoundaryError(code);
  return parsed;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

export function validateA100Environment(value) {
  exactKeys(value, ["projectClass", "sourceRevisionId", "sourceManifestSha256", "environmentDigest", "stagingOrigin", "controlPlaneDigest"], "a100_environment_fields_invalid");
  if (value.projectClass !== "disposable_staging") throw new A100BoundaryError("a100_project_class_invalid");
  safeId(value.sourceRevisionId, "a100_source_revision_invalid");
  hex64(value.sourceManifestSha256, "a100_source_manifest_invalid");
  hex64(value.environmentDigest, "a100_environment_digest_invalid");
  hex64(value.controlPlaneDigest, "a100_control_plane_digest_invalid");
  let url;
  try { url = new URL(value.stagingOrigin); } catch { throw new A100BoundaryError("a100_staging_origin_invalid"); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new A100BoundaryError("a100_staging_origin_not_origin_only");
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || /(?:^|\.)(?:prod|production|live|www)(?:\.|$)/u.test(host)) throw new A100BoundaryError("a100_staging_origin_unsafe");
  return Object.freeze({ ...value, stagingOrigin: url.origin });
}

export function validateA100StateSnapshot(value, expected = {}) {
  exactKeys(value, ["schemaVersion", "incidentId", "runId", "sourceRevisionId", "sourceManifestSha256", "environmentDigest", "state", "severity", "killSwitchActive", "paidDeliveryBlocked", "safeMode", "health", "sequence", "observedAt", "providerReceiptSha256"], "a100_state_fields_invalid");
  if (value.schemaVersion !== "velmere.a100.incident-state.v1") throw new A100BoundaryError("a100_state_schema_invalid");
  safeId(value.incidentId, "a100_incident_id_invalid"); safeId(value.runId, "a100_run_id_invalid");
  if (!STATES.includes(value.state)) throw new A100BoundaryError("a100_state_invalid");
  if (!SEVERITIES.includes(value.severity)) throw new A100BoundaryError("a100_severity_invalid");
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 0) throw new A100BoundaryError("a100_sequence_invalid");
  hex64(value.sourceManifestSha256, "a100_state_source_manifest_invalid"); hex64(value.environmentDigest, "a100_state_environment_invalid"); hex64(value.providerReceiptSha256, "a100_state_provider_receipt_invalid");
  isoMs(value.observedAt, "a100_state_observed_at_invalid");
  if (typeof value.killSwitchActive !== "boolean" || typeof value.paidDeliveryBlocked !== "boolean") throw new A100BoundaryError("a100_state_boolean_invalid");
  if (!(["normal", "degraded_safe", "read_only_safe"]).includes(value.safeMode)) throw new A100BoundaryError("a100_safe_mode_invalid");
  if (!(["healthy", "degraded", "recovering", "recovered"]).includes(value.health)) throw new A100BoundaryError("a100_health_invalid");
  if (["contained", "recovering"].includes(value.state) && (!value.killSwitchActive || !value.paidDeliveryBlocked || !["degraded_safe", "read_only_safe"].includes(value.safeMode))) throw new A100BoundaryError("a100_containment_state_invalid");
  if (value.state === "closed" && (value.killSwitchActive || value.paidDeliveryBlocked || value.health !== "recovered" || value.safeMode !== "normal")) throw new A100BoundaryError("a100_closed_state_invalid");
  if (expected.incidentId && value.incidentId !== expected.incidentId) throw new A100BoundaryError("a100_incident_binding_mismatch");
  if (expected.runId && value.runId !== expected.runId) throw new A100BoundaryError("a100_run_binding_mismatch");
  if (expected.sourceRevisionId && value.sourceRevisionId !== expected.sourceRevisionId) throw new A100BoundaryError("a100_source_revision_mismatch");
  if (expected.sourceManifestSha256 && value.sourceManifestSha256 !== expected.sourceManifestSha256) throw new A100BoundaryError("a100_source_manifest_mismatch");
  if (expected.environmentDigest && value.environmentDigest !== expected.environmentDigest) throw new A100BoundaryError("a100_environment_mismatch");
  return Object.freeze({ ...value, observedAtMs: isoMs(value.observedAt, "a100_state_observed_at_invalid") });
}

export function validateA100AlertReceipt(value, expected) {
  exactKeys(value, ["schemaVersion", "incidentId", "runId", "severity", "triggeredAt", "deliveredAt", "alertIdHash", "producerFamilyDigest", "observerFamilyDigest", "sourceRevisionId", "environmentDigest", "providerReceiptSha256"], "a100_alert_fields_invalid");
  if (value.schemaVersion !== "velmere.a100.alert-receipt.v1") throw new A100BoundaryError("a100_alert_schema_invalid");
  safeId(value.incidentId, "a100_alert_incident_invalid"); safeId(value.runId, "a100_alert_run_invalid");
  if (!SEVERITIES.includes(value.severity)) throw new A100BoundaryError("a100_alert_severity_invalid");
  for (const key of ["alertIdHash", "producerFamilyDigest", "observerFamilyDigest", "environmentDigest", "providerReceiptSha256"]) hex64(value[key], `a100_alert_${key}_invalid`);
  const triggeredAtMs = isoMs(value.triggeredAt, "a100_alert_triggered_at_invalid");
  const deliveredAtMs = isoMs(value.deliveredAt, "a100_alert_delivered_at_invalid");
  if (deliveredAtMs < triggeredAtMs || deliveredAtMs - triggeredAtMs > ALERT_SLA_MS) throw new A100BoundaryError("a100_alert_delivery_sla_failed");
  if (value.producerFamilyDigest === value.observerFamilyDigest) throw new A100BoundaryError("a100_alert_observer_not_independent");
  if (expected && (value.incidentId !== expected.incidentId || value.runId !== expected.runId || value.sourceRevisionId !== expected.sourceRevisionId || value.environmentDigest !== expected.environmentDigest)) throw new A100BoundaryError("a100_alert_binding_mismatch");
  return Object.freeze({ ...value, triggeredAtMs, deliveredAtMs });
}

export function validateA100AckReceipt(value, expected) {
  exactKeys(value, ["schemaVersion", "incidentId", "runId", "alertIdHash", "actorRole", "actorIdHash", "sessionIdHash", "mfaMethod", "acknowledgedAt", "providerReceiptSha256"], "a100_ack_fields_invalid");
  if (value.schemaVersion !== "velmere.a100.ack-receipt.v1" || value.actorRole !== "security_on_call" || value.mfaMethod !== "webauthn") throw new A100BoundaryError("a100_ack_policy_invalid");
  for (const key of ["alertIdHash", "actorIdHash", "sessionIdHash", "providerReceiptSha256"]) hex64(value[key], `a100_ack_${key}_invalid`);
  const acknowledgedAtMs = isoMs(value.acknowledgedAt, "a100_ack_time_invalid");
  if (expected) {
    if (value.incidentId !== expected.incidentId || value.runId !== expected.runId || value.alertIdHash !== expected.alert.alertIdHash) throw new A100BoundaryError("a100_ack_binding_mismatch");
    if (acknowledgedAtMs < expected.alert.deliveredAtMs || acknowledgedAtMs - expected.alert.deliveredAtMs > ACK_SLA_MS) throw new A100BoundaryError("a100_ack_sla_failed");
  }
  return Object.freeze({ ...value, acknowledgedAtMs });
}

export function validateA100KillSwitchReceipt(value, expected) {
  exactKeys(value, ["schemaVersion", "incidentId", "runId", "operation", "killSwitchActive", "paidDeliveryBlocked", "safeMode", "sequence", "appliedAt", "sourceRevisionId", "environmentDigest", "providerReceiptSha256"], "a100_kill_switch_fields_invalid");
  if (value.schemaVersion !== "velmere.a100.kill-switch-receipt.v1" || !["activate", "release", "emergency_hold"].includes(value.operation)) throw new A100BoundaryError("a100_kill_switch_schema_invalid");
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 1) throw new A100BoundaryError("a100_kill_switch_sequence_invalid");
  hex64(value.environmentDigest, "a100_kill_switch_environment_invalid"); hex64(value.providerReceiptSha256, "a100_kill_switch_provider_receipt_invalid");
  isoMs(value.appliedAt, "a100_kill_switch_time_invalid");
  if (value.operation === "release") {
    if (value.killSwitchActive !== false || value.paidDeliveryBlocked !== false || value.safeMode !== "normal") throw new A100BoundaryError("a100_kill_switch_release_state_invalid");
  } else if (value.killSwitchActive !== true || value.paidDeliveryBlocked !== true || !["degraded_safe", "read_only_safe"].includes(value.safeMode)) throw new A100BoundaryError("a100_kill_switch_containment_state_invalid");
  if (expected && (value.incidentId !== expected.incidentId || value.runId !== expected.runId || value.sourceRevisionId !== expected.sourceRevisionId || value.environmentDigest !== expected.environmentDigest)) throw new A100BoundaryError("a100_kill_switch_binding_mismatch");
  return Object.freeze({ ...value });
}

export function validateA100PlaybookReceipt(value, expected) {
  exactKeys(value, ["schemaVersion", "incidentId", "runId", "actions", "evidenceDigests", "completedAt", "providerReceiptSha256"], "a100_playbook_fields_invalid");
  if (value.schemaVersion !== "velmere.a100.playbook-receipt.v1") throw new A100BoundaryError("a100_playbook_schema_invalid");
  if (!Array.isArray(value.actions) || !Array.isArray(value.evidenceDigests)) throw new A100BoundaryError("a100_playbook_arrays_invalid");
  const actions = value.actions.map(String);
  if (new Set(actions).size !== actions.length || REQUIRED_PLAYBOOK_ACTIONS.some((action) => !actions.includes(action))) throw new A100BoundaryError("a100_playbook_incomplete_or_duplicate");
  if (value.evidenceDigests.length < REQUIRED_PLAYBOOK_ACTIONS.length || value.evidenceDigests.some((digest) => !HEX64.test(String(digest)))) throw new A100BoundaryError("a100_playbook_evidence_invalid");
  isoMs(value.completedAt, "a100_playbook_completed_at_invalid"); hex64(value.providerReceiptSha256, "a100_playbook_provider_receipt_invalid");
  if (expected && (value.incidentId !== expected.incidentId || value.runId !== expected.runId)) throw new A100BoundaryError("a100_playbook_binding_mismatch");
  return Object.freeze({ ...value, actions: [...actions].sort() });
}

export function validateA100NoticeProjection(notices, expected) {
  if (!Array.isArray(notices) || notices.length !== 3) throw new A100BoundaryError("a100_notice_locale_denominator_invalid");
  const byLocale = new Map(notices.map((notice) => [notice.locale, notice]));
  for (const locale of ["pl", "en", "de"]) if (!byLocale.has(locale)) throw new A100BoundaryError("a100_notice_locale_missing", locale);
  const roots = notices.map((notice) => ({ kind: notice.kind, severity: notice.severity, incidentIdHash: notice.incidentIdHash, recipientCohortHash: notice.recipientCohortHash, affectedSurfaceIds: notice.affectedSurfaceIds, claimIds: notice.claimIds, nextUpdateAt: notice.nextUpdateAt, recoveryValidated: notice.recoveryValidated, dataLossAssessment: notice.dataLossAssessment }));
  if (roots.some((root) => canonicalJson(root) !== canonicalJson(roots[0]))) throw new A100BoundaryError("a100_notice_cross_locale_fact_drift");
  for (const notice of notices) {
    if (!HEX64.test(notice.contentSha256) || !HEX64.test(notice.incidentIdHash) || !HEX64.test(notice.recipientCohortHash)) throw new A100BoundaryError("a100_notice_digest_invalid");
    if (notice.incidentIdHash !== expected.incidentIdHash || notice.recipientCohortHash !== expected.recipientCohortHash || notice.kind !== expected.kind) throw new A100BoundaryError("a100_notice_binding_mismatch");
    if (/(?:zero risk|fully safe|guaranteed|no data loss|100% safe)/iu.test(`${notice.title}\n${notice.body}`)) throw new A100BoundaryError("a100_notice_false_safety_claim");
  }
  return Object.freeze({ locales: 3, factDigest: sha256Text(canonicalJson(roots[0])), contentDigests: notices.map((notice) => notice.contentSha256).sort() });
}

function stateTransitionAllowed(from, to) {
  const allowed = { ready: ["open"], open: ["contained"], contained: ["recovering"], recovering: ["resolved"], resolved: ["closed"], closed: [] };
  return allowed[from]?.includes(to) === true;
}

export async function executeA100IncidentLifecycle({ environment, callbacks, notices, releaseDualControl, closeDualControl, nowMs = Date.now() } = {}) {
  const env = validateA100Environment(environment);
  const journal = createA99Journal();
  const state = { mutationStarted: false, incidentOpened: false, containmentActivated: false, recoveryRequested: false, recoveryValidated: false, killSwitchReleased: false, incidentClosed: false, finalBaselineVerified: false, emergencyHoldAttempted: false, emergencyHoldSucceeded: false };
  let incidentId = null; let runId = null; let currentState = "ready"; let lastSequence = 0;
  const append = (type, data = {}) => journal.append(type, data);
  const expectSnapshot = (snapshot, expectedState) => {
    const validated = validateA100StateSnapshot(snapshot, { incidentId, runId, sourceRevisionId: env.sourceRevisionId, sourceManifestSha256: env.sourceManifestSha256, environmentDigest: env.environmentDigest });
    if (validated.state !== expectedState) throw new A100BoundaryError("a100_unexpected_state", `${validated.state}->${expectedState}`);
    if (validated.sequence <= lastSequence) throw new A100BoundaryError("a100_non_monotonic_sequence");
    if (!stateTransitionAllowed(currentState, validated.state) && validated.state !== currentState) throw new A100BoundaryError("a100_illegal_state_transition", `${currentState}->${validated.state}`);
    currentState = validated.state; lastSequence = validated.sequence; return validated;
  };
  try {
    const baseline = validateA100StateSnapshot(await callbacks.baseline(), { sourceRevisionId: env.sourceRevisionId, sourceManifestSha256: env.sourceManifestSha256, environmentDigest: env.environmentDigest });
    if (baseline.state !== "ready" || baseline.killSwitchActive || baseline.paidDeliveryBlocked || baseline.health !== "healthy" || baseline.safeMode !== "normal") throw new A100BoundaryError("a100_baseline_not_ready");
    incidentId = baseline.incidentId; runId = baseline.runId; lastSequence = baseline.sequence; append("baseline_verified", { state: baseline.state, sequence: baseline.sequence });
    state.mutationStarted = true;
    const opened = expectSnapshot(await callbacks.openIncident(), "open"); state.incidentOpened = true; append("incident_opened", { sequence: opened.sequence, severity: opened.severity });
    const alert = validateA100AlertReceipt(await callbacks.deliverAlert(), { incidentId, runId, sourceRevisionId: env.sourceRevisionId, environmentDigest: env.environmentDigest }); append("alert_delivered", { alertIdHash: alert.alertIdHash });
    const ack = validateA100AckReceipt(await callbacks.acknowledgeAlert(), { incidentId, runId, alert }); append("alert_acknowledged", { actorIdHash: ack.actorIdHash });
    const activated = validateA100KillSwitchReceipt(await callbacks.activateKillSwitch(), { incidentId, runId, sourceRevisionId: env.sourceRevisionId, environmentDigest: env.environmentDigest }); if (activated.operation !== "activate") throw new A100BoundaryError("a100_expected_activation_receipt"); state.containmentActivated = true; append("kill_switch_activated", { sequence: activated.sequence });
    const contained = expectSnapshot(await callbacks.containedState(), "contained"); append("containment_verified", { sequence: contained.sequence, safeMode: contained.safeMode });
    validateA100NoticeProjection(notices.investigating, { incidentIdHash: sha256Text(incidentId), recipientCohortHash: notices.recipientCohortHash, kind: "investigating" });
    const investigatingDelivery = await callbacks.deliverInvestigatingNotices(notices.investigating); if (!investigatingDelivery || investigatingDelivery.delivered !== true || investigatingDelivery.failed !== 0 || investigatingDelivery.total !== 3) throw new A100BoundaryError("a100_investigating_notice_delivery_failed"); append("investigating_notices_delivered", { total: 3 });
    validateA100PlaybookReceipt(await callbacks.completePlaybook(), { incidentId, runId }); append("playbook_completed", {});
    const recovering = expectSnapshot(await callbacks.requestRecovery(), "recovering"); state.recoveryRequested = true; append("recovery_requested", { sequence: recovering.sequence });
    const recovery = await callbacks.validateRecovery(); if (!recovery || recovery.validated !== true || recovery.health !== "recovered" || !HEX64.test(String(recovery.evidenceDigest ?? ""))) throw new A100BoundaryError("a100_recovery_not_validated"); state.recoveryValidated = true; append("recovery_validated", { evidenceDigest: recovery.evidenceDigest });
    const releaseBodySha256 = hex64(releaseDualControl?.bodySha256, "a100_release_body_digest_invalid");
    validateA99DualControl({ primary: releaseDualControl.primary, independent: releaseDualControl.independent, action: { scope: "incident_kill_switch_release", path: "/api/internal/incidents/release", bodySha256: releaseBodySha256 }, nowMs });
    const released = validateA100KillSwitchReceipt(await callbacks.releaseKillSwitch(), { incidentId, runId, sourceRevisionId: env.sourceRevisionId, environmentDigest: env.environmentDigest }); if (released.operation !== "release") throw new A100BoundaryError("a100_expected_release_receipt"); state.killSwitchReleased = true; append("kill_switch_released", { sequence: released.sequence });
    const resolved = expectSnapshot(await callbacks.resolvedState(), "resolved"); append("incident_resolved", { sequence: resolved.sequence });
    validateA100NoticeProjection(notices.resolved, { incidentIdHash: sha256Text(incidentId), recipientCohortHash: notices.recipientCohortHash, kind: "resolved" });
    const resolvedDelivery = await callbacks.deliverResolvedNotices(notices.resolved); if (!resolvedDelivery || resolvedDelivery.delivered !== true || resolvedDelivery.failed !== 0 || resolvedDelivery.total !== 3) throw new A100BoundaryError("a100_resolved_notice_delivery_failed"); append("resolved_notices_delivered", { total: 3 });
    const closeBodySha256 = hex64(closeDualControl?.bodySha256, "a100_close_body_digest_invalid");
    validateA99DualControl({ primary: closeDualControl.primary, independent: closeDualControl.independent, action: { scope: "incident_close", path: "/api/internal/incidents/close", bodySha256: closeBodySha256 }, nowMs });
    const closed = expectSnapshot(await callbacks.closeIncident(), "closed"); state.incidentClosed = true; append("incident_closed", { sequence: closed.sequence });
    const final = validateA100StateSnapshot(await callbacks.finalState(), { incidentId, runId, sourceRevisionId: env.sourceRevisionId, sourceManifestSha256: env.sourceManifestSha256, environmentDigest: env.environmentDigest });
    if (final.state !== "closed" || final.killSwitchActive || final.paidDeliveryBlocked || final.safeMode !== "normal" || final.health !== "recovered") throw new A100BoundaryError("a100_final_baseline_invalid"); state.finalBaselineVerified = true; append("final_baseline_verified", { sequence: final.sequence });
    return Object.freeze({ status: "LOCAL_LIFECYCLE_VERIFIED_FIXTURE_ONLY", state: Object.freeze({ ...state }), journal: journal.snapshot(), realStagingCredit: false, live: false, saleEnabled: false });
  } catch (error) {
    if (state.mutationStarted && !state.finalBaselineVerified) {
      state.emergencyHoldAttempted = true;
      try {
        const hold = validateA100KillSwitchReceipt(await callbacks.emergencyHold(), { incidentId, runId, sourceRevisionId: env.sourceRevisionId, environmentDigest: env.environmentDigest });
        if (hold.operation !== "emergency_hold") throw new A100BoundaryError("a100_expected_emergency_hold_receipt");
        state.emergencyHoldSucceeded = true; append("emergency_hold_confirmed", { sequence: hold.sequence });
      } catch (holdError) { append("emergency_hold_failed", { code: holdError?.code ?? "unknown" }); }
    }
    const receipt = Object.freeze({ status: state.emergencyHoldSucceeded ? "ACTION_REQUIRED_SAFE_CONTAINMENT" : "RECOVERY_REQUIRED_CONTAINMENT_UNCONFIRMED", state: Object.freeze({ ...state }), journal: journal.snapshot(), realStagingCredit: false, live: false, saleEnabled: false });
    throw new A100BoundaryError("a100_lifecycle_failed", error?.code ?? error?.message ?? "unknown", receipt);
  }
}
