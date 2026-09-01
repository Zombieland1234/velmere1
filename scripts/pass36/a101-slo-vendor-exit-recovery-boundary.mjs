#!/usr/bin/env node
import crypto from "node:crypto";
import {
  A99BoundaryError,
  assertA99IndependentProviderPair,
  createA99Journal,
  validateA99DualControl,
  validateA99ProviderIdentity,
} from "./a99-backup-restore-provider-loss-boundary.mjs";

export const A101_BOUNDARY_ID = "velmere.pass36.a101.slo-error-budget-vendor-exit-recovery-boundary.v1";
const HEX64 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,180}$/u;
const SLO_TARGET_PERCENT = 99;
const MIN_WINDOW_MS = 900_000;
const MAX_WINDOW_MS = 1_800_000;
const MAX_WINDOW_AGE_MS = 180_000;
const MAX_CLOCK_SKEW_MS = 2_000;
const MIN_SAMPLES = 50;
const MAX_SAMPLES = 1_000_000;
const AVAILABILITY_TOLERANCE_PP = 0.05;
const ERROR_BUDGET_TOLERANCE_PP = 0.05;
const P95_LIMIT_MS = 1_500;
const P99_LIMIT_MS = 3_000;
const FRESHNESS_LIMIT_SECONDS = 120;
const VENDOR_EXIT_LIMIT_MS = 120_000;
const MIN_SERVICE_PROBES = 10;
const MAX_SERVICE_PROBES = 100;
const SERVICE_AVAILABILITY_FLOOR_PERCENT = 90;
const SERVICE_P95_LIMIT_MS = 2_000;
const SERVICE_FRESHNESS_LIMIT_SECONDS = 120;
const RESTORE_ATTEMPTS = 3;

export class A101BoundaryError extends Error {
  constructor(code, detail = null, receipt = null) {
    super(detail == null ? code : `${code}:${String(detail)}`);
    this.name = "A101BoundaryError";
    this.code = code;
    this.detail = detail;
    this.receipt = receipt;
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new A101BoundaryError(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new A101BoundaryError(code, JSON.stringify({ actual, expected: wanted }));
  }
}

function safeId(value, code) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) throw new A101BoundaryError(code);
  return value;
}

function hex64(value, code) {
  if (typeof value !== "string" || !HEX64.test(value)) throw new A101BoundaryError(code);
  return value;
}

function isoMs(value, code) {
  if (typeof value !== "string" || value.length > 64) throw new A101BoundaryError(code);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new A101BoundaryError(code);
  return parsed;
}

function finite(value, code, { min = -Number.MAX_VALUE, max = Number.MAX_VALUE } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new A101BoundaryError(code);
  return value;
}

function integer(value, code, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new A101BoundaryError(code);
  return value;
}

function percentile(values, percent) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((percent / 100) * sorted.length) - 1)];
}

export function validateA101Environment(value) {
  exactKeys(value, [
    "projectClass", "sourceRevisionId", "sourceManifestSha256", "environmentDigest",
    "stagingOrigin", "telemetryPlaneDigest", "vendorControlPlaneDigest",
  ], "a101_environment_fields_invalid");
  if (value.projectClass !== "disposable_staging") throw new A101BoundaryError("a101_project_class_invalid");
  safeId(value.sourceRevisionId, "a101_source_revision_invalid");
  hex64(value.sourceManifestSha256, "a101_source_manifest_invalid");
  for (const key of ["environmentDigest", "telemetryPlaneDigest", "vendorControlPlaneDigest"]) hex64(value[key], `a101_${key}_invalid`);
  if (value.telemetryPlaneDigest === value.vendorControlPlaneDigest) throw new A101BoundaryError("a101_telemetry_vendor_control_not_independent");
  let url;
  try { url = new URL(value.stagingOrigin); } catch { throw new A101BoundaryError("a101_staging_origin_invalid"); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new A101BoundaryError("a101_staging_origin_not_origin_only");
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || /(?:^|\.)(?:prod|production|live|www)(?:\.|$)/u.test(host)) throw new A101BoundaryError("a101_staging_origin_unsafe");
  return Object.freeze({ ...value, stagingOrigin: url.origin });
}

