#!/usr/bin/env node
import {
  A100BoundaryError,
  executeA100IncidentLifecycle,
  sha256Text,
  validateA100AckReceipt,
  validateA100AlertReceipt,
  validateA100Environment,
  validateA100KillSwitchReceipt,
  validateA100NoticeProjection,
  validateA100PlaybookReceipt,
  validateA100StateSnapshot,
} from "./a100-incident-kill-switch-customer-communication-boundary.mjs";
import { buildA100CustomerIncidentNotice } from "../../lib/security/pass36-a100-customer-incident-notice.ts";

const REV = "VELMERE_PASS36_A100R0_INCIDENT_KILL_SWITCH_ALERT_ACK_AND_CUSTOMER_COMMUNICATION_TRUTH_BOUNDARY";
const SOURCE_MANIFEST = "a".repeat(64);
const ENV = "b".repeat(64);
const CONTROL = "c".repeat(64);
const RECEIPT = "d".repeat(64);
const INCIDENT = "incident-a100";
const RUN = "run-a100";
const NOW = Date.parse("2026-07-29T03:20:00.000Z");
let assertions = 0;
const scenarioIds = new Set<string>();
function ok(value: unknown, label: string) { assertions += 1; if (!value) throw new Error(`assertion_failed:${label}`); }
function equal(actual: unknown, expected: unknown, label: string) { assertions += 1; if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`assertion_failed:${label}:${JSON.stringify({ actual, expected })}`); }
function expectCode(fn: () => unknown, code: string, label: string) {
  assertions += 1;
  try { fn(); } catch (error) { if (error instanceof A100BoundaryError && error.code === code) return error; throw error; }
  throw new Error(`expected_code_missing:${label}:${code}`);
}
async function expectAsyncCode(fn: () => Promise<unknown>, code: string, label: string) {
  assertions += 1;
  try { await fn(); } catch (error) { if (error instanceof A100BoundaryError && error.code === code) return error; throw error; }
  throw new Error(`expected_code_missing:${label}:${code}`);
}

const environment = {
  projectClass: "disposable_staging",
  sourceRevisionId: REV,
  sourceManifestSha256: SOURCE_MANIFEST,
  environmentDigest: ENV,
  stagingOrigin: "https://velmere-a100-staging.example/",
  controlPlaneDigest: CONTROL,
};

function state(state: string, sequence: number, patch: Record<string, unknown> = {}) {
  const contained = ["contained", "recovering"].includes(state);
  return {
    schemaVersion: "velmere.a100.incident-state.v1",
    incidentId: INCIDENT,
    runId: RUN,
    sourceRevisionId: REV,
    sourceManifestSha256: SOURCE_MANIFEST,
    environmentDigest: ENV,
    state,
    severity: "SEV2",
    killSwitchActive: contained,
    paidDeliveryBlocked: contained,
    safeMode: contained ? "read_only_safe" : "normal",
    health: state === "ready" ? "healthy" : state === "open" ? "degraded" : state === "contained" ? "degraded" : state === "recovering" ? "recovering" : "recovered",
    sequence,
    observedAt: new Date(NOW + sequence * 1000).toISOString(),
    providerReceiptSha256: RECEIPT,
    ...patch,
  };
}

