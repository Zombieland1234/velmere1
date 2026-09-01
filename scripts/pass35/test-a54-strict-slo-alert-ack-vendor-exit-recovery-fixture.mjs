#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.json"), "utf8"));
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const sha = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const secrets = {
  telemetry: "a54-telemetry-secret-abcdefghijklmnopqrstuvwxyz",
  alertTrigger: "a54-alert-trigger-secret-abcdefghijklmnopqrstu",
  alertObserver: "a54-alert-observer-secret-abcdefghijklmnopqrs",
  ackActor: "a54-ack-actor-secret-abcdefghijklmnopqrstuvwxyz",
  vendorControl: "a54-vendor-control-secret-abcdefghijklmnopqrs",
  vendorObserver: "a54-vendor-observer-secret-abcdefghijklmnopq",
  serviceProbe: "a54-service-probe-secret-abcdefghijklmnopqrst",
  primaryCredential: "a54-primary-credential-secret-abcdefghijklmn"
};
const primary = {
  providerId: "provider-primary-a54",
  vendorFamily: "vendor-primary-family",
  accountDigest: "account-primary-digest",
  region: "eu-central-primary",
  failureDomainDigest: "failure-primary-digest",
  controlPlaneDigest: "control-primary-digest"
};
const alternate = {
  providerId: "provider-alternate-a54",
  vendorFamily: "vendor-alternate-family",
  accountDigest: "account-alternate-digest",
  region: "eu-west-alternate",
  failureDomainDigest: "failure-alternate-digest",
  controlPlaneDigest: "control-alternate-digest"
};

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function token(req) { return String(req.headers.authorization ?? "").replace(/^Bearer\s+/iu, ""); }
function bindingFromHeaders(req) {
  return {
    runId: String(req.headers["x-velmere-run-id"] ?? ""),
    currentRevisionId: String(req.headers["x-velmere-revision-id"] ?? ""),
    parentRevisionId: String(req.headers["x-velmere-parent-revision-id"] ?? ""),
    sourceFingerprint: String(req.headers["x-velmere-source-fingerprint"] ?? ""),
    nonceHash: String(req.headers["x-velmere-nonce-hash"] ?? ""),
    stepId: String(req.headers["x-velmere-step-id"] ?? ""),
    previousStepDigest: String(req.headers["x-velmere-previous-step-digest"] ?? "")
  };
}
function maybeBadBinding(binding, options, key) {
  return options[key] ? { ...binding, runId: "wrong-run-id" } : binding;
}