export function validateA101SloReceipt(value, expected, nowMs = Date.now()) {
  exactKeys(value, [
    "schemaVersion", "runId", "sourceRevisionId", "sourceManifestSha256", "environmentDigest",
    "telemetrySourceFamilyDigest", "controlPlaneFamilyDigest", "windowStartedAt", "windowEndedAt",
    "observedAt", "targetAvailabilityPercent", "sampleCount", "successCount", "errorCount",
    "reportedAvailabilityPercent", "p50Ms", "p95Ms", "p99Ms", "errorBudgetConsumedPercent",
    "freshnessP95Seconds", "providerReceiptSha256",
  ], "a101_slo_fields_invalid");
  if (value.schemaVersion !== "velmere.a101.slo-receipt.v1") throw new A101BoundaryError("a101_slo_schema_invalid");
  safeId(value.runId, "a101_slo_run_id_invalid");
  for (const key of ["sourceManifestSha256", "environmentDigest", "telemetrySourceFamilyDigest", "controlPlaneFamilyDigest", "providerReceiptSha256"]) hex64(value[key], `a101_slo_${key}_invalid`);
  if (value.telemetrySourceFamilyDigest === value.controlPlaneFamilyDigest) throw new A101BoundaryError("a101_slo_telemetry_not_independent");
  const startedAtMs = isoMs(value.windowStartedAt, "a101_slo_window_start_invalid");
  const endedAtMs = isoMs(value.windowEndedAt, "a101_slo_window_end_invalid");
  const observedAtMs = isoMs(value.observedAt, "a101_slo_observed_at_invalid");
  const spanMs = endedAtMs - startedAtMs;
  if (spanMs < MIN_WINDOW_MS || spanMs > MAX_WINDOW_MS) throw new A101BoundaryError("a101_slo_window_not_bounded");
  if (endedAtMs > observedAtMs + MAX_CLOCK_SKEW_MS || observedAtMs > nowMs + MAX_CLOCK_SKEW_MS || nowMs - endedAtMs > MAX_WINDOW_AGE_MS) throw new A101BoundaryError("a101_slo_window_not_current");
  if (value.targetAvailabilityPercent !== SLO_TARGET_PERCENT) throw new A101BoundaryError("a101_slo_target_invalid");
  const sampleCount = integer(value.sampleCount, "a101_slo_sample_count_invalid", { min: MIN_SAMPLES, max: MAX_SAMPLES });
  const successCount = integer(value.successCount, "a101_slo_success_count_invalid", { min: 0, max: sampleCount });
  const errorCount = integer(value.errorCount, "a101_slo_error_count_invalid", { min: 0, max: sampleCount });
  if (successCount + errorCount !== sampleCount) throw new A101BoundaryError("a101_slo_count_algebra_invalid");
  const calculatedAvailability = (successCount / sampleCount) * 100;
  finite(value.reportedAvailabilityPercent, "a101_slo_reported_availability_invalid", { min: 0, max: 100 });
  if (Math.abs(value.reportedAvailabilityPercent - calculatedAvailability) > AVAILABILITY_TOLERANCE_PP) throw new A101BoundaryError("a101_slo_availability_mismatch");
  if (calculatedAvailability < SLO_TARGET_PERCENT) throw new A101BoundaryError("a101_slo_availability_target_failed");
  const p50 = finite(value.p50Ms, "a101_slo_p50_invalid", { min: 0, max: 60_000 });
  const p95 = finite(value.p95Ms, "a101_slo_p95_invalid", { min: 0, max: 60_000 });
  const p99 = finite(value.p99Ms, "a101_slo_p99_invalid", { min: 0, max: 60_000 });
  if (!(p50 <= p95 && p95 <= p99)) throw new A101BoundaryError("a101_slo_percentile_order_invalid");
  if (p95 > P95_LIMIT_MS) throw new A101BoundaryError("a101_slo_p95_target_failed");
  if (p99 > P99_LIMIT_MS) throw new A101BoundaryError("a101_slo_p99_target_failed");
  const allowedErrors = sampleCount * (1 - SLO_TARGET_PERCENT / 100);
  const calculatedBudget = allowedErrors === 0 ? (errorCount === 0 ? 0 : Number.POSITIVE_INFINITY) : (errorCount / allowedErrors) * 100;
  finite(value.errorBudgetConsumedPercent, "a101_slo_error_budget_invalid", { min: 0, max: 10_000 });
  if (!Number.isFinite(calculatedBudget) || Math.abs(value.errorBudgetConsumedPercent - calculatedBudget) > ERROR_BUDGET_TOLERANCE_PP) throw new A101BoundaryError("a101_slo_error_budget_mismatch");
  if (calculatedBudget > 100 + ERROR_BUDGET_TOLERANCE_PP) throw new A101BoundaryError("a101_slo_error_budget_exhausted");
  finite(value.freshnessP95Seconds, "a101_slo_freshness_invalid", { min: 0, max: 86_400 });
  if (value.freshnessP95Seconds > FRESHNESS_LIMIT_SECONDS) throw new A101BoundaryError("a101_slo_freshness_target_failed");
  if (expected) {
    if (value.runId !== expected.runId || value.sourceRevisionId !== expected.sourceRevisionId || value.sourceManifestSha256 !== expected.sourceManifestSha256 || value.environmentDigest !== expected.environmentDigest) throw new A101BoundaryError("a101_slo_binding_mismatch");
    if (value.controlPlaneFamilyDigest !== expected.vendorControlPlaneDigest || value.telemetrySourceFamilyDigest !== expected.telemetryPlaneDigest) throw new A101BoundaryError("a101_slo_plane_binding_mismatch");
  }
  return Object.freeze({ ...value, startedAtMs, endedAtMs, observedAtMs, calculatedAvailabilityPercent: calculatedAvailability, calculatedErrorBudgetConsumedPercent: calculatedBudget });
}

