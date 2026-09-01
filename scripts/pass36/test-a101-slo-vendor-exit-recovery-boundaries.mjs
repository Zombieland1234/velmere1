#!/usr/bin/env node
import {
  A101BoundaryError,
  executeA101SloVendorExitLifecycle,
  sha256Text,
  validateA101CredentialProbeReceipt,
  validateA101Environment,
  validateA101RestoreReceipt,
  validateA101ServiceProbes,
  validateA101SloReceipt,
  validateA101VendorExitReceipt,
} from "./a101-slo-vendor-exit-recovery-boundary.mjs";

let assertions = 0;
const scenarioIds = new Set();
function ok(value, label) { assertions += 1; if (!value) throw new Error(`assertion_failed:${label}`); }
function equal(actual, expected, label) { assertions += 1; if (actual !== expected) throw new Error(`assertion_failed:${label}:${JSON.stringify({ actual, expected })}`); }
function expectCode(fn, code, label) {
  assertions += 1;
  try { const value = fn(); if (value && typeof value.then === "function") throw new Error("use expectCodeAsync"); }
  catch (error) {
    if (error instanceof A101BoundaryError && error.code === code) return;
    throw new Error(`assertion_failed:${label}:${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  throw new Error(`assertion_failed:${label}:not_thrown`);
}
async function expectCodeAsync(fn, code, label, receiptDecision = null) {
  assertions += 1;
  try { await fn(); }
  catch (error) {
    if (error instanceof A101BoundaryError && error.code === code && (receiptDecision == null || error.receipt?.decision === receiptDecision)) return error;
    throw new Error(`assertion_failed:${label}:${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  throw new Error(`assertion_failed:${label}:not_thrown`);
}
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

const REV = "VELMERE_PASS36_A101R0_MEASURED_SLO_ERROR_BUDGET_VENDOR_EXIT_AND_RECOVERY_TRUTH_BOUNDARY";
const SOURCE_SHA = "1".repeat(64);
const ENV = "2".repeat(64);
const TELEMETRY = "3".repeat(64);
const CONTROL = "4".repeat(64);
const VENDOR_OBSERVER = "5".repeat(64);
const PROBE_OBSERVER = "6".repeat(64);
const RESTORE_OBSERVER = "7".repeat(64);
const RUN = "a101-run-001";
const NOW = Date.parse("2026-07-29T09:00:00.000Z");
const START = NOW - 1_200_000;
const END = NOW - 60_000;

const environment = {
  projectClass: "disposable_staging",
  sourceRevisionId: REV,
  sourceManifestSha256: SOURCE_SHA,
  environmentDigest: ENV,
  stagingOrigin: "https://a101-preview.example.test",
  telemetryPlaneDigest: TELEMETRY,
  vendorControlPlaneDigest: CONTROL,
};
const expected = { runId: RUN, sourceRevisionId: REV, sourceManifestSha256: SOURCE_SHA, environmentDigest: ENV, telemetryPlaneDigest: TELEMETRY, vendorControlPlaneDigest: CONTROL };

function provider(mode, seed, overrides = {}) {
  return {
    schemaVersion: "velmere.a99.provider-identity.v1",
    sourceRevisionId: REV,
    sourceManifestSha256: SOURCE_SHA,
    environmentDigest: ENV,
    providerId: `provider-${seed}`,
    vendorFamily: `vendor-${seed}`,
    accountDigest: seed.repeat(64).slice(0, 64),
    region: `region-${seed}`,
    failureDomainDigest: String(Number(seed) + 1).repeat(64).slice(0, 64),
    controlPlaneDigest: String(Number(seed) + 2).repeat(64).slice(0, 64),
    credentialDigest: String(Number(seed) + 3).repeat(64).slice(0, 64),
    mode,
    observedAt: new Date(NOW - 70_000).toISOString(),
    providerReceiptSha256: String(Number(seed) + 4).repeat(64).slice(0, 64),
    ...overrides,
  };
}
const primary = provider("primary", "1");
const alternate = provider("alternate", "6");

function slo(overrides = {}) {
  return {
    schemaVersion: "velmere.a101.slo-receipt.v1",
    runId: RUN,
    sourceRevisionId: REV,
    sourceManifestSha256: SOURCE_SHA,
    environmentDigest: ENV,
    telemetrySourceFamilyDigest: TELEMETRY,
    controlPlaneFamilyDigest: CONTROL,
    windowStartedAt: new Date(START).toISOString(),
    windowEndedAt: new Date(END).toISOString(),
    observedAt: new Date(END + 1_000).toISOString(),
    targetAvailabilityPercent: 99,
    sampleCount: 1000,
    successCount: 995,
    errorCount: 5,
    reportedAvailabilityPercent: 99.5,
    p50Ms: 250,
    p95Ms: 900,
    p99Ms: 1600,
    errorBudgetConsumedPercent: 50,
    freshnessP95Seconds: 30,
    providerReceiptSha256: "8".repeat(64),
    ...overrides,
  };
}
function exitReceipt(overrides = {}) {
  return {
    schemaVersion: "velmere.a101.vendor-exit-receipt.v1",
    operation: "vendor_exit",
    runId: RUN,
    sourceRevisionId: REV,
    sourceManifestSha256: SOURCE_SHA,
    environmentDigest: ENV,
    primaryIdentity: primary,
    alternateIdentity: alternate,
    startedAt: new Date(NOW - 50_000).toISOString(),
    completedAt: new Date(NOW - 10_000).toISOString(),
    primaryTrafficPercent: 0,
    primaryCredentialActive: false,
    primaryCachePurged: true,
    alternateActive: true,
    controlPlaneFamilyDigest: CONTROL,
    observerFamilyDigest: VENDOR_OBSERVER,
    providerReceiptSha256: "9".repeat(64),
    ...overrides,
  };
}
function credential(overrides = {}) {
  return {
    schemaVersion: "velmere.a101.credential-probe-receipt.v1",
    runId: RUN,
    primaryCredentialDigest: primary.credentialDigest,
    attemptedAt: new Date(NOW - 8_000).toISOString(),
    httpStatus: 403,
    credentialAccepted: false,
    controlPlaneFamilyDigest: CONTROL,
    observerFamilyDigest: PROBE_OBSERVER,
    providerReceiptSha256: "a".repeat(64),
    ...overrides,
  };
}
function probes(overridesByIndex = new Map(), count = 10) {
  return Array.from({ length: count }, (_, index) => {
    const requested = NOW - 7_000 + index * 100;
    return {
      schemaVersion: "velmere.a101.service-probe.v1",
      runId: RUN,
      sampleId: `sample-${index + 1}`,
      providerIdDigest: sha256Text(alternate.providerId),
      requestedAt: new Date(requested).toISOString(),
      observedAt: new Date(requested + 400 + index * 10).toISOString(),
      available: true,
      latencyMs: 400 + index * 10,
      freshnessSeconds: 20 + index,
      dataFloorMet: true,
      payloadSha256: String((index % 9) + 1).repeat(64),
      sourceRevisionId: REV,
      environmentDigest: ENV,
      observerFamilyDigest: RESTORE_OBSERVER,
      providerReceiptSha256: String(((index + 2) % 9) + 1).repeat(64),
      ...(overridesByIndex.get(index) ?? {}),
    };
  });
}
function restore(overrides = {}) {
  return {
    schemaVersion: "velmere.a101.restore-receipt.v1",
    operation: "primary_restore",
    runId: RUN,
    sourceRevisionId: REV,
    sourceManifestSha256: SOURCE_SHA,
    environmentDigest: ENV,
    primaryIdentity: { ...primary, mode: "recovered", observedAt: new Date(NOW - 1_000).toISOString() },
    alternateIdentity: alternate,
    restoredAt: new Date(NOW - 1_000).toISOString(),
    primaryActive: true,
    primaryTrafficPercent: 100,
    primaryCredentialActive: true,
    cacheWarm: true,
    alternateTrafficPercent: 0,
    serviceHealthy: true,
    controlPlaneFamilyDigest: CONTROL,
    observerFamilyDigest: RESTORE_OBSERVER,
    providerReceiptSha256: "b".repeat(64),
    ...overrides,
  };
}
function finalPrimary(overrides = {}) { return { ...primary, mode: "recovered", observedAt: new Date(NOW).toISOString(), ...overrides }; }
function dualControl() {
  const action = { scope: "vendor_exit", path: "/api/internal/providers/vendor-exit", bodySha256: "c".repeat(64) };
  const actionDigest = sha256Text(canonicalJson({ scope: action.scope, method: "POST", path: action.path, bodySha256: action.bodySha256 }));
  const base = {
    schemaVersion: "velmere.a99.operator-assertion.v1",
    mfaMethod: "webauthn",
    environment: "test_only",
    scope: action.scope,
    method: "POST",
    path: action.path,
    bodySha256: action.bodySha256,
    actionDigest,
    issuedAt: new Date(NOW - 30_000).toISOString(),
    recentAuthAt: new Date(NOW - 40_000).toISOString(),
    expiresAt: new Date(NOW + 180_000).toISOString(),
    decision: "approve",
  };
  return {
    action,
    primary: { ...base, assertionId: "assertion-primary", actorIdHash: "d".repeat(64), sessionIdHash: "e".repeat(64), role: "operations_owner" },
    independent: { ...base, assertionId: "assertion-independent", actorIdHash: "f".repeat(64), sessionIdHash: "0".repeat(64), role: "independent_reviewer" },
  };
}

// Environment boundary.
scenarioIds.add("environment_boundary");
equal(validateA101Environment(environment).stagingOrigin, "https://a101-preview.example.test", "environment accepted");
expectCode(() => validateA101Environment({ ...environment, projectClass: "production" }), "a101_project_class_invalid", "production project rejected");
expectCode(() => validateA101Environment({ ...environment, telemetryPlaneDigest: CONTROL }), "a101_telemetry_vendor_control_not_independent", "shared planes rejected");
expectCode(() => validateA101Environment({ ...environment, stagingOrigin: "https://user:pass@a101-preview.example.test" }), "a101_staging_origin_not_origin_only", "origin credentials rejected");
expectCode(() => validateA101Environment({ ...environment, stagingOrigin: "https://prod.example.test" }), "a101_staging_origin_unsafe", "production host rejected");

// SLO receipt strictness.
scenarioIds.add("slo_receipt_boundary");
const validSlo = validateA101SloReceipt(slo(), expected, NOW);
equal(validSlo.calculatedAvailabilityPercent, 99.5, "availability calculated");
ok(Math.abs(validSlo.calculatedErrorBudgetConsumedPercent - 50) < 1e-9, "budget calculated");
expectCode(() => validateA101SloReceipt(slo({ windowStartedAt: new Date(END - 600_000).toISOString() }), expected, NOW), "a101_slo_window_not_bounded", "short window rejected");
expectCode(() => validateA101SloReceipt(slo({ windowStartedAt: new Date(END - 2_000_000).toISOString() }), expected, NOW), "a101_slo_window_not_bounded", "long window rejected");
expectCode(() => validateA101SloReceipt(slo({ windowEndedAt: new Date(NOW - 400_000).toISOString(), windowStartedAt: new Date(NOW - 1_600_000).toISOString(), observedAt: new Date(NOW - 399_000).toISOString() }), expected, NOW), "a101_slo_window_not_current", "stale window rejected");
expectCode(() => validateA101SloReceipt(slo({ observedAt: new Date(NOW + 10_000).toISOString() }), expected, NOW), "a101_slo_window_not_current", "future observation rejected");
expectCode(() => validateA101SloReceipt(slo({ targetAvailabilityPercent: 99.9 }), expected, NOW), "a101_slo_target_invalid", "target rewrite rejected");
expectCode(() => validateA101SloReceipt(slo({ sampleCount: 49, successCount: 49, errorCount: 0, reportedAvailabilityPercent: 100, errorBudgetConsumedPercent: 0 }), expected, NOW), "a101_slo_sample_count_invalid", "small sample rejected");
expectCode(() => validateA101SloReceipt(slo({ successCount: 996, errorCount: 5 }), expected, NOW), "a101_slo_count_algebra_invalid", "count algebra rejected");
expectCode(() => validateA101SloReceipt(slo({ reportedAvailabilityPercent: 99.9 }), expected, NOW), "a101_slo_availability_mismatch", "availability mismatch rejected");
expectCode(() => validateA101SloReceipt(slo({ successCount: 989, errorCount: 11, reportedAvailabilityPercent: 98.9, errorBudgetConsumedPercent: 110 }), expected, NOW), "a101_slo_availability_target_failed", "availability floor rejected");
expectCode(() => validateA101SloReceipt(slo({ p50Ms: 1000, p95Ms: 900 }), expected, NOW), "a101_slo_percentile_order_invalid", "percentile order rejected");
expectCode(() => validateA101SloReceipt(slo({ p95Ms: 1600, p99Ms: 1700 }), expected, NOW), "a101_slo_p95_target_failed", "p95 rejected");
expectCode(() => validateA101SloReceipt(slo({ p99Ms: 3200 }), expected, NOW), "a101_slo_p99_target_failed", "p99 rejected");
expectCode(() => validateA101SloReceipt(slo({ errorBudgetConsumedPercent: 49 }), expected, NOW), "a101_slo_error_budget_mismatch", "budget mismatch rejected");
expectCode(() => validateA101SloReceipt(slo({ successCount: 989, errorCount: 11, reportedAvailabilityPercent: 98.9, errorBudgetConsumedPercent: 110 }), expected, NOW), "a101_slo_availability_target_failed", "budget exhaustion cannot hide availability");
expectCode(() => validateA101SloReceipt(slo({ freshnessP95Seconds: 121 }), expected, NOW), "a101_slo_freshness_target_failed", "freshness rejected");
expectCode(() => validateA101SloReceipt(slo({ sourceRevisionId: "wrong" }), expected, NOW), "a101_slo_binding_mismatch", "source binding rejected");
expectCode(() => validateA101SloReceipt(slo({ telemetrySourceFamilyDigest: CONTROL }), expected, NOW), "a101_slo_telemetry_not_independent", "telemetry self-report rejected");
expectCode(() => validateA101SloReceipt(slo({ controlPlaneFamilyDigest: "9".repeat(64) }), expected, NOW), "a101_slo_plane_binding_mismatch", "control plane drift rejected");
expectCode(() => validateA101SloReceipt({ ...slo(), extra: true }, expected, NOW), "a101_slo_fields_invalid", "extra SLO field rejected");

// Vendor exit receipt.
scenarioIds.add("vendor_exit_boundary");
const validExit = validateA101VendorExitReceipt(exitReceipt(), expected);
equal(validExit.primaryTrafficPercent, 0, "exit accepted");
expectCode(() => validateA101VendorExitReceipt(exitReceipt({ completedAt: new Date(NOW + 200_000).toISOString() }), expected), "a101_vendor_exit_sla_failed", "slow exit rejected");
expectCode(() => validateA101VendorExitReceipt(exitReceipt({ primaryTrafficPercent: 1 }), expected), "a101_vendor_exit_state_invalid", "residual traffic rejected");
expectCode(() => validateA101VendorExitReceipt(exitReceipt({ primaryCredentialActive: true }), expected), "a101_vendor_exit_state_invalid", "active credential rejected");
expectCode(() => validateA101VendorExitReceipt(exitReceipt({ primaryCachePurged: false }), expected), "a101_vendor_exit_state_invalid", "unpurged cache rejected");
expectCode(() => validateA101VendorExitReceipt(exitReceipt({ observerFamilyDigest: CONTROL }), expected), "a101_vendor_exit_observer_not_independent", "self-observed exit rejected");
expectCode(() => validateA101VendorExitReceipt(exitReceipt({ observerFamilyDigest: TELEMETRY }), expected), "a101_vendor_exit_observer_collides_with_telemetry", "telemetry observer collision rejected");
expectCode(() => validateA101VendorExitReceipt(exitReceipt({ alternateIdentity: { ...alternate, vendorFamily: primary.vendorFamily } }), expected), "a101_provider_failure_domains_not_independent", "shared vendor rejected");
expectCode(() => validateA101VendorExitReceipt(exitReceipt({ controlPlaneFamilyDigest: "8".repeat(64) }), expected), "a101_vendor_exit_control_plane_mismatch", "control plane mismatch rejected");

// Credential revocation.
scenarioIds.add("credential_probe_boundary");
equal(validateA101CredentialProbeReceipt(credential(), { ...expected, primaryCredentialDigest: primary.credentialDigest }).httpStatus, 403, "credential rejection accepted");
expectCode(() => validateA101CredentialProbeReceipt(credential({ httpStatus: 200, credentialAccepted: true }), { ...expected, primaryCredentialDigest: primary.credentialDigest }), "a101_credential_probe_not_rejected", "accepted credential rejected");
expectCode(() => validateA101CredentialProbeReceipt(credential({ observerFamilyDigest: CONTROL }), { ...expected, primaryCredentialDigest: primary.credentialDigest }), "a101_credential_probe_observer_not_independent", "credential self-observer rejected");
expectCode(() => validateA101CredentialProbeReceipt(credential({ primaryCredentialDigest: "9".repeat(64) }), { ...expected, primaryCredentialDigest: primary.credentialDigest }), "a101_credential_probe_binding_mismatch", "credential digest drift rejected");
expectCode(() => validateA101CredentialProbeReceipt(credential({ observerFamilyDigest: TELEMETRY }), { ...expected, primaryCredentialDigest: primary.credentialDigest }), "a101_credential_probe_observer_collides_with_telemetry", "credential observer telemetry collision rejected");

// Service probes.
scenarioIds.add("service_probe_boundary");
const validProbes = validateA101ServiceProbes(probes(), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW);
equal(validProbes.count, 10, "probe denominator accepted");
equal(validProbes.available, 10, "available probes counted");
ok(validProbes.p95Ms <= 2000, "probe p95 bounded");
expectCode(() => validateA101ServiceProbes(probes(new Map(), 9), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_denominator_invalid", "small probe denominator rejected");
const duplicate = probes(); duplicate[9] = { ...duplicate[9], sampleId: duplicate[0].sampleId };
expectCode(() => validateA101ServiceProbes(duplicate, { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_duplicate_sample", "duplicate sample rejected");
expectCode(() => validateA101ServiceProbes(probes(new Map([[0, { providerIdDigest: "9".repeat(64) }]])), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_provider_mismatch", "provider mismatch rejected");
expectCode(() => validateA101ServiceProbes(probes(new Map([[0, { observedAt: new Date(NOW + 10_000).toISOString() }]])), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_timeline_invalid", "future probe rejected");
expectCode(() => validateA101ServiceProbes(probes(new Map([[0, { latencyMs: 9999 }]])), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_latency_mismatch", "latency mismatch rejected");
expectCode(() => validateA101ServiceProbes(probes(new Map([[0, { available: true, dataFloorMet: false }]])), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_available_without_data_floor", "missing data floor rejected");
const availabilityFailure = new Map([[0, { available: false, dataFloorMet: false }], [1, { available: false, dataFloorMet: false }]]);
expectCode(() => validateA101ServiceProbes(probes(availabilityFailure), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_availability_floor_failed", "low availability rejected");
const p95Failure = new Map(Array.from({ length: 10 }, (_, index) => [index, { observedAt: new Date(NOW - 7_000 + index * 100 + 2500).toISOString(), latencyMs: 2500 }]));
expectCode(() => validateA101ServiceProbes(probes(p95Failure), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_p95_failed", "probe p95 rejected");
expectCode(() => validateA101ServiceProbes(probes(new Map([[0, { freshnessSeconds: 121 }]])), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_freshness_failed", "probe freshness rejected");
expectCode(() => validateA101ServiceProbes(probes(new Map([[0, { observerFamilyDigest: CONTROL }]])), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_observer_not_independent", "probe control observer rejected");
expectCode(() => validateA101ServiceProbes(probes(new Map([[0, { observerFamilyDigest: TELEMETRY }]])), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, NOW), "a101_service_probe_observer_not_independent", "probe telemetry observer rejected");

// Restore truth.
scenarioIds.add("restore_boundary");
equal(validateA101RestoreReceipt(restore(), { ...expected, primaryProviderId: primary.providerId, alternateProviderId: alternate.providerId }).primaryTrafficPercent, 100, "restore accepted");
expectCode(() => validateA101RestoreReceipt(restore({ primaryTrafficPercent: 99 }), { ...expected, primaryProviderId: primary.providerId, alternateProviderId: alternate.providerId }), "a101_restore_state_invalid", "partial primary restore rejected");
expectCode(() => validateA101RestoreReceipt(restore({ alternateTrafficPercent: 1 }), { ...expected, primaryProviderId: primary.providerId, alternateProviderId: alternate.providerId }), "a101_restore_state_invalid", "alternate traffic after restore rejected");
expectCode(() => validateA101RestoreReceipt(restore({ observerFamilyDigest: CONTROL }), { ...expected, primaryProviderId: primary.providerId, alternateProviderId: alternate.providerId }), "a101_restore_observer_not_independent", "restore self-observer rejected");
expectCode(() => validateA101RestoreReceipt(restore({ primaryIdentity: { ...primary, providerId: "wrong", mode: "recovered" } }), { ...expected, primaryProviderId: primary.providerId, alternateProviderId: alternate.providerId }), "a101_restore_provider_binding_mismatch", "restore provider drift rejected");
expectCode(() => validateA101RestoreReceipt(restore({ observerFamilyDigest: TELEMETRY }), { ...expected, primaryProviderId: primary.providerId, alternateProviderId: alternate.providerId }), "a101_restore_observer_collides_with_telemetry", "restore telemetry collision rejected");

function callbacks(overrides = {}) {
  return {
    slo: async () => slo(),
    primaryStatus: async () => primary,
    alternateStatus: async () => alternate,
    beginVendorExit: async () => exitReceipt(),
    credentialProbe: async () => credential(),
    serviceProbes: async () => probes(),
    restorePrimary: async () => restore(),
    finalPrimaryStatus: async () => finalPrimary(),
    ...overrides,
  };
}

// Full lifecycle success.
scenarioIds.add("clean_lifecycle");
const clean = await executeA101SloVendorExitLifecycle({ environment, runId: RUN, callbacks: callbacks(), dualControl: dualControl(), nowMs: NOW });
equal(clean.status, "LOCAL_SLO_VENDOR_EXIT_VERIFIED_FIXTURE_ONLY", "clean lifecycle status");
equal(clean.decision, "FIXTURE_PASS", "clean lifecycle decision");
ok(clean.state.vendorExitCompleted, "vendor exit completed");
ok(clean.state.credentialRevocationVerified, "credential revocation verified");
ok(clean.state.alternateProbeSetVerified, "alternate probes verified");
ok(clean.state.primaryRestoreSucceeded, "primary restore succeeded");
ok(clean.state.finalBaselineVerified, "final baseline verified");
equal(clean.stagingCredit, false, "no staging credit");
equal(clean.saleEnabled, false, "no sale credit");
ok(clean.journal.events.length >= 9, "journal complete");

// SLO preflight failure must be zero mutation and zero restore.
scenarioIds.add("slo_preflight_zero_mutation");
let preflightMutations = 0; let preflightRestores = 0;
const preflightError = await expectCodeAsync(() => executeA101SloVendorExitLifecycle({
  environment, runId: RUN, dualControl: dualControl(), nowMs: NOW,
  callbacks: callbacks({
    slo: async () => slo({ p95Ms: 1900, p99Ms: 2000 }),
    beginVendorExit: async () => { preflightMutations += 1; return exitReceipt(); },
    restorePrimary: async () => { preflightRestores += 1; return restore(); },
  }),
}), "a101_preflight_failed_zero_mutation", "SLO preflight zero mutation", "ACTION_REQUIRED");
equal(preflightMutations, 0, "no vendor mutation after SLO fail");
equal(preflightRestores, 0, "no restore before mutation");
equal(preflightError.receipt.state.mutationStarted, false, "preflight receipt mutation false");

// Dual control failure also blocks mutation.
scenarioIds.add("dual_control_zero_mutation");
let dualMutations = 0;
const badDual = dualControl(); badDual.independent = { ...badDual.independent, actorIdHash: badDual.primary.actorIdHash };
await expectCodeAsync(() => executeA101SloVendorExitLifecycle({ environment, runId: RUN, callbacks: callbacks({ beginVendorExit: async () => { dualMutations += 1; return exitReceipt(); } }), dualControl: badDual, nowMs: NOW }), "a101_preflight_failed_zero_mutation", "dual control zero mutation", "ACTION_REQUIRED");
equal(dualMutations, 0, "no mutation after dual control fail");

// Post-mutation credential failure must restore safe baseline.
scenarioIds.add("credential_failure_safe_restore");
let credentialRestores = 0;
const credentialError = await expectCodeAsync(() => executeA101SloVendorExitLifecycle({
  environment, runId: RUN, dualControl: dualControl(), nowMs: NOW,
  callbacks: callbacks({
    credentialProbe: async () => credential({ httpStatus: 200, credentialAccepted: true }),
    restorePrimary: async () => { credentialRestores += 1; return restore(); },
  }),
}), "a101_lifecycle_failed_safe_baseline_restored", "credential fail restores baseline", "ACTION_REQUIRED_SAFE_BASELINE_RESTORED");
equal(credentialRestores, 1, "restore called once on credential failure");
ok(credentialError.receipt.state.primaryRestoreSucceeded, "credential failure restored primary");
ok(credentialError.receipt.state.finalBaselineVerified, "credential failure final baseline");

// Probe failure must restore safe baseline.
scenarioIds.add("probe_failure_safe_restore");
let probeRestores = 0;
const probeError = await expectCodeAsync(() => executeA101SloVendorExitLifecycle({
  environment, runId: RUN, dualControl: dualControl(), nowMs: NOW,
  callbacks: callbacks({
    serviceProbes: async () => probes(new Map([[0, { available: false, dataFloorMet: false }], [1, { available: false, dataFloorMet: false }]])),
    restorePrimary: async () => { probeRestores += 1; return restore(); },
  }),
}), "a101_lifecycle_failed_safe_baseline_restored", "probe fail restores baseline", "ACTION_REQUIRED_SAFE_BASELINE_RESTORED");
equal(probeRestores, 1, "restore called after probe fail");
ok(probeError.receipt.state.primaryRestoreSucceeded, "probe failure restored primary");

// Restore fails all three times -> RECOVERY_REQUIRED.
scenarioIds.add("restore_failure_recovery_required");
let failedRestoreAttempts = 0;
const restoreError = await expectCodeAsync(() => executeA101SloVendorExitLifecycle({
  environment, runId: RUN, dualControl: dualControl(), nowMs: NOW,
  callbacks: callbacks({
    restorePrimary: async () => { failedRestoreAttempts += 1; return restore({ primaryTrafficPercent: 0, primaryActive: false, primaryCredentialActive: false, cacheWarm: false, alternateTrafficPercent: 100, serviceHealthy: false }); },
  }),
}), "a101_recovery_required_primary_restore_unconfirmed", "restore failure requires recovery", "RECOVERY_REQUIRED");
equal(failedRestoreAttempts, 3, "three restore attempts used");
equal(restoreError.receipt.state.primaryRestoreAttempts, 3, "receipt records three attempts");
equal(restoreError.receipt.state.primaryRestoreSucceeded, false, "restore not falsely credited");

// Restore receipt valid but final status wrong -> RECOVERY_REQUIRED.
scenarioIds.add("final_baseline_mismatch_recovery_required");
const baselineError = await expectCodeAsync(() => executeA101SloVendorExitLifecycle({
  environment, runId: RUN, dualControl: dualControl(), nowMs: NOW,
  callbacks: callbacks({ finalPrimaryStatus: async () => ({ ...finalPrimary(), providerId: alternate.providerId }) }),
}), "a101_recovery_required_primary_restore_unconfirmed", "final baseline mismatch requires recovery", "RECOVERY_REQUIRED");
equal(baselineError.receipt.state.primaryRestoreSucceeded, true, "restore receipt passed");
equal(baselineError.receipt.state.finalBaselineVerified, false, "final baseline not credited");

// Vendor exit receipt failure is post-mutation and restores.
scenarioIds.add("exit_receipt_failure_safe_restore");
let exitFailureRestores = 0;
const exitFailure = await expectCodeAsync(() => executeA101SloVendorExitLifecycle({
  environment, runId: RUN, dualControl: dualControl(), nowMs: NOW,
  callbacks: callbacks({
    beginVendorExit: async () => exitReceipt({ primaryTrafficPercent: 5 }),
    restorePrimary: async () => { exitFailureRestores += 1; return restore(); },
  }),
}), "a101_lifecycle_failed_safe_baseline_restored", "exit receipt failure restores", "ACTION_REQUIRED_SAFE_BASELINE_RESTORED");
equal(exitFailureRestores, 1, "restore after exit receipt failure");
equal(exitFailure.receipt.state.vendorExitCompleted, false, "invalid exit not credited");

// Missing callback rejects before lifecycle.
scenarioIds.add("missing_callback");
const missing = callbacks(); delete missing.serviceProbes;
await expectCodeAsync(() => executeA101SloVendorExitLifecycle({ environment, runId: RUN, callbacks: missing, dualControl: dualControl(), nowMs: NOW }), "a101_lifecycle_callback_missing", "missing callback rejected");

const output = {
  status: "PASS_A101_SLO_ERROR_BUDGET_VENDOR_EXIT_RECOVERY_BOUNDARY_LOCAL_ONLY",
  revisionId: REV,
  assertions,
  fixtureScenarios: scenarioIds.size,
  realSloWindows: 0,
  realVendorExitRuns: 0,
  realCredentialRevocationProbes: 0,
  realAlternateServiceProbeSets: 0,
  realPrimaryRestoreConfirmations: 0,
  productionSloProven: false,
  continuousMonitoringProven: false,
  stagingCredit: false,
  live: false,
  saleEnabled: false,
};
console.log(JSON.stringify(output, null, 2));