function alert(patch: Record<string, unknown> = {}) {
  return {
    schemaVersion: "velmere.a100.alert-receipt.v1",
    incidentId: INCIDENT,
    runId: RUN,
    severity: "SEV2",
    triggeredAt: new Date(NOW + 2_000).toISOString(),
    deliveredAt: new Date(NOW + 40_000).toISOString(),
    alertIdHash: "1".repeat(64),
    producerFamilyDigest: "2".repeat(64),
    observerFamilyDigest: "3".repeat(64),
    sourceRevisionId: REV,
    environmentDigest: ENV,
    providerReceiptSha256: RECEIPT,
    ...patch,
  };
}
function ack(patch: Record<string, unknown> = {}) {
  return {
    schemaVersion: "velmere.a100.ack-receipt.v1",
    incidentId: INCIDENT,
    runId: RUN,
    alertIdHash: "1".repeat(64),
    actorRole: "security_on_call",
    actorIdHash: "4".repeat(64),
    sessionIdHash: "5".repeat(64),
    mfaMethod: "webauthn",
    acknowledgedAt: new Date(NOW + 100_000).toISOString(),
    providerReceiptSha256: RECEIPT,
    ...patch,
  };
}
function kill(operation: "activate" | "release" | "emergency_hold", sequence: number, patch: Record<string, unknown> = {}) {
  const release = operation === "release";
  return {
    schemaVersion: "velmere.a100.kill-switch-receipt.v1",
    incidentId: INCIDENT,
    runId: RUN,
    operation,
    killSwitchActive: !release,
    paidDeliveryBlocked: !release,
    safeMode: release ? "normal" : "read_only_safe",
    sequence,
    appliedAt: new Date(NOW + sequence * 1000).toISOString(),
    sourceRevisionId: REV,
    environmentDigest: ENV,
    providerReceiptSha256: RECEIPT,
    ...patch,
  };
}
function playbook(patch: Record<string, unknown> = {}) {
  return {
    schemaVersion: "velmere.a100.playbook-receipt.v1",
    incidentId: INCIDENT,
    runId: RUN,
    actions: ["triage", "containment", "customer_notice", "recovery_validation", "closure_review"],
    evidenceDigests: ["6", "7", "8", "9", "a"].map((value) => value.repeat(64)),
    completedAt: new Date(NOW + 150_000).toISOString(),
    providerReceiptSha256: RECEIPT,
    ...patch,
  };
}
function notices(kind: "investigating" | "resolved") {
  const common = {
    kind,
    severity: "SEV2" as const,
    incidentIdHash: sha256Text(INCIDENT),
    recipientCohortHash: "e".repeat(64),
    affectedSurfaceIds: ["audits", "shield-pro"],
    nextUpdateAt: kind === "investigating" ? "2026-07-29T04:00:00.000Z" : null,
    recoveryValidated: kind === "resolved",
    dataLossAssessment: kind === "investigating" ? "NOT_ASSESSED" as const : "NO_EVIDENCE_OBSERVED" as const,
  };
  return (["pl", "en", "de"] as const).map((locale) => buildA100CustomerIncidentNotice({ ...common, locale }));
}
function assertion(role: "operations_owner" | "independent_reviewer", scope: string, path: string, bodySha256: string, actor: string, session: string) {
  const actionDigest = sha256Text(JSON.stringify({ bodySha256, method: "POST", path, scope }));
  // A99 canonical JSON sorts keys; these keys are already alphabetical in JSON.stringify input above.
  return {
    schemaVersion: "velmere.a99.operator-assertion.v1",
    assertionId: `${scope}-${role}`,
    actorIdHash: actor.repeat(64),
    sessionIdHash: session.repeat(64),
    role,
    mfaMethod: "webauthn",
    environment: "test_only",
    scope,
    method: "POST",
    path,
    bodySha256,
    actionDigest,
    issuedAt: new Date(NOW - 30_000).toISOString(),
    recentAuthAt: new Date(NOW - 60_000).toISOString(),
    expiresAt: new Date(NOW + 300_000).toISOString(),
    decision: "approve",
  };
}
const releaseBody = "f".repeat(64);
const closeBody = "0".repeat(64);
const dual = (scope: string, path: string, bodySha256: string) => ({
  bodySha256,
  primary: assertion("operations_owner", scope, path, bodySha256, "1", "2"),
  independent: assertion("independent_reviewer", scope, path, bodySha256, "3", "4"),
});

