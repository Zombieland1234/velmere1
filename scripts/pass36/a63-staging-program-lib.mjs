#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DIGEST = /^[a-f0-9]{64}$/u;
export const PROGRAM_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{15,95}$/u;
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const normalize = (value) => String(value ?? "").replaceAll("\\", "/");
export function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
export function decisionOf(receipt) {
  if (typeof receipt?.decision === "string") return receipt.decision;
  if (typeof receipt?.decision?.state === "string") return receipt.decision.state;
  if (typeof receipt?.status === "string") return receipt.status;
  return null;
}
export function sourceManifestOf(receipt) {
  const candidates = [
    receipt?.sourceManifestSha256,
    receipt?.sourceFingerprint?.manifestSha256,
    receipt?.source?.manifestSha256,
    receipt?.bindings?.sourceManifestSha256,
    receipt?.subject?.sourceManifestSha256,
  ];
  return candidates.find((value) => DIGEST.test(String(value ?? ""))) ?? null;
}
export function fixtureOf(receipt) {
  return receipt?.fixtureMode === true || receipt?.fixture === true || String(decisionOf(receipt) ?? "").startsWith("FIXTURE_");
}
function checkTimestamp(receipt, nowMs, safety) {
  const raw = receipt?.completedAt ?? receipt?.generatedAt ?? receipt?.issuedAt ?? receipt?.createdAt ?? null;
  if (!raw) return { ok: false, reason: "receipt_time_missing", timestampMs: null };
  const timestampMs = Date.parse(raw);
  if (!Number.isFinite(timestampMs)) return { ok: false, reason: "receipt_time_invalid", timestampMs: null };
  if (timestampMs > nowMs + safety.maximumClockSkewSeconds * 1000) return { ok: false, reason: "receipt_time_future", timestampMs };
  if (nowMs - timestampMs > safety.maximumEvidenceAgeSeconds * 1000) return { ok: false, reason: "receipt_time_stale", timestampMs };
  return { ok: true, timestampMs };
}
function add(checks, id, passed, detail = null) { checks.push({ id, passed: Boolean(passed), detail }); }
function normalizedCriticalSummary(receipt) {
  const summary = receipt?.summary ?? {};
  const blocked = Number(summary.exactByteBlocked ?? 0) + Number(summary.runtimeDependencyBlocked ?? 0);
  return {
    suites: Number(summary.suites ?? receipt?.suiteCount ?? 0),
    passed: Number(summary.passed ?? receipt?.passedSuiteCount ?? 0),
    blocked: Number.isFinite(blocked) && blocked > 0 ? blocked : Number(receipt?.failedSuiteCount ?? 0),
    semanticFailures: Number(summary.semanticOrUnknownFailed ?? 0),
    credit: receipt?.criticalGate30Of30Credit === true || receipt?.offlineReleaseCandidateEligible === true,
    lineageMode: receipt?.lineageMode ?? null,
  };
}
export function environmentSummary(environment, policy) {
  const entries = Object.entries(environment ?? {}).filter(([, value]) => value !== undefined && value !== null && String(value).length > 0).sort(([a], [b]) => a.localeCompare(b));
  const urls = [];
  const secretValues = [];
  const livePaymentKeys = [];
  for (const [name, raw] of entries) {
    const value = String(raw);
    if (/(?:URL|URI|ENDPOINT)$/u.test(name) || /_URL_/u.test(name)) {
      try { urls.push({ name, parsed: new URL(value) }); } catch { urls.push({ name, parsed: null }); }
    }
    if (/(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY|SERVICE_ROLE_KEY|API_KEY)$/u.test(name)) secretValues.push({ name, value });
    if (policy.stagingSafety.rejectLivePaymentPrefixes.some((prefix) => value.startsWith(prefix))) livePaymentKeys.push(name);
  }
  const origins = [...new Set(urls.filter((row) => row.parsed).map((row) => row.parsed.origin))];
  const environmentBinding = entries.map(([name, value]) => ({ name, valueSha256: sha256(String(value)) }));
  return {
    configuredNames: entries.map(([name]) => name),
    configuredCount: entries.length,
    aggregateSha256: sha256(canonicalJson(environmentBinding)),
    urls,
    origins,
    secretValues,
    livePaymentKeys,
  };
}
export function validateEnvironment(environment, policy, checks) {
  const summary = environmentSummary(environment, policy);
  for (const required of policy.commonEnvironment) add(checks, `environment:${required}`, Boolean(environment?.[required]), Boolean(environment?.[required]));
  add(checks, "environment:project-class", environment?.VELMERE_A63_PROJECT_CLASS === policy.projectClass, environment?.VELMERE_A63_PROJECT_CLASS ?? null);
  add(checks, "environment:confirmation", environment?.VELMERE_A63_CONFIRM === policy.confirmationToken, Boolean(environment?.VELMERE_A63_CONFIRM));
  add(checks, "environment:program-id", PROGRAM_ID.test(String(environment?.VELMERE_A63_PROGRAM_ID ?? "")), environment?.VELMERE_A63_PROGRAM_ID ?? null);
  add(checks, "environment:staging-id", String(environment?.VELMERE_A63_STAGING_ENVIRONMENT_ID ?? "").length >= 16, Boolean(environment?.VELMERE_A63_STAGING_ENVIRONMENT_ID));
  add(checks, "environment:urls-valid", summary.urls.every((row) => row.parsed), summary.urls.filter((row) => !row.parsed).map((row) => row.name));
  add(checks, "environment:https-only", summary.urls.every((row) => row.parsed?.protocol === "https:"), summary.urls.map((row) => row.parsed?.protocol ?? null));
  const rejectedHosts = summary.urls.filter((row) => row.parsed && policy.stagingSafety.rejectHostnameTokens.some((token) => row.parsed.hostname.toLowerCase().split(/[.-]/u).includes(token)));
  add(checks, "environment:no-production-hosts", rejectedHosts.length === 0, rejectedHosts.map((row) => row.name));
  const missingHints = summary.urls.filter((row) => row.parsed && !policy.stagingSafety.requireHostnameHints.some((token) => row.parsed.hostname.toLowerCase().includes(token)));
  add(checks, "environment:staging-host-hints", missingHints.length === 0, missingHints.map((row) => row.name));
  add(checks, "environment:origin-diversity", summary.origins.length >= policy.stagingSafety.minimumDistinctOrigins, summary.origins.length);
  add(checks, "environment:no-live-payment-keys", summary.livePaymentKeys.length === 0, summary.livePaymentKeys);
  const weakSecrets = summary.secretValues.filter((row) => row.value.length < policy.stagingSafety.minimumSecretLength);
  add(checks, "environment:secret-length", weakSecrets.length === 0, weakSecrets.map((row) => row.name));
  const secretDigests = summary.secretValues.map((row) => sha256(row.value));
  add(checks, "environment:secret-distinctness", new Set(secretDigests).size === secretDigests.length, summary.secretValues.length);
  return { configuredNames: summary.configuredNames, configuredCount: summary.configuredCount, aggregateSha256: summary.aggregateSha256, originCount: summary.origins.length, secretCount: summary.secretValues.length };
}
export function validatePrerequisites(context, policy) {
  const checks = [];
  add(checks, "runtime:node", context.runtime?.node === policy.runtime.node, context.runtime?.node ?? null);
  add(checks, "runtime:npm", context.runtime?.npm === policy.runtime.npm, context.runtime?.npm ?? null);
  add(checks, "source:expected-digest-format", DIGEST.test(String(context.expectedSourceManifestSha256 ?? "")), context.expectedSourceManifestSha256 ?? null);
  add(checks, "source:observed-digest-format", DIGEST.test(String(context.sourceManifestSha256 ?? "")), context.sourceManifestSha256 ?? null);
  add(checks, "source:anchor-match", context.sourceManifestSha256 === context.expectedSourceManifestSha256, null);
  const a60 = context.a60 ?? {};
  add(checks, "a60:revision", a60.revisionId === policy.requiredPreconditions.a60.revisionId, a60.revisionId ?? null);
  add(checks, "a60:decision", decisionOf(a60) === policy.requiredPreconditions.a60.decision, decisionOf(a60));
  add(checks, "a60:non-fixture", !fixtureOf(a60), fixtureOf(a60));
  add(checks, "a60:source-binding", sourceManifestOf(a60) === null || sourceManifestOf(a60) === context.sourceManifestSha256, sourceManifestOf(a60));
  const a61 = context.a61 ?? {};
  const a77 = context.a77 ?? {};
  const lineagePolicy = policy.requiredPreconditions.lineage;
  const legacyVerified = a61.revisionId === lineagePolicy.legacy.revisionId && decisionOf(a61) === lineagePolicy.legacy.decision && !fixtureOf(a61);
  const cleanRootVerified = a77.revisionId === lineagePolicy.cleanRoot.revisionId && decisionOf(a77) === lineagePolicy.cleanRoot.decision && !fixtureOf(a77) && a77.saleEnabled !== true && a77.liveProven !== true;
  const admittedLineage = legacyVerified ? "legacy" : cleanRootVerified ? "current-root" : null;
  add(checks, "lineage:legacy-or-signed-clean-root", Boolean(admittedLineage), { legacyVerified, cleanRootVerified });
  add(checks, "lineage:no-fixture", admittedLineage === "legacy" ? !fixtureOf(a61) : admittedLineage === "current-root" ? !fixtureOf(a77) : false, admittedLineage);
  const critical = normalizedCriticalSummary(context.criticalGate ?? {});
  add(checks, "critical:suites", critical.suites === policy.requiredPreconditions.criticalGate.suites, critical.suites);
  add(checks, "critical:passed", critical.passed === policy.requiredPreconditions.criticalGate.passed, critical.passed);
  add(checks, "critical:blocked-zero", critical.blocked === policy.requiredPreconditions.criticalGate.blocked, critical.blocked);
  add(checks, "critical:semantic-failures-zero", critical.semanticFailures === policy.requiredPreconditions.criticalGate.semanticFailures, critical.semanticFailures);
  add(checks, "critical:credit", critical.credit, critical.credit);
  add(checks, "critical:lineage-mode", admittedLineage !== null && critical.lineageMode === admittedLineage, { admittedLineage, observed: critical.lineageMode });
  const environment = validateEnvironment(context.environment ?? {}, policy, checks);
  return { checks, passed: checks.every((row) => row.passed), environment, critical };
}
export function validateStageReceipt(stage, receipt, context, previousTimestampMs, policy) {
  const checks = [];
  add(checks, `${stage.id}:present`, Boolean(receipt), Boolean(receipt));
  if (!receipt) return { stageId: stage.id, passed: false, checks, timestampMs: null };
  add(checks, `${stage.id}:revision`, receipt.revisionId === stage.revisionId, receipt.revisionId ?? null);
  add(checks, `${stage.id}:decision`, decisionOf(receipt) === stage.expectedDecision, decisionOf(receipt));
  add(checks, `${stage.id}:non-fixture`, !fixtureOf(receipt), fixtureOf(receipt));
  add(checks, `${stage.id}:sale-disabled`, receipt.saleEnabled !== true && receipt.sellEnabled !== true, { saleEnabled: receipt.saleEnabled, sellEnabled: receipt.sellEnabled });
  add(checks, `${stage.id}:live-unclaimed`, receipt.liveProven !== true && receipt.productionApproved !== true, { liveProven: receipt.liveProven, productionApproved: receipt.productionApproved });
  const source = sourceManifestOf(receipt);
  add(checks, `${stage.id}:source-binding`, source === null || source === context.sourceManifestSha256, source);
  const time = checkTimestamp(receipt, context.nowMs, policy.stagingSafety);
  add(checks, `${stage.id}:timestamp`, time.ok, time.reason ?? receipt.completedAt ?? receipt.generatedAt ?? null);
  add(checks, `${stage.id}:ordered`, time.timestampMs === null || previousTimestampMs === null || time.timestampMs >= previousTimestampMs, { previousTimestampMs, timestampMs: time.timestampMs });
  return { stageId: stage.id, passed: checks.every((row) => row.passed), checks, timestampMs: time.timestampMs };
}
export function evaluateProgram(context, policy) {
  const preflight = validatePrerequisites(context, policy);
  const stageResults = [];
  let previousTimestampMs = null;
  let missing = false;
  let failed = false;
  if (preflight.passed) {
    const receipts = context.stageReceipts ?? {};
    for (const stage of policy.stages) {
      const receipt = receipts[stage.id] ?? null;
      if (!receipt) missing = true;
      const result = validateStageReceipt(stage, receipt, context, previousTimestampMs, policy);
      stageResults.push(result);
      if (!result.passed && receipt) failed = true;
      if (result.timestampMs !== null) previousTimestampMs = result.timestampMs;
      if (!result.passed) break;
    }
  }
  let decision;
  if (!preflight.passed) decision = policy.decisions.blocked;
  else if (missing) decision = policy.decisions.incomplete;
  else if (failed || stageResults.some((row) => !row.passed)) decision = policy.decisions.actionRequired;
  else if (stageResults.length !== policy.stages.length) decision = policy.decisions.incomplete;
  else decision = policy.decisions.verified;
  const passedChecks = [...preflight.checks, ...stageResults.flatMap((row) => row.checks)].filter((row) => row.passed).length;
  const totalChecks = preflight.checks.length + stageResults.flatMap((row) => row.checks).length;
  return {
    schemaVersion: "velmere.pass36.a63.staging-program-evaluation.v1",
    revisionId: policy.revisionId,
    programId: context.environment?.VELMERE_A63_PROGRAM_ID ?? null,
    decision,
    fixtureMode: Boolean(context.fixtureMode),
    preflight,
    stageResults,
    summary: { totalChecks, passedChecks, failedChecks: totalChecks - passedChecks, stagesExpected: policy.stages.length, stagesVerified: stageResults.filter((row) => row.passed).length },
    sourceManifestSha256: context.sourceManifestSha256 ?? null,
    environmentDigestSha256: preflight.environment.aggregateSha256,
    saleEnabled: false,
    liveProven: false,
    productionApproved: false,
    truthBoundary: policy.truthBoundary,
  };
}
export function appendJournalEvent(journal, event) {
  const previousDigest = journal.length ? journal[journal.length - 1].digest : "0".repeat(64);
  const rowCore = { sequence: journal.length + 1, previousDigest, ...event };
  return [...journal, { ...rowCore, digest: sha256(canonicalJson(rowCore)) }];
}
export function verifyJournal(journal) {
  if (!Array.isArray(journal)) return { ok: false, reason: "journal_not_array" };
  let previousDigest = "0".repeat(64);
  for (let index = 0; index < journal.length; index += 1) {
    const row = journal[index];
    if (row.sequence !== index + 1 || row.previousDigest !== previousDigest) return { ok: false, reason: `journal_chain:${index + 1}` };
    const core = { ...row }; delete core.digest;
    if (row.digest !== sha256(canonicalJson(core))) return { ok: false, reason: `journal_digest:${index + 1}` };
    previousDigest = row.digest;
  }
  return { ok: true, events: journal.length, finalDigest: previousDigest };
}
export function redactObject(value, suppliedSecrets = []) {
  const secrets = suppliedSecrets.filter((secret) => typeof secret === "string" && secret.length > 0);
  const text = JSON.stringify(value);
  for (const secret of secrets) if (text.includes(secret)) throw new Error("a63_secret_leak_detected");
  if (/(?:sk|pk|rk)_live_[A-Za-z0-9]/u.test(text)) throw new Error("a63_live_key_leak_detected");
  return value;
}
export function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, filePath);
}