function validateProviderIdentity(value, expected) {
  try { return validateA99ProviderIdentity(value, expected); }
  catch (error) {
    if (error instanceof A99BoundaryError) throw new A101BoundaryError(error.code.replace(/^a99_/u, "a101_"), error.detail);
    throw error;
  }
}

function assertIndependentProviderPair(primary, alternate) {
  try { return assertA99IndependentProviderPair(primary, alternate); }
  catch (error) {
    if (error instanceof A99BoundaryError) throw new A101BoundaryError(error.code.replace(/^a99_/u, "a101_"), error.detail);
    throw error;
  }
}

function validateDualControl(input) {
  try { return validateA99DualControl(input); }
  catch (error) {
    if (error instanceof A99BoundaryError) throw new A101BoundaryError(error.code.replace(/^a99_/u, "a101_"), error.detail);
    throw error;
  }
}

export function validateA101VendorExitReceipt(value, expected) {
  exactKeys(value, [
    "schemaVersion", "operation", "runId", "sourceRevisionId", "sourceManifestSha256", "environmentDigest",
    "primaryIdentity", "alternateIdentity", "startedAt", "completedAt", "primaryTrafficPercent",
    "primaryCredentialActive", "primaryCachePurged", "alternateActive", "controlPlaneFamilyDigest",
    "observerFamilyDigest", "providerReceiptSha256",
  ], "a101_vendor_exit_fields_invalid");
  if (value.schemaVersion !== "velmere.a101.vendor-exit-receipt.v1" || value.operation !== "vendor_exit") throw new A101BoundaryError("a101_vendor_exit_schema_invalid");
  safeId(value.runId, "a101_vendor_exit_run_invalid");
  for (const key of ["sourceManifestSha256", "environmentDigest", "controlPlaneFamilyDigest", "observerFamilyDigest", "providerReceiptSha256"]) hex64(value[key], `a101_vendor_exit_${key}_invalid`);
  if (value.controlPlaneFamilyDigest === value.observerFamilyDigest) throw new A101BoundaryError("a101_vendor_exit_observer_not_independent");
  const startedAtMs = isoMs(value.startedAt, "a101_vendor_exit_started_invalid");
  const completedAtMs = isoMs(value.completedAt, "a101_vendor_exit_completed_invalid");
  if (completedAtMs < startedAtMs || completedAtMs - startedAtMs > VENDOR_EXIT_LIMIT_MS) throw new A101BoundaryError("a101_vendor_exit_sla_failed");
  finite(value.primaryTrafficPercent, "a101_vendor_exit_primary_traffic_invalid", { min: 0, max: 100 });
  if (value.primaryTrafficPercent !== 0 || value.primaryCredentialActive !== false || value.primaryCachePurged !== true || value.alternateActive !== true) throw new A101BoundaryError("a101_vendor_exit_state_invalid");
  const providerExpected = { sourceRevisionId: expected?.sourceRevisionId, sourceManifestSha256: expected?.sourceManifestSha256, environmentDigest: expected?.environmentDigest };
  const primary = validateProviderIdentity(value.primaryIdentity, providerExpected);
  const alternate = validateProviderIdentity(value.alternateIdentity, providerExpected);
  assertIndependentProviderPair(primary, alternate);
  if (expected) {
    if (value.runId !== expected.runId || value.sourceRevisionId !== expected.sourceRevisionId || value.sourceManifestSha256 !== expected.sourceManifestSha256 || value.environmentDigest !== expected.environmentDigest) throw new A101BoundaryError("a101_vendor_exit_binding_mismatch");
    if (value.controlPlaneFamilyDigest !== expected.vendorControlPlaneDigest) throw new A101BoundaryError("a101_vendor_exit_control_plane_mismatch");
    if (value.observerFamilyDigest === expected.telemetryPlaneDigest) throw new A101BoundaryError("a101_vendor_exit_observer_collides_with_telemetry");
  }
  return Object.freeze({ ...value, primaryIdentity: primary, alternateIdentity: alternate, startedAtMs, completedAtMs });
}