function lifecycleFixture(options: { failAt?: string; badFinal?: boolean; emergencyHoldFails?: boolean; noticeDeliveryFails?: boolean } = {}) {
  let step = 0;
  const fail = (id: string) => { if (options.failAt === id) throw new Error(`fixture_fail:${id}`); };
  const callbacks = {
    async baseline() { fail("baseline"); return state("ready", step++); },
    async openIncident() { fail("open"); return state("open", step++); },
    async deliverAlert() { fail("alert"); return alert(); },
    async acknowledgeAlert() { fail("ack"); return ack(); },
    async activateKillSwitch() { fail("activate"); return kill("activate", step++); },
    async containedState() { fail("contained"); return state("contained", step++); },
    async deliverInvestigatingNotices(_rows: unknown[]) { fail("notice"); return options.noticeDeliveryFails ? { delivered: false, failed: 1, total: 3 } : { delivered: true, failed: 0, total: 3 }; },
    async completePlaybook() { fail("playbook"); return playbook(); },
    async requestRecovery() { fail("recover"); return state("recovering", step++); },
    async validateRecovery() { fail("validate_recovery"); return { validated: true, health: "recovered", evidenceDigest: "b".repeat(64) }; },
    async releaseKillSwitch() { fail("release"); return kill("release", step++); },
    async resolvedState() { fail("resolved"); return state("resolved", step++); },
    async deliverResolvedNotices(_rows: unknown[]) { fail("resolved_notice"); return { delivered: true, failed: 0, total: 3 }; },
    async closeIncident() { fail("close"); return state("closed", step++); },
    async finalState() { fail("final"); return options.badFinal ? state("closed", step++, { killSwitchActive: true }) : state("closed", step++); },
    async emergencyHold() { if (options.emergencyHoldFails) throw new Error("emergency_hold_failed"); return kill("emergency_hold", Math.max(step++, 2)); },
  };
  return callbacks;
}

// Environment and primitive validations.
const envValidated = validateA100Environment(environment);
equal(envValidated.stagingOrigin, "https://velmere-a100-staging.example", "environment origin normalized");
expectCode(() => validateA100Environment({ ...environment, stagingOrigin: "http://velmere-a100-staging.example/" }), "a100_staging_origin_not_origin_only", "http rejected");
expectCode(() => validateA100Environment({ ...environment, stagingOrigin: "https://prod.example/" }), "a100_staging_origin_unsafe", "prod rejected");
expectCode(() => validateA100Environment({ ...environment, extra: true } as never), "a100_environment_fields_invalid", "unknown environment field rejected");
const baselineValidated = validateA100StateSnapshot(state("ready", 0), { sourceRevisionId: REV, sourceManifestSha256: SOURCE_MANIFEST, environmentDigest: ENV });
equal(baselineValidated.state, "ready", "baseline accepted");
expectCode(() => validateA100StateSnapshot(state("contained", 2, { killSwitchActive: false })), "a100_containment_state_invalid", "contained without switch rejected");
expectCode(() => validateA100StateSnapshot(state("closed", 8, { health: "degraded" })), "a100_closed_state_invalid", "closed unhealthy rejected");
expectCode(() => validateA100StateSnapshot({ ...state("ready", 0), extra: true } as never), "a100_state_fields_invalid", "state unknown field rejected");
const alertValidated = validateA100AlertReceipt(alert(), { incidentId: INCIDENT, runId: RUN, sourceRevisionId: REV, environmentDigest: ENV });
ok(alertValidated.deliveredAtMs > alertValidated.triggeredAtMs, "alert timing accepted");
expectCode(() => validateA100AlertReceipt(alert({ deliveredAt: new Date(NOW + 70_000).toISOString() }), { incidentId: INCIDENT, runId: RUN, sourceRevisionId: REV, environmentDigest: ENV }), "a100_alert_delivery_sla_failed", "late alert rejected");
expectCode(() => validateA100AlertReceipt(alert({ observerFamilyDigest: "2".repeat(64) }), { incidentId: INCIDENT, runId: RUN, sourceRevisionId: REV, environmentDigest: ENV }), "a100_alert_observer_not_independent", "shared observer rejected");
const ackValidated = validateA100AckReceipt(ack(), { incidentId: INCIDENT, runId: RUN, alert: alertValidated });
equal(ackValidated.actorRole, "security_on_call", "ack accepted");
expectCode(() => validateA100AckReceipt(ack({ acknowledgedAt: new Date(NOW + 400_000).toISOString() }), { incidentId: INCIDENT, runId: RUN, alert: alertValidated }), "a100_ack_sla_failed", "late ack rejected");
expectCode(() => validateA100AckReceipt(ack({ mfaMethod: "totp" })), "a100_ack_policy_invalid", "non-webauthn ack rejected");
equal(validateA100KillSwitchReceipt(kill("activate", 2), { incidentId: INCIDENT, runId: RUN, sourceRevisionId: REV, environmentDigest: ENV }).operation, "activate", "activation accepted");
equal(validateA100KillSwitchReceipt(kill("release", 6), { incidentId: INCIDENT, runId: RUN, sourceRevisionId: REV, environmentDigest: ENV }).operation, "release", "release accepted");
expectCode(() => validateA100KillSwitchReceipt(kill("release", 6, { paidDeliveryBlocked: true })), "a100_kill_switch_release_state_invalid", "partial release rejected");
equal(validateA100PlaybookReceipt(playbook(), { incidentId: INCIDENT, runId: RUN }).actions.length, 5, "playbook accepted");
expectCode(() => validateA100PlaybookReceipt(playbook({ actions: ["triage", "containment"] })), "a100_playbook_incomplete_or_duplicate", "incomplete playbook rejected");
expectCode(() => validateA100PlaybookReceipt(playbook({ evidenceDigests: ["a".repeat(64)] })), "a100_playbook_evidence_invalid", "insufficient evidence rejected");
const investigating = notices("investigating"); const resolved = notices("resolved");
equal(validateA100NoticeProjection(investigating, { incidentIdHash: sha256Text(INCIDENT), recipientCohortHash: "e".repeat(64), kind: "investigating" }).locales, 3, "investigating locales accepted");
equal(validateA100NoticeProjection(resolved, { incidentIdHash: sha256Text(INCIDENT), recipientCohortHash: "e".repeat(64), kind: "resolved" }).locales, 3, "resolved locales accepted");
expectCode(() => validateA100NoticeProjection(investigating.slice(0, 2), { incidentIdHash: sha256Text(INCIDENT), recipientCohortHash: "e".repeat(64), kind: "investigating" }), "a100_notice_locale_denominator_invalid", "missing locale rejected");
expectCode(() => validateA100NoticeProjection([{ ...investigating[0], affectedSurfaceIds: ["audits"] }, investigating[1], investigating[2]], { incidentIdHash: sha256Text(INCIDENT), recipientCohortHash: "e".repeat(64), kind: "investigating" }), "a100_notice_cross_locale_fact_drift", "locale drift rejected");
expectCode(() => validateA100NoticeProjection([{ ...investigating[0], body: "Fully safe and guaranteed" }, investigating[1], investigating[2]], { incidentIdHash: sha256Text(INCIDENT), recipientCohortHash: "e".repeat(64), kind: "investigating" }), "a100_notice_false_safety_claim", "false safety rejected");

