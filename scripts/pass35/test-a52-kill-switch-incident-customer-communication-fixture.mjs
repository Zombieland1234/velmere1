#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const incidentSecret = "a52-incident-secret-abcdefghijklmnopqrstuvwxyz";
const alertSecret = "a52-alert-secret-abcdefghijklmnopqrstuvwxyz";
const commSecret = "a52-comm-secret-abcdefghijklmnopqrstuvwxyz";

function json(res, status, body) { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); }
async function readJson(req) { const chunks = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
function bearer(req) { return String(req.headers.authorization ?? "").replace(/^Bearer\s+/iu, ""); }

function createServer(options = {}) {
  const state = {
    incidentId: "incident-a52-fixture", incidentState: "none", killSwitch: false, paidDeliveryBlocked: false,
    serviceMode: "normal", health: "healthy", recoveryValidated: false, playbookComplete: false, evidenceBound: false,
    alertId: "alert-a52-fixture"
  };
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method ?? "GET";
    try {
      if (url.pathname === "/health" && method === "GET") {
        if (bearer(req) !== incidentSecret) return json(res, 401, { error: "unauthorized" });
        return json(res, 200, { health: state.health, incidentKillSwitchActive: state.killSwitch, recoveryValidated: state.recoveryValidated });
      }
      if (url.pathname === "/incident/status" && method === "GET") {
        if (bearer(req) !== incidentSecret) return json(res, 401, { error: "unauthorized" });
        return json(res, 200, { incidentState: state.incidentState, incidentKillSwitchActive: state.killSwitch, paidDeliveryBlocked: state.paidDeliveryBlocked, serviceMode: state.serviceMode, saleEnabled: false });
      }
      if (url.pathname === "/incident/control" && method === "POST") {
        if (bearer(req) !== incidentSecret) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        if (body.operation === "open") {
          state.incidentState = "open";
          return json(res, 201, { opened: true, incidentId: state.incidentId, sourceRevisionId: body.sourceRevisionId, nonceHash: body.nonceHash });
        }
        if (body.operation === "activate_kill_switch") {
          if (!options.killSwitchBroken) { state.killSwitch = true; state.paidDeliveryBlocked = true; state.serviceMode = "degraded_safe"; }
          return json(res, 202, { accepted: true });
        }
        if (body.operation === "complete_playbook") {
          const actions = options.playbookIncomplete ? body.actions.slice(0, 2) : body.actions;
          state.playbookComplete = !options.playbookIncomplete;
          state.evidenceBound = !options.playbookIncomplete;
          return json(res, 200, { playbookComplete: state.playbookComplete, completedActions: actions.length, actions, evidenceCount: options.playbookIncomplete ? 1 : body.evidenceDigests.length, evidenceBound: state.evidenceBound });
        }
        if (body.operation === "recover") {
          if (!options.recoveryBroken) { state.health = "recovered"; state.recoveryValidated = true; state.serviceMode = "normal"; }
          return json(res, 202, { recoveryAccepted: !options.recoveryBroken });
        }
        if (body.operation === "release_kill_switch") {
          if (!options.releaseBroken) { state.killSwitch = false; state.paidDeliveryBlocked = false; }
          return json(res, 202, { accepted: true });
        }
        if (body.operation === "close") {
          const allowed = !options.closeBroken && state.recoveryValidated && !state.killSwitch && state.playbookComplete;
          if (allowed) state.incidentState = "closed";
          return json(res, allowed ? 200 : 409, { closed: allowed });
        }
      }
      if (url.pathname === "/alerts/deliver" && method === "POST") {
        if (bearer(req) !== alertSecret) return json(res, 401, { error: "unauthorized" });
        return json(res, 202, { delivered: !options.alertUndelivered, alertId: state.alertId, deliveredAt: new Date().toISOString() });
      }
      if (url.pathname === "/oncall/ack" && method === "POST") {
        if (bearer(req) !== alertSecret) return json(res, 401, { error: "unauthorized" });
        const offset = options.lateAck ? 900_000 : 5_000;
        return json(res, 202, { acknowledged: !options.ackMissing, acknowledgedAt: new Date(Date.now() + offset).toISOString() });
      }
      if (url.pathname === "/customer/communication" && method === "POST") {
        if (bearer(req) !== commSecret) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        const fail = options.customerUndelivered && body.kind === "investigating";
        return json(res, 202, { messageId: `message-${body.kind}-a52`, contentHash: body.contentHash, delivered: !fail, deliveredAt: new Date().toISOString() });
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
  const child = spawn(process.execPath, ["scripts/a52-kill-switch-incident-customer-communication-acceptance.mjs", "--fixture"], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env,
      VELMERE_A52_STAGING_BASE_URL: base,
      VELMERE_A52_INCIDENT_CONTROL_URL: `${base}/incident/control`,
      VELMERE_A52_INCIDENT_STATUS_URL: `${base}/incident/status`,
      VELMERE_A52_ALERT_DELIVERY_URL: `${base}/alerts/deliver`,
      VELMERE_A52_ONCALL_ACK_URL: `${base}/oncall/ack`,
      VELMERE_A52_CUSTOMER_COMM_URL: `${base}/customer/communication`,
      VELMERE_A52_SERVICE_HEALTH_URL: `${base}/health`,
      VELMERE_A52_INCIDENT_BEARER_SECRET: incidentSecret,
      VELMERE_A52_ALERT_BEARER_SECRET: alertSecret,
      VELMERE_A52_COMM_BEARER_SECRET: commSecret,
      VELMERE_A52_PROJECT_CLASS: "disposable_staging",
      VELMERE_A52_CONFIRM: "fixture"
    }
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
  const status = await new Promise((resolve) => child.on("close", resolve));
  await new Promise((resolve) => server.close(resolve));
  const report = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a52/PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE.json"), "utf8"));
  check(`${name}:exit`, expectedPass ? status === 0 : status !== 0, { status, stdout: stdout.trim(), stderr: stderr.trim() });
  check(`${name}:decision`, report.decision === (expectedPass ? "FIXTURE_PASS" : "FIXTURE_FAIL"), report.decision);
  check(`${name}:truth`, report.productionIncidentResponseProven === false && report.realSlaProven === false && report.saleEnabled === false, report);
  if (!expectedPass && expectedFailureId) check(`${name}:failure`, report.failures?.some((row) => row.id === expectedFailureId), report.failures?.map((row) => row.id));
}

await runScenario("clean", {}, true);
await runScenario("alert_missing", { alertUndelivered: true }, false, "alert-delivered");
await runScenario("late_ack", { lateAck: true }, false, "acknowledgement-sla-met");
await runScenario("kill_switch_missing", { killSwitchBroken: true }, false, "kill-switch-activated");
await runScenario("customer_notice_missing", { customerUndelivered: true }, false, "customer-notice-delivered");
await runScenario("playbook_incomplete", { playbookIncomplete: true }, false, "playbook-actions-complete");
await runScenario("recovery_missing", { recoveryBroken: true }, false, "service-recovered");
await runScenario("final_clean", {}, true);

const failures = checks.filter((row) => !row.ok);
fs.mkdirSync(path.join(root, "artifacts/pass35/a52"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a52/PASS35_A52_ADVERSARIAL_FIXTURE_SUITE.json"), `${JSON.stringify({ schemaVersion: "velmere.pass35.a52.adversarial-fixture-suite.v1", revisionId: "VELMERE_PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE", generatedAt: new Date().toISOString(), summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, checks }, null, 2)}\n`);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