export function validateA101CredentialProbeReceipt(value, expected) {
  exactKeys(value, [
    "schemaVersion", "runId", "primaryCredentialDigest", "attemptedAt", "httpStatus",
    "credentialAccepted", "controlPlaneFamilyDigest", "observerFamilyDigest", "providerReceiptSha256",
  ], "a101_credential_probe_fields_invalid");
  if (value.schemaVersion !== "velmere.a101.credential-probe-receipt.v1") throw new A101BoundaryError("a101_credential_probe_schema_invalid");
  safeId(value.runId, "a101_credential_probe_run_invalid");
  for (const key of ["primaryCredentialDigest", "controlPlaneFamilyDigest", "observerFamilyDigest", "providerReceiptSha256"]) hex64(value[key], `a101_credential_probe_${key}_invalid`);
  isoMs(value.attemptedAt, "a101_credential_probe_time_invalid");
  if (![401, 403].includes(value.httpStatus) || value.credentialAccepted !== false) throw new A101BoundaryError("a101_credential_probe_not_rejected");
  if (value.controlPlaneFamilyDigest === value.observerFamilyDigest) throw new A101BoundaryError("a101_credential_probe_observer_not_independent");
  if (expected) {
    if (value.runId !== expected.runId || value.primaryCredentialDigest !== expected.primaryCredentialDigest || value.controlPlaneFamilyDigest !== expected.vendorControlPlaneDigest) throw new A101BoundaryError("a101_credential_probe_binding_mismatch");
    if (value.observerFamilyDigest === expected.telemetryPlaneDigest) throw new A101BoundaryError("a101_credential_probe_observer_collides_with_telemetry");
  }
  return Object.freeze({ ...value });
}