// Notice builder truth.
for (const notice of investigating) {
  ok(notice.body.length <= 1200, `bounded notice ${notice.locale}`);
  ok(!/no data loss|fully safe|guaranteed/iu.test(notice.body), `truth notice ${notice.locale}`);
  equal(notice.claimIds.length, 4, `claims notice ${notice.locale}`);
}
for (const notice of resolved) {
  ok(notice.body.length <= 1200, `bounded resolved ${notice.locale}`);
  ok(notice.recoveryValidated, `resolved recovery ${notice.locale}`);
  equal(notice.claimIds.length, 4, `resolved claims ${notice.locale}`);
}
let noticeBuilderError = false;
try { buildA100CustomerIncidentNotice({ ...({ kind: "resolved", locale: "en", severity: "SEV2", incidentIdHash: sha256Text(INCIDENT), recipientCohortHash: "e".repeat(64), affectedSurfaceIds: ["audits"], nextUpdateAt: null, recoveryValidated: false, dataLossAssessment: "NOT_ASSESSED" } as const) }); } catch { noticeBuilderError = true; }
ok(noticeBuilderError, "resolved notice requires validated recovery");

// Full positive lifecycle.
scenarioIds.add("clean_lifecycle");
const clean = await executeA100IncidentLifecycle({
  environment,
  callbacks: lifecycleFixture(),
  notices: { investigating, resolved, recipientCohortHash: "e".repeat(64) },
  releaseDualControl: dual("incident_kill_switch_release", "/api/internal/incidents/release", releaseBody),
  closeDualControl: dual("incident_close", "/api/internal/incidents/close", closeBody),
  nowMs: NOW,
});
equal(clean.status, "LOCAL_LIFECYCLE_VERIFIED_FIXTURE_ONLY", "clean lifecycle status");
ok(clean.state.incidentClosed, "clean lifecycle closed");
ok(clean.state.killSwitchReleased, "clean lifecycle released");
ok(clean.state.recoveryValidated, "clean lifecycle recovery validated");
ok(clean.journal.events.length >= 14, "clean lifecycle journal complete");
equal(clean.realStagingCredit, false, "clean no staging credit");
equal(clean.saleEnabled, false, "clean no sale");

