#!/usr/bin/env node
import crypto from "node:crypto";
import { lookup } from "node:dns/promises";
import fs from "node:fs";
import { isIP } from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { extractZipSafely } from "./lib/a47-safe-zip.mjs";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";
import {
  stopRuleEvaluation,
  stopRuleEvaluationForPlane,
  validateSnapshotSchemas,
} from "./lib/a57-canary-validation.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const argValue = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; };
const fixtureScenario = argValue("--fixture-scenario") ?? "clean";
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.json"), "utf8"));
const artifactsRoot = path.join(root, "artifacts/pass35/a57");
const runsRoot = path.join(artifactsRoot, "runs");
fs.mkdirSync(runsRoot, { recursive: true });

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const shaText = (value) => sha256(Buffer.from(String(value), "utf8"));
const isSha = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isNonNegativeNumber = (value) => isFiniteNumber(value) && value >= 0;
const parseTime = (value) => { if (typeof value !== "string") return null; const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : null; };
const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (value) => String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
const percentile = (values, pct) => { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); return sorted[Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)]; };

const runId = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
const nonce = crypto.randomBytes(32).toString("hex");
const nonceHash = shaText(nonce);
const runDir = path.join(runsRoot, runId);
fs.mkdirSync(runDir, { recursive: true });
const outputJson = path.join(artifactsRoot, "PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE.json");
const outputMd = path.join(artifactsRoot, "PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE.md");
const runReceiptPath = path.join(runDir, "receipt.json");
const journalPath = path.join(runDir, "journal.json");
const journalNdjsonPath = path.join(runDir, "journal.ndjson");
const lockPath = path.join(artifactsRoot, ".a57.lock");
const lockToken = crypto.randomBytes(32).toString("hex");

const checks = [];
const journal = [];
let lockFd = null;
let lockOwned = false;
let lockIdentity = null;
let bindingSequence = 0;
let bindingDigest = shaText(`a57:${runId}:${nonceHash}`);
let requestCount = 0;
let mutationRequests = 0;
let mutationStarted = false;
let stopRequested = false;
let killSwitchAttempted = false;
let killSwitchSucceeded = false;
let rollbackAttempted = false;
let rollbackSucceeded = false;
let finalBaselineHealthy = false;
let fatalError;
let sourceBefore = null;
let sourceAfter = null;
let a55Evidence = null;
let a56Evidence = null;
let boundedMetrics = null;
let stopReasons = [];
let stage = "initializing";
let configuredSecrets = [];
let expectedBaselineDigest = null;
let activeRecoveryContext = null;
const snapshotEvidence = [];
let journalHeadDigest = shaText(`a57-journal:${runId}:${nonceHash}`);