export function validateA101ServiceProbes(values, expected, nowMs = Date.now()) {
  if (!Array.isArray(values) || values.length < MIN_SERVICE_PROBES || values.length > MAX_SERVICE_PROBES) throw new A101BoundaryError("a101_service_probe_denominator_invalid");
  const seen = new Set();
  const rows = values.map((value) => {
    exactKeys(value, [
      "schemaVersion", "runId", "sampleId", "providerIdDigest", "requestedAt", "observedAt",
      "available", "latencyMs", "freshnessSeconds", "dataFloorMet", "payloadSha256",
      "sourceRevisionId", "environmentDigest", "observerFamilyDigest", "providerReceiptSha256",
    ], "a101_service_probe_fields_invalid");
    if (value.schemaVersion !== "velmere.a101.service-probe.v1") throw new A101BoundaryError("a101_service_probe_schema_invalid");
    safeId(value.runId, "a101_service_probe_run_invalid");
    safeId(value.sampleId, "a101_service_probe_sample_invalid");
    if (seen.has(value.sampleId)) throw new A101BoundaryError("a101_service_probe_duplicate_sample");
    seen.add(value.sampleId);
    for (const key of ["providerIdDigest", "environmentDigest", "observerFamilyDigest", "providerReceiptSha256", "payloadSha256"]) hex64(value[key], `a101_service_probe_${key}_invalid`);
    if (typeof value.available !== "boolean" || typeof value.dataFloorMet !== "boolean") throw new A101BoundaryError("a101_service_probe_boolean_invalid");
    const requestedAtMs = isoMs(value.requestedAt, "a101_service_probe_requested_invalid");
    const observedAtMs = isoMs(value.observedAt, "a101_service_probe_observed_invalid");
    if (observedAtMs < requestedAtMs || observedAtMs > nowMs + MAX_CLOCK_SKEW_MS) throw new A101BoundaryError("a101_service_probe_timeline_invalid");
    const latency = finite(value.latencyMs, "a101_service_probe_latency_invalid", { min: 0, max: 60_000 });
    if (Math.abs(latency - (observedAtMs - requestedAtMs)) > 250) throw new A101BoundaryError("a101_service_probe_latency_mismatch");
    finite(value.freshnessSeconds, "a101_service_probe_freshness_invalid", { min: 0, max: 86_400 });
    if (value.available && !value.dataFloorMet) throw new A101BoundaryError("a101_service_probe_available_without_data_floor");
    if (expected) {
      if (value.runId !== expected.runId || value.sourceRevisionId !== expected.sourceRevisionId || value.environmentDigest !== expected.environmentDigest) throw new A101BoundaryError("a101_service_probe_binding_mismatch");
      if (value.providerIdDigest !== expected.alternateProviderIdDigest) throw new A101BoundaryError("a101_service_probe_provider_mismatch");
      if (value.observerFamilyDigest === expected.vendorControlPlaneDigest || value.observerFamilyDigest === expected.telemetryPlaneDigest) throw new A101BoundaryError("a101_service_probe_observer_not_independent");
    }
    return Object.freeze({ ...value, requestedAtMs, observedAtMs });
  });
  const available = rows.filter((row) => row.available && row.dataFloorMet);
  const availabilityPercent = (available.length / rows.length) * 100;
  const p95Ms = percentile(rows.map((row) => row.latencyMs), 95);
  const freshnessMaxSeconds = available.length ? Math.max(...available.map((row) => row.freshnessSeconds)) : Number.POSITIVE_INFINITY;
  if (availabilityPercent < SERVICE_AVAILABILITY_FLOOR_PERCENT) throw new A101BoundaryError("a101_service_probe_availability_floor_failed");
  if (p95Ms > SERVICE_P95_LIMIT_MS) throw new A101BoundaryError("a101_service_probe_p95_failed");
  if (!Number.isFinite(freshnessMaxSeconds) || freshnessMaxSeconds > SERVICE_FRESHNESS_LIMIT_SECONDS) throw new A101BoundaryError("a101_service_probe_freshness_failed");
  return Object.freeze({ rows: Object.freeze(rows), count: rows.length, available: available.length, availabilityPercent, p95Ms, freshnessMaxSeconds });
}

export function validateA101RestoreReceipt(value, expected) {
  exactKeys(value, [
    "schemaVersion", "operation", "runId", "sourceRevisionId", "sourceManifestSha256", "environmentDigest",
    "primaryIdentity", "alternateIdentity", "restoredAt", "primaryActive", "primaryTrafficPercent",
    "primaryCredentialActive", "cacheWarm", "alternateTrafficPercent", "serviceHealthy",
    "controlPlaneFamilyDigest", "observerFamilyDigest", "providerReceiptSha256",
  ], "a101_restore_fields_invalid");
  if (value.schemaVersion !== "velmere.a101.restore-receipt.v1" || value.operation !== "primary_restore") throw new A101BoundaryError("a101_restore_schema_invalid");
  safeId(value.runId, "a101_restore_run_invalid");
  for (const key of ["sourceManifestSha256", "environmentDigest", "controlPlaneFamilyDigest", "observerFamilyDigest", "providerReceiptSha256"]) hex64(value[key], `a101_restore_${key}_invalid`);
  isoMs(value.restoredAt, "a101_restore_time_invalid");
  finite(value.primaryTrafficPercent, "a101_restore_primary_traffic_invalid", { min: 0, max: 100 });
  finite(value.alternateTrafficPercent, "a101_restore_alternate_traffic_invalid", { min: 0, max: 100 });
  if (value.primaryActive !== true || value.primaryTrafficPercent !== 100 || value.primaryCredentialActive !== true || value.cacheWarm !== true || value.alternateTrafficPercent !== 0 || value.serviceHealthy !== true) throw new A101BoundaryError("a101_restore_state_invalid");
  if (value.controlPlaneFamilyDigest === value.observerFamilyDigest) throw new A101BoundaryError("a101_restore_observer_not_independent");
  const providerExpected = { sourceRevisionId: expected?.sourceRevisionId, sourceManifestSha256: expected?.sourceManifestSha256, environmentDigest: expected?.environmentDigest };
  const primary = validateProviderIdentity(value.primaryIdentity, providerExpected);
  const alternate = validateProviderIdentity(value.alternateIdentity, providerExpected);
  assertIndependentProviderPair(primary, alternate);
  if (expected) {
    if (value.runId !== expected.runId || value.sourceRevisionId !== expected.sourceRevisionId || value.sourceManifestSha256 !== expected.sourceManifestSha256 || value.environmentDigest !== expected.environmentDigest) throw new A101BoundaryError("a101_restore_binding_mismatch");
    if (value.controlPlaneFamilyDigest !== expected.vendorControlPlaneDigest) throw new A101BoundaryError("a101_restore_control_plane_mismatch");
    if (primary.providerId !== expected.primaryProviderId || alternate.providerId !== expected.alternateProviderId) throw new A101BoundaryError("a101_restore_provider_binding_mismatch");
    if (value.observerFamilyDigest === expected.telemetryPlaneDigest) throw new A101BoundaryError("a101_restore_observer_collides_with_telemetry");
  }
  return Object.freeze({ ...value, primaryIdentity: primary, alternateIdentity: alternate });
}