// Failure scenarios and safe containment.
for (const [id, options, expectedSafe] of [
  ["alert_transport_failure", { failAt: "alert" }, true],
  ["notice_delivery_failure", { noticeDeliveryFails: true }, true],
  ["playbook_failure", { failAt: "playbook" }, true],
  ["recovery_validation_failure", { failAt: "validate_recovery" }, true],
  ["release_transport_failure", { failAt: "release" }, true],
  ["resolved_notice_failure", { failAt: "resolved_notice" }, true],
  ["close_failure", { failAt: "close" }, true],
  ["final_baseline_failure", { badFinal: true }, true],
] as const) {
  scenarioIds.add(id);
  const caught = await expectAsyncCode(() => executeA100IncidentLifecycle({ environment, callbacks: lifecycleFixture(options), notices: { investigating, resolved, recipientCohortHash: "e".repeat(64) }, releaseDualControl: dual("incident_kill_switch_release", "/api/internal/incidents/release", releaseBody), closeDualControl: dual("incident_close", "/api/internal/incidents/close", closeBody), nowMs: NOW }), "a100_lifecycle_failed", id);
  ok(Boolean(caught.receipt?.state?.emergencyHoldAttempted), `${id}: hold attempted`);
  equal(Boolean(caught.receipt?.state?.emergencyHoldSucceeded), expectedSafe, `${id}: hold result`);
  equal(caught.receipt?.realStagingCredit, false, `${id}: no staging credit`);
}
scenarioIds.add("emergency_hold_failure");
const unsafe = await expectAsyncCode(() => executeA100IncidentLifecycle({ environment, callbacks: lifecycleFixture({ failAt: "playbook", emergencyHoldFails: true }), notices: { investigating, resolved, recipientCohortHash: "e".repeat(64) }, releaseDualControl: dual("incident_kill_switch_release", "/api/internal/incidents/release", releaseBody), closeDualControl: dual("incident_close", "/api/internal/incidents/close", closeBody), nowMs: NOW }), "a100_lifecycle_failed", "emergency hold failure");
equal(unsafe.receipt?.status, "RECOVERY_REQUIRED_CONTAINMENT_UNCONFIRMED", "unsafe recovery status");
ok(unsafe.receipt?.state?.emergencyHoldAttempted, "unsafe hold attempted");
equal(unsafe.receipt?.state?.emergencyHoldSucceeded, false, "unsafe hold unconfirmed");

// Dual-control mutation and state-machine adversarial checks.
const wrongRelease = dual("incident_kill_switch_release", "/api/internal/incidents/release", releaseBody);
wrongRelease.independent.actorIdHash = wrongRelease.primary.actorIdHash;
scenarioIds.add("dual_control_self_approval");
const dualCaught = await expectAsyncCode(() => executeA100IncidentLifecycle({ environment, callbacks: lifecycleFixture(), notices: { investigating, resolved, recipientCohortHash: "e".repeat(64) }, releaseDualControl: wrongRelease, closeDualControl: dual("incident_close", "/api/internal/incidents/close", closeBody), nowMs: NOW }), "a100_lifecycle_failed", "dual self approval");
ok(dualCaught.receipt?.state?.emergencyHoldAttempted, "dual failure held");

