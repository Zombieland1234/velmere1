#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
if (!fixtureMode) {
  console.error("A53_RETIRED_BY_A54: real staging execution is disabled; use VELMERE_RUN_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.cmd");
  process.exit(1);
}
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a53-measured-slo-alert-ack-vendor-exit-acceptance.json"), "utf8"));
const outputDir = path.join(root, "artifacts/pass35/a53");
const outputJson = path.join(outputDir, "PASS35_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE.json");
const outputMd = path.join(outputDir, "PASS35_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE.md");
fs.mkdirSync(outputDir, { recursive: true });

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const shaText = (value) => sha256(Buffer.from(String(value), "utf8"));
const nowIso = () => new Date().toISOString();
const checks = [];
const addCheck = (id, ok, detail = null, status = ok ? "PASS" : "FAIL") => checks.push({ id, ok: Boolean(ok), status, detail });
const parseTime = (value) => { const time = Date.parse(String(value ?? "")); return Number.isFinite(time) ? time : null; };
const finiteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const percentile = (values, pct) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1);
  return sorted[index];
};

function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a53-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "a53_source_manifest_missing", digest: null, rows: 0 };
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const digest = crypto.createHash("sha256");
  for (const row of manifest.files ?? []) {
    const absolute = path.join(root, row.path);
    if (!fs.existsSync(absolute)) return { ok: false, reason: `source_file_missing:${row.path}`, digest: null, rows: manifest.files.length };
    const bytes = fs.readFileSync(absolute);
    const current = sha256(bytes);
    if (current !== row.sha256 || bytes.byteLength !== row.bytes) return { ok: false, reason: `source_hash_mismatch:${row.path}`, digest: null, rows: manifest.files.length };
    digest.update(row.path); digest.update("\0"); digest.update(current); digest.update("\0");
  }
  return { ok: true, reason: null, digest: digest.digest("hex"), rows: manifest.files.length };
}

function safeUrl(raw, kind) {
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: "invalid_url" }; }
  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (fixtureMode && local) return { ok: true, url, hostClass: `fixture_${kind}` };
  if (url.protocol !== "https:") return { ok: false, reason: "https_required" };
  if (local) return { ok: false, reason: "localhost_not_staging" };
  if (contract.stagingSafety.rejectHostnameTokens.some((token) => host.includes(token))) return { ok: false, reason: "production_like_hostname" };
  if (kind === "staging" && !contract.stagingSafety.requireHostnameHint.some((token) => host.includes(token))) return { ok: false, reason: "staging_hostname_hint_missing" };
  return { ok: true, url, hostClass: kind };
}