export async function executeA101SloVendorExitLifecycle({
  environment,
  runId,
  callbacks,
  dualControl,
  nowMs = Date.now(),
} = {}) {
  const env = validateA101Environment(environment);
  safeId(runId, "a101_lifecycle_run_id_invalid");
  const requiredCallbacks = ["slo", "primaryStatus", "alternateStatus", "beginVendorExit", "credentialProbe", "serviceProbes", "restorePrimary", "finalPrimaryStatus"];
  for (const name of requiredCallbacks) if (typeof callbacks?.[name] !== "function") throw new A101BoundaryError("a101_lifecycle_callback_missing", name);
  const expected = { runId, sourceRevisionId: env.sourceRevisionId, sourceManifestSha256: env.sourceManifestSha256, environmentDigest: env.environmentDigest, telemetryPlaneDigest: env.telemetryPlaneDigest, vendorControlPlaneDigest: env.vendorControlPlaneDigest };
  const journal = createA99Journal();
  const state = {
    mutationStarted: false,
    vendorExitCompleted: false,
    credentialRevocationVerified: false,
    alternateProbeSetVerified: false,
    primaryRestoreAttempted: false,
    primaryRestoreAttempts: 0,
    primaryRestoreSucceeded: false,
    finalBaselineVerified: false,
    failure: null,
  };
  let primary = null;
  let alternate = null;
  let exit;
  let failure = null;
  try {
    journal.append("preflight_started", { runIdHash: sha256Text(runId), environmentDigest: env.environmentDigest });
    const slo = validateA101SloReceipt(await callbacks.slo(), expected, nowMs);
    journal.append("slo_verified", { availabilityPercent: slo.calculatedAvailabilityPercent, errorBudgetConsumedPercent: slo.calculatedErrorBudgetConsumedPercent, p95Ms: slo.p95Ms, p99Ms: slo.p99Ms });
    primary = validateProviderIdentity(await callbacks.primaryStatus(), expected);
    alternate = validateProviderIdentity(await callbacks.alternateStatus(), expected);
    if (!['primary', 'normal'].includes(primary.mode)) throw new A101BoundaryError("a101_primary_baseline_invalid");
    if (!['alternate', 'standby'].includes(alternate.mode)) throw new A101BoundaryError("a101_alternate_baseline_invalid");
    assertIndependentProviderPair(primary, alternate);
    journal.append("provider_baseline_verified", { primaryProviderHash: sha256Text(primary.providerId), alternateProviderHash: sha256Text(alternate.providerId) });
    validateDualControl({ primary: dualControl?.primary, independent: dualControl?.independent, action: dualControl?.action, nowMs });
    journal.append("dual_control_verified", { actionDigest: dualControl.action.actionDigest ?? sha256Text(canonicalJson(dualControl.action)) });
    state.mutationStarted = true;
    exit = validateA101VendorExitReceipt(await callbacks.beginVendorExit({ primary, alternate }), expected);
    if (exit.primaryIdentity.providerId !== primary.providerId || exit.alternateIdentity.providerId !== alternate.providerId) throw new A101BoundaryError("a101_vendor_exit_provider_binding_mismatch");
    state.vendorExitCompleted = true;
    journal.append("vendor_exit_verified", { primaryProviderHash: sha256Text(primary.providerId), alternateProviderHash: sha256Text(alternate.providerId) });
    const credential = validateA101CredentialProbeReceipt(await callbacks.credentialProbe({ primary, alternate }), { ...expected, primaryCredentialDigest: primary.credentialDigest });
    state.credentialRevocationVerified = true;
    journal.append("primary_credential_rejection_verified", { status: credential.httpStatus });
    const probes = validateA101ServiceProbes(await callbacks.serviceProbes({ primary, alternate }), { ...expected, alternateProviderIdDigest: sha256Text(alternate.providerId) }, nowMs);
    state.alternateProbeSetVerified = true;
    journal.append("alternate_service_probes_verified", { count: probes.count, availabilityPercent: probes.availabilityPercent, p95Ms: probes.p95Ms, freshnessMaxSeconds: probes.freshnessMaxSeconds });
  } catch (error) {
    failure = error;
    state.failure = error instanceof A101BoundaryError ? error.code : "a101_lifecycle_error";
    try { journal.append("failure", { code: state.failure, postMutation: state.mutationStarted }); } catch {
      // The original lifecycle failure remains authoritative if the journal is already sealed.
    }
  }

  if (state.mutationStarted && primary && alternate) {
    state.primaryRestoreAttempted = true;
    for (let attempt = 1; attempt <= RESTORE_ATTEMPTS; attempt += 1) {
      state.primaryRestoreAttempts = attempt;
      try {
        const restore = validateA101RestoreReceipt(await callbacks.restorePrimary({ primary, alternate, attempt }), { ...expected, primaryProviderId: primary.providerId, alternateProviderId: alternate.providerId });
        state.primaryRestoreSucceeded = restore.primaryActive === true;
        journal.append("primary_restore_attempt", { attempt, succeeded: state.primaryRestoreSucceeded });
        if (state.primaryRestoreSucceeded) break;
      } catch (error) {
        journal.append("primary_restore_attempt", { attempt, succeeded: false, code: error instanceof A101BoundaryError ? error.code : "a101_restore_error" });
      }
    }
    if (state.primaryRestoreSucceeded) {
      try {
        const final = validateProviderIdentity(await callbacks.finalPrimaryStatus(), expected);
        state.finalBaselineVerified = final.providerId === primary.providerId && ["primary", "recovered", "normal"].includes(final.mode);
        journal.append("final_primary_baseline", { verified: state.finalBaselineVerified, providerHash: sha256Text(final.providerId) });
      } catch { state.finalBaselineVerified = false; }
    }
  }

  const snapshot = journal.snapshot();
  if (!state.mutationStarted && failure) {
    throw new A101BoundaryError("a101_preflight_failed_zero_mutation", state.failure, { decision: "ACTION_REQUIRED", state: Object.freeze({ ...state }), journal: snapshot });
  }
  if (state.mutationStarted && (!state.primaryRestoreSucceeded || !state.finalBaselineVerified)) {
    throw new A101BoundaryError("a101_recovery_required_primary_restore_unconfirmed", state.failure, { decision: "RECOVERY_REQUIRED", state: Object.freeze({ ...state }), journal: snapshot });
  }
  if (failure) {
    throw new A101BoundaryError("a101_lifecycle_failed_safe_baseline_restored", state.failure, { decision: "ACTION_REQUIRED_SAFE_BASELINE_RESTORED", state: Object.freeze({ ...state }), journal: snapshot });
  }
  journal.append("completed", { safeBaseline: true, stagingCredit: false });
  return Object.freeze({ status: "LOCAL_SLO_VENDOR_EXIT_VERIFIED_FIXTURE_ONLY", decision: "FIXTURE_PASS", state: Object.freeze({ ...state }), journal: journal.snapshot(), stagingCredit: false, live: false, saleEnabled: false });
}

export const A101_LIMITS = Object.freeze({
  SLO_TARGET_PERCENT, MIN_WINDOW_MS, MAX_WINDOW_MS, MAX_WINDOW_AGE_MS, MIN_SAMPLES, MAX_SAMPLES,
  P95_LIMIT_MS, P99_LIMIT_MS, FRESHNESS_LIMIT_SECONDS, VENDOR_EXIT_LIMIT_MS, MIN_SERVICE_PROBES,
  SERVICE_AVAILABILITY_FLOOR_PERCENT, SERVICE_P95_LIMIT_MS, SERVICE_FRESHNESS_LIMIT_SECONDS, RESTORE_ATTEMPTS,
});
