#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const telemetrySecret = "a53-telemetry-secret-abcdefghijklmnopqrstuvwxyz";
const alertSecret = "a53-alert-secret-abcdefghijklmnopqrstuvwxyz";
const vendorSecret = "a53-vendor-secret-abcdefghijklmnopqrstuvwxyz";
const primary = "provider-primary-a53";
const alternate = "provider-alternate-a53";

function json(res, status, body) { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); }
async function readJson(req) { const chunks = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
function bearer(req) { return String(req.headers.authorization ?? "").replace(/^Bearer\s+/iu, ""); }

function createServer(options = {}) {
  const state = { exited: false, restored: false, exitRequestedAt: null, alertId: "alert-a53-fixture" };
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method ?? "GET";
    try {
      if (url.pathname === "/slo/query" && method === "GET") {
        if (bearer(req) !== telemetrySecret) return json(res, 401, { error: "unauthorized" });
        const end = Date.now() - 1_000;
        const duration = options.shortWindow ? 300_000 : 1_200_000;
        const sampleCount = options.lowSamples ? 12 : 100;
        const successCount = options.lowAvailability ? 95 : 100;
        return json(res, 200, {
          windowStart: new Date(end - duration).toISOString(), windowEnd: new Date(end).toISOString(),
          windowClass: "bounded_staging", sampleCount, successCount, errorCount: sampleCount - successCount,
          availabilityPct: (successCount / sampleCount) * 100,
          p50Ms: 180, p95Ms: options.highP95 ? 2500 : 700, p99Ms: options.highP99 ? 5000 : 1200,
          errorBudgetConsumedPct: options.errorBudgetHigh ? 140 : 20,
          telemetrySource: "fixture-observability", sourceRevisionId: "VELMERE_PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE", fixture: false
        });
      }
      if (url.pathname === "/alerts/trigger" && method === "POST") {
        if (bearer(req) !== alertSecret) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        return json(res, 202, { triggered: true, alertId: state.alertId, triggeredAt: new Date().toISOString(), nonceHash: body.nonceHash });
      }
      if (url.pathname === "/alerts/status" && method === "POST") {
        if (bearer(req) !== alertSecret) return json(res, 401, { error: "unauthorized" });
        const offset = options.lateAlert ? 120_000 : 10_000;
        return json(res, 200, { delivered: !options.alertMissing, deliveredAt: new Date(Date.now() + offset).toISOString(), provider: "fixture-alert-provider" });
      }
      if (url.pathname === "/oncall/ack" && method === "POST") {
        if (bearer(req) !== alertSecret) return json(res, 401, { error: "unauthorized" });
        const offset = options.lateAck ? 700_000 : (options.lateAlert ? 140_000 : 20_000);
        return json(res, 202, { acknowledged: !options.ackMissing, acknowledgedAt: new Date(Date.now() + offset).toISOString(), actorRole: "oncall" });
      }
      if (url.pathname === "/vendor/control" && method === "POST") {
        if (bearer(req) !== vendorSecret) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        if (body.operation === "begin_vendor_exit") {
          state.exitRequestedAt = Date.now();
          if (!options.exitIneffective) state.exited = true;
          return json(res, 202, { accepted: true, requestedAt: new Date(state.exitRequestedAt).toISOString(), nonceHash: body.nonceHash });
        }
        if (body.operation === "restore_primary") {
          if (!options.restoreBroken) { state.exited = false; state.restored = true; }
          return json(res, 202, { restored: !options.restoreBroken });
        }
      }
      if (url.pathname === "/vendor/status" && method === "GET") {
        if (bearer(req) !== vendorSecret) return json(res, 401, { error: "unauthorized" });
        if (state.exited) {
          const changeOffset = options.exitSlow ? 300_000 : 30_000;
          return json(res, 200, {
            healthy: true, health: "healthy", state: options.alternateInactive ? "primary_disabled" : "alternate_active",
            primaryProviderId: primary, activeProviderId: options.alternateInactive ? primary : alternate,
            primaryCredentialActive: options.credentialNotRevoked ? true : false,
            primaryTrafficSharePct: options.exitIneffective ? 100 : 0, cachePurged: !options.cacheNotPurged,
            alternateProviderActive: !options.alternateInactive,
            changedAt: new Date((state.exitRequestedAt ?? Date.now()) + changeOffset).toISOString()
          });
        }
        return json(res, 200, {
          healthy: true, health: "healthy", state: "primary_active",
          primaryProviderId: primary, activeProviderId: primary,
          primaryCredentialActive: true, primaryTrafficSharePct: 100, cachePurged: true,
          alternateProviderActive: false, changedAt: new Date().toISOString()
        });
      }
      if (url.pathname === "/service/probe" && method === "GET") {
        if (bearer(req) !== vendorSecret) return json(res, 401, { error: "unauthorized" });
        const index = Number(req.headers["x-velmere-probe-index"] ?? 0);
        const unavailable = options.probeUnavailable && index === 0;
        return json(res, 200, {
          available: !unavailable,
          activeProviderId: state.exited && !options.alternateInactive ? alternate : primary,
          latencyMs: options.probeLatencyHigh ? 3500 : 350 + index * 10,
          freshnessSeconds: options.probeStale ? 500 : 15 + index,
          dataFloorMet: !unavailable && !options.probeDataFloorMissing
        });
      }
      return json(res, 404, { error: "not_found" });
    } catch (error) { return json(res, 500, { error: error instanceof Error ? error.message : String(error) }); }
  });
}

