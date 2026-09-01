#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a52-kill-switch-incident-customer-communication-acceptance.json"), "utf8"));
const outputDir = path.join(root, "artifacts/pass35/a52");
const outputJson = path.join(outputDir, "PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE.json");
const outputMd = path.join(outputDir, "PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE.md");
fs.mkdirSync(outputDir, { recursive: true });

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const shaText = (value) => sha256(Buffer.from(String(value), "utf8"));
const nowIso = () => new Date().toISOString();
const checks = [];
const addCheck = (id, ok, detail = null, status = ok ? "PASS" : "FAIL") => checks.push({ id, ok: Boolean(ok), status, detail });

function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a52-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "a52_source_manifest_missing", digest: null, rows: 0 };
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
const parseTime = (value) => { const time = Date.parse(String(value ?? "")); return Number.isFinite(time) ? time : null; };

async function main() {
  const startedAt = nowIso();
  const sourceBefore = verifySourceManifest();
  addCheck("source-fingerprint-before", sourceBefore.ok, { rows: sourceBefore.rows, digest: sourceBefore.digest, reason: sourceBefore.reason });

  if (fixtureMode) addCheck("precondition-a51-verified", true, { fixture: true }, "FIXTURE_PASS");
  else {
    const receipt = path.join(root, "artifacts/pass35/a51/PASS35_A51_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_ACCEPTANCE.json");
    const decision = fs.existsSync(receipt) ? JSON.parse(fs.readFileSync(receipt, "utf8")).decision : null;
    addCheck("precondition-a51-verified", decision === contract.requiredA51Decision, { decision, required: contract.requiredA51Decision });
  }

  const npmObserved = currentNpmVersion();
  addCheck("runtime-exact", fixtureMode || (process.versions.node === contract.runtime.node && npmObserved === contract.runtime.npm), { node: process.versions.node, npm: npmObserved, expected: contract.runtime, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);
  const confirmation = process.env.VELMERE_A52_CONFIRM ?? "";
  addCheck("confirmation-token", fixtureMode || confirmation === contract.confirmationToken, { present: Boolean(confirmation), fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const urlNames = [
    ["staging", "VELMERE_A52_STAGING_BASE_URL"], ["incident_control", "VELMERE_A52_INCIDENT_CONTROL_URL"],
    ["incident_status", "VELMERE_A52_INCIDENT_STATUS_URL"], ["alert_delivery", "VELMERE_A52_ALERT_DELIVERY_URL"],
    ["oncall_ack", "VELMERE_A52_ONCALL_ACK_URL"], ["customer_comm", "VELMERE_A52_CUSTOMER_COMM_URL"],
    ["service_health", "VELMERE_A52_SERVICE_HEALTH_URL"]
  ];
  const urls = {};
  const urlFailures = [];
  for (const [kind, name] of urlNames) {
    const safety = safeUrl(process.env[name] ?? "", kind === "staging" ? "staging" : "bridge");
    if (!safety.ok) urlFailures.push({ name, reason: safety.reason }); else urls[kind] = safety.url;
  }
  addCheck("staging-url-safety", Boolean(urls.staging), urls.staging ? { originSha256: shaText(urls.staging.origin) } : { failures: urlFailures.filter((row) => row.name === "VELMERE_A52_STAGING_BASE_URL") });
  addCheck("bridge-url-safety", urlFailures.length === 0, { failures: urlFailures });
  if (urlFailures.length) throw new Error("unsafe_or_missing_a52_url");

  const incidentSecret = process.env.VELMERE_A52_INCIDENT_BEARER_SECRET ?? "";
  const alertSecret = process.env.VELMERE_A52_ALERT_BEARER_SECRET ?? "";
  const commSecret = process.env.VELMERE_A52_COMM_BEARER_SECRET ?? "";
  const projectClass = process.env.VELMERE_A52_PROJECT_CLASS ?? "";
  const secretsOk = fixtureMode || [incidentSecret, alertSecret, commSecret].every((value) => value.length >= contract.bridgeSafety.minimumSecretLength);
  addCheck("secret-boundary", secretsOk && (fixtureMode || projectClass === contract.bridgeSafety.projectClass), { incidentSecretLengthOk: incidentSecret.length >= 32, alertSecretLengthOk: alertSecret.length >= 32, commSecretLengthOk: commSecret.length >= 32, projectClass, fixture: fixtureMode });

  const nonce = crypto.randomBytes(16).toString("hex");
  const nonceHash = shaText(nonce);
  const baseline = await requestJson(urls.service_health, { headers: bearer(incidentSecret) });
  addCheck("baseline-service-healthy", baseline.response.status === 200 && baseline.json?.health === "healthy" && baseline.json?.incidentKillSwitchActive === false, { status: baseline.response.status, health: baseline.json?.health, incidentKillSwitchActive: baseline.json?.incidentKillSwitchActive });

  const opened = await requestJson(urls.incident_control, { method: "POST", headers: bearer(incidentSecret), body: JSON.stringify({ operation: "open", severity: "SEV2", sourceRevisionId: contract.parentRevisionId, nonceHash }) });
  const incidentId = typeof opened.json?.incidentId === "string" ? opened.json.incidentId : null;
  addCheck("incident-opened", [200, 201, 202].includes(opened.response.status) && opened.json?.opened === true && Boolean(incidentId), { status: opened.response.status, opened: opened.json?.opened, incidentDigest: incidentId ? shaText(incidentId) : null });
  addCheck("incident-identity-bound", opened.json?.sourceRevisionId === contract.parentRevisionId && opened.json?.nonceHash === nonceHash, { sourceRevisionId: opened.json?.sourceRevisionId, nonceMatched: opened.json?.nonceHash === nonceHash });

  const alert = await requestJson(urls.alert_delivery, { method: "POST", headers: bearer(alertSecret), body: JSON.stringify({ incidentId, severity: "SEV2", eventType: "staging_acceptance", nonceHash }) });
  const alertId = typeof alert.json?.alertId === "string" ? alert.json.alertId : null;
  const deliveredAt = parseTime(alert.json?.deliveredAt);
  addCheck("alert-delivered", [200, 201, 202].includes(alert.response.status) && alert.json?.delivered === true && Boolean(alertId && deliveredAt), { status: alert.response.status, delivered: alert.json?.delivered, alertDigest: alertId ? shaText(alertId) : null });

  const ack = await requestJson(urls.oncall_ack, { method: "POST", headers: bearer(alertSecret), body: JSON.stringify({ incidentId, alertId, nonceHash }) });
  const acknowledgedAt = parseTime(ack.json?.acknowledgedAt);
  addCheck("oncall-acknowledged", [200, 201, 202].includes(ack.response.status) && ack.json?.acknowledged === true && Boolean(acknowledgedAt), { status: ack.response.status, acknowledged: ack.json?.acknowledged });
  const ackSeconds = deliveredAt !== null && acknowledgedAt !== null ? Math.max(0, (acknowledgedAt - deliveredAt) / 1000) : null;
  addCheck("acknowledgement-sla-met", ackSeconds !== null && ackSeconds <= contract.budgets.acknowledgementSlaSeconds, { acknowledgementSeconds: ackSeconds, maximum: contract.budgets.acknowledgementSlaSeconds });

  const activated = await requestJson(urls.incident_control, { method: "POST", headers: bearer(incidentSecret), body: JSON.stringify({ operation: "activate_kill_switch", incidentId, nonceHash }) });
  const activeStatus = await requestJson(urls.incident_status, { headers: bearer(incidentSecret) });
  addCheck("kill-switch-activated", [200, 202].includes(activated.response.status) && activated.json?.accepted === true && activeStatus.json?.incidentKillSwitchActive === true, { controlStatus: activated.response.status, status: activeStatus.response.status, active: activeStatus.json?.incidentKillSwitchActive });
  addCheck("paid-delivery-blocked", activeStatus.json?.paidDeliveryBlocked === true && activeStatus.json?.saleEnabled === false, { paidDeliveryBlocked: activeStatus.json?.paidDeliveryBlocked, saleEnabled: activeStatus.json?.saleEnabled });
  addCheck("service-safe-mode", contract.incidentSafety.safeModes.includes(activeStatus.json?.serviceMode), { serviceMode: activeStatus.json?.serviceMode });

  const investigatingMessage = {
    kind: "investigating", locale: "en", title: "Service disruption under investigation",
    body: "Some paid or real-time functions are temporarily unavailable while a safety control is active. We are investigating and will provide another update. No claim of data loss or full safety is made.",
    incidentId, nonceHash
  };
  const noticeHash = shaText(JSON.stringify(investigatingMessage));
  const notice = await requestJson(urls.customer_comm, { method: "POST", headers: bearer(commSecret), body: JSON.stringify({ ...investigatingMessage, contentHash: noticeHash }) });
  addCheck("customer-notice-created", [200, 201, 202].includes(notice.response.status) && typeof notice.json?.messageId === "string" && notice.json?.contentHash === noticeHash, { status: notice.response.status, messageDigest: notice.json?.messageId ? shaText(notice.json.messageId) : null, contentHashMatched: notice.json?.contentHash === noticeHash });
  addCheck("customer-notice-delivered", notice.json?.delivered === true && Boolean(parseTime(notice.json?.deliveredAt)), { delivered: notice.json?.delivered });
  addCheck("customer-notice-content-bounded", investigatingMessage.title.length + investigatingMessage.body.length <= contract.budgets.maximumCustomerMessageChars, { chars: investigatingMessage.title.length + investigatingMessage.body.length, maximum: contract.budgets.maximumCustomerMessageChars });
  const falseClaims = /no data loss|fully safe|zero risk|incident resolved/iu.test(investigatingMessage.body);
  addCheck("customer-notice-truthful", !falseClaims && investigatingMessage.body.includes("No claim of data loss"), { falseClaims, limitationIncluded: investigatingMessage.body.includes("No claim of data loss") });

  const playbookActions = [...contract.incidentSafety.requiredPlaybookActions];
  const playbook = await requestJson(urls.incident_control, { method: "POST", headers: bearer(incidentSecret), body: JSON.stringify({ operation: "complete_playbook", incidentId, actions: playbookActions, evidenceDigests: [shaText("alert"), shaText("kill-switch"), noticeHash], nonceHash }) });
  addCheck("playbook-actions-complete", [200, 202].includes(playbook.response.status) && playbook.json?.playbookComplete === true && Number(playbook.json?.completedActions) >= contract.budgets.minimumPlaybookActions && contract.incidentSafety.requiredPlaybookActions.every((action) => playbook.json?.actions?.includes(action)), { status: playbook.response.status, completedActions: playbook.json?.completedActions, actions: playbook.json?.actions });
  addCheck("evidence-attached", Number(playbook.json?.evidenceCount) >= 3 && playbook.json?.evidenceBound === true, { evidenceCount: playbook.json?.evidenceCount, evidenceBound: playbook.json?.evidenceBound });

  const recovery = await requestJson(urls.incident_control, { method: "POST", headers: bearer(incidentSecret), body: JSON.stringify({ operation: "recover", incidentId, nonceHash }) });
  addCheck("recovery-requested", [200, 202].includes(recovery.response.status) && recovery.json?.recoveryAccepted === true, { status: recovery.response.status, recoveryAccepted: recovery.json?.recoveryAccepted });
  const recoveredHealth = await requestJson(urls.service_health, { headers: bearer(incidentSecret) });
  addCheck("service-recovered", recoveredHealth.response.status === 200 && contract.incidentSafety.healthyModes.includes(recoveredHealth.json?.health) && recoveredHealth.json?.recoveryValidated === true, { status: recoveredHealth.response.status, health: recoveredHealth.json?.health, recoveryValidated: recoveredHealth.json?.recoveryValidated });

  const released = await requestJson(urls.incident_control, { method: "POST", headers: bearer(incidentSecret), body: JSON.stringify({ operation: "release_kill_switch", incidentId, nonceHash }) });
  const releasedStatus = await requestJson(urls.incident_status, { headers: bearer(incidentSecret) });
  addCheck("kill-switch-released", [200, 202].includes(released.response.status) && releasedStatus.json?.incidentKillSwitchActive === false && releasedStatus.json?.paidDeliveryBlocked === false, { status: released.response.status, active: releasedStatus.json?.incidentKillSwitchActive, paidDeliveryBlocked: releasedStatus.json?.paidDeliveryBlocked });

  const resolvedMessage = {
    kind: "resolved", locale: "en", title: "Service restored",
    body: "The affected staging functions have been restored and validated. This acceptance drill does not establish a production SLA or guarantee that no data was lost.",
    incidentId, nonceHash
  };
  const resolvedHash = shaText(JSON.stringify(resolvedMessage));
  const resolution = await requestJson(urls.customer_comm, { method: "POST", headers: bearer(commSecret), body: JSON.stringify({ ...resolvedMessage, contentHash: resolvedHash }) });
  addCheck("resolution-message-delivered", [200, 201, 202].includes(resolution.response.status) && resolution.json?.delivered === true && resolution.json?.contentHash === resolvedHash, { status: resolution.response.status, delivered: resolution.json?.delivered, contentHashMatched: resolution.json?.contentHash === resolvedHash });

  const closed = await requestJson(urls.incident_control, { method: "POST", headers: bearer(incidentSecret), body: JSON.stringify({ operation: "close", incidentId, closureReview: true, nonceHash }) });
  const finalStatus = await requestJson(urls.incident_status, { headers: bearer(incidentSecret) });
  addCheck("incident-closed", [200, 202].includes(closed.response.status) && closed.json?.closed === true && finalStatus.json?.incidentState === "closed", { status: closed.response.status, closed: closed.json?.closed, incidentState: finalStatus.json?.incidentState });
  const finalHealth = await requestJson(urls.service_health, { headers: bearer(incidentSecret) });
  addCheck("postcondition-healthy", finalHealth.response.status === 200 && contract.incidentSafety.healthyModes.includes(finalHealth.json?.health) && finalHealth.json?.incidentKillSwitchActive === false, { status: finalHealth.response.status, health: finalHealth.json?.health, active: finalHealth.json?.incidentKillSwitchActive });

  const sourceAfter = verifySourceManifest();
  addCheck("source-fingerprint-unchanged", sourceBefore.ok && sourceAfter.ok && sourceBefore.digest === sourceAfter.digest, { before: sourceBefore.digest, after: sourceAfter.digest, rows: sourceAfter.rows, reason: sourceAfter.reason });

  const secretNeedles = [incidentSecret, alertSecret, commSecret, incidentId, alertId, notice.json?.messageId, resolution.json?.messageId].filter(Boolean);
  const preliminary = JSON.stringify({ checks, nonceHash, sourceBefore, sourceAfter });
  addCheck("evidence-redaction", secretNeedles.every((value) => !preliminary.includes(value)), { leakedValues: secretNeedles.filter((value) => preliminary.includes(value)).length });

  const failures = checks.filter((row) => !row.ok);
  const decision = fixtureMode ? (failures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : failures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION";
  const report = {
    schemaVersion: "velmere.pass35.a52.kill-switch-incident-customer-communication-receipt.v1",
    revisionId: contract.revisionId, parentRevisionId: contract.parentRevisionId,
    generatedAt: nowIso(), startedAt, completedAt: nowIso(), fixtureMode, decision, status: decision,
    truthBoundary: contract.truthBoundary, stagingIncidentLifecycleProven: !fixtureMode && failures.length === 0,
    productionIncidentResponseProven: false, customerComprehensionProven: false, legalCommunicationProven: false,
    realSlaProven: false, liveProven: false, saleEnabled: false,
    sourceFingerprint: { before: sourceBefore.digest, after: sourceAfter.digest, rows: sourceAfter.rows },
    incident: { incidentIdDigest: incidentId ? shaText(incidentId) : null, alertIdDigest: alertId ? shaText(alertId) : null, acknowledgementSeconds: ackSeconds },
    communication: { investigatingDigest: noticeHash, resolvedDigest: resolvedHash },
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, failures, checks
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (secretNeedles.some((value) => serialized.includes(value))) throw new Error("evidence_secret_leak_detected");
  fs.writeFileSync(outputJson, serialized);
  fs.writeFileSync(outputMd, `# PASS35 A52 — kill switch, incident response and customer communication\n\nDecision: **${decision}**\n\n- Checks: ${checks.length}\n- Passed: ${checks.length - failures.length}\n- Failed: ${failures.length}\n- Fixture mode: ${fixtureMode}\n- Production incident response proven: false\n- Real SLA proven: false\n- Sale enabled: false\n\n${failures.length ? "## Failures\n\n" + failures.map((row) => `- ${row.id}: ${JSON.stringify(row.detail)}`).join("\n") : "All declared A52 checks passed."}\n`);
  console.log(JSON.stringify({ decision, summary: report.summary, output: path.relative(root, outputJson).replaceAll("\\", "/") }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  const report = { schemaVersion: "velmere.pass35.a52.error.v1", revisionId: contract.revisionId, generatedAt: nowIso(), decision: fixtureMode ? "FIXTURE_FAIL" : "ACTION_REQUIRED", error: error instanceof Error ? error.message : String(error), productionIncidentResponseProven: false, realSlaProven: false, liveProven: false, saleEnabled: false };
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
});