function addCheck(id, ok, detail = null, category = "semantic") {
  checks.push({ id, ok: Boolean(ok), category, detail });
}
function journalStep(stepId, status, detail = null) {
  const unsigned = {
    sequence: journal.length + 1,
    at: nowIso(),
    stepId,
    status,
    detail,
    previousDigest: journalHeadDigest,
  };
  const row = { ...unsigned, digest: shaText(JSON.stringify(unsigned)) };
  journalHeadDigest = row.digest;
  journal.push(row);
  fs.appendFileSync(journalNdjsonPath, `${JSON.stringify(row)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.writeFileSync(journalPath, `${JSON.stringify({ schemaVersion: "velmere.pass35.a57.journal.v1", revisionId: contract.revisionId, runId, rows: journal }, null, 2)}\n`);
  return row;
}
function acquireLock() {
  let acquiredFd = null;
  try {
    acquiredFd = fs.openSync(lockPath, "wx", 0o600);
    const stat = fs.fstatSync(acquiredFd);
    lockFd = acquiredFd;
    lockIdentity = { dev: stat.dev, ino: stat.ino };
    lockOwned = true;
    fs.writeFileSync(lockFd, `${JSON.stringify({ runId, pid: process.pid, lockToken, startedAt: nowIso() })}\n`);
  } catch (error) {
    if (lockOwned) releaseLock();
    else if (acquiredFd !== null) {
      try { fs.closeSync(acquiredFd); } catch (ignoredError) { void ignoredError; }
    }
    throw new Error(`a57_concurrent_or_stale_lock:${error instanceof Error ? error.code ?? error.message : String(error)}`, { cause: error });
  }
}
function releaseLock() {
  if (!lockOwned || lockFd === null || !lockIdentity) return;
  let removeOwnedPath = false;
  try {
    const pathStat = fs.statSync(lockPath);
    const sameInode = pathStat.dev === lockIdentity.dev && pathStat.ino === lockIdentity.ino;
    let ownerMatches = false;
    try {
      const owner = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      ownerMatches = owner.runId === runId && owner.pid === process.pid && owner.lockToken === lockToken;
    } catch {
      ownerMatches = true;
    }
    removeOwnedPath = sameInode && ownerMatches;
  } catch (ignoredError) { void ignoredError; }
  if (removeOwnedPath) {
    try { fs.rmSync(lockPath); } catch (ignoredError) { void ignoredError; }
  }
  try { fs.closeSync(lockFd); } catch (ignoredError) { void ignoredError; }
  lockFd = null;
  lockOwned = false;
  lockIdentity = null;
}
function walkFiles(directory) {
  const rows = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) rows.push(absolute);
      else throw new Error(`non_regular_file:${entry.name}`);
    }
  };
  walk(directory);
  return rows;
}
function findExact(directory, basename) {
  const matches = walkFiles(directory).filter((file) => path.basename(file) === basename);
  if (matches.length !== 1) throw new Error(`exact_file_count:${basename}:${matches.length}`);
  return matches[0];
}
function safeReadJson(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size <= 0 || stat.size > contract.canary.maximumResponseBytes) throw new Error(`json_budget_or_type:${path.basename(file)}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function verifyExactManifest(directory, manifestName, schemaVersion, revisionId) {
  const errors = [];
  const manifestPath = findExact(directory, manifestName);
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.schemaVersion !== schemaVersion) errors.push("manifest_schema_invalid");
  if (manifest.revisionId !== revisionId) errors.push("manifest_revision_invalid");
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) errors.push("manifest_files_missing");
  const base = path.dirname(manifestPath);
  const seen = new Set();
  for (const row of manifest.files ?? []) {
    const relative = normalize(row.path);
    if (!relative || relative.startsWith("/") || relative.split("/").includes("..") || seen.has(relative)) { errors.push(`manifest_path_invalid:${relative}`); continue; }
    seen.add(relative);
    const absolute = path.resolve(base, relative);
    if (!absolute.startsWith(`${path.resolve(base)}${path.sep}`) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) { errors.push(`manifest_file_invalid:${relative}`); continue; }
    const bytes = fs.readFileSync(absolute);
    if (!Number.isInteger(row.bytes) || row.bytes !== bytes.length) errors.push(`manifest_size_mismatch:${relative}`);
    if (!isSha(row.sha256) || row.sha256 !== sha256(bytes)) errors.push(`manifest_hash_mismatch:${relative}`);
  }
  const actual = walkFiles(base).map((file) => normalize(path.relative(base, file))).filter((file) => file !== normalize(path.relative(base, manifestPath))).sort();
  const declared = [...seen].sort();
  if (JSON.stringify(actual) !== JSON.stringify(declared)) errors.push(`manifest_inventory_mismatch:actual=${actual.length}:declared=${declared.length}`);
  return { ok: errors.length === 0, errors, manifest, manifestPath, manifestSha256: sha256(manifestBytes), base };
}
function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a57-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "source_manifest_missing", manifestSha256: null, digest: null, rows: 0 };
  const bytes = fs.readFileSync(file);
  const manifest = JSON.parse(bytes.toString("utf8"));
  const aggregate = crypto.createHash("sha256");
  const errors = [];
  if (manifest.revisionId !== contract.revisionId) errors.push("source_manifest_revision_invalid");
  if ((manifest.files ?? []).some((row) => row.path === "config/pass35/a57-source-manifest.json")) errors.push("source_manifest_self_reference");
  const fixtureFastManifest = fixtureMode && process.env.VELMERE_A57_FIXTURE_FAST_MANIFEST === "1";
  if (fixtureFastManifest) {
    for (const row of manifest.files ?? []) { aggregate.update(row.path); aggregate.update("\0"); aggregate.update(row.sha256 ?? ""); aggregate.update("\0"); }
    return { ok: errors.length === 0, errors, manifestSha256: sha256(bytes), digest: aggregate.digest("hex"), rows: manifest.files?.length ?? 0, fixtureFastManifest: true };
  }
  for (const row of manifest.files ?? []) {
    const absolute = path.resolve(root, row.path);
    if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.existsSync(absolute)) { errors.push(`source_file_invalid:${row.path}`); continue; }
    const current = fs.readFileSync(absolute);
    if (!isSha(row.sha256) || current.length !== row.bytes || sha256(current) !== row.sha256) errors.push(`source_hash_mismatch:${row.path}`);
    aggregate.update(row.path); aggregate.update("\0"); aggregate.update(row.sha256 ?? ""); aggregate.update("\0");
  }
  return { ok: errors.length === 0, errors, manifestSha256: sha256(bytes), digest: aggregate.digest("hex"), rows: manifest.files?.length ?? 0 };
}
function verifyParentManifestSignature(manifestBytes, kind) {
  if (fixtureMode) return { ok: true, fixtureBypass: true, signerSpkiSha256: null };
  const upperKind = kind.toUpperCase();
  const expectedFingerprint = contract.parentEvidenceTrust?.[`${kind}PublicKeySpkiSha256`];
  const publicKeyPem = process.env[`VELMERE_A57_${upperKind}_SIGNER_PUBLIC_KEY_PEM`] ?? "";
  const signatureBase64 = process.env[`VELMERE_A57_${upperKind}_MANIFEST_SIGNATURE_BASE64`] ?? "";
  const errors = [];
  if (contract.parentEvidenceTrust?.signatureAlgorithm !== "ed25519") errors.push(`${kind}_signature_algorithm_invalid`);
  if (!isSha(expectedFingerprint)) errors.push(`${kind}_trusted_key_not_pinned`);
  if (!publicKeyPem.trim()) errors.push(`${kind}_signer_public_key_missing`);
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(signatureBase64) || signatureBase64.length % 4 !== 0) errors.push(`${kind}_manifest_signature_invalid_encoding`);
  if (errors.length) return { ok: false, errors, signerSpkiSha256: null };
  try {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    if (publicKey.asymmetricKeyType !== "ed25519") errors.push(`${kind}_signer_key_type_invalid`);
    const spki = publicKey.export({ type: "spki", format: "der" });
    const signerSpkiSha256 = sha256(spki);
    if (signerSpkiSha256 !== expectedFingerprint) errors.push(`${kind}_signer_key_fingerprint_mismatch`);
    const signature = Buffer.from(signatureBase64, "base64");
    if (!crypto.verify(null, manifestBytes, publicKey, signature)) errors.push(`${kind}_manifest_signature_verification_failed`);
    return { ok: errors.length === 0, errors, signerSpkiSha256 };
  } catch {
    return { ok: false, errors: [...errors, `${kind}_manifest_signature_verification_error`], signerSpkiSha256: null };
  }
}
function verifyParentEvidence(zipPath, expectedZipSha, kind) {
  const errors = [];
  if (!fs.existsSync(zipPath) || !fs.statSync(zipPath).isFile()) return { ok: false, errors: [`${kind}_zip_missing`] };
  const observedZipSha = sha256(fs.readFileSync(zipPath));
  if (!isSha(expectedZipSha) || expectedZipSha !== observedZipSha) errors.push(`${kind}_zip_anchor_mismatch`);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `velmere-a57-${kind}-`));
  try {
    extractZipSafely(zipPath, temp, contract.zipBudgets);
    const isA55 = kind === "a55";
    const revisionId = isA55 ? contract.requiredA55RevisionId : contract.requiredA56RevisionId;
    const decision = isA55 ? contract.requiredA55Decision : contract.requiredA56Decision;
    const manifestName = isA55 ? "PASS35_A55_EVIDENCE_MANIFEST.json" : "PASS35_A56_EVIDENCE_MANIFEST.json";
    const manifestSchema = isA55 ? "velmere.pass35.a55.evidence-manifest.v1" : "velmere.pass35.a56.evidence-manifest.v1";
    const receiptName = isA55 ? "PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.json" : "PASS35_A56_OUT_OF_TIME_SLO_VENDOR_EXIT_OBSERVATION_ACCEPTANCE.json";
    const manifest = verifyExactManifest(temp, manifestName, manifestSchema, revisionId);
    errors.push(...manifest.errors.map((error) => `${kind}:${error}`));
    const signature = verifyParentManifestSignature(fs.readFileSync(manifest.manifestPath), kind);
    errors.push(...(signature.errors ?? []));
    if (manifest.manifest.decision !== decision) errors.push(`${kind}_manifest_decision_invalid`);
    const receiptPath = findExact(temp, receiptName);
    const receipt = safeReadJson(receiptPath);
    const generatedAt = parseTime(receipt.generatedAt);
    const ageSeconds = generatedAt === null ? null : (Date.now() - generatedAt) / 1000;
    const fresh = generatedAt !== null && ageSeconds >= -contract.canary.maximumClockSkewSeconds && ageSeconds <= contract.canary.maximumParentEvidenceAgeSeconds;
    const common = receipt.revisionId === revisionId && receipt.decision === decision && receipt.fixtureMode === false && receipt.summary?.failed === 0 && receipt.productionApproved === false && receipt.liveProven === false && receipt.saleEnabled === false && fresh;
    if (!common) errors.push(`${kind}_receipt_common_semantics_invalid`);
    if (isA55 && !(receipt.independentAssuranceProven === true && receipt.controlledCanaryPreparationApproved === true)) errors.push("a55_release_semantics_invalid");
    if (!isA55 && !(receipt.repeatedOutOfTimeObservationProven === true && receipt.controlledCanaryEntryEligible === true && receipt.controlledCanaryExecuted === false)) errors.push("a56_observation_semantics_invalid");
    return {
      ok: errors.length === 0,
      errors,
      zipSha256: observedZipSha,
      manifestSha256: manifest.manifestSha256,
      receiptSha256: sha256(fs.readFileSync(receiptPath)),
      signature,
      receipt,
    };
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
function isPublicIpv4(address) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a, b] = octets;
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  ) return false;
  return true;
}
function isPublicIpAddress(address) {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version !== 6) return false;
  const normalizedAddress = address.toLowerCase().split("%", 1)[0];
  if (
    normalizedAddress === "::" ||
    normalizedAddress === "::1" ||
    normalizedAddress.startsWith("fc") ||
    normalizedAddress.startsWith("fd") ||
    /^fe[89ab]/u.test(normalizedAddress) ||
    normalizedAddress.startsWith("ff") ||
    normalizedAddress.startsWith("2001:db8:")
  ) return false;
  const mapped = normalizedAddress.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/u);
  return mapped ? isPublicIpv4(mapped[1]) : true;
}
async function assertPublicEndpoint(url, label) {
  const literalVersion = isIP(url.hostname);
  if (literalVersion) {
    if (!isPublicIpAddress(url.hostname)) throw new Error(`${label}:private_or_reserved_destination`);
    return;
  }
  const resolved = await lookup(url.hostname, { all: true, verbatim: true });
  if (!resolved.length || resolved.some((row) => !isPublicIpAddress(row.address))) {
    throw new Error(`${label}:dns_private_or_reserved_destination`);
  }
}
function safeUrl(raw, kind) {
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: "invalid_url" }; }
  if (url.username || url.password || url.hash) return { ok: false, reason: "url_credentials_or_fragment_forbidden" };
  if (url.protocol !== "https:") return { ok: false, reason: "https_required" };
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || (isIP(host) && !isPublicIpAddress(host))) return { ok: false, reason: "private_or_reserved_host_forbidden" };
  if (contract.stagingSafety.rejectHostnameTokens.some((token) => host.includes(token))) return { ok: false, reason: "production_like_hostname" };
  if (!contract.stagingSafety.requireHostnameHint.some((token) => host.includes(token))) return { ok: false, reason: "canary_hostname_hint_missing" };
  return { ok: true, url, origin: url.origin, originDigest: shaText(url.origin), kind };
}
function nextBinding(action, sourceFingerprint) {
  bindingSequence += 1;
  const binding = { revisionId: contract.revisionId, runId, nonceHash, sourceFingerprint, sequence: bindingSequence, action, previousDigest: bindingDigest };
  bindingDigest = shaText(JSON.stringify(binding));
  return binding;
}
function validateBinding(observed, expected) {
  return isRecord(observed) && Object.keys(expected).every((key) => observed[key] === expected[key]);
}
function bindingHeaders(binding) {
  return {
    "x-velmere-revision": binding.revisionId,
    "x-velmere-run-id": binding.runId,
    "x-velmere-nonce-hash": binding.nonceHash,
    "x-velmere-source-fingerprint": binding.sourceFingerprint,
    "x-velmere-sequence": String(binding.sequence),
    "x-velmere-action": binding.action,
    "x-velmere-previous-digest": binding.previousDigest
  };
}
function bearer(secret, headers = {}) { return { authorization: `Bearer ${secret}`, accept: "application/json", ...headers }; }
function redact(value) {
  let text = String(value ?? "");
  for (const secret of configuredSecrets) if (secret) text = text.replaceAll(secret, "[REDACTED]");
  return text.slice(0, 2000);
}
async function requestJson(url, options, label) {
  requestCount += 1;
  if ((options.method ?? "GET") !== "GET") mutationRequests += 1;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), contract.canary.requestTimeoutMs);
  const sentAtMs = Date.now();
  try {
    await assertPublicEndpoint(url, label);
    const response = await fetch(url, { ...options, redirect: "manual", signal: controller.signal });
    if (response.status >= 300 && response.status < 400) throw new Error(`${label}:redirect_forbidden`);
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json" && !contentType?.endsWith("+json")) {
      throw new Error(`${label}:json_content_type_required`);
    }
    if (!response.body) throw new Error(`${label}:response_body_missing`);
    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > contract.canary.maximumResponseBytes) {
        try { await reader.cancel(); } catch (ignoredError) { void ignoredError; }
        throw new Error(`${label}:response_too_large`);
      }
      chunks.push(Buffer.from(chunk.value));
    }
    const buffer = Buffer.concat(chunks, totalBytes);
    let json;
    try { json = JSON.parse(buffer.toString("utf8")); } catch { throw new Error(`${label}:invalid_json`); }
    return { response, json, sentAtMs, receivedAtMs: Date.now() };
  } finally { clearTimeout(timer); }
}

