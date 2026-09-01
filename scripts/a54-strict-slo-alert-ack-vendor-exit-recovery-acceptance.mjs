#!/usr/bin/env node
import crypto from "node:crypto";
import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const contractPath = path.join(root, "config/pass35/a54-strict-slo-alert-ack-vendor-exit-recovery-acceptance.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const artifactsRoot = path.join(root, "artifacts/pass35/a54");
const runsRoot = path.join(artifactsRoot, "runs");
fs.mkdirSync(runsRoot, { recursive: true });

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const shaText = (value) => sha256(Buffer.from(String(value), "utf8"));
const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isSha256 = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const isNonEmptyString = (value, maximum = 512) => typeof value === "string" && value.length > 0 && value.length <= maximum;
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isNonNegativeFinite = (value) => isFiniteNumber(value) && value >= 0;
const isIntegerInRange = (value, minimum, maximum) => Number.isInteger(value) && value >= minimum && value <= maximum;
const parseTime = (value) => {
  if (typeof value !== "string" || value.length < 20 || value.length > 64) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const percentile = (values, pct) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)];
};

const runId = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
const runDir = path.join(runsRoot, runId);
fs.mkdirSync(runDir, { recursive: true });
const outputJson = path.join(artifactsRoot, "PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.json");
const outputMd = path.join(artifactsRoot, "PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.md");
const runOutputJson = path.join(runDir, "receipt.json");
const journalPath = path.join(runDir, "journal.json");
const lockPath = path.join(artifactsRoot, ".a54.lock");
const checks = [];
const journal = [];
let lockFd = null;
let mutationStarted = false;
let restorationAttempted = false;
let restorationSucceeded = false;
let recoveryError = null;
let sourceBefore = null;
let sourceAfter = null;
let primaryIdentity = null;
let alternateIdentity = null;
let nonceHash = null;
let chainDigest = shaText(`a54:${runId}`);
let fatalError = null;
let stage = "initializing";