async function boundedJson(response, maximum = contract.budgets.maximumJsonBytes) {
  const type = String(response.headers.get("content-type") ?? "").toLowerCase();
  if (!type.includes("application/json")) throw new Error(`non_json_response:${type || "missing"}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("response_body_missing");
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) { await reader.cancel(); throw new Error("response_too_large"); }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
}

async function requestJson(target, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request_timeout")), contract.budgets.requestTimeoutMs);
  try {
    const response = await fetch(target, { ...options, redirect: "manual", cache: "no-store", signal: controller.signal });
    const json = await boundedJson(response);
    return { response, json };
  } finally { clearTimeout(timer); }
}

const bearer = (secret, extra = {}) => ({ authorization: `Bearer ${secret}`, accept: "application/json", "content-type": "application/json", ...extra });

async function main() {
  const startedAt = nowIso();
  const sourceBefore = verifySourceManifest();
  addCheck("source-fingerprint-before", sourceBefore.ok, { rows: sourceBefore.rows, digest: sourceBefore.digest, reason: sourceBefore.reason });

  if (fixtureMode) addCheck("precondition-a52-verified", true, { fixture: true }, "FIXTURE_PASS");
  else {
    const receipt = path.join(root, "artifacts/pass35/a52/PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE.json");
    const decision = fs.existsSync(receipt) ? JSON.parse(fs.readFileSync(receipt, "utf8")).decision : null;
    addCheck("precondition-a52-verified", decision === contract.requiredA52Decision, { decision, required: contract.requiredA52Decision });
  }

  const npmObserved = currentNpmVersion();
  addCheck("runtime-exact", fixtureMode || (process.versions.node === contract.runtime.node && npmObserved === contract.runtime.npm), { node: process.versions.node, npm: npmObserved, expected: contract.runtime, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);
  const confirmation = process.env.VELMERE_A53_CONFIRM ?? "";
  addCheck("confirmation-token", fixtureMode || confirmation === contract.confirmationToken, { present: Boolean(confirmation), fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const urlNames = [
    ["staging", "VELMERE_A53_STAGING_BASE_URL"], ["slo_query", "VELMERE_A53_SLO_QUERY_URL"],
    ["alert_trigger", "VELMERE_A53_ALERT_TRIGGER_URL"], ["alert_status", "VELMERE_A53_ALERT_STATUS_URL"],
    ["oncall_ack", "VELMERE_A53_ONCALL_ACK_URL"], ["vendor_control", "VELMERE_A53_VENDOR_CONTROL_URL"],
    ["vendor_status", "VELMERE_A53_VENDOR_STATUS_URL"], ["service_probe", "VELMERE_A53_SERVICE_PROBE_URL"]
  ];
  const urls = {};
  const urlFailures = [];
  for (const [kind, name] of urlNames) {
    const result = safeUrl(process.env[name] ?? "", kind === "staging" ? "staging" : "bridge");
    if (result.ok) urls[kind] = result.url; else urlFailures.push({ name, reason: result.reason });
  }
  addCheck("staging-url-safety", Boolean(urls.staging), urls.staging ? { originSha256: shaText(urls.staging.origin) } : { failures: urlFailures.filter((row) => row.name === "VELMERE_A53_STAGING_BASE_URL") });
  addCheck("bridge-url-safety", urlFailures.length === 0, { failures: urlFailures });

  const telemetrySecret = process.env.VELMERE_A53_TELEMETRY_BEARER_SECRET ?? "";
  const alertSecret = process.env.VELMERE_A53_ALERT_BEARER_SECRET ?? "";
  const vendorSecret = process.env.VELMERE_A53_VENDOR_BEARER_SECRET ?? "";
  const projectClass = process.env.VELMERE_A53_PROJECT_CLASS ?? "";
  const secretsOk = [telemetrySecret, alertSecret, vendorSecret].every((value) => value.length >= contract.bridgeSafety.minimumSecretLength) && projectClass === contract.bridgeSafety.projectClass;
  addCheck("secret-boundary", fixtureMode || secretsOk, { telemetrySecretPresent: Boolean(telemetrySecret), alertSecretPresent: Boolean(alertSecret), vendorSecretPresent: Boolean(vendorSecret), projectClass, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  if (urlFailures.length || (!fixtureMode && !secretsOk)) throw new Error("a53_preflight_failed");

  const telemetry = await requestJson(urls.slo_query, { headers: bearer(telemetrySecret) });
  const windowStart = parseTime(telemetry.json?.windowStart);
  const windowEnd = parseTime(telemetry.json?.windowEnd);
  const windowSeconds = windowStart !== null && windowEnd !== null ? (windowEnd - windowStart) / 1000 : null;
  const sampleCount = Number(telemetry.json?.sampleCount);
  const successCount = Number(telemetry.json?.successCount);
  const availabilityComputed = sampleCount > 0 && Number.isFinite(successCount) ? (successCount / sampleCount) * 100 : null;
  const availabilityReported = Number(telemetry.json?.availabilityPct);
  addCheck("slo-window-bounded", telemetry.response.status === 200 && windowSeconds !== null && windowSeconds >= contract.budgets.minimumWindowSeconds && windowEnd <= Date.now() + 120000 && contract.telemetrySafety.allowedWindowClasses.includes(telemetry.json?.windowClass), { status: telemetry.response.status, windowSeconds, minimum: contract.budgets.minimumWindowSeconds, windowClass: telemetry.json?.windowClass });
  addCheck("slo-minimum-samples", Number.isInteger(sampleCount) && sampleCount >= contract.budgets.minimumSamples && Number.isInteger(successCount) && successCount >= 0 && successCount <= sampleCount, { sampleCount, successCount, minimum: contract.budgets.minimumSamples });
  const availabilityConsistent = availabilityComputed !== null && finiteNumber(availabilityReported) && Math.abs(availabilityComputed - availabilityReported) <= 0.05;
  addCheck("slo-availability-target", availabilityConsistent && availabilityReported >= contract.budgets.availabilityTargetPct, { availabilityPct: availabilityReported, computedPct: availabilityComputed, target: contract.budgets.availabilityTargetPct });
  addCheck("slo-p95-target", finiteNumber(telemetry.json?.p95Ms) && telemetry.json.p95Ms <= contract.budgets.p95MaximumMs, { p95Ms: telemetry.json?.p95Ms, maximum: contract.budgets.p95MaximumMs });
  addCheck("slo-p99-target", finiteNumber(telemetry.json?.p99Ms) && telemetry.json.p99Ms <= contract.budgets.p99MaximumMs, { p99Ms: telemetry.json?.p99Ms, maximum: contract.budgets.p99MaximumMs });
  addCheck("error-budget-within-limit", finiteNumber(telemetry.json?.errorBudgetConsumedPct) && telemetry.json.errorBudgetConsumedPct >= 0 && telemetry.json.errorBudgetConsumedPct <= contract.budgets.maximumErrorBudgetConsumedPct, { consumedPct: telemetry.json?.errorBudgetConsumedPct, maximum: contract.budgets.maximumErrorBudgetConsumedPct });
  addCheck("telemetry-source-bound", typeof telemetry.json?.telemetrySource === "string" && telemetry.json.telemetrySource.length >= 3 && telemetry.json?.sourceRevisionId === contract.parentRevisionId && telemetry.json?.fixture === false, { telemetrySourceDigest: telemetry.json?.telemetrySource ? shaText(telemetry.json.telemetrySource) : null, sourceRevisionMatched: telemetry.json?.sourceRevisionId === contract.parentRevisionId, fixture: telemetry.json?.fixture });

  const baseline = await requestJson(urls.vendor_status, { headers: bearer(vendorSecret) });
  const primaryProviderId = typeof baseline.json?.primaryProviderId === "string" ? baseline.json.primaryProviderId : null;
  const baselineActiveProviderId = typeof baseline.json?.activeProviderId === "string" ? baseline.json.activeProviderId : null;
  addCheck("baseline-provider-healthy", baseline.response.status === 200 && baseline.json?.healthy === true && Boolean(primaryProviderId) && baselineActiveProviderId === primaryProviderId && baseline.json?.primaryCredentialActive === true && Number(baseline.json?.primaryTrafficSharePct) > 0, { status: baseline.response.status, healthy: baseline.json?.healthy, activeMatchesPrimary: baselineActiveProviderId === primaryProviderId, credentialActive: baseline.json?.primaryCredentialActive, trafficSharePct: baseline.json?.primaryTrafficSharePct });

  const nonce = crypto.randomBytes(16).toString("hex");
  const nonceHash = shaText(nonce);
  const alert = await requestJson(urls.alert_trigger, { method: "POST", headers: bearer(alertSecret), body: JSON.stringify({ sourceRevisionId: contract.parentRevisionId, severity: "SEV2", kind: "vendor_exit_staging_drill", nonceHash }) });
  const alertId = typeof alert.json?.alertId === "string" ? alert.json.alertId : null;
  const triggeredAt = parseTime(alert.json?.triggeredAt);
  addCheck("alert-triggered", [200, 201, 202].includes(alert.response.status) && alert.json?.triggered === true && Boolean(alertId && triggeredAt) && alert.json?.nonceHash === nonceHash, { status: alert.response.status, triggered: alert.json?.triggered, alertDigest: alertId ? shaText(alertId) : null, nonceMatched: alert.json?.nonceHash === nonceHash });

  const alertStatus = await requestJson(urls.alert_status, { method: "POST", headers: bearer(alertSecret), body: JSON.stringify({ alertId, nonceHash }) });
  const deliveredAt = parseTime(alertStatus.json?.deliveredAt);
  const deliverySeconds = triggeredAt !== null && deliveredAt !== null ? Math.max(0, (deliveredAt - triggeredAt) / 1000) : null;
  addCheck("alert-delivered", [200, 202].includes(alertStatus.response.status) && alertStatus.json?.delivered === true && Boolean(deliveredAt), { status: alertStatus.response.status, delivered: alertStatus.json?.delivered, providerDigest: alertStatus.json?.provider ? shaText(alertStatus.json.provider) : null });
  addCheck("alert-delivery-sla-met", deliverySeconds !== null && deliverySeconds <= contract.budgets.alertDeliverySlaSeconds, { deliverySeconds, maximum: contract.budgets.alertDeliverySlaSeconds });

  const ack = await requestJson(urls.oncall_ack, { method: "POST", headers: bearer(alertSecret), body: JSON.stringify({ alertId, nonceHash }) });
  const acknowledgedAt = parseTime(ack.json?.acknowledgedAt);
  const ackSeconds = deliveredAt !== null && acknowledgedAt !== null ? Math.max(0, (acknowledgedAt - deliveredAt) / 1000) : null;
  addCheck("oncall-acknowledged", [200, 201, 202].includes(ack.response.status) && ack.json?.acknowledged === true && Boolean(acknowledgedAt) && ack.json?.actorRole === "oncall", { status: ack.response.status, acknowledged: ack.json?.acknowledged, actorRole: ack.json?.actorRole });
  addCheck("acknowledgement-sla-met", ackSeconds !== null && ackSeconds <= contract.budgets.acknowledgementSlaSeconds, { acknowledgementSeconds: ackSeconds, maximum: contract.budgets.acknowledgementSlaSeconds });

  const exitRequested = await requestJson(urls.vendor_control, { method: "POST", headers: bearer(vendorSecret), body: JSON.stringify({ operation: "begin_vendor_exit", sourceRevisionId: contract.parentRevisionId, nonceHash }) });
  const exitRequestedAt = parseTime(exitRequested.json?.requestedAt);
  addCheck("vendor-exit-requested", [200, 202].includes(exitRequested.response.status) && exitRequested.json?.accepted === true && Boolean(exitRequestedAt) && exitRequested.json?.nonceHash === nonceHash, { status: exitRequested.response.status, accepted: exitRequested.json?.accepted, nonceMatched: exitRequested.json?.nonceHash === nonceHash });

  const exited = await requestJson(urls.vendor_status, { headers: bearer(vendorSecret) });
  const changedAt = parseTime(exited.json?.changedAt);
  const exitSeconds = exitRequestedAt !== null && changedAt !== null ? Math.max(0, (changedAt - exitRequestedAt) / 1000) : null;
  const alternateProviderId = typeof exited.json?.activeProviderId === "string" ? exited.json.activeProviderId : null;
  addCheck("primary-traffic-zero", exited.response.status === 200 && Number(exited.json?.primaryTrafficSharePct) === 0, { status: exited.response.status, primaryTrafficSharePct: exited.json?.primaryTrafficSharePct });
  addCheck("primary-credential-revoked", exited.json?.primaryCredentialActive === false && exited.json?.cachePurged === true, { primaryCredentialActive: exited.json?.primaryCredentialActive, cachePurged: exited.json?.cachePurged });
  addCheck("alternate-provider-active", exited.json?.alternateProviderActive === true && Boolean(alternateProviderId) && alternateProviderId !== primaryProviderId && contract.telemetrySafety.allowedExitStates.includes(exited.json?.state), { alternateProviderActive: exited.json?.alternateProviderActive, alternateDiffers: alternateProviderId !== primaryProviderId, state: exited.json?.state });
  addCheck("vendor-exit-sla-met", exitSeconds !== null && exitSeconds <= contract.budgets.vendorExitSlaSeconds, { exitSeconds, maximum: contract.budgets.vendorExitSlaSeconds });

  const probes = [];
  for (let index = 0; index < contract.budgets.minimumServiceProbes; index += 1) {
    const probe = await requestJson(urls.service_probe, { headers: bearer(vendorSecret, { "x-velmere-probe-index": String(index) }) });
    probes.push({ status: probe.response.status, available: probe.json?.available === true, activeProviderMatches: probe.json?.activeProviderId === alternateProviderId, latencyMs: Number(probe.json?.latencyMs), freshnessSeconds: Number(probe.json?.freshnessSeconds), dataFloorMet: probe.json?.dataFloorMet === true });
  }
  const successfulProbes = probes.filter((row) => row.status === 200 && row.available && row.activeProviderMatches && row.dataFloorMet);
  const serviceAvailabilityPct = (successfulProbes.length / probes.length) * 100;
  const probeP95 = percentile(probes.map((row) => row.latencyMs).filter(Number.isFinite), 95);
  const freshnessMax = Math.max(...probes.map((row) => row.freshnessSeconds).filter(Number.isFinite));
  addCheck("service-probes-complete", probes.length >= contract.budgets.minimumServiceProbes && probes.every((row) => finiteNumber(row.latencyMs) && finiteNumber(row.freshnessSeconds)), { probes: probes.length, minimum: contract.budgets.minimumServiceProbes });
  addCheck("service-availability-floor", serviceAvailabilityPct >= contract.budgets.serviceAvailabilityFloorPct, { serviceAvailabilityPct, successfulProbes: successfulProbes.length, probes: probes.length, floor: contract.budgets.serviceAvailabilityFloorPct });
  addCheck("service-latency-floor", probeP95 !== null && probeP95 <= contract.budgets.serviceP95MaximumMs, { p95Ms: probeP95, maximum: contract.budgets.serviceP95MaximumMs });
  addCheck("service-freshness-floor", Number.isFinite(freshnessMax) && freshnessMax <= contract.budgets.serviceFreshnessMaximumSeconds, { maximumObservedSeconds: freshnessMax, maximum: contract.budgets.serviceFreshnessMaximumSeconds });

  const restore = await requestJson(urls.vendor_control, { method: "POST", headers: bearer(vendorSecret), body: JSON.stringify({ operation: "restore_primary", sourceRevisionId: contract.parentRevisionId, nonceHash }) });
  const restored = await requestJson(urls.vendor_status, { headers: bearer(vendorSecret) });
  addCheck("vendor-restored", [200, 202].includes(restore.response.status) && restore.json?.restored === true && restored.json?.activeProviderId === primaryProviderId && restored.json?.primaryCredentialActive === true && Number(restored.json?.primaryTrafficSharePct) > 0 && contract.telemetrySafety.allowedRestoreStates.includes(restored.json?.state), { controlStatus: restore.response.status, restored: restore.json?.restored, activeMatchesPrimary: restored.json?.activeProviderId === primaryProviderId, credentialActive: restored.json?.primaryCredentialActive, state: restored.json?.state });
  addCheck("postcondition-healthy", restored.response.status === 200 && restored.json?.healthy === true && contract.telemetrySafety.allowedHealthStates.includes(restored.json?.health), { status: restored.response.status, healthy: restored.json?.healthy, health: restored.json?.health });

  const sourceAfter = verifySourceManifest();
  addCheck("source-fingerprint-unchanged", sourceBefore.ok && sourceAfter.ok && sourceBefore.digest === sourceAfter.digest, { before: sourceBefore.digest, after: sourceAfter.digest, rows: sourceAfter.rows, reason: sourceAfter.reason });

  const secretNeedles = [telemetrySecret, alertSecret, vendorSecret, alertId, primaryProviderId, alternateProviderId].filter(Boolean);
  const preliminary = JSON.stringify({ checks, nonceHash, sourceBefore, sourceAfter });
  addCheck("evidence-redaction", secretNeedles.every((value) => !preliminary.includes(value)), { leakedValues: secretNeedles.filter((value) => preliminary.includes(value)).length });

  const failures = checks.filter((row) => !row.ok);
  const decision = fixtureMode ? (failures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : failures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT";
  const report = {
    schemaVersion: "velmere.pass35.a53.measured-slo-alert-ack-vendor-exit-receipt.v1",
    revisionId: contract.revisionId, parentRevisionId: contract.parentRevisionId,
    generatedAt: nowIso(), startedAt, completedAt: nowIso(), fixtureMode, decision, status: decision,
    truthBoundary: contract.truthBoundary,
    stagingSloWindowProven: !fixtureMode && failures.length === 0,
    stagingAlertAckTelemetryProven: !fixtureMode && failures.length === 0,
    stagingVendorExitProven: !fixtureMode && failures.length === 0,
    productionSloProven: false, contractualSlaProven: false, productionVendorExitProven: false,
    continuousMonitoringProven: false, liveProven: false, saleEnabled: false,
    sourceFingerprint: { before: sourceBefore.digest, after: sourceAfter.digest, rows: sourceAfter.rows },
    slo: { windowSeconds, sampleCount, availabilityPct: availabilityReported, p95Ms: telemetry.json?.p95Ms, p99Ms: telemetry.json?.p99Ms, errorBudgetConsumedPct: telemetry.json?.errorBudgetConsumedPct },
    alert: { alertIdDigest: alertId ? shaText(alertId) : null, deliverySeconds, acknowledgementSeconds: ackSeconds },
    vendorExit: { primaryProviderDigest: primaryProviderId ? shaText(primaryProviderId) : null, alternateProviderDigest: alternateProviderId ? shaText(alternateProviderId) : null, exitSeconds, probeCount: probes.length, serviceAvailabilityPct, serviceP95Ms: probeP95, freshnessMaximumSeconds: freshnessMax },
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, failures, checks
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (secretNeedles.some((value) => serialized.includes(value))) throw new Error("evidence_secret_leak_detected");
  fs.writeFileSync(outputJson, serialized);
  fs.writeFileSync(outputMd, `# PASS35 A53 — measured SLO, alert/ACK telemetry and vendor exit\n\nDecision: **${decision}**\n\n- Checks: ${checks.length}\n- Passed: ${checks.length - failures.length}\n- Failed: ${failures.length}\n- Fixture mode: ${fixtureMode}\n- Production SLO proven: false\n- Contractual SLA proven: false\n- Production vendor exit proven: false\n- Sale enabled: false\n\n${failures.length ? "## Failures\n\n" + failures.map((row) => `- ${row.id}: ${JSON.stringify(row.detail)}`).join("\n") : "All declared A53 checks passed."}\n`);
  console.log(JSON.stringify({ decision, summary: report.summary, output: path.relative(root, outputJson).replaceAll("\\", "/") }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  const report = { schemaVersion: "velmere.pass35.a53.error.v1", revisionId: contract.revisionId, generatedAt: nowIso(), decision: fixtureMode ? "FIXTURE_FAIL" : "ACTION_REQUIRED", error: error instanceof Error ? error.message : String(error), productionSloProven: false, contractualSlaProven: false, productionVendorExitProven: false, liveProven: false, saleEnabled: false };
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
});