function createServer(options = {}) {
  const state = {
    requests: 0,
    exited: false,
    restored: false,
    restoreCalls: 0,
    exitRequestedAt: null,
    triggeredAt: null,
    deliveredAt: null,
    alertId: "alert-a54-fixture"
  };
  const server = http.createServer(async (req, res) => {
    state.requests += 1;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method ?? "GET";
    try {
      if (url.pathname === "/slo/query" && method === "GET") {
        if (token(req) !== secrets.telemetry) return json(res, 401, { error: "unauthorized" });
        const binding = bindingFromHeaders(req);
        const now = Date.now();
        const end = options.staleWindow ? now - 3_600_000 : options.futureWindow ? now + 3_600_000 : now - 500;
        const duration = options.shortWindow ? 300_000 : options.longWindow ? 3_600_000 : 1_200_000;
        const sampleCount = options.lowSamples ? 12 : 100;
        const successCount = options.lowAvailability ? 95 : 100;
        const errorCount = options.countMismatch ? 999 : sampleCount - successCount;
        const p50 = options.negativeLatency ? -1 : 180;
        const p95 = options.percentileOrder ? 1500 : options.highP95 ? 2500 : 700;
        const p99 = options.percentileOrder ? 1000 : options.highP99 ? 5000 : 1200;
        return json(res, 200, {
          binding: maybeBadBinding(binding, options, "telemetryBindingMismatch"),
          windowStart: new Date(end - duration).toISOString(),
          windowEnd: new Date(end).toISOString(),
          windowClass: "bounded_staging",
          sampleCount,
          successCount,
          errorCount,
          availabilityPct: options.availabilityMismatch ? 50 : (successCount / sampleCount) * 100,
          p50Ms: options.nullMetrics ? null : p50,
          p95Ms: options.nullMetrics ? null : p95,
          p99Ms: options.nullMetrics ? null : p99,
          errorBudgetConsumedPct: options.errorBudgetHigh ? 140 : options.negativeErrorBudget ? -1 : 20,
          telemetrySource: "fixture-observability",
          sourceRevisionId: options.sourceRevisionMismatch ? contract.parentRevisionId : contract.revisionId,
          fixture: false
        });
      }
      if (url.pathname === "/vendor/observer" && method === "GET") {
        if (token(req) !== secrets.vendorObserver) return json(res, 401, { error: "unauthorized" });
        const binding = bindingFromHeaders(req);
        if (state.exited) {
          const identity = {
            ...alternate,
            vendorFamily: options.sameVendorFamily ? primary.vendorFamily : alternate.vendorFamily,
            accountDigest: options.sameAccount ? primary.accountDigest : alternate.accountDigest,
            failureDomainDigest: options.sameFailureDomain ? primary.failureDomainDigest : alternate.failureDomainDigest,
            controlPlaneDigest: options.sameControlPlane ? primary.controlPlaneDigest : alternate.controlPlaneDigest
          };
          const changedBase = state.exitRequestedAt ?? Date.now();
          const changedAt = options.reversedExitTime ? changedBase - 10_000 : options.futureExitTime ? Date.now() + 3_600_000 : options.exitSlow ? changedBase + 300_000 : Date.now();
          return json(res, 200, {
            binding: maybeBadBinding(binding, options, "vendorBindingMismatch"),
            healthy: true,
            health: "healthy",
            state: options.alternateInactive ? "primary_disabled" : "alternate_active",
            providerIdentity: options.alternateInactive ? primary : identity,
            primaryCredentialActive: options.credentialNotRevoked ? true : false,
            primaryTrafficSharePct: options.nullTraffic ? null : options.exitIneffective ? 100 : 0,
            cachePurged: !options.cacheNotPurged,
            alternateProviderActive: !options.alternateInactive,
            changedAt: new Date(changedAt).toISOString()
          });
        }
        return json(res, 200, {
          binding,
          healthy: true,
          health: "healthy",
          state: "primary_active",
          providerIdentity: primary,
          primaryCredentialActive: true,
          primaryTrafficSharePct: 100,
          cachePurged: true,
          alternateProviderActive: false,
          changedAt: new Date().toISOString()
        });
      }
      if (url.pathname === "/alerts/trigger" && method === "POST") {
        if (token(req) !== secrets.alertTrigger) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        state.triggeredAt = Date.now();
        return json(res, 202, {
          binding: maybeBadBinding(body.binding, options, "triggerBindingMismatch"),
          triggered: true,
          alertId: state.alertId,
          triggeredAt: new Date(options.futureTrigger ? Date.now() + 3_600_000 : state.triggeredAt).toISOString()
        });
      }
      if (url.pathname === "/alerts/observer" && method === "POST") {
        if (token(req) !== secrets.alertObserver) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        const deliveredAt = options.reversedAlertTime ? (state.triggeredAt ?? Date.now()) - 10_000 : options.futureAlert ? Date.now() + 3_600_000 : options.lateAlert ? (state.triggeredAt ?? Date.now()) + 120_000 : Date.now();
        state.deliveredAt = deliveredAt;
        return json(res, 200, {
          binding: maybeBadBinding(body.binding, options, "observerBindingMismatch"),
          delivered: !options.alertMissing,
          deliveredAt: new Date(deliveredAt).toISOString(),
          alertIdDigest: options.alertIdMismatch ? sha("wrong-alert") : body.alertIdDigest,
          observerFamily: "independent-fixture-observer"
        });
      }
      if (url.pathname === "/oncall/ack" && method === "POST") {
        if (token(req) !== secrets.ackActor) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        const ackAt = options.reversedAckTime ? (state.deliveredAt ?? Date.now()) - 10_000 : options.futureAck ? Date.now() + 3_600_000 : options.lateAck ? (state.deliveredAt ?? Date.now()) + 700_000 : Date.now();
        return json(res, 202, {
          binding: maybeBadBinding(body.binding, options, "ackBindingMismatch"),
          acknowledged: !options.ackMissing,
          acknowledgedAt: new Date(ackAt).toISOString(),
          alertIdDigest: options.ackAlertMismatch ? sha("wrong-alert") : body.alertIdDigest,
          actorRole: options.wrongActorRole ? "observer" : "oncall",
          actorDigest: "fixture-oncall-actor-digest"
        });
      }
      if (url.pathname === "/vendor/control" && method === "POST") {
        if (token(req) !== secrets.vendorControl) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        if (body.operation === "begin_vendor_exit") {
          state.exitRequestedAt = Date.now();
          if (!options.exitIneffective) state.exited = true;
          return json(res, 202, {
            binding: maybeBadBinding(body.binding, options, "exitRequestBindingMismatch"),
            accepted: true,
            requestedAt: new Date(options.futureExitRequest ? Date.now() + 3_600_000 : state.exitRequestedAt).toISOString()
          });
        }
        if (body.operation === "restore_primary") {
          state.restoreCalls += 1;
          if (!options.restoreBroken) {
            state.exited = false;
            state.restored = true;
          }
          return json(res, 202, { binding: body.binding, restored: !options.restoreBroken });
        }
      }
      if (url.pathname === "/credential/probe" && method === "GET") {
        const binding = bindingFromHeaders(req);
        if (token(req) !== secrets.primaryCredential) return json(res, 401, { binding, credentialAccepted: false });
        if (options.credentialStillWorks) return json(res, 200, { binding, credentialAccepted: true });
        return json(res, 401, { binding, credentialAccepted: false });
      }
      if (url.pathname === "/service/probe" && method === "GET") {
        if (token(req) !== secrets.serviceProbe) return json(res, 401, { error: "unauthorized" });
        const index = Number(req.headers["x-velmere-probe-index"] ?? 0);
        if (options.transportFailureAfterExit && index === 1) {
          req.socket.destroy();
          return;
        }
        const binding = bindingFromHeaders(req);
        const identity = options.probeWrongProvider ? primary : alternate;
        return json(res, 200, {
          binding: maybeBadBinding(binding, options, "probeBindingMismatch"),
          available: !(options.probeUnavailable && index < 2),
          providerIdentity: identity,
          latencyMs: options.probeNullMetrics ? null : options.probeNegative ? -1 : options.probeLatencyHigh ? 3500 : 350 + index * 10,
          freshnessSeconds: options.probeNullMetrics ? null : options.probeNegative ? -1 : options.probeStale ? 500 : 15 + index,
          dataFloorMet: !options.probeDataFloorMissing,
          observedAt: new Date(options.probeFuture ? Date.now() + 3_600_000 : Date.now()).toISOString(),
          sampleId: options.duplicateSampleId ? "same-sample" : `sample-${index}`,
          payloadDigest: options.badPayloadDigest ? "bad" : sha(`payload-${index}`)
        });
      }
      return json(res, 404, { error: "not_found" });
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
  return { server, state };
}

async function runScenario(name, options, expectedPass, expectedFailureId = null, assertions = {}) {
  const { server, state } = createServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    VELMERE_A54_STAGING_BASE_URL: base,
    VELMERE_A54_SLO_QUERY_URL: `${base}/slo/query`,
    VELMERE_A54_ALERT_TRIGGER_URL: `${base}/alerts/trigger`,
    VELMERE_A54_ALERT_OBSERVER_URL: `${base}/alerts/observer`,
    VELMERE_A54_ONCALL_ACK_URL: `${base}/oncall/ack`,
    VELMERE_A54_VENDOR_CONTROL_URL: `${base}/vendor/control`,
    VELMERE_A54_VENDOR_OBSERVER_URL: `${base}/vendor/observer`,
    VELMERE_A54_SERVICE_PROBE_URL: `${base}/service/probe`,
    VELMERE_A54_PRIMARY_CREDENTIAL_PROBE_URL: `${base}/credential/probe`,
    VELMERE_A54_TELEMETRY_BEARER_SECRET: secrets.telemetry,
    VELMERE_A54_ALERT_TRIGGER_BEARER_SECRET: secrets.alertTrigger,
    VELMERE_A54_ALERT_OBSERVER_BEARER_SECRET: secrets.alertObserver,
    VELMERE_A54_ACK_ACTOR_BEARER_SECRET: secrets.ackActor,
    VELMERE_A54_VENDOR_CONTROL_BEARER_SECRET: secrets.vendorControl,
    VELMERE_A54_VENDOR_OBSERVER_BEARER_SECRET: secrets.vendorObserver,
    VELMERE_A54_SERVICE_PROBE_BEARER_SECRET: secrets.serviceProbe,
    VELMERE_A54_PRIMARY_CREDENTIAL_SECRET: secrets.primaryCredential,
    VELMERE_A54_PROJECT_CLASS: "disposable_staging",
    VELMERE_A54_CONFIRM: options.badConfirmation ? "wrong" : contract.confirmationToken
  };
  if (options.duplicateSecrets) env.VELMERE_A54_ALERT_OBSERVER_BEARER_SECRET = secrets.alertTrigger;
  const child = spawn(process.execPath, ["scripts/a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.mjs", "--fixture"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const status = await new Promise((resolve) => child.on("close", resolve));
  await new Promise((resolve) => server.close(resolve));
  const reportPath = path.join(root, "artifacts/pass35/a54/PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.json");
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  check(`${name}:exit`, expectedPass ? status === 0 : status !== 0, { status, stdout: stdout.trim(), stderr: stderr.trim() });
  check(`${name}:decision`, report.decision === (expectedPass ? "FIXTURE_PASS" : "FIXTURE_FAIL"), { decision: report.decision, fatalError: report.fatalError });
  check(`${name}:truth`, report.productionSloProven === false && report.contractualSlaProven === false && report.productionVendorExitProven === false && report.independentAssuranceProven === false && report.saleEnabled === false, report);
  if (!expectedPass && expectedFailureId) check(`${name}:failure`, report.failures?.some((row) => row.id === expectedFailureId) || String(report.fatalError ?? "").includes(expectedFailureId), { failureIds: report.failures?.map((row) => row.id), fatalError: report.fatalError });
  if (assertions.noRequests) check(`${name}:no_requests`, state.requests === 0, { requests: state.requests });
  if (assertions.restoreAttempted) check(`${name}:restore_attempted`, state.restoreCalls > 0, { restoreCalls: state.restoreCalls, restored: state.restored, recovery: report.recovery });
  if (assertions.restored) check(`${name}:restored`, state.restored === true && report.recovery?.restorationSucceeded === true, { state, recovery: report.recovery });
}

await runScenario("clean", {}, true);
await runScenario("bad_confirmation_preflight", { badConfirmation: true }, false, "confirmation-token", { noRequests: true });
await runScenario("duplicate_secrets_preflight", { duplicateSecrets: true }, false, "secret-boundary", { noRequests: true });
await runScenario("short_window", { shortWindow: true }, false, "slo-window-current-and-bounded");
await runScenario("long_window", { longWindow: true }, false, "slo-window-current-and-bounded");
await runScenario("stale_window", { staleWindow: true }, false, "slo-window-current-and-bounded");
await runScenario("future_window", { futureWindow: true }, false, "slo-window-current-and-bounded");
await runScenario("low_samples", { lowSamples: true }, false, "slo-count-algebra-valid");
await runScenario("count_mismatch", { countMismatch: true }, false, "slo-count-algebra-valid");
await runScenario("availability_mismatch", { availabilityMismatch: true }, false, "slo-availability-consistent");
await runScenario("low_availability", { lowAvailability: true }, false, "slo-availability-target");
await runScenario("negative_latency", { negativeLatency: true }, false, "slo-percentiles-valid");
await runScenario("null_metrics", { nullMetrics: true }, false, "slo-percentiles-valid");
await runScenario("percentile_order", { percentileOrder: true }, false, "slo-percentiles-valid");
await runScenario("high_p95", { highP95: true }, false, "slo-p95-target");
await runScenario("high_p99", { highP99: true }, false, "slo-p99-target");
await runScenario("negative_error_budget", { negativeErrorBudget: true }, false, "error-budget-within-limit");
await runScenario("high_error_budget", { errorBudgetHigh: true }, false, "error-budget-within-limit");
await runScenario("telemetry_binding", { telemetryBindingMismatch: true }, false, "telemetry-response-bound");
await runScenario("source_revision", { sourceRevisionMismatch: true }, false, "telemetry-source-bound");
await runScenario("trigger_binding", { triggerBindingMismatch: true }, false, "alert-triggered");
await runScenario("alert_missing", { alertMissing: true }, false, "alert-delivered-by-independent-observer");
await runScenario("alert_id_mismatch", { alertIdMismatch: true }, false, "alert-delivered-by-independent-observer");
await runScenario("reversed_alert", { reversedAlertTime: true }, false, "alert-delivery-timeline-and-sla");
await runScenario("future_alert", { futureAlert: true }, false, "alert-delivery-timeline-and-sla");
await runScenario("late_alert", { lateAlert: true }, false, "alert-delivery-timeline-and-sla");
await runScenario("ack_missing", { ackMissing: true }, false, "oncall-acknowledged-by-distinct-actor");
await runScenario("ack_binding", { ackBindingMismatch: true }, false, "oncall-acknowledged-by-distinct-actor");
await runScenario("ack_alert_mismatch", { ackAlertMismatch: true }, false, "oncall-acknowledged-by-distinct-actor");
await runScenario("wrong_actor", { wrongActorRole: true }, false, "oncall-acknowledged-by-distinct-actor");
await runScenario("reversed_ack", { reversedAckTime: true }, false, "acknowledgement-timeline-and-sla");
await runScenario("future_ack", { futureAck: true }, false, "acknowledgement-timeline-and-sla");
await runScenario("late_ack", { lateAck: true }, false, "acknowledgement-timeline-and-sla");
await runScenario("exit_request_binding", { exitRequestBindingMismatch: true }, false, "vendor-exit-requested");
await runScenario("vendor_binding", { vendorBindingMismatch: true }, false, "vendor-exit-observer-bound", { restoreAttempted: true, restored: true });
await runScenario("exit_ineffective", { exitIneffective: true }, false, "primary-traffic-zero");
await runScenario("null_traffic", { nullTraffic: true }, false, "primary-traffic-zero", { restoreAttempted: true, restored: true });
await runScenario("credential_not_revoked", { credentialNotRevoked: true }, false, "primary-credential-revoked-and-cache-purged", { restoreAttempted: true, restored: true });
await runScenario("cache_not_purged", { cacheNotPurged: true }, false, "primary-credential-revoked-and-cache-purged", { restoreAttempted: true, restored: true });
await runScenario("same_vendor_family", { sameVendorFamily: true }, false, "alternate-provider-independent", { restoreAttempted: true, restored: true });
await runScenario("same_account", { sameAccount: true }, false, "alternate-provider-independent", { restoreAttempted: true, restored: true });
await runScenario("same_failure_domain", { sameFailureDomain: true }, false, "alternate-provider-independent", { restoreAttempted: true, restored: true });
await runScenario("same_control_plane", { sameControlPlane: true }, false, "alternate-provider-independent", { restoreAttempted: true, restored: true });
await runScenario("reversed_exit", { reversedExitTime: true }, false, "vendor-exit-timeline-and-sla", { restoreAttempted: true, restored: true });
await runScenario("future_exit", { futureExitTime: true }, false, "vendor-exit-timeline-and-sla", { restoreAttempted: true, restored: true });
await runScenario("exit_slow", { exitSlow: true }, false, "vendor-exit-timeline-and-sla", { restoreAttempted: true, restored: true });
await runScenario("credential_still_works", { credentialStillWorks: true }, false, "revoked-primary-credential-rejected", { restoreAttempted: true, restored: true });
await runScenario("probe_binding", { probeBindingMismatch: true }, false, "service-probes-complete-and-bound", { restoreAttempted: true, restored: true });
await runScenario("probe_wrong_provider", { probeWrongProvider: true }, false, "service-probes-complete-and-bound", { restoreAttempted: true, restored: true });
await runScenario("probe_null", { probeNullMetrics: true }, false, "service-probe-schema-valid", { restoreAttempted: true, restored: true });
await runScenario("probe_negative", { probeNegative: true }, false, "service-probe-schema-valid", { restoreAttempted: true, restored: true });
await runScenario("probe_future", { probeFuture: true }, false, "service-probe-schema-valid", { restoreAttempted: true, restored: true });
await runScenario("duplicate_sample", { duplicateSampleId: true }, false, "service-probe-schema-valid", { restoreAttempted: true, restored: true });
await runScenario("bad_payload_digest", { badPayloadDigest: true }, false, "service-probe-schema-valid", { restoreAttempted: true, restored: true });
await runScenario("probe_unavailable", { probeUnavailable: true }, false, "service-availability-floor", { restoreAttempted: true, restored: true });
await runScenario("probe_data_floor", { probeDataFloorMissing: true }, false, "service-availability-floor", { restoreAttempted: true, restored: true });
await runScenario("probe_latency", { probeLatencyHigh: true }, false, "service-latency-floor", { restoreAttempted: true, restored: true });
await runScenario("probe_stale", { probeStale: true }, false, "service-freshness-floor", { restoreAttempted: true, restored: true });
await runScenario("transport_failure_recovery", { transportFailureAfterExit: true }, false, null, { restoreAttempted: true, restored: true });
await runScenario("restore_broken", { restoreBroken: true }, false, "vendor-restored-in-finally", { restoreAttempted: true });
await runScenario("final_clean", {}, true);

const failures = checks.filter((row) => !row.ok);
fs.mkdirSync(path.join(root, "artifacts/pass35/a54"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a54/PASS35_A54_STRICT_ADVERSARIAL_FIXTURE_SUITE.json"), `${JSON.stringify({ schemaVersion: "velmere.pass35.a54.strict-adversarial-fixture-suite.v1", revisionId: contract.revisionId, generatedAt: new Date().toISOString(), scenarios: checks.filter((row) => row.id.endsWith(":decision")).length, summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, checks }, null, 2)}\n`);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length, scenarios: checks.filter((row) => row.id.endsWith(":decision")).length }, null, 2));
if (failures.length) {
  console.error(JSON.stringify(failures.slice(0, 100), null, 2));
  process.exit(1);
}