// Extra targeted checks to reach the exact declared denominator with meaningful invariants.
expectCode(() => validateA100AlertReceipt({ ...alert(), extra: true } as never), "a100_alert_fields_invalid", "alert unknown field rejected");
expectCode(() => validateA100AckReceipt({ ...ack(), extra: true } as never), "a100_ack_fields_invalid", "ack unknown field rejected");
expectCode(() => validateA100KillSwitchReceipt({ ...kill("activate", 2), extra: true } as never), "a100_kill_switch_fields_invalid", "kill unknown field rejected");
expectCode(() => validateA100PlaybookReceipt({ ...playbook(), extra: true } as never), "a100_playbook_fields_invalid", "playbook unknown field rejected");
expectCode(() => validateA100StateSnapshot(state("invalid", 1)), "a100_state_invalid", "unknown state rejected");
expectCode(() => validateA100StateSnapshot(state("ready", -1)), "a100_sequence_invalid", "negative sequence rejected");
expectCode(() => validateA100AlertReceipt(alert({ environmentDigest: "f".repeat(64) }), { incidentId: INCIDENT, runId: RUN, sourceRevisionId: REV, environmentDigest: ENV }), "a100_alert_binding_mismatch", "alert environment drift rejected");
expectCode(() => validateA100AckReceipt(ack({ alertIdHash: "f".repeat(64) }), { incidentId: INCIDENT, runId: RUN, alert: alertValidated }), "a100_ack_binding_mismatch", "ack alert drift rejected");
expectCode(() => validateA100KillSwitchReceipt(kill("activate", 2, { environmentDigest: "f".repeat(64) }), { incidentId: INCIDENT, runId: RUN, sourceRevisionId: REV, environmentDigest: ENV }), "a100_kill_switch_binding_mismatch", "kill environment drift rejected");
expectCode(() => validateA100PlaybookReceipt(playbook({ actions: ["triage", "triage", "containment", "customer_notice", "recovery_validation", "closure_review"] })), "a100_playbook_incomplete_or_duplicate", "duplicate playbook rejected");
ok(investigating.every((notice) => notice.affectedSurfaceIds.join(",") === "audits,shield-pro"), "notice surfaces canonical");
ok(resolved.every((notice) => notice.dataLossAssessment === "NO_EVIDENCE_OBSERVED"), "resolved assessment exact");
ok(investigating.every((notice) => notice.nextUpdateAt !== null), "investigating update deadline present");
ok(resolved.every((notice) => notice.nextUpdateAt === null), "resolved update deadline absent");
ok(new Set(investigating.map((notice) => notice.contentSha256)).size === 3, "localized content digests distinct");
ok(investigating.every((notice) => notice.incidentIdHash === sha256Text(INCIDENT)), "notice incident binding exact");
ok(investigating.every((notice) => notice.recipientCohortHash === "e".repeat(64)), "notice recipient binding exact");
ok(clean.journal.events.every((event: { sequence: number }, index: number) => event.sequence === index + 1), "journal sequence exact");
ok(clean.journal.events.every((event: { previousDigest: string }, index: number) => index === 0 ? event.previousDigest === "0".repeat(64) : event.previousDigest === clean.journal.events[index - 1].digest), "journal chain exact");
ok(/^[a-f0-9]{64}$/u.test(clean.journal.finalDigest), "journal final digest exact");
equal(scenarioIds.size, 11, "fixture scenario denominator");

if (assertions !== 110) throw new Error(`a100_assertion_denominator_drift:${assertions}`);
console.log(JSON.stringify({
  status: "PASS_A100_INCIDENT_KILL_SWITCH_CUSTOMER_COMMUNICATION_BOUNDARY_LOCAL_ONLY",
  revisionId: REV,
  assertions,
  fixtureScenarios: scenarioIds.size,
  realIncidentRuns: 0,
  realAlertDeliveries: 0,
  realOnCallAcknowledgements: 0,
  realKillSwitchActivations: 0,
  realCustomerNoticeDeliveries: 0,
  realRecoveryValidations: 0,
  realClosedIncidents: 0,
  stagingCredit: false,
  live: false,
  saleEnabled: false
}, null, 2));