async function runScenario(name, options, expectedPass, expectedFailureId = null) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["scripts/a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs", "--fixture"], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env,
      VELMERE_A53_STAGING_BASE_URL: base,
      VELMERE_A53_SLO_QUERY_URL: `${base}/slo/query`,
      VELMERE_A53_ALERT_TRIGGER_URL: `${base}/alerts/trigger`,
      VELMERE_A53_ALERT_STATUS_URL: `${base}/alerts/status`,
      VELMERE_A53_ONCALL_ACK_URL: `${base}/oncall/ack`,
      VELMERE_A53_VENDOR_CONTROL_URL: `${base}/vendor/control`,
      VELMERE_A53_VENDOR_STATUS_URL: `${base}/vendor/status`,
      VELMERE_A53_SERVICE_PROBE_URL: `${base}/service/probe`,
      VELMERE_A53_TELEMETRY_BEARER_SECRET: telemetrySecret,
      VELMERE_A53_ALERT_BEARER_SECRET: alertSecret,
      VELMERE_A53_VENDOR_BEARER_SECRET: vendorSecret,
      VELMERE_A53_PROJECT_CLASS: "disposable_staging",
      VELMERE_A53_CONFIRM: "fixture"
    }
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
  const status = await new Promise((resolve) => child.on("close", resolve));
  await new Promise((resolve) => server.close(resolve));
  const report = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a53/PASS35_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE.json"), "utf8"));
  check(`${name}:exit`, expectedPass ? status === 0 : status !== 0, { status, stdout: stdout.trim(), stderr: stderr.trim() });
  check(`${name}:decision`, report.decision === (expectedPass ? "FIXTURE_PASS" : "FIXTURE_FAIL"), report.decision);
  check(`${name}:truth`, report.productionSloProven === false && report.contractualSlaProven === false && report.productionVendorExitProven === false && report.saleEnabled === false, report);
  if (!expectedPass && expectedFailureId) check(`${name}:failure`, report.failures?.some((row) => row.id === expectedFailureId), report.failures?.map((row) => row.id));
}

await runScenario("clean", {}, true);
await runScenario("short_window", { shortWindow: true }, false, "slo-window-bounded");
await runScenario("low_samples", { lowSamples: true }, false, "slo-minimum-samples");
await runScenario("low_availability", { lowAvailability: true }, false, "slo-availability-target");
await runScenario("high_p95", { highP95: true }, false, "slo-p95-target");
await runScenario("high_p99", { highP99: true }, false, "slo-p99-target");
await runScenario("error_budget", { errorBudgetHigh: true }, false, "error-budget-within-limit");
await runScenario("late_alert", { lateAlert: true }, false, "alert-delivery-sla-met");
await runScenario("late_ack", { lateAck: true }, false, "acknowledgement-sla-met");
await runScenario("exit_ineffective", { exitIneffective: true }, false, "primary-traffic-zero");
await runScenario("alternate_inactive", { alternateInactive: true }, false, "alternate-provider-active");
await runScenario("exit_slow", { exitSlow: true }, false, "vendor-exit-sla-met");
await runScenario("probe_unavailable", { probeUnavailable: true }, false, "service-availability-floor");
await runScenario("probe_latency", { probeLatencyHigh: true }, false, "service-latency-floor");
await runScenario("probe_stale", { probeStale: true }, false, "service-freshness-floor");
await runScenario("restore_missing", { restoreBroken: true }, false, "vendor-restored");
await runScenario("final_clean", {}, true);

const failures = checks.filter((row) => !row.ok);
fs.mkdirSync(path.join(root, "artifacts/pass35/a53"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a53/PASS35_A53_ADVERSARIAL_FIXTURE_SUITE.json"), `${JSON.stringify({ schemaVersion: "velmere.pass35.a53.adversarial-fixture-suite.v1", revisionId: "VELMERE_PASS35_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE", generatedAt: new Date().toISOString(), summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, checks }, null, 2)}\n`);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