function addCheck(id, ok, detail = null, status = ok ? "PASS" : "FAIL") {
  checks.push({ id, ok: Boolean(ok), status, detail });
}
function journalStep(stepId, status, detail = null) {
  const row = { sequence: journal.length + 1, at: nowIso(), stepId, status, detail };
  journal.push(row);
  fs.writeFileSync(journalPath, `${JSON.stringify({ schemaVersion: "velmere.pass35.a54.journal.v1", revisionId: contract.revisionId, runId, rows: journal }, null, 2)}\n`);
  return row;
}
function acquireLock() {
  try {
    lockFd = fs.openSync(lockPath, "wx", 0o600);
    fs.writeFileSync(lockFd, `${JSON.stringify({ runId, pid: process.pid, startedAt: nowIso() })}\n`);
  } catch (error) {
    throw new Error(`a54_concurrent_or_stale_lock:${error instanceof Error ? error.code ?? error.message : String(error)}`, { cause: error });
  }
}
function releaseLock() {
  if (lockFd !== null) {
    try { fs.closeSync(lockFd); } catch (ignoredError) { void ignoredError; }
    lockFd = null;
  }
  try { fs.rmSync(lockPath, { force: true }); } catch (ignoredError) { void ignoredError; }
}
function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a54-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "a54_source_manifest_missing", digest: null, rows: 0, manifestSha256: null };
  const manifestBytes = fs.readFileSync(file);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const digest = crypto.createHash("sha256");
  for (const row of manifest.files ?? []) {
    if (!isNonEmptyString(row.path, 2048) || !isSha256(row.sha256) || !Number.isInteger(row.bytes) || row.bytes < 0) {
      return { ok: false, reason: "a54_source_manifest_row_invalid", digest: null, rows: manifest.files?.length ?? 0, manifestSha256: sha256(manifestBytes) };
    }
    const absolute = path.resolve(root, row.path);
    if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) return { ok: false, reason: `source_path_escape:${row.path}`, digest: null, rows: manifest.files.length, manifestSha256: sha256(manifestBytes) };
    if (!fs.existsSync(absolute)) return { ok: false, reason: `source_file_missing:${row.path}`, digest: null, rows: manifest.files.length, manifestSha256: sha256(manifestBytes) };
    const bytes = fs.readFileSync(absolute);
    const current = sha256(bytes);
    if (current !== row.sha256 || bytes.byteLength !== row.bytes) return { ok: false, reason: `source_hash_mismatch:${row.path}`, digest: null, rows: manifest.files.length, manifestSha256: sha256(manifestBytes) };
    digest.update(row.path); digest.update("\0"); digest.update(current); digest.update("\0");
  }
  return { ok: true, reason: null, digest: digest.digest("hex"), rows: manifest.files.length, manifestSha256: sha256(manifestBytes) };
}
function verifyParentA52Evidence() {
  if (fixtureMode) return { ok: true, fixture: true, decision: contract.requiredA52Decision, manifestSha256: null, receiptSha256: null };
  const base = path.join(root, "artifacts/pass35/a52");
  const receiptPath = path.join(base, "PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE.json");
  const manifestPath = path.join(base, "PASS35_A52_EVIDENCE_MANIFEST.json");
  if (!fs.existsSync(receiptPath) || !fs.existsSync(manifestPath)) return { ok: false, reason: "a52_receipt_or_manifest_missing" };
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifestSha256 = sha256(manifestBytes);
  const expectedManifestSha = String(process.env.VELMERE_A54_A52_EVIDENCE_MANIFEST_SHA256 ?? "").toLowerCase();
  if (!isSha256(expectedManifestSha) || expectedManifestSha !== manifestSha256) return { ok: false, reason: "a52_manifest_external_anchor_mismatch", manifestSha256 };
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.revisionId !== contract.requiredA52RevisionId) return { ok: false, reason: "a52_manifest_revision_mismatch", manifestSha256 };
  const receiptName = path.basename(receiptPath);
  const row = (manifest.files ?? []).find((candidate) => candidate.path === receiptName);
  if (!row || !isSha256(row.sha256) || !Number.isInteger(row.bytes)) return { ok: false, reason: "a52_receipt_not_bound_in_manifest", manifestSha256 };
  const receiptBytes = fs.readFileSync(receiptPath);
  const receiptSha256 = sha256(receiptBytes);
  if (receiptSha256 !== row.sha256 || receiptBytes.byteLength !== row.bytes) return { ok: false, reason: "a52_receipt_hash_mismatch", manifestSha256, receiptSha256 };
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  const sourceStable = receipt.sourceFingerprint?.before && receipt.sourceFingerprint?.before === receipt.sourceFingerprint?.after;
  const completedAt = parseTime(receipt.completedAt ?? receipt.generatedAt);
  const startedAt = parseTime(receipt.startedAt ?? receipt.generatedAt);
  const timelineValid = startedAt !== null && completedAt !== null && startedAt <= completedAt && completedAt <= Date.now() + contract.budgets.maximumClockSkewSeconds * 1000;
  const ok = receipt.revisionId === contract.requiredA52RevisionId && receipt.decision === contract.requiredA52Decision && receipt.fixtureMode === false && receipt.saleEnabled === false && sourceStable && timelineValid;
  return { ok, reason: ok ? null : "a52_receipt_semantic_invalid", decision: receipt.decision, manifestSha256, receiptSha256, sourceStable: Boolean(sourceStable), timelineValid };
}
function safeUrl(raw, kind) {
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: "invalid_url" }; }
  if (url.username || url.password || url.hash) return { ok: false, reason: "url_credentials_or_fragment_forbidden" };
  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (fixtureMode && local && url.protocol === "http:") return { ok: true, url, hostClass: `fixture_${kind}` };
  if (url.protocol !== "https:") return { ok: false, reason: "https_required" };
  if (local) return { ok: false, reason: "localhost_not_staging" };
  if (contract.stagingSafety.rejectHostnameTokens.some((token) => host.includes(token))) return { ok: false, reason: "production_like_hostname" };
  if (kind === "staging" && !contract.stagingSafety.requireHostnameHint.some((token) => host.includes(token))) return { ok: false, reason: "staging_hostname_hint_missing" };
  if (net.isIP(host) && isPrivateIp(host)) return { ok: false, reason: "private_ip_literal_forbidden" };
  return { ok: true, url, hostClass: kind };
}
function isPrivateIp(address) {
  if (net.isIP(address) === 4) {
    const parts = address.split(".").map(Number);
    return parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || parts[0] === 0 || parts[0] >= 224;
  }
  if (net.isIP(address) === 6) {
    const value = address.toLowerCase();
    return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb");
  }
  return false;
}
async function verifyResolvedHosts(urls) {
  if (fixtureMode) return { ok: true, fixture: true, hosts: [] };
  const hosts = [...new Set(Object.values(urls).map((url) => url.hostname))];
  const rows = [];
  for (const host of hosts) {
    const resolved = await dns.lookup(host, { all: true, verbatim: true });
    if (!resolved.length) return { ok: false, reason: `dns_empty:${host}`, hosts: rows };
    const privateRows = resolved.filter((row) => isPrivateIp(row.address));
    rows.push({ hostSha256: shaText(host), addressCount: resolved.length, privateCount: privateRows.length });
    if (privateRows.length) return { ok: false, reason: `private_dns_target:${host}`, hosts: rows };
  }
  return { ok: true, hosts: rows };
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
async function requestJson(target, options = {}, requestStep = "request") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request_timeout")), contract.budgets.requestTimeoutMs);
  const sentAtMs = Date.now();
  journalStep(requestStep, "REQUEST_SENT", { targetOriginSha256: shaText(target.origin), method: options.method ?? "GET" });
  try {
    const response = await fetch(target, { ...options, redirect: "manual", cache: "no-store", signal: controller.signal });
    const json = await boundedJson(response);
    const receivedAtMs = Date.now();
    journalStep(requestStep, "RESPONSE_RECEIVED", { status: response.status, elapsedMs: receivedAtMs - sentAtMs });
    return { response, json, sentAtMs, receivedAtMs };
  } finally { clearTimeout(timer); }
}
function bearer(secret, extra = {}) {
  return { authorization: `Bearer ${secret}`, accept: "application/json", "content-type": "application/json", "cache-control": "no-store", ...extra };
}
function baseBinding(sourceFingerprint) {
  return { runId, currentRevisionId: contract.revisionId, parentRevisionId: contract.parentRevisionId, sourceFingerprint, nonceHash };
}
function nextBinding(stepId, sourceFingerprint) {
  const binding = { ...baseBinding(sourceFingerprint), stepId, previousStepDigest: chainDigest };
  chainDigest = shaText(JSON.stringify(binding));
  return binding;
}
function bindingHeaders(binding) {
  return {
    "x-velmere-run-id": binding.runId,
    "x-velmere-revision-id": binding.currentRevisionId,
    "x-velmere-parent-revision-id": binding.parentRevisionId,
    "x-velmere-source-fingerprint": binding.sourceFingerprint,
    "x-velmere-nonce-hash": binding.nonceHash,
    "x-velmere-step-id": binding.stepId,
    "x-velmere-previous-step-digest": binding.previousStepDigest
  };
}
function validateBinding(actual, expected) {
  return actual && typeof actual === "object" && Object.entries(expected).every(([key, value]) => actual[key] === value);
}
function redactIdentity(identity) {
  if (!identity) return null;
  return {
    providerIdDigest: shaText(identity.providerId),
    vendorFamilyDigest: shaText(identity.vendorFamily),
    accountDigestDigest: shaText(identity.accountDigest),
    regionDigest: shaText(identity.region),
    failureDomainDigestDigest: shaText(identity.failureDomainDigest),
    controlPlaneDigestDigest: shaText(identity.controlPlaneDigest)
  };
}
function parseProviderIdentity(value) {
  if (!value || typeof value !== "object") return null;
  const fields = ["providerId", "vendorFamily", "accountDigest", "region", "failureDomainDigest", "controlPlaneDigest"];
  if (!fields.every((key) => isNonEmptyString(value[key], 256))) return null;
  return Object.fromEntries(fields.map((key) => [key, value[key]]));
}
function checkTimeline(valueMs, minimumMs, maximumMs) {
  return valueMs !== null && valueMs >= minimumMs && valueMs <= maximumMs;
}
function failuresSince(index) { return checks.slice(index).filter((row) => !row.ok); }
function requireNoFailuresSince(index, errorCode) {
  const failures = failuresSince(index);
  if (failures.length) throw new Error(`${errorCode}:${failures.map((row) => row.id).join(",")}`);
}
async function pollJson(url, secret, binding, predicate, options = {}) {
  const attempts = fixtureMode ? 1 : Math.max(1, options.attempts ?? 1);
  const interval = fixtureMode ? 1 : Math.max(50, options.intervalMs ?? 1000);
  let latest = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    latest = await requestJson(url, { method: options.method ?? "GET", headers: bearer(secret, bindingHeaders(binding)), body: options.body ? JSON.stringify(options.body) : undefined }, `${binding.stepId}:attempt:${attempt + 1}`);
    if (predicate(latest)) return latest;
    if (attempt + 1 < attempts) await sleep(interval);
  }
  return latest;
}
async function restorePrimary(urls, secrets, sourceFingerprint, reason) {
  restorationAttempted = true;
  journalStep("restore-primary", "STARTED", { reason });
  let lastError = null;
  for (let attempt = 1; attempt <= contract.recovery.restoreAttempts; attempt += 1) {
    try {
      const binding = nextBinding(`restore-primary-${attempt}`, sourceFingerprint);
      const control = await requestJson(urls.vendor_control, { method: "POST", headers: bearer(secrets.vendorControl, bindingHeaders(binding)), body: JSON.stringify({ operation: "restore_primary", binding }) }, `restore-primary-control:${attempt}`);
      const controlBound = validateBinding(control.json?.binding, binding);
      const statusBinding = nextBinding(`restore-status-${attempt}`, sourceFingerprint);
      const status = await requestJson(urls.vendor_observer, { headers: bearer(secrets.vendorObserver, bindingHeaders(statusBinding)) }, `restore-primary-status:${attempt}`);
      const statusBound = validateBinding(status.json?.binding, statusBinding);
      const identity = parseProviderIdentity(status.json?.providerIdentity);
      const restored = [200, 202].includes(control.response.status) && control.json?.restored === true && controlBound && status.response.status === 200 && statusBound && identity && primaryIdentity && identity.providerId === primaryIdentity.providerId && status.json?.primaryCredentialActive === true && isFiniteNumber(status.json?.primaryTrafficSharePct) && status.json.primaryTrafficSharePct > 0 && status.json?.healthy === true && contract.telemetrySafety.allowedRestoreStates.includes(status.json?.state) && contract.telemetrySafety.allowedHealthStates.includes(status.json?.health);
      journalStep("restore-primary", restored ? "SUCCEEDED" : "FAILED_ATTEMPT", { attempt, controlStatus: control.response.status, statusStatus: status.response.status, identityMatches: Boolean(identity && primaryIdentity && identity.providerId === primaryIdentity.providerId) });
      if (restored) { restorationSucceeded = true; return { ok: true, identity, status }; }
      lastError = new Error("restore_validation_failed");
    } catch (error) {
      lastError = error;
      journalStep("restore-primary", "FAILED_ATTEMPT", { attempt, error: error instanceof Error ? error.message : String(error) });
    }
    if (attempt < contract.recovery.restoreAttempts) await sleep(fixtureMode ? 1 : contract.recovery.restoreRetryDelayMs);
  }
  recoveryError = lastError instanceof Error ? lastError.message : String(lastError ?? "restore_failed");
  return { ok: false, error: recoveryError };
}
function writeReport(extra = {}) {
  const failures = checks.filter((row) => !row.ok);
  const decision = restorationAttempted && !restorationSucceeded
    ? (fixtureMode ? "FIXTURE_FAIL" : "RECOVERY_REQUIRED")
    : fixtureMode
      ? (failures.length || fatalError ? "FIXTURE_FAIL" : "FIXTURE_PASS")
      : (failures.length || fatalError ? "ACTION_REQUIRED" : "VERIFIED_STAGING_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY");
  const report = {
    schemaVersion: "velmere.pass35.a54.strict-slo-alert-ack-vendor-exit-recovery-receipt.v1",
    revisionId: contract.revisionId,
    parentRevisionId: contract.parentRevisionId,
    runId,
    generatedAt: nowIso(),
    fixtureMode,
    decision,
    status: decision,
    stage,
    truthBoundary: contract.truthBoundary,
    fatalError,
    recovery: { mutationStarted, restorationAttempted, restorationSucceeded, recoveryError },
    productionSloProven: false,
    contractualSlaProven: false,
    productionVendorExitProven: false,
    continuousMonitoringProven: false,
    independentAssuranceProven: false,
    liveProven: false,
    saleEnabled: false,
    sourceFingerprint: { before: sourceBefore?.digest ?? null, after: sourceAfter?.digest ?? null, rows: sourceAfter?.rows ?? sourceBefore?.rows ?? 0, manifestSha256: sourceBefore?.manifestSha256 ?? null },
    providerIdentity: { primary: redactIdentity(primaryIdentity), alternate: redactIdentity(alternateIdentity) },
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length, journalRows: journal.length },
    failures,
    checks,
    journalDigest: shaText(JSON.stringify(journal)),
    ...extra
  };
  const secretNeedles = Object.values({
    telemetry: process.env.VELMERE_A54_TELEMETRY_BEARER_SECRET,
    alertTrigger: process.env.VELMERE_A54_ALERT_TRIGGER_BEARER_SECRET,
    alertObserver: process.env.VELMERE_A54_ALERT_OBSERVER_BEARER_SECRET,
    ack: process.env.VELMERE_A54_ACK_ACTOR_BEARER_SECRET,
    vendorControl: process.env.VELMERE_A54_VENDOR_CONTROL_BEARER_SECRET,
    vendorObserver: process.env.VELMERE_A54_VENDOR_OBSERVER_BEARER_SECRET,
    service: process.env.VELMERE_A54_SERVICE_PROBE_BEARER_SECRET,
    primaryCredential: process.env.VELMERE_A54_PRIMARY_CREDENTIAL_SECRET
  }).filter(Boolean);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (secretNeedles.some((needle) => serialized.includes(needle))) throw new Error("evidence_secret_leak_detected");
  fs.mkdirSync(artifactsRoot, { recursive: true });
  fs.writeFileSync(outputJson, serialized);
  fs.writeFileSync(runOutputJson, serialized);
  fs.writeFileSync(outputMd, `# PASS35 A54 — strict SLO, alert/ACK, vendor exit and recovery\n\nDecision: **${decision}**\n\n- Checks: ${report.summary.checks}\n- Passed: ${report.summary.passed}\n- Failed: ${report.summary.failed}\n- Mutation started: ${mutationStarted}\n- Restoration attempted: ${restorationAttempted}\n- Restoration succeeded: ${restorationSucceeded}\n- Production SLO proven: false\n- Contractual SLA proven: false\n- Production vendor exit proven: false\n- Independent assurance proven: false\n- Sale enabled: false\n\n${fatalError ? `Fatal error: \`${fatalError}\`\n\n` : ""}${failures.length ? "## Failures\n\n" + failures.map((row) => `- ${row.id}: ${JSON.stringify(row.detail)}`).join("\n") : "All declared A54 checks passed within the bounded fixture/staging truth boundary."}\n`);
  return report;
}

async function main() {
  acquireLock();
  addCheck("exclusive-run-lock-acquired", true, { runId });
  journalStep("run", "STARTED", { fixtureMode });
  stage = "preflight";
  const preflightStart = checks.length;
  sourceBefore = verifySourceManifest();
  addCheck("source-manifest-valid", sourceBefore.ok, { rows: sourceBefore.rows, digest: sourceBefore.digest, manifestSha256: sourceBefore.manifestSha256, reason: sourceBefore.reason });
  const expectedManifestSha = String(process.env.VELMERE_A54_EXPECTED_SOURCE_MANIFEST_SHA256 ?? "").toLowerCase();
  addCheck("source-manifest-external-anchor", fixtureMode || (isSha256(expectedManifestSha) && expectedManifestSha === sourceBefore.manifestSha256), { expectedPresent: Boolean(expectedManifestSha), observed: sourceBefore.manifestSha256, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);
  const parent = verifyParentA52Evidence();
  addCheck("precondition-a52-evidence-bound", parent.ok, parent, fixtureMode ? "FIXTURE_PASS" : undefined);
  const npmObserved = currentNpmVersion();
  addCheck("runtime-exact", fixtureMode || (process.versions.node === contract.runtime.node && npmObserved === contract.runtime.npm), { observed: { node: process.versions.node, npm: npmObserved }, expected: contract.runtime, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);
  const confirmation = process.env.VELMERE_A54_CONFIRM ?? "";
  addCheck("confirmation-token", confirmation === contract.confirmationToken, { present: Boolean(confirmation) });

  const urlNames = [
    ["staging", "VELMERE_A54_STAGING_BASE_URL"], ["slo_query", "VELMERE_A54_SLO_QUERY_URL"],
    ["alert_trigger", "VELMERE_A54_ALERT_TRIGGER_URL"], ["alert_observer", "VELMERE_A54_ALERT_OBSERVER_URL"],
    ["oncall_ack", "VELMERE_A54_ONCALL_ACK_URL"], ["vendor_control", "VELMERE_A54_VENDOR_CONTROL_URL"],
    ["vendor_observer", "VELMERE_A54_VENDOR_OBSERVER_URL"], ["service_probe", "VELMERE_A54_SERVICE_PROBE_URL"],
    ["primary_credential_probe", "VELMERE_A54_PRIMARY_CREDENTIAL_PROBE_URL"]
  ];
  const urls = {};
  const urlFailures = [];
  for (const [kind, name] of urlNames) {
    const result = safeUrl(process.env[name] ?? "", kind === "staging" ? "staging" : "bridge");
    if (result.ok) urls[kind] = result.url; else urlFailures.push({ name, reason: result.reason });
  }
  addCheck("url-safety", urlFailures.length === 0, { failures: urlFailures });
  const observerOriginsIndependent = fixtureMode || (urls.alert_trigger?.origin !== urls.alert_observer?.origin && urls.vendor_control?.origin !== urls.vendor_observer?.origin && urls.vendor_control?.origin !== urls.primary_credential_probe?.origin);
  addCheck("observer-origins-independent", Boolean(observerOriginsIndependent), { fixture: fixtureMode, alertOriginsDiffer: urls.alert_trigger?.origin !== urls.alert_observer?.origin, vendorOriginsDiffer: urls.vendor_control?.origin !== urls.vendor_observer?.origin, credentialProbeOriginDiffers: urls.vendor_control?.origin !== urls.primary_credential_probe?.origin }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const secrets = {
    telemetry: process.env.VELMERE_A54_TELEMETRY_BEARER_SECRET ?? "",
    alertTrigger: process.env.VELMERE_A54_ALERT_TRIGGER_BEARER_SECRET ?? "",
    alertObserver: process.env.VELMERE_A54_ALERT_OBSERVER_BEARER_SECRET ?? "",
    ackActor: process.env.VELMERE_A54_ACK_ACTOR_BEARER_SECRET ?? "",
    vendorControl: process.env.VELMERE_A54_VENDOR_CONTROL_BEARER_SECRET ?? "",
    vendorObserver: process.env.VELMERE_A54_VENDOR_OBSERVER_BEARER_SECRET ?? "",
    serviceProbe: process.env.VELMERE_A54_SERVICE_PROBE_BEARER_SECRET ?? "",
    primaryCredential: process.env.VELMERE_A54_PRIMARY_CREDENTIAL_SECRET ?? ""
  };
  const secretValues = Object.values(secrets);
  const secretsStrong = secretValues.every((value) => typeof value === "string" && value.length >= contract.bridgeSafety.minimumSecretLength);
  const secretsDistinct = new Set(secretValues).size === secretValues.length;
  const projectClass = process.env.VELMERE_A54_PROJECT_CLASS ?? "";
  addCheck("secret-boundary", secretsStrong && secretsDistinct && projectClass === contract.bridgeSafety.projectClass, { allPresent: secretValues.every(Boolean), allStrong: secretsStrong, allDistinct: secretsDistinct, projectClass });
  requireNoFailuresSince(preflightStart, "a54_preflight_failed");

  const resolved = await verifyResolvedHosts(urls);
  addCheck("dns-target-safety", resolved.ok, resolved, fixtureMode ? "FIXTURE_PASS" : undefined);
  requireNoFailuresSince(preflightStart, "a54_preflight_failed");
  journalStep("preflight", "PASSED", { checks: checks.length - preflightStart });

  nonceHash = shaText(crypto.randomBytes(32));
  const sourceFingerprint = sourceBefore.digest;
  const clockSkewMs = contract.budgets.maximumClockSkewSeconds * 1000;

  stage = "telemetry_and_alert_pre_exit";
  const preExitStart = checks.length;
  const telemetryBinding = nextBinding("telemetry-query", sourceFingerprint);
  const telemetry = await requestJson(urls.slo_query, { headers: bearer(secrets.telemetry, bindingHeaders(telemetryBinding)) }, "telemetry-query");
  const telemetryBound = validateBinding(telemetry.json?.binding, telemetryBinding);
  const windowStart = parseTime(telemetry.json?.windowStart);
  const windowEnd = parseTime(telemetry.json?.windowEnd);
  const windowSeconds = windowStart !== null && windowEnd !== null ? (windowEnd - windowStart) / 1000 : null;
  const windowAgeSeconds = windowEnd !== null ? (telemetry.receivedAtMs - windowEnd) / 1000 : null;
  const sampleCount = telemetry.json?.sampleCount;
  const successCount = telemetry.json?.successCount;
  const errorCount = telemetry.json?.errorCount;
  const availabilityReported = telemetry.json?.availabilityPct;
  const p50 = telemetry.json?.p50Ms;
  const p95 = telemetry.json?.p95Ms;
  const p99 = telemetry.json?.p99Ms;
  const errorBudget = telemetry.json?.errorBudgetConsumedPct;
  const countsValid = isIntegerInRange(sampleCount, contract.budgets.minimumSamples, contract.budgets.maximumSamples) && isIntegerInRange(successCount, 0, sampleCount) && isIntegerInRange(errorCount, 0, sampleCount) && successCount + errorCount === sampleCount;
  const availabilityComputed = countsValid ? (successCount / sampleCount) * 100 : null;
  addCheck("telemetry-response-bound", telemetry.response.status === 200 && telemetryBound, { status: telemetry.response.status, bindingMatched: telemetryBound });
  addCheck("slo-window-current-and-bounded", windowStart !== null && windowEnd !== null && windowStart < windowEnd && windowSeconds >= contract.budgets.minimumWindowSeconds && windowSeconds <= contract.budgets.maximumWindowSeconds && windowAgeSeconds >= -contract.budgets.maximumClockSkewSeconds && windowAgeSeconds <= contract.budgets.maximumWindowAgeSeconds && contract.telemetrySafety.allowedWindowClasses.includes(telemetry.json?.windowClass), { windowSeconds, windowAgeSeconds, class: telemetry.json?.windowClass });
  addCheck("slo-count-algebra-valid", countsValid, { sampleCount, successCount, errorCount });
  addCheck("slo-availability-consistent", availabilityComputed !== null && isFiniteNumber(availabilityReported) && availabilityReported >= 0 && availabilityReported <= 100 && Math.abs(availabilityComputed - availabilityReported) <= contract.budgets.availabilityTolerancePct, { availabilityComputed, availabilityReported });
  addCheck("slo-availability-target", isFiniteNumber(availabilityReported) && availabilityReported >= contract.budgets.availabilityTargetPct, { availabilityReported, target: contract.budgets.availabilityTargetPct });
  const percentilesValid = [p50, p95, p99].every(isNonNegativeFinite) && p50 <= p95 && p95 <= p99;
  addCheck("slo-percentiles-valid", percentilesValid, { p50, p95, p99 });
  addCheck("slo-p95-target", isNonNegativeFinite(p95) && p95 <= contract.budgets.p95MaximumMs, { p95, maximum: contract.budgets.p95MaximumMs });
  addCheck("slo-p99-target", isNonNegativeFinite(p99) && p99 <= contract.budgets.p99MaximumMs, { p99, maximum: contract.budgets.p99MaximumMs });
  addCheck("error-budget-within-limit", isFiniteNumber(errorBudget) && errorBudget >= 0 && errorBudget <= contract.budgets.maximumErrorBudgetConsumedPct, { errorBudget, maximum: contract.budgets.maximumErrorBudgetConsumedPct });
  addCheck("telemetry-source-bound", telemetry.json?.sourceRevisionId === contract.revisionId && telemetry.json?.fixture === false && isNonEmptyString(telemetry.json?.telemetrySource, 256), { revisionMatched: telemetry.json?.sourceRevisionId === contract.revisionId, fixture: telemetry.json?.fixture, telemetrySourcePresent: isNonEmptyString(telemetry.json?.telemetrySource, 256) });

  const baselineBinding = nextBinding("vendor-baseline", sourceFingerprint);
  const baseline = await requestJson(urls.vendor_observer, { headers: bearer(secrets.vendorObserver, bindingHeaders(baselineBinding)) }, "vendor-baseline");
  const baselineBound = validateBinding(baseline.json?.binding, baselineBinding);
  primaryIdentity = parseProviderIdentity(baseline.json?.providerIdentity);
  addCheck("baseline-provider-healthy", baseline.response.status === 200 && baselineBound && baseline.json?.healthy === true && contract.telemetrySafety.allowedHealthStates.includes(baseline.json?.health) && primaryIdentity && baseline.json?.primaryCredentialActive === true && isFiniteNumber(baseline.json?.primaryTrafficSharePct) && baseline.json.primaryTrafficSharePct > 0, { status: baseline.response.status, bindingMatched: baselineBound, healthy: baseline.json?.healthy, identityValid: Boolean(primaryIdentity), credentialActive: baseline.json?.primaryCredentialActive });

  const triggerBinding = nextBinding("alert-trigger", sourceFingerprint);
  const trigger = await requestJson(urls.alert_trigger, { method: "POST", headers: bearer(secrets.alertTrigger, bindingHeaders(triggerBinding)), body: JSON.stringify({ alertType: "a54_acceptance_probe", binding: triggerBinding }) }, "alert-trigger");
  const triggerBound = validateBinding(trigger.json?.binding, triggerBinding);
  const triggeredAt = parseTime(trigger.json?.triggeredAt);
  const alertId = isNonEmptyString(trigger.json?.alertId, 256) ? trigger.json.alertId : null;
  addCheck("alert-triggered", [200, 201, 202].includes(trigger.response.status) && triggerBound && trigger.json?.triggered === true && alertId && checkTimeline(triggeredAt, trigger.sentAtMs - clockSkewMs, trigger.receivedAtMs + clockSkewMs), { status: trigger.response.status, bindingMatched: triggerBound, triggered: trigger.json?.triggered, alertIdPresent: Boolean(alertId), timelineValid: checkTimeline(triggeredAt, trigger.sentAtMs - clockSkewMs, trigger.receivedAtMs + clockSkewMs) });

  const observerBinding = nextBinding("alert-observer", sourceFingerprint);
  const alertStatus = await pollJson(urls.alert_observer, secrets.alertObserver, observerBinding, (result) => result.json?.delivered === true, { method: "POST", body: { alertIdDigest: alertId ? shaText(alertId) : null, binding: observerBinding }, attempts: Math.ceil((contract.budgets.alertDeliverySlaSeconds * 1000) / contract.polling.alertPollIntervalMs) + 1, intervalMs: contract.polling.alertPollIntervalMs });
  const observerBound = validateBinding(alertStatus?.json?.binding, observerBinding);
  const deliveredAt = parseTime(alertStatus?.json?.deliveredAt);
  const deliverySeconds = triggeredAt !== null && deliveredAt !== null ? (deliveredAt - triggeredAt) / 1000 : null;
  addCheck("alert-delivered-by-independent-observer", alertStatus?.response.status === 200 && observerBound && alertStatus?.json?.delivered === true && alertStatus?.json?.alertIdDigest === shaText(alertId) && isNonEmptyString(alertStatus?.json?.observerFamily, 256), { status: alertStatus?.response.status, bindingMatched: observerBound, delivered: alertStatus?.json?.delivered, alertMatched: alertStatus?.json?.alertIdDigest === shaText(alertId), observerFamilyPresent: isNonEmptyString(alertStatus?.json?.observerFamily, 256) });
  addCheck("alert-delivery-timeline-and-sla", deliverySeconds !== null && deliverySeconds >= 0 && deliverySeconds <= contract.budgets.alertDeliverySlaSeconds && deliveredAt <= Date.now() + clockSkewMs, { deliverySeconds, maximum: contract.budgets.alertDeliverySlaSeconds, notFuture: deliveredAt !== null && deliveredAt <= Date.now() + clockSkewMs });

  const ackBinding = nextBinding("oncall-ack", sourceFingerprint);
  const ack = await pollJson(urls.oncall_ack, secrets.ackActor, ackBinding, (result) => result.json?.acknowledged === true, { method: "POST", body: { alertIdDigest: alertId ? shaText(alertId) : null, binding: ackBinding }, attempts: Math.ceil((contract.budgets.acknowledgementSlaSeconds * 1000) / contract.polling.ackPollIntervalMs) + 1, intervalMs: contract.polling.ackPollIntervalMs });
  const ackBound = validateBinding(ack?.json?.binding, ackBinding);
  const acknowledgedAt = parseTime(ack?.json?.acknowledgedAt);
  const ackSeconds = deliveredAt !== null && acknowledgedAt !== null ? (acknowledgedAt - deliveredAt) / 1000 : null;
  addCheck("oncall-acknowledged-by-distinct-actor", [200, 201, 202].includes(ack?.response.status) && ackBound && ack?.json?.acknowledged === true && ack?.json?.alertIdDigest === shaText(alertId) && ack?.json?.actorRole === "oncall" && isNonEmptyString(ack?.json?.actorDigest, 256), { status: ack?.response.status, bindingMatched: ackBound, acknowledged: ack?.json?.acknowledged, alertMatched: ack?.json?.alertIdDigest === shaText(alertId), actorRole: ack?.json?.actorRole, actorDigestPresent: isNonEmptyString(ack?.json?.actorDigest, 256) });
  addCheck("acknowledgement-timeline-and-sla", ackSeconds !== null && ackSeconds >= 0 && ackSeconds <= contract.budgets.acknowledgementSlaSeconds && acknowledgedAt <= Date.now() + clockSkewMs, { acknowledgementSeconds: ackSeconds, maximum: contract.budgets.acknowledgementSlaSeconds, notFuture: acknowledgedAt !== null && acknowledgedAt <= Date.now() + clockSkewMs });
  requireNoFailuresSince(preExitStart, "a54_pre_exit_gate_failed");
  journalStep("pre-exit-gate", "PASSED", { checks: checks.length - preExitStart });

  stage = "vendor_exit_mutation";
  let exitRequestedAt;
  let changedAt;
  let exitSeconds;
  let serviceAvailabilityPct;
  let probeP95;
  let freshnessMax;
  let probeCount;
  try {
    const exitBinding = nextBinding("vendor-exit-request", sourceFingerprint);
    const exitRequested = await requestJson(urls.vendor_control, { method: "POST", headers: bearer(secrets.vendorControl, bindingHeaders(exitBinding)), body: JSON.stringify({ operation: "begin_vendor_exit", binding: exitBinding }) }, "vendor-exit-request");
    const exitBound = validateBinding(exitRequested.json?.binding, exitBinding);
    exitRequestedAt = parseTime(exitRequested.json?.requestedAt);
    addCheck("vendor-exit-requested", [200, 202].includes(exitRequested.response.status) && exitBound && exitRequested.json?.accepted === true && checkTimeline(exitRequestedAt, exitRequested.sentAtMs - clockSkewMs, exitRequested.receivedAtMs + clockSkewMs), { status: exitRequested.response.status, bindingMatched: exitBound, accepted: exitRequested.json?.accepted, timelineValid: checkTimeline(exitRequestedAt, exitRequested.sentAtMs - clockSkewMs, exitRequested.receivedAtMs + clockSkewMs) });
    requireNoFailuresSince(checks.length - 1, "vendor_exit_request_failed");
    mutationStarted = true;
    journalStep("vendor-exit", "MUTATION_STARTED", { requestedAtDigest: exitRequestedAt ? shaText(exitRequestedAt) : null });

    const exitStatusBinding = nextBinding("vendor-exit-observer", sourceFingerprint);
    const exited = await pollJson(urls.vendor_observer, secrets.vendorObserver, exitStatusBinding, (result) => result.json?.alternateProviderActive === true, { attempts: Math.ceil((contract.budgets.vendorExitSlaSeconds * 1000) / contract.polling.vendorPollIntervalMs) + 1, intervalMs: contract.polling.vendorPollIntervalMs });
    const exitStatusBound = validateBinding(exited?.json?.binding, exitStatusBinding);
    changedAt = parseTime(exited?.json?.changedAt);
    exitSeconds = exitRequestedAt !== null && changedAt !== null ? (changedAt - exitRequestedAt) / 1000 : null;
    alternateIdentity = parseProviderIdentity(exited?.json?.providerIdentity);
    addCheck("vendor-exit-observer-bound", exited?.response.status === 200 && exitStatusBound, { status: exited?.response.status, bindingMatched: exitStatusBound });
    addCheck("primary-traffic-zero", isFiniteNumber(exited?.json?.primaryTrafficSharePct) && exited.json.primaryTrafficSharePct === 0, { primaryTrafficSharePct: exited?.json?.primaryTrafficSharePct });
    addCheck("primary-credential-revoked-and-cache-purged", exited?.json?.primaryCredentialActive === false && exited?.json?.cachePurged === true, { primaryCredentialActive: exited?.json?.primaryCredentialActive, cachePurged: exited?.json?.cachePurged });
    const identitiesIndependent = primaryIdentity && alternateIdentity && primaryIdentity.providerId !== alternateIdentity.providerId && primaryIdentity.vendorFamily !== alternateIdentity.vendorFamily && primaryIdentity.accountDigest !== alternateIdentity.accountDigest && primaryIdentity.failureDomainDigest !== alternateIdentity.failureDomainDigest && primaryIdentity.controlPlaneDigest !== alternateIdentity.controlPlaneDigest;
    addCheck("alternate-provider-independent", exited?.json?.alternateProviderActive === true && alternateIdentity && identitiesIndependent && contract.telemetrySafety.allowedExitStates.includes(exited?.json?.state), { alternateActive: exited?.json?.alternateProviderActive, identityValid: Boolean(alternateIdentity), providerIdDiffers: Boolean(primaryIdentity && alternateIdentity && primaryIdentity.providerId !== alternateIdentity.providerId), vendorFamilyDiffers: Boolean(primaryIdentity && alternateIdentity && primaryIdentity.vendorFamily !== alternateIdentity.vendorFamily), accountDiffers: Boolean(primaryIdentity && alternateIdentity && primaryIdentity.accountDigest !== alternateIdentity.accountDigest), failureDomainDiffers: Boolean(primaryIdentity && alternateIdentity && primaryIdentity.failureDomainDigest !== alternateIdentity.failureDomainDigest), controlPlaneDiffers: Boolean(primaryIdentity && alternateIdentity && primaryIdentity.controlPlaneDigest !== alternateIdentity.controlPlaneDigest), state: exited?.json?.state });
    addCheck("vendor-exit-timeline-and-sla", exitSeconds !== null && exitSeconds >= 0 && exitSeconds <= contract.budgets.vendorExitSlaSeconds && changedAt <= Date.now() + clockSkewMs, { exitSeconds, maximum: contract.budgets.vendorExitSlaSeconds, notFuture: changedAt !== null && changedAt <= Date.now() + clockSkewMs });
    requireNoFailuresSince(checks.length - 5, "vendor_exit_validation_failed");

    const credentialBinding = nextBinding("primary-credential-negative-probe", sourceFingerprint);
    const credentialProbe = await requestJson(urls.primary_credential_probe, { headers: bearer(secrets.primaryCredential, bindingHeaders(credentialBinding)) }, "primary-credential-negative-probe");
    const credentialBound = validateBinding(credentialProbe.json?.binding, credentialBinding);
    addCheck("revoked-primary-credential-rejected", [401, 403].includes(credentialProbe.response.status) && credentialBound && credentialProbe.json?.credentialAccepted === false, { status: credentialProbe.response.status, bindingMatched: credentialBound, credentialAccepted: credentialProbe.json?.credentialAccepted });
    requireNoFailuresSince(checks.length - 1, "credential_revocation_probe_failed");

    const probes = [];
    for (let index = 0; index < contract.budgets.minimumServiceProbes; index += 1) {
      const probeBinding = nextBinding(`service-probe-${index}`, sourceFingerprint);
      const probe = await requestJson(urls.service_probe, { headers: bearer(secrets.serviceProbe, { ...bindingHeaders(probeBinding), "x-velmere-probe-index": String(index), "x-velmere-cache-buster": crypto.randomBytes(12).toString("hex") }) }, `service-probe:${index}`);
      const identity = parseProviderIdentity(probe.json?.providerIdentity);
      const observedAt = parseTime(probe.json?.observedAt);
      probes.push({
        status: probe.response.status,
        bindingMatched: validateBinding(probe.json?.binding, probeBinding),
        available: probe.json?.available === true,
        identityMatches: Boolean(identity && alternateIdentity && identity.providerId === alternateIdentity.providerId),
        latencyMs: probe.json?.latencyMs,
        freshnessSeconds: probe.json?.freshnessSeconds,
        dataFloorMet: probe.json?.dataFloorMet === true,
        observedAt,
        observedTimelineValid: checkTimeline(observedAt, probe.sentAtMs - clockSkewMs, probe.receivedAtMs + clockSkewMs),
        sampleId: probe.json?.sampleId,
        payloadDigest: probe.json?.payloadDigest
      });
      if (index + 1 < contract.budgets.minimumServiceProbes) await sleep(fixtureMode ? 1 : contract.polling.serviceProbeIntervalMs);
    }
    probeCount = probes.length;
    const sampleIdsUnique = probes.every((row) => isNonEmptyString(row.sampleId, 256)) && new Set(probes.map((row) => row.sampleId)).size === probes.length;
    const payloadDigestsValid = probes.every((row) => isSha256(row.payloadDigest));
    const numbersValid = probes.every((row) => isNonNegativeFinite(row.latencyMs) && isNonNegativeFinite(row.freshnessSeconds));
    const timelinesValid = probes.every((row) => row.observedTimelineValid);
    const successful = probes.filter((row) => row.status === 200 && row.bindingMatched && row.available && row.identityMatches && row.dataFloorMet && row.observedTimelineValid && isNonNegativeFinite(row.latencyMs) && isNonNegativeFinite(row.freshnessSeconds) && isSha256(row.payloadDigest));
    serviceAvailabilityPct = probes.length ? (successful.length / probes.length) * 100 : null;
    probeP95 = numbersValid ? percentile(probes.map((row) => row.latencyMs), 95) : null;
    freshnessMax = numbersValid ? Math.max(...probes.map((row) => row.freshnessSeconds)) : null;
    addCheck("service-probes-complete-and-bound", probes.length >= contract.budgets.minimumServiceProbes && probes.every((row) => row.status === 200 && row.bindingMatched && row.identityMatches), { probes: probes.length, minimum: contract.budgets.minimumServiceProbes, allBound: probes.every((row) => row.bindingMatched), allIdentityMatched: probes.every((row) => row.identityMatches) });
    addCheck("service-probe-schema-valid", numbersValid && timelinesValid && sampleIdsUnique && payloadDigestsValid, { numbersValid, timelinesValid, sampleIdsUnique, payloadDigestsValid });
    addCheck("service-availability-floor", isFiniteNumber(serviceAvailabilityPct) && serviceAvailabilityPct >= contract.budgets.serviceAvailabilityFloorPct, { serviceAvailabilityPct, successful: successful.length, probes: probes.length, floor: contract.budgets.serviceAvailabilityFloorPct });
    addCheck("service-latency-floor", isNonNegativeFinite(probeP95) && probeP95 <= contract.budgets.serviceP95MaximumMs, { p95Ms: probeP95, maximum: contract.budgets.serviceP95MaximumMs });
    addCheck("service-freshness-floor", isNonNegativeFinite(freshnessMax) && freshnessMax <= contract.budgets.serviceFreshnessMaximumSeconds, { maximumObservedSeconds: freshnessMax, maximum: contract.budgets.serviceFreshnessMaximumSeconds });
    requireNoFailuresSince(checks.length - 5, "service_probe_validation_failed");
  } finally {
    if (mutationStarted && !restorationSucceeded) {
      const recovery = await restorePrimary(urls, secrets, sourceFingerprint, fatalError ?? "normal_finally");
      addCheck("vendor-restored-in-finally", recovery.ok, { restorationAttempted, restorationSucceeded, error: recovery.error ?? null });
      addCheck("postcondition-healthy", recovery.ok && recovery.status?.json?.healthy === true && contract.telemetrySafety.allowedHealthStates.includes(recovery.status?.json?.health), { healthy: recovery.status?.json?.healthy, health: recovery.status?.json?.health });
    }
  }

  stage = "postcondition";
  sourceAfter = verifySourceManifest();
  addCheck("source-fingerprint-unchanged", sourceBefore.ok && sourceAfter.ok && sourceBefore.digest === sourceAfter.digest && sourceBefore.manifestSha256 === sourceAfter.manifestSha256, { before: sourceBefore.digest, after: sourceAfter.digest, manifestBefore: sourceBefore.manifestSha256, manifestAfter: sourceAfter.manifestSha256, reason: sourceAfter.reason });
  addCheck("evidence-redaction", true, { enforcedAtSerialization: true });
  const report = writeReport({ boundedMetrics: { windowSeconds, windowAgeSeconds, sampleCount, availabilityPct: availabilityReported, p50Ms: p50, p95Ms: p95, p99Ms: p99, errorBudgetConsumedPct: errorBudget, deliverySeconds, acknowledgementSeconds: ackSeconds, exitSeconds, probeCount, serviceAvailabilityPct, serviceP95Ms: probeP95, freshnessMaximumSeconds: freshnessMax } });
  journalStep("run", report.decision === "FIXTURE_PASS" || report.decision.startsWith("VERIFIED_") ? "COMPLETED" : "FAILED", { decision: report.decision });
  console.log(JSON.stringify({ decision: report.decision, summary: report.summary, output: path.relative(root, outputJson).replaceAll("\\", "/"), runId }, null, 2));
  if (!(report.decision === "FIXTURE_PASS" || report.decision.startsWith("VERIFIED_"))) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  fatalError = error instanceof Error ? error.message : String(error);
  journalStep(stage, "ERROR", { error: fatalError });
  try {
    if (mutationStarted && !restorationSucceeded) {
      const urls = {};
      const mappings = {
        vendor_control: "VELMERE_A54_VENDOR_CONTROL_URL",
        vendor_observer: "VELMERE_A54_VENDOR_OBSERVER_URL"
      };
      for (const [key, envName] of Object.entries(mappings)) {
        const parsed = safeUrl(process.env[envName] ?? "", "bridge");
        if (parsed.ok) urls[key] = parsed.url;
      }
      const secrets = {
        vendorControl: process.env.VELMERE_A54_VENDOR_CONTROL_BEARER_SECRET ?? "",
        vendorObserver: process.env.VELMERE_A54_VENDOR_OBSERVER_BEARER_SECRET ?? ""
      };
      if (urls.vendor_control && urls.vendor_observer && sourceBefore?.digest) {
        const recovery = await restorePrimary(urls, secrets, sourceBefore.digest, fatalError);
        addCheck("vendor-restored-after-error", recovery.ok, { restorationAttempted, restorationSucceeded, error: recovery.error ?? null });
      }
    }
  } catch (recoveryFailure) {
    recoveryError = recoveryFailure instanceof Error ? recoveryFailure.message : String(recoveryFailure);
    addCheck("vendor-restored-after-error", false, { error: recoveryError });
  }
  try {
    sourceAfter = verifySourceManifest();
    if (sourceBefore) addCheck("source-fingerprint-unchanged", sourceBefore.ok && sourceAfter.ok && sourceBefore.digest === sourceAfter.digest && sourceBefore.manifestSha256 === sourceAfter.manifestSha256, { before: sourceBefore.digest, after: sourceAfter.digest, manifestBefore: sourceBefore.manifestSha256, manifestAfter: sourceAfter.manifestSha256, reason: sourceAfter.reason });
    const report = writeReport();
    console.error(JSON.stringify({ decision: report.decision, fatalError, recovery: report.recovery, summary: report.summary, runId }, null, 2));
  } catch (reportError) {
    console.error(JSON.stringify({ decision: fixtureMode ? "FIXTURE_FAIL" : "RECOVERY_REQUIRED", fatalError, recoveryError, reportError: reportError instanceof Error ? reportError.message : String(reportError), runId }, null, 2));
  }
  process.exitCode = 1;
} finally {
  releaseLock();
}