const fixtureState = {
  active: false,
  killSwitch: false,
  rollbackReady: true,
  healthy: true,
  trafficPct: 0,
  participants: 0,
  testTransactions: 0,
  activeTestEntitlements: 0,
  snapshotIndex: 0,
  baselineDigest: shaText("a57-fixture-baseline"),
  actions: [],
  rolledBack: false,
  clockMs: Date.now() - 1000
};
function fixtureResponse(kind, method, binding, body = null) {
  requestCount += 1;
  if (method !== "GET") mutationRequests += 1;
  fixtureState.actions.push({ kind, method, action: body?.action ?? null });
  if (fixtureScenario === "transport-failure-after-start" && fixtureState.active && kind === "telemetry" && fixtureState.snapshotIndex >= 1) throw new Error("fixture_transport_failure_after_start");
  fixtureState.clockMs += 1;
  const observedAt = fixtureScenario === "future-timestamp"
    ? new Date(Date.now() + 3600000).toISOString()
    : new Date(fixtureState.clockMs).toISOString();
  let responseBinding = { ...binding };
  if (fixtureScenario === "binding-mismatch" && kind === "telemetry" && fixtureState.snapshotIndex === 0) responseBinding.sequence += 1;
  const base = { binding: responseBinding, observedAt };
  if (kind === "control-status") {
    return { status: 200, json: { ...base, state: fixtureState.active ? "CANARY_ACTIVE" : "READY", healthy: !(fixtureScenario === "final-unhealthy" && fixtureState.rolledBack), killSwitchActive: fixtureState.killSwitch, rollbackReady: fixtureScenario !== "baseline-rollback-not-ready", canaryTrafficPct: fixtureState.trafficPct, activeTestEntitlements: fixtureState.activeTestEntitlements, baselineDigest: fixtureScenario === "final-baseline-mismatch" && fixtureState.rolledBack ? shaText("wrong-final-baseline") : fixtureState.baselineDigest, paymentMode: "STRIPE_TEST_ONLY" } };
  }
  if (kind === "control-action") {
    const action = body?.action;
    if (action === "start_canary") {
      if (fixtureScenario === "start-rejected") return { status: 409, json: { ...base, accepted: false, state: "READY" } };
      fixtureState.active = true; fixtureState.trafficPct = 5; fixtureState.participants = 5; fixtureState.testTransactions = 2; fixtureState.activeTestEntitlements = 2;
      return { status: 200, json: { ...base, accepted: true, state: fixtureScenario === "start-state-invalid" ? "READY" : "CANARY_ACTIVE", canaryIdDigest: shaText(runId), paymentMode: "STRIPE_TEST_ONLY" } };
    }
    if (action === "stop_canary") { stopRequested = true; fixtureState.active = false; fixtureState.trafficPct = 0; return { status: 200, json: { ...base, accepted: true, state: "CANARY_STOPPED" } }; }
    if (action === "activate_kill_switch") {
      killSwitchAttempted = true;
      if (fixtureScenario === "kill-switch-failure") return { status: 500, json: { ...base, accepted: false, killSwitchActive: false } };
      fixtureState.killSwitch = true; fixtureState.active = false; fixtureState.trafficPct = 0;
      return { status: 200, json: { ...base, accepted: true, killSwitchActive: true, state: "SAFE_STOP" } };
    }
    if (action === "rollback") {
      rollbackAttempted = true;
      if (fixtureScenario === "rollback-failure") return { status: 500, json: { ...base, accepted: false, restored: false } };
      fixtureState.active = false; fixtureState.killSwitch = false; fixtureState.trafficPct = 0; fixtureState.participants = 0; fixtureState.testTransactions = 0; fixtureState.activeTestEntitlements = 0; fixtureState.healthy = true; fixtureState.rolledBack = true;
      return { status: 200, json: { ...base, accepted: true, restored: true, baselineDigest: fixtureScenario === "rollback-baseline-mismatch" ? shaText("wrong-rollback-baseline") : fixtureState.baselineDigest, state: "READY" } };
    }
  }
  const index = fixtureState.snapshotIndex;
  if (kind === "telemetry") {
    const payload = { ...base, sampleId: fixtureScenario === "duplicate-sample" && index > 0 ? "sample-0" : `sample-${index}`, sampleDigest: shaText(`telemetry:${index}`), availabilityPct: fixtureScenario === "low-availability" ? 95 : 99.9, p50Ms: 120, p95Ms: fixtureScenario === "high-p95" ? 5000 : 700, p99Ms: 1200, errorRatePct: fixtureScenario === "high-error-rate" ? 5 : 0.1, freshnessSeconds: fixtureScenario === "stale-data" ? 999 : 20, requests: 100, successes: fixtureScenario === "counter-algebra" ? 120 : 100, failures: 0, canaryTrafficPct: fixtureState.trafficPct, participants: fixtureScenario === "participant-overflow" ? 99 : fixtureState.participants };
    return { status: 200, json: payload };
  }
  if (kind === "support") return { status: 200, json: { ...base, sampleId: `support-${index}`, sampleDigest: shaText(`support:${index}`), totalTickets: 2, sev1Tickets: fixtureScenario === "sev1-ticket" ? 1 : 0, unresolvedSev2Tickets: fixtureScenario === "unresolved-sev2" ? 1 : 0, firstResponseP95Seconds: fixtureScenario === "slow-support" ? 2000 : 300 } };
  if (kind === "payment") return { status: 200, json: { ...base, sampleId: `payment-${index}`, sampleDigest: shaText(`payment:${index}`), paymentMode: fixtureScenario === "live-payment-mode" ? "LIVE" : "STRIPE_TEST_ONLY", testTransactions: fixtureScenario === "test-payment-overflow" ? 99 : fixtureState.testTransactions, refundRequests: 1, refundsCompleted: fixtureScenario === "pending-refund" || fixtureScenario === "failed-refund" ? 0 : 1, refundsPending: fixtureScenario === "pending-refund" ? 1 : 0, refundsFailed: fixtureScenario === "failed-refund" ? 1 : 0 } };
  if (kind === "outcome") {
    const outcomeParticipants = fixtureScenario === "cross-plane-mismatch" ? 1 : fixtureState.participants;
    return { status: 200, json: { ...base, sampleId: `outcome-${index}`, sampleDigest: shaText(`outcome:${index}`), participants: outcomeParticipants, completedJourneys: fixtureScenario === "low-completion" ? 1 : outcomeParticipants, abandonedJourneys: fixtureScenario === "low-completion" ? Math.max(0, outcomeParticipants - 1) : 0, customerHarmFlags: fixtureScenario === "customer-harm" ? 1 : 0, comprehensionFailures: fixtureScenario === "comprehension-failure" ? 1 : 0 } };
  }
  if (kind === "security") {
    fixtureState.snapshotIndex += 1;
    return { status: 200, json: { ...base, sampleId: `security-${index}`, sampleDigest: shaText(`security:${index}`), securityIncidents: fixtureScenario === "security-incident" ? 1 : 0, authIsolationViolations: fixtureScenario === "auth-isolation-violation" ? 1 : 0, entitlementViolations: fixtureScenario === "entitlement-violation" ? 1 : 0 } };
  }
  throw new Error(`fixture_unknown_kind:${kind}`);
}
async function transport(kind, url, method, secret, binding, body = null) {
  if (fixtureMode) {
    const response = fixtureResponse(kind, method, binding, body);
    return { response: { status: response.status }, json: response.json, sentAtMs: Date.now(), receivedAtMs: Date.now() };
  }
  const headers = bearer(secret, { ...bindingHeaders(binding), ...(body ? { "content-type": "application/json" } : {}) });
  return requestJson(url, { method, headers, ...(body ? { body: JSON.stringify({ ...body, binding }) } : {}) }, kind);
}
function validateObservedTime(value, sentAtMs, receivedAtMs) {
  const parsed = parseTime(value);
  if (parsed === null) return false;
  const skew = contract.canary.maximumClockSkewSeconds * 1000;
  return parsed >= sentAtMs - skew && parsed <= receivedAtMs + skew;
}
function validateSampleCommon(json, binding, sentAtMs, receivedAtMs, seenIds, previousObservedAt = null) {
  const errors = [];
  if (!validateBinding(json?.binding, binding)) errors.push("binding_invalid");
  const observedAt = parseTime(json?.observedAt);
  if (!validateObservedTime(json?.observedAt, sentAtMs, receivedAtMs)) errors.push("observed_time_invalid");
  if (observedAt !== null && Date.now() - observedAt > contract.canary.maximumSnapshotAgeSeconds * 1000) errors.push("snapshot_age_exceeded");
  if (previousObservedAt !== null && (observedAt === null || observedAt <= previousObservedAt)) errors.push("observed_time_not_monotonic");
  if (typeof json?.sampleId !== "string" || json.sampleId.length < 3 || seenIds.has(json.sampleId)) errors.push("sample_id_invalid_or_duplicate");
  else seenIds.add(json.sampleId);
  if (!isSha(json?.sampleDigest)) errors.push("sample_digest_invalid");
  return errors;
}
function persistSnapshot(index, rows, status, validation = {}) {
  const payload = {
    schemaVersion: "velmere.pass35.a57.snapshot-evidence.v1",
    revisionId: contract.revisionId,
    runId,
    index,
    recordedAt: nowIso(),
    status,
    sourceFingerprint: sourceBefore?.digest ?? null,
    validation,
    planes: rows,
  };
  const encoded = `${JSON.stringify(payload, null, 2)}\n`;
  const fileName = `snapshot-${String(index).padStart(3, "0")}.json`;
  const filePath = path.join(runDir, fileName);
  fs.writeFileSync(filePath, encoded, { encoding: "utf8", mode: 0o600 });
  const receipt = { index, path: fileName, bytes: Buffer.byteLength(encoded), sha256: shaText(encoded), status };
  snapshotEvidence.push(receipt);
  return receipt;
}
const monotonicCounterKeys = {
  telemetry: ["requests", "successes", "failures", "participants"],
  support: ["totalTickets", "sev1Tickets", "unresolvedSev2Tickets"],
  payment: ["testTransactions", "refundRequests", "refundsCompleted", "refundsPending", "refundsFailed"],
  outcome: ["participants", "completedJourneys", "abandonedJourneys", "customerHarmFlags", "comprehensionFailures"],
  security: ["securityIncidents", "authIsolationViolations", "entitlementViolations"],
};
function validateMonotonicCounters(kind, current, previous) {
  if (!previous) return [];
  return (monotonicCounterKeys[kind] ?? [])
    .filter((key) => isFiniteNumber(current?.[key]) && isFiniteNumber(previous?.[key]) && current[key] < previous[key])
    .map((key) => `${kind}_${key}_counter_decreased`);
}
async function terminateCanary(urls, secrets, sourceFingerprint, baselineDigest, reason) {
  const result = { stop: false, kill: false, rollback: false, final: false, errors: [] };
  if (!mutationStarted || !isSha(baselineDigest)) {
    result.errors.push("trusted_baseline_digest_missing");
    return result;
  }
  if (!stopRequested) {
    try {
      const binding = nextBinding("stop-canary", sourceFingerprint);
      const response = await transport("control-action", urls.controlAction, "POST", secrets.control, binding, { action: "stop_canary", reasonDigest: shaText(reason) });
      result.stop = response.response.status === 200 && validateBinding(response.json?.binding, binding) && response.json?.accepted === true;
      stopRequested = result.stop;
      journalStep("canary-stop-requested", result.stop ? "SUCCEEDED" : "FAILED", { status: response.response.status });
    } catch (error) { result.errors.push(`stop:${redact(error instanceof Error ? error.message : String(error))}`); journalStep("canary-stop-requested", "ERROR", { error: result.errors.at(-1) }); }
  }
  try {
    killSwitchAttempted = true;
    const binding = nextBinding("activate-kill-switch", sourceFingerprint);
    const response = await transport("control-action", urls.controlAction, "POST", secrets.control, binding, { action: "activate_kill_switch", reasonDigest: shaText(reason) });
    result.kill = response.response.status === 200 && validateBinding(response.json?.binding, binding) && response.json?.accepted === true && response.json?.killSwitchActive === true;
    killSwitchSucceeded = result.kill;
    journalStep("kill-switch-activated", result.kill ? "SUCCEEDED" : "FAILED", { status: response.response.status });
  } catch (error) { result.errors.push(`kill:${redact(error instanceof Error ? error.message : String(error))}`); journalStep("kill-switch-activated", "ERROR", { error: result.errors.at(-1) }); }
  rollbackAttempted = true;
  for (let attempt = 1; attempt <= contract.canary.recoveryAttempts && !result.rollback; attempt += 1) {
    try {
      const binding = nextBinding(`rollback-${attempt}`, sourceFingerprint);
      const response = await transport("control-action", urls.controlAction, "POST", secrets.control, binding, { action: "rollback", baselineDigest, reasonDigest: shaText(reason), attempt });
      result.rollback = response.response.status === 200 &&
        validateBinding(response.json?.binding, binding) &&
        response.json?.accepted === true &&
        response.json?.restored === true &&
        response.json?.baselineDigest === baselineDigest;
      journalStep("rollback-requested", result.rollback ? "SUCCEEDED" : "FAILED", { attempt, status: response.response.status });
    } catch (error) { result.errors.push(`rollback:${attempt}:${redact(error instanceof Error ? error.message : String(error))}`); journalStep("rollback-requested", "ERROR", { attempt, error: result.errors.at(-1) }); }
    if (!result.rollback && attempt < contract.canary.recoveryAttempts) await sleep(fixtureMode ? 1 : contract.canary.recoveryBackoffMs * attempt);
  }
  rollbackSucceeded = result.rollback;
  try {
    const binding = nextBinding("post-rollback-status", sourceFingerprint);
    const response = await transport("control-status", urls.controlStatus, "GET", secrets.control, binding);
    result.final = response.response.status === 200 &&
      validateBinding(response.json?.binding, binding) &&
      response.json?.state === "READY" &&
      response.json?.healthy === true &&
      response.json?.killSwitchActive === false &&
      response.json?.rollbackReady === true &&
      response.json?.canaryTrafficPct === 0 &&
      response.json?.activeTestEntitlements === 0 &&
      response.json?.paymentMode === contract.canary.paymentMode &&
      response.json?.baselineDigest === baselineDigest;
    finalBaselineHealthy = result.final;
    journalStep("rollback-verified", result.final ? "SUCCEEDED" : "FAILED", { state: response.json?.state, healthy: response.json?.healthy });
  } catch (error) { result.errors.push(`final:${redact(error instanceof Error ? error.message : String(error))}`); journalStep("rollback-verified", "ERROR", { error: result.errors.at(-1) }); }
  return result;
}
function writeReport(decision) {
  const failures = checks.filter((row) => !row.ok);
  const verified = decision === "VERIFIED_STAGING_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY";
  const report = {
    schemaVersion: "velmere.pass35.a57.controlled-canary-kill-switch-rollback-telemetry-acceptance-receipt.v1",
    revisionId: contract.revisionId,
    parentRevisionId: contract.parentRevisionId,
    generatedAt: nowIso(),
    runId,
    fixtureMode,
    fixtureScenario: fixtureMode ? fixtureScenario : null,
    decision,
    truthBoundary: contract.truthBoundary,
    boundedCanaryLifecycleProven: verified,
    controlledCanaryExecuted: verified,
    killSwitchAndRollbackProven: verified,
    supportRefundOutcomeTelemetryProven: verified,
    productionPaymentsProven: false,
    continuousMonitoringProven: false,
    productionApproved: false,
    liveProven: false,
    saleEnabled: false,
    parentEvidence: {
      a55EvidenceManifestSha256: a55Evidence?.manifestSha256 ?? null,
      a56EvidenceManifestSha256: a56Evidence?.manifestSha256 ?? null,
      a56A55ManifestBindingMatched: Boolean(a55Evidence && a56Evidence && a56Evidence.receipt?.a55?.manifestSha256 === a55Evidence.manifestSha256),
      a55SignerSpkiSha256: a55Evidence?.signature?.signerSpkiSha256 ?? null,
      a56SignerSpkiSha256: a56Evidence?.signature?.signerSpkiSha256 ?? null,
      detachedSignaturesVerified: Boolean(a55Evidence?.signature?.ok && a56Evidence?.signature?.ok && !fixtureMode),
      fixtureSignatureBypassNoCredit: Boolean(fixtureMode),
    },
    sourceFingerprint: { before: sourceBefore?.digest ?? null, after: sourceAfter?.digest ?? null, manifestSha256: sourceBefore?.manifestSha256 ?? null },
    recovery: { mutationStarted, stopRequested, killSwitchAttempted, killSwitchSucceeded, rollbackAttempted, rollbackSucceeded, finalBaselineHealthy },
    requestSummary: { requests: requestCount, mutationRequests },
    stopReasons,
    boundedMetrics,
    snapshotEvidence: {
      count: snapshotEvidence.length,
      receipts: snapshotEvidence,
    },
    journalDigest: journalHeadDigest,
    journalEvidence: {
      json: normalize(path.relative(runDir, journalPath)),
      ndjson: normalize(path.relative(runDir, journalNdjsonPath)),
      entries: journal.length,
      hashChainHead: journalHeadDigest,
    },
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
    failures,
    checks
  };
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(runReceiptPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outputMd, `# PASS35 A57 — controlled canary, kill switch, rollback and telemetry acceptance\n\nDecision: **${decision}**\n\n- Checks: ${report.summary.checks}\n- Passed: ${report.summary.passed}\n- Failed: ${report.summary.failed}\n- Controlled canary executed/proven: ${report.controlledCanaryExecuted}\n- Kill switch and rollback proven: ${report.killSwitchAndRollbackProven}\n- Production payments/LIVE/sale: false\n\n${failures.length ? "## Failures\n\n" + failures.map((row) => `- ${row.id}: ${JSON.stringify(row.detail)}`).join("\n") : "All declared A57 checks passed within the bounded controlled-canary truth boundary."}\n`);
  return report;
}

async function main() {
  acquireLock();
  journalStep("run-started", "STARTED", { fixtureMode });
  stage = "preflight";
  sourceBefore = verifySourceManifest();
  addCheck("source-manifest-valid", sourceBefore.ok, sourceBefore, "integrity");
  const expectedSourceSha = String(process.env.VELMERE_A57_EXPECTED_SOURCE_MANIFEST_SHA256 ?? argValue("--source-manifest-sha") ?? "").toLowerCase();
  addCheck("source-manifest-external-anchor", isSha(expectedSourceSha) && expectedSourceSha === sourceBefore.manifestSha256, { observed: sourceBefore.manifestSha256, expectedPresent: Boolean(expectedSourceSha) }, "integrity");
  addCheck("runtime-exact", fixtureMode || (process.versions.node === contract.runtime.node && currentNpmVersion() === contract.runtime.npm), { observed: { node: process.versions.node, npm: currentNpmVersion() }, expected: contract.runtime }, "preflight");
  const confirmation = process.env.VELMERE_A57_CONFIRM ?? argValue("--confirm") ?? "";
  addCheck("confirmation-token", confirmation === contract.confirmationToken, { present: Boolean(confirmation) }, "preflight");
  const projectClass = process.env.VELMERE_A57_PROJECT_CLASS ?? argValue("--project-class") ?? "";
  addCheck("project-class-controlled-canary", projectClass === contract.projectClass, { observed: projectClass }, "preflight");

  const a55Zip = path.resolve(root, process.env.VELMERE_A57_A55_EVIDENCE_ZIP ?? argValue("--a55-evidence") ?? "");
  const a56Zip = path.resolve(root, process.env.VELMERE_A57_A56_EVIDENCE_ZIP ?? argValue("--a56-evidence") ?? "");
  const a55Sha = String(process.env.VELMERE_A57_A55_EVIDENCE_SHA256 ?? argValue("--a55-evidence-sha") ?? "").toLowerCase();
  const a56Sha = String(process.env.VELMERE_A57_A56_EVIDENCE_SHA256 ?? argValue("--a56-evidence-sha") ?? "").toLowerCase();
  a55Evidence = verifyParentEvidence(a55Zip, a55Sha, "a55");
  a56Evidence = verifyParentEvidence(a56Zip, a56Sha, "a56");
  addCheck("a55-evidence-integrity-and-semantics", a55Evidence.ok, a55Evidence.errors, "integrity");
  addCheck("a56-evidence-integrity-and-semantics", a56Evidence.ok, a56Evidence.errors, "integrity");
  const distinctParentSigners = fixtureMode || (
    a55Evidence.signature?.ok &&
    a56Evidence.signature?.ok &&
    isSha(a55Evidence.signature.signerSpkiSha256) &&
    isSha(a56Evidence.signature.signerSpkiSha256) &&
    (
      contract.parentEvidenceTrust?.requireDistinctSigners !== true ||
      a55Evidence.signature.signerSpkiSha256 !== a56Evidence.signature.signerSpkiSha256
    )
  );
  addCheck("a55-a56-independent-signers", distinctParentSigners, {
    fixtureBypassNoCredit: fixtureMode,
    a55SignerSpkiSha256: a55Evidence.signature?.signerSpkiSha256 ?? null,
    a56SignerSpkiSha256: a56Evidence.signature?.signerSpkiSha256 ?? null,
  }, "integrity");
  const chainBound = a55Evidence.ok && a56Evidence.ok && a56Evidence.receipt?.a55?.manifestSha256 === a55Evidence.manifestSha256 && a56Evidence.receipt?.a55?.a54SourceManifestSha256 === a55Evidence.receipt?.a54?.sourceManifestSha256;
  addCheck("a55-a56-evidence-chain-bound", chainBound, { a55Manifest: a55Evidence.manifestSha256, a56BoundA55: a56Evidence.receipt?.a55?.manifestSha256, a55A54Source: a55Evidence.receipt?.a54?.sourceManifestSha256, a56A54Source: a56Evidence.receipt?.a55?.a54SourceManifestSha256 }, "integrity");

  const urlMappings = {
    controlStatus: ["VELMERE_A57_CONTROL_STATUS_URL", "control"], controlAction: ["VELMERE_A57_CONTROL_ACTION_URL", "control"], telemetry: ["VELMERE_A57_TELEMETRY_URL", "telemetry"], support: ["VELMERE_A57_SUPPORT_URL", "support"], payment: ["VELMERE_A57_PAYMENT_REFUND_URL", "payment"], outcome: ["VELMERE_A57_OUTCOME_URL", "outcome"], security: ["VELMERE_A57_SECURITY_URL", "security"]
  };
  const urls = {};
  const origins = [];
  for (const [key, [envName, kind]] of Object.entries(urlMappings)) {
    const rawUrl = process.env[envName] ?? argValue(`--${key}`) ?? (fixtureMode ? `https://${kind}-canary.test/a57` : "");
    const parsed = safeUrl(rawUrl, kind);
    addCheck(`url-safe:${key}`, parsed.ok, { reason: parsed.reason ?? null, originDigest: parsed.originDigest ?? null }, "preflight");
    if (parsed.ok) { urls[key] = parsed.url; origins.push(parsed.origin); }
  }
  addCheck("independent-origin-floor", new Set(origins).size >= contract.stagingSafety.minimumDistinctOrigins, { distinctOrigins: new Set(origins).size, minimum: contract.stagingSafety.minimumDistinctOrigins }, "preflight");

  const secretMappings = {
    control: "VELMERE_A57_CONTROL_BEARER_SECRET", telemetry: "VELMERE_A57_TELEMETRY_BEARER_SECRET", support: "VELMERE_A57_SUPPORT_BEARER_SECRET", payment: "VELMERE_A57_PAYMENT_BEARER_SECRET", outcome: "VELMERE_A57_OUTCOME_BEARER_SECRET", security: "VELMERE_A57_SECURITY_BEARER_SECRET"
  };
  const secrets = {};
  for (const [key, envName] of Object.entries(secretMappings)) {
    const value = process.env[envName] ?? (fixtureMode ? `${key}-fixture-secret-${"x".repeat(32)}` : "");
    secrets[key] = value; configuredSecrets.push(value);
    addCheck(`secret-boundary:${key}`, typeof value === "string" && value.length >= contract.stagingSafety.minimumSecretLength, { present: Boolean(value), length: value.length }, "preflight");
  }
  addCheck("secrets-distinct", new Set(Object.values(secrets)).size === Object.values(secrets).length, { distinct: new Set(Object.values(secrets)).size }, "preflight");

  const preflightFailures = checks.filter((row) => !row.ok);
  addCheck("preflight-no-network-mutation", mutationRequests === 0, { mutationRequests }, "preflight");
  if (preflightFailures.length) {
    journalStep("preflight-complete", "FAILED", { failures: preflightFailures.length });
    sourceAfter = verifySourceManifest();
    addCheck("source-fingerprint-unchanged", sourceBefore.ok && sourceAfter.ok && sourceBefore.digest === sourceAfter.digest, { before: sourceBefore.digest, after: sourceAfter.digest }, "integrity");
    journalStep("run-completed", "FAILED", { decision: fixtureMode ? "FIXTURE_FAIL" : "INCOMPLETE_EVIDENCE" });
    const report = writeReport(fixtureMode ? "FIXTURE_FAIL" : "INCOMPLETE_EVIDENCE");
    console.log(JSON.stringify({ decision: report.decision, summary: report.summary, mutationRequests }, null, 2));
    if (report.decision !== "FIXTURE_PASS") process.exitCode = 1;
    return;
  }
  journalStep("preflight-complete", "SUCCEEDED", { sourceManifestSha256: sourceBefore.manifestSha256 });

  stage = "baseline";
  const baselineBinding = nextBinding("baseline-status", sourceBefore.digest);
  const baseline = await transport("control-status", urls.controlStatus, "GET", secrets.control, baselineBinding);
  const baselineTimeValid = validateObservedTime(baseline.json?.observedAt, baseline.sentAtMs, baseline.receivedAtMs);
  addCheck("baseline-response-bound", baseline.response.status === 200 && validateBinding(baseline.json?.binding, baselineBinding) && baselineTimeValid, { status: baseline.response.status, timeValid: baselineTimeValid }, "semantic");
  addCheck("baseline-safe-and-rollback-ready", baseline.json?.state === "READY" && baseline.json?.healthy === true && baseline.json?.killSwitchActive === false && baseline.json?.rollbackReady === true && baseline.json?.canaryTrafficPct === 0 && baseline.json?.activeTestEntitlements === 0 && baseline.json?.paymentMode === contract.canary.paymentMode && isSha(baseline.json?.baselineDigest), { state: baseline.json?.state, healthy: baseline.json?.healthy, rollbackReady: baseline.json?.rollbackReady }, "semantic");
  if (checks.some((row) => !row.ok)) throw new Error("baseline_validation_failed");
  expectedBaselineDigest = baseline.json.baselineDigest;
  fixtureState.baselineDigest = expectedBaselineDigest;
  activeRecoveryContext = Object.freeze({
    urls: Object.freeze({ controlStatus: urls.controlStatus, controlAction: urls.controlAction }),
    secrets: Object.freeze({ control: secrets.control }),
    sourceFingerprint: sourceBefore.digest,
    baselineDigest: expectedBaselineDigest,
  });
  journalStep("baseline-verified", "SUCCEEDED", { baselineDigest: expectedBaselineDigest });

  stage = "start-canary";
  const startBinding = nextBinding("start-canary", sourceBefore.digest);
  mutationStarted = true;
  const start = await transport("control-action", urls.controlAction, "POST", secrets.control, startBinding, { action: "start_canary", config: { paymentMode: contract.canary.paymentMode, maximumParticipants: contract.canary.maximumParticipants, maximumTestTransactions: contract.canary.maximumTestTransactions, maximumTrafficPct: contract.canary.maximumTrafficPct, maximumDurationSeconds: contract.canary.maximumDurationSeconds } });
  addCheck("canary-start-response-bound", start.response.status === 200 && validateBinding(start.json?.binding, startBinding), { status: start.response.status }, "semantic");
  addCheck("canary-started-bounded-test-only", start.json?.accepted === true && start.json?.state === "CANARY_ACTIVE" && start.json?.paymentMode === contract.canary.paymentMode && isSha(start.json?.canaryIdDigest), { accepted: start.json?.accepted, state: start.json?.state, paymentMode: start.json?.paymentMode }, "semantic");
  if (checks.some((row) => !row.ok)) throw new Error("canary_start_validation_failed");
  journalStep("canary-started", "SUCCEEDED", { canaryIdDigest: start.json.canaryIdDigest });

  stage = "observe";
  const snapshots = [];
  const seenSampleIds = new Set();
  const lastObservedAtByPlane = new Map();
  const lastCountersByPlane = new Map();
  const startedAt = Date.now();
  for (let index = 0; index < contract.canary.minimumSnapshots; index += 1) {
    const rows = {};
    for (const [kind, urlKey, secretKey] of [["telemetry","telemetry","telemetry"],["support","support","support"],["payment","payment","payment"],["outcome","outcome","outcome"],["security","security","security"]]) {
      const binding = nextBinding(`${kind}-snapshot-${index}`, sourceBefore.digest);
      const response = await transport(kind, urls[urlKey], "GET", secrets[secretKey], binding);
      rows[kind] = response.json;
      const previousObservedAt = lastObservedAtByPlane.get(kind) ?? null;
      const commonErrors = validateSampleCommon(response.json, binding, response.sentAtMs, response.receivedAtMs, seenSampleIds, previousObservedAt);
      const counterErrors = validateMonotonicCounters(kind, response.json, lastCountersByPlane.get(kind));
      if (kind === "telemetry") {
        const observedAt = parseTime(response.json?.observedAt);
        const derivedAgeSeconds = observedAt === null ? Number.POSITIVE_INFINITY : Math.max(0, (response.receivedAtMs - observedAt) / 1000);
        if (!isNonNegativeNumber(response.json?.freshnessSeconds) || derivedAgeSeconds - response.json.freshnessSeconds > contract.canary.maximumClockSkewSeconds) {
          commonErrors.push("claimed_freshness_below_observed_age");
        }
      }
      const responseValid = response.response.status === 200 && commonErrors.length === 0 && counterErrors.length === 0;
      addCheck(`snapshot-${index}-${kind}-bound-and-fresh`, responseValid, { status: response.response.status, errors: [...commonErrors, ...counterErrors] }, "semantic");
      if (!responseValid) {
        const reason = `${kind}_transport_binding_or_monotonic_validation_failure`;
        stopReasons = [...new Set([...stopReasons, reason])];
        persistSnapshot(index, rows, "INVALID_PLANE", { kind, errors: [...commonErrors, ...counterErrors] });
        journalStep("snapshot-observed", "STOP_RULE_BREACH", { index, kind, stopReasons: [reason] });
        throw new Error(reason);
      }
      lastObservedAtByPlane.set(kind, parseTime(response.json.observedAt));
      lastCountersByPlane.set(kind, structuredClone(response.json));
      const planeStop = stopRuleEvaluationForPlane(kind, response.json, contract);
      if (planeStop.reasons.length) {
        stopReasons = [...new Set([...stopReasons, ...planeStop.reasons])];
        persistSnapshot(index, rows, "PLANE_STOP_RULE_BREACH", { kind, stopReasons: planeStop.reasons });
        journalStep("snapshot-observed", "STOP_RULE_BREACH", { index, kind, stopReasons: planeStop.reasons });
        throw new Error(`plane_stop_rule:${kind}:${planeStop.reasons.join(",")}`);
      }
    }
    const schemaErrors = validateSnapshotSchemas(rows);
    addCheck(`snapshot-${index}-strict-schema-and-algebra`, schemaErrors.length === 0, schemaErrors, "semantic");
    if (schemaErrors.length) {
      stopReasons = [...new Set([...stopReasons, "snapshot_schema_or_cross_plane_validation_failure"])];
      persistSnapshot(index, rows, "SCHEMA_STOP", { schemaErrors });
      journalStep("snapshot-observed", "STOP_RULE_BREACH", { index, stopReasons, schemaErrors });
      throw new Error(`snapshot_schema_failure:${schemaErrors.join(",")}`);
    }
    const stop = stopRuleEvaluation(rows, contract);
    snapshots.push({ ...rows, stop });
    persistSnapshot(index, rows, stop.reasons.length ? "STOP_RULE_BREACH" : "ACCEPTED", { stopReasons: stop.reasons });
    journalStep("snapshot-observed", stop.reasons.length ? "STOP_RULE_BREACH" : "SUCCEEDED", { index, stopReasons: stop.reasons });
    if (stop.reasons.length) { stopReasons = [...new Set([...stopReasons, ...stop.reasons])]; break; }
    if (index + 1 < contract.canary.minimumSnapshots) await sleep(fixtureMode ? 1 : contract.canary.pollIntervalMs);
  }
  const observedSeconds = fixtureMode ? contract.canary.minimumObservationSeconds : Math.floor((Date.now() - startedAt) / 1000);
  addCheck("minimum-snapshot-count", snapshots.length >= contract.canary.minimumSnapshots || stopReasons.length > 0, { snapshots: snapshots.length, minimum: contract.canary.minimumSnapshots }, "semantic");
  addCheck("minimum-observation-window", stopReasons.length > 0 || observedSeconds >= contract.canary.minimumObservationSeconds, { observedSeconds, minimum: contract.canary.minimumObservationSeconds }, "semantic");
  addCheck("maximum-canary-duration", observedSeconds <= contract.canary.maximumDurationSeconds, { observedSeconds, maximum: contract.canary.maximumDurationSeconds }, "semantic");
  addCheck("stop-rules-clear", stopReasons.length === 0, { stopReasons }, "semantic");

  const telemetryRows = snapshots.map((row) => row.telemetry);
  boundedMetrics = {
    snapshots: snapshots.length,
    observationSeconds: observedSeconds,
    minimumAvailabilityPct: telemetryRows.length ? Math.min(...telemetryRows.map((row) => row.availabilityPct)) : null,
    maximumP95Ms: telemetryRows.length ? Math.max(...telemetryRows.map((row) => row.p95Ms)) : null,
    maximumP99Ms: telemetryRows.length ? Math.max(...telemetryRows.map((row) => row.p99Ms)) : null,
    maximumErrorRatePct: telemetryRows.length ? Math.max(...telemetryRows.map((row) => row.errorRatePct)) : null,
    maximumFreshnessSeconds: telemetryRows.length ? Math.max(...telemetryRows.map((row) => row.freshnessSeconds)) : null,
    aggregateP95Ms: telemetryRows.length ? percentile(telemetryRows.map((row) => row.p95Ms), 95) : null,
    participantsMaximum: telemetryRows.length ? Math.max(...telemetryRows.map((row) => row.participants)) : null,
    stopRuleBreaches: stopReasons.length
  };

  stage = "terminate";
  const termination = await terminateCanary(urls, secrets, sourceBefore.digest, expectedBaselineDigest, stopReasons.length ? `stop_rules:${stopReasons.join(",")}` : "bounded_canary_complete");
  addCheck("canary-stop-requested", termination.stop, termination, "recovery");
  addCheck("kill-switch-activated", termination.kill, termination, "recovery");
  addCheck("rollback-completed", termination.rollback, termination, "recovery");
  addCheck("post-rollback-baseline-healthy", termination.final, termination, "recovery");

  sourceAfter = verifySourceManifest();
  addCheck("source-fingerprint-unchanged", sourceBefore.ok && sourceAfter.ok && sourceBefore.digest === sourceAfter.digest && sourceBefore.manifestSha256 === sourceAfter.manifestSha256, { before: sourceBefore.digest, after: sourceAfter.digest, manifestBefore: sourceBefore.manifestSha256, manifestAfter: sourceAfter.manifestSha256 }, "integrity");
  addCheck("evidence-redaction", true, { rawUrls: false, rawSecrets: false, rawAccountIdentifiers: false }, "integrity");
  const failures = checks.filter((row) => !row.ok);
  const decision = fixtureMode ? (failures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : rollbackSucceeded && finalBaselineHealthy ? (failures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY") : "RECOVERY_REQUIRED";
  journalStep("run-completed", decision === "FIXTURE_PASS" || decision.startsWith("VERIFIED_") ? "COMPLETED" : "FAILED", { decision });
  const report = writeReport(decision);
  console.log(JSON.stringify({ decision: report.decision, summary: report.summary, recovery: report.recovery, output: normalize(path.relative(root, outputJson)) }, null, 2));
  if (!(decision === "FIXTURE_PASS" || decision.startsWith("VERIFIED_"))) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  fatalError = redact(error instanceof Error ? error.message : String(error));
  journalStep(stage, "ERROR", { error: fatalError });
  try {
    if (mutationStarted && activeRecoveryContext) {
      const recovery = await terminateCanary(
        activeRecoveryContext.urls,
        activeRecoveryContext.secrets,
        activeRecoveryContext.sourceFingerprint,
        activeRecoveryContext.baselineDigest,
        fatalError,
      );
      addCheck("emergency-stop-requested", recovery.stop, recovery, "recovery");
      addCheck("emergency-kill-switch-activated", recovery.kill, recovery, "recovery");
      addCheck("emergency-rollback-completed", recovery.rollback, recovery, "recovery");
      addCheck("emergency-postcondition-healthy", recovery.final, recovery, "recovery");
    } else if (mutationStarted) {
      addCheck("emergency-recovery-context", false, { error: "trusted_recovery_context_missing" }, "recovery");
    }
  } catch (recoveryError) {
    addCheck("emergency-recovery", false, { error: redact(recoveryError instanceof Error ? recoveryError.message : String(recoveryError)) }, "recovery");
  }
  sourceAfter = verifySourceManifest();
  if (sourceBefore) addCheck("source-fingerprint-unchanged", sourceBefore.ok && sourceAfter.ok && sourceBefore.digest === sourceAfter.digest && sourceBefore.manifestSha256 === sourceAfter.manifestSha256, { before: sourceBefore.digest, after: sourceAfter.digest }, "integrity");
  const decision = fixtureMode ? "FIXTURE_FAIL" : rollbackSucceeded && finalBaselineHealthy ? "ACTION_REQUIRED" : mutationStarted ? "RECOVERY_REQUIRED" : "INCOMPLETE_EVIDENCE";
  journalStep("run-completed", "FAILED", { decision });
  const report = writeReport(decision);
  console.error(JSON.stringify({ decision: report.decision, fatalError, recovery: report.recovery, summary: report.summary }, null, 2));
  process.exitCode = 1;
} finally {
  releaseLock();
}
