#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a51-backup-restore-rollback-provider-loss-acceptance.json"), "utf8"));
const outputDir = path.join(root, "artifacts/pass35/a51");
const outputJson = path.join(outputDir, "PASS35_A51_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_ACCEPTANCE.json");
const outputMd = path.join(outputDir, "PASS35_A51_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_ACCEPTANCE.md");
fs.mkdirSync(outputDir, { recursive: true });

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const shaText = (value) => sha256(Buffer.from(String(value), "utf8"));
const nowIso = () => new Date().toISOString();
const checks = [];
const addCheck = (id, ok, detail = null, status = ok ? "PASS" : "FAIL") => checks.push({ id, ok: Boolean(ok), status, detail });

function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a51-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "a51_source_manifest_missing", digest: null, rows: 0 };
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

function bearer(secret, extra = {}) {
  return { authorization: `Bearer ${secret}`, accept: "application/json", "content-type": "application/json", ...extra };
}

function marketRows(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["assets", "markets", "data", "items", "results"]) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

async function main() {
  const startedAt = nowIso();
  const sourceBefore = verifySourceManifest();
  addCheck("source-fingerprint-before", sourceBefore.ok, { rows: sourceBefore.rows, digest: sourceBefore.digest, reason: sourceBefore.reason });

  if (fixtureMode) addCheck("precondition-a50-verified", true, { fixture: true }, "FIXTURE_PASS");
  else {
    const receipt = path.join(root, "artifacts/pass35/a50/PASS35_A50_TRANSACTIONAL_EMAIL_PRIVATE_STORAGE_KMS_ACCEPTANCE.json");
    const decision = fs.existsSync(receipt) ? JSON.parse(fs.readFileSync(receipt, "utf8")).decision : null;
    addCheck("precondition-a50-verified", decision === contract.requiredA50Decision, { decision, required: contract.requiredA50Decision });
  }

  const npmObserved = currentNpmVersion();
  addCheck("runtime-exact", fixtureMode || (process.versions.node === contract.runtime.node && npmObserved === contract.runtime.npm), { node: process.versions.node, npm: npmObserved, expected: contract.runtime, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);
  const confirmation = process.env.VELMERE_A51_CONFIRM ?? "";
  addCheck("confirmation-token", fixtureMode || confirmation === contract.confirmationToken, { present: Boolean(confirmation), fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const urlNames = [
    ["staging", "VELMERE_A51_STAGING_BASE_URL"],
    ["backup_create", "VELMERE_A51_BACKUP_CREATE_URL"],
    ["backup_verify", "VELMERE_A51_BACKUP_VERIFY_URL"],
    ["restore", "VELMERE_A51_RESTORE_URL"],
    ["restore_verify", "VELMERE_A51_RESTORE_VERIFY_URL"],
    ["deployment_status", "VELMERE_A51_DEPLOYMENT_STATUS_URL"],
    ["deployment_rollback", "VELMERE_A51_DEPLOYMENT_ROLLBACK_URL"],
    ["chaos_control", "VELMERE_A51_CHAOS_CONTROL_URL"],
    ["markets", "VELMERE_A51_MARKETS_URL"]
  ];
  const urls = {};
  const urlFailures = [];
  for (const [kind, name] of urlNames) {
    const safety = safeUrl(process.env[name] ?? "", kind === "staging" ? "staging" : "bridge");
    if (!safety.ok) urlFailures.push({ name, reason: safety.reason }); else urls[kind] = safety.url;
  }
  addCheck("staging-url-safety", Boolean(urls.staging), urls.staging ? { originSha256: shaText(urls.staging.origin) } : { failures: urlFailures.filter((row) => row.name === "VELMERE_A51_STAGING_BASE_URL") });
  addCheck("bridge-url-safety", urlFailures.length === 0, { failures: urlFailures });
  if (urlFailures.length) throw new Error("unsafe_or_missing_a51_url");

  const backupSecret = process.env.VELMERE_A51_BACKUP_BEARER_SECRET ?? "";
  const deploymentSecret = process.env.VELMERE_A51_DEPLOYMENT_BEARER_SECRET ?? "";
  const chaosSecret = process.env.VELMERE_A51_CHAOS_BEARER_SECRET ?? "";
  const projectClass = process.env.VELMERE_A51_PROJECT_CLASS ?? "";
  const secretsOk = fixtureMode || [backupSecret, deploymentSecret, chaosSecret].every((value) => value.length >= contract.bridgeSafety.minimumSecretLength);
  addCheck("secret-boundary", secretsOk && (fixtureMode || projectClass === contract.bridgeSafety.projectClass), { backupSecretLengthOk: backupSecret.length >= 32, deploymentSecretLengthOk: deploymentSecret.length >= 32, chaosSecretLengthOk: chaosSecret.length >= 32, projectClass, fixture: fixtureMode });

  const nonce = crypto.randomBytes(16).toString("hex");
  const nonceHash = shaText(nonce);
  const backupCreate = await requestJson(urls.backup_create, {
    method: "POST", headers: bearer(backupSecret), body: JSON.stringify({ operation: "create", scope: contract.bridgeSafety.backupScope, nonceHash, sourceRevisionId: contract.parentRevisionId })
  });
  const backup = backupCreate.json ?? {};
  const backupId = typeof backup.backupId === "string" ? backup.backupId : null;
  addCheck("backup-created", [200, 201, 202].includes(backupCreate.response.status) && Boolean(backupId) && Number(backup.backupBytes) > 0, { status: backupCreate.response.status, backupIdDigest: backupId ? shaText(backupId) : null, backupBytes: Number(backup.backupBytes) || 0 });
  addCheck("backup-encrypted", backup.encrypted === true && typeof backup.encryption === "string", { encrypted: backup.encrypted, encryption: backup.encryption ?? null });
  addCheck("backup-source-revision-bound", backup.sourceRevisionId === contract.parentRevisionId, { sourceRevisionId: backup.sourceRevisionId ?? null });

  const backupVerify = await requestJson(urls.backup_verify, { method: "POST", headers: bearer(backupSecret), body: JSON.stringify({ backupId, nonceHash }) });
  const verified = backupVerify.json ?? {};
  const dbDigest = typeof verified.databaseDigest === "string" ? verified.databaseDigest : backup.databaseDigest;
  const storageDigest = typeof verified.storageDigest === "string" ? verified.storageDigest : backup.storageDigest;
  addCheck("backup-verified", backupVerify.response.status === 200 && verified.verified === true && verified.checksumsValid === true && Boolean(dbDigest && storageDigest), { status: backupVerify.response.status, verified: verified.verified, checksumsValid: verified.checksumsValid });

  const restoreCreate = await requestJson(urls.restore, { method: "POST", headers: bearer(backupSecret), body: JSON.stringify({ operation: "restore", backupId, targetClass: contract.bridgeSafety.restoreTargetClass, nonceHash }) });
  const restoreId = typeof restoreCreate.json?.restoreId === "string" ? restoreCreate.json.restoreId : null;
  addCheck("restore-created", [200, 201, 202].includes(restoreCreate.response.status) && Boolean(restoreId), { status: restoreCreate.response.status, restoreIdDigest: restoreId ? shaText(restoreId) : null });

  const restoreVerify = await requestJson(urls.restore_verify, { method: "POST", headers: bearer(backupSecret), body: JSON.stringify({ restoreId, backupId, nonceHash }) });
  const restored = restoreVerify.json ?? {};
  addCheck("restore-database-digest-parity", restoreVerify.response.status === 200 && restored.databaseDigest === dbDigest, { status: restoreVerify.response.status, parity: restored.databaseDigest === dbDigest });
  addCheck("restore-storage-digest-parity", restoreVerify.response.status === 200 && restored.storageDigest === storageDigest, { status: restoreVerify.response.status, parity: restored.storageDigest === storageDigest });
  addCheck("restore-rls-revalidated", Number(restored.rlsPolicyCount) >= contract.budgets.minimumRlsPolicies && restored.rlsVerified === true, { rlsPolicyCount: Number(restored.rlsPolicyCount) || 0, rlsVerified: restored.rlsVerified });
  addCheck("restore-tenant-isolation-revalidated", restored.tenantIsolationVerified === true && restored.crossTenantReadsDenied === true, { tenantIsolationVerified: restored.tenantIsolationVerified, crossTenantReadsDenied: restored.crossTenantReadsDenied });
  addCheck("restore-record-object-floor", Number(restored.restoredRecords) >= contract.budgets.minimumRestoredRecords && Number(restored.restoredObjects) >= contract.budgets.minimumRestoredObjects, { restoredRecords: Number(restored.restoredRecords) || 0, restoredObjects: Number(restored.restoredObjects) || 0 });

  const statusBefore = await requestJson(urls.deployment_status, { headers: bearer(deploymentSecret) });
  const baseline = statusBefore.json ?? {};
  const activeDeploymentId = typeof baseline.activeDeploymentId === "string" ? baseline.activeDeploymentId : null;
  const previousDeploymentId = typeof baseline.previousDeploymentId === "string" ? baseline.previousDeploymentId : null;
  addCheck("deployment-baseline-healthy", statusBefore.response.status === 200 && baseline.health === "healthy" && Boolean(activeDeploymentId && previousDeploymentId && activeDeploymentId !== previousDeploymentId), { status: statusBefore.response.status, health: baseline.health, activeDigest: activeDeploymentId ? shaText(activeDeploymentId) : null, previousDigest: previousDeploymentId ? shaText(previousDeploymentId) : null });

  const rollback = await requestJson(urls.deployment_rollback, { method: "POST", headers: bearer(deploymentSecret), body: JSON.stringify({ operation: "rollback", targetDeploymentId: previousDeploymentId, expectedCurrentDeploymentId: activeDeploymentId, nonceHash }) });
  addCheck("rollback-request-accepted", [200, 202].includes(rollback.response.status) && rollback.json?.accepted === true, { status: rollback.response.status, accepted: rollback.json?.accepted });
  const statusRolled = await requestJson(urls.deployment_status, { headers: bearer(deploymentSecret) });
  addCheck("rollback-active-deployment", statusRolled.response.status === 200 && statusRolled.json?.activeDeploymentId === previousDeploymentId, { status: statusRolled.response.status, targetMatched: statusRolled.json?.activeDeploymentId === previousDeploymentId });
  addCheck("rollback-health-proven", statusRolled.json?.health === "healthy" && statusRolled.json?.smokePassed === true, { health: statusRolled.json?.health, smokePassed: statusRolled.json?.smokePassed });

  const primaryBefore = await requestJson(urls.markets, { headers: { accept: "application/json" } });
  const primaryRows = marketRows(primaryBefore.json);
  addCheck("provider-primary-baseline", primaryBefore.response.status === 200 && contract.providerSafety.baselineModes.includes(primaryBefore.json?.providerMode) && primaryRows.length >= contract.budgets.minimumMarketAssets, { status: primaryBefore.response.status, providerMode: primaryBefore.json?.providerMode, assets: primaryRows.length });

  const outage = await requestJson(urls.chaos_control, { method: "POST", headers: bearer(chaosSecret), body: JSON.stringify({ mode: contract.providerSafety.outageMode, nonceHash }) });
  addCheck("provider-primary-outage-induced", [200, 202].includes(outage.response.status) && outage.json?.primaryUnavailable === true, { status: outage.response.status, primaryUnavailable: outage.json?.primaryUnavailable });
  const failover = await requestJson(urls.markets, { headers: { accept: "application/json" } });
  const failoverRows = marketRows(failover.json);
  addCheck("provider-failover-served", failover.response.status === 200 && contract.providerSafety.failoverModes.includes(failover.json?.providerMode) && failover.json?.primaryUnavailable === true && typeof failover.json?.activeProviderId === "string", { status: failover.response.status, providerMode: failover.json?.providerMode, primaryUnavailable: failover.json?.primaryUnavailable, providerDigest: failover.json?.activeProviderId ? shaText(failover.json.activeProviderId) : null });
  addCheck("provider-data-floor-maintained", failoverRows.length >= contract.budgets.minimumMarketAssets, { assets: failoverRows.length });

  const restorePrimary = await requestJson(urls.chaos_control, { method: "POST", headers: bearer(chaosSecret), body: JSON.stringify({ mode: contract.providerSafety.restoreMode, nonceHash }) });
  const recovered = await requestJson(urls.markets, { headers: { accept: "application/json" } });
  addCheck("provider-primary-restored", [200, 202].includes(restorePrimary.response.status) && recovered.response.status === 200 && contract.providerSafety.recoveredModes.includes(recovered.json?.providerMode), { controlStatus: restorePrimary.response.status, marketStatus: recovered.response.status, providerMode: recovered.json?.providerMode });

  const forward = await requestJson(urls.deployment_rollback, { method: "POST", headers: bearer(deploymentSecret), body: JSON.stringify({ operation: "restore_forward", targetDeploymentId: activeDeploymentId, expectedCurrentDeploymentId: previousDeploymentId, nonceHash }) });
  const statusForward = await requestJson(urls.deployment_status, { headers: bearer(deploymentSecret) });
  addCheck("rollback-forward-restored", [200, 202].includes(forward.response.status) && statusForward.response.status === 200 && statusForward.json?.activeDeploymentId === activeDeploymentId && statusForward.json?.health === "healthy", { forwardStatus: forward.response.status, status: statusForward.response.status, activeMatched: statusForward.json?.activeDeploymentId === activeDeploymentId, health: statusForward.json?.health });

  const cleanup = await requestJson(urls.restore, { method: "POST", headers: bearer(backupSecret), body: JSON.stringify({ operation: "cleanup", restoreId, backupId, nonceHash }) });
  addCheck("restore-cleanup-complete", [200, 202, 204].includes(cleanup.response.status) && cleanup.json?.cleanupComplete === true, { status: cleanup.response.status, cleanupComplete: cleanup.json?.cleanupComplete });

  const sourceAfter = verifySourceManifest();
  addCheck("source-fingerprint-unchanged", sourceBefore.ok && sourceAfter.ok && sourceBefore.digest === sourceAfter.digest, { before: sourceBefore.digest, after: sourceAfter.digest, rows: sourceAfter.rows, reason: sourceAfter.reason });

  const secretNeedles = [backupSecret, deploymentSecret, chaosSecret, backupId, restoreId, activeDeploymentId, previousDeploymentId].filter(Boolean);
  const preliminary = JSON.stringify({ checks, nonceHash, sourceBefore, sourceAfter });
  addCheck("evidence-redaction", secretNeedles.every((value) => !preliminary.includes(value)), { leakedValues: secretNeedles.filter((value) => preliminary.includes(value)).length });

  const failures = checks.filter((row) => !row.ok);
  const decision = fixtureMode ? (failures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : failures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_BACKUP_RESTORE_ROLLBACK_PROVIDER_FAILOVER";
  const report = {
    schemaVersion: "velmere.pass35.a51.backup-restore-rollback-provider-loss-receipt.v1",
    revisionId: contract.revisionId,
    parentRevisionId: contract.parentRevisionId,
    generatedAt: nowIso(), startedAt, completedAt: nowIso(), fixtureMode,
    decision, status: decision, truthBoundary: contract.truthBoundary,
    stagingBackupRestoreProven: !fixtureMode && failures.length === 0,
    productionBackupProven: false, productionRollbackProven: false, providerSlaProven: false,
    liveProven: false, saleEnabled: false,
    sourceFingerprint: { before: sourceBefore.digest, after: sourceAfter.digest, rows: sourceAfter.rows },
    backup: { backupIdDigest: backupId ? shaText(backupId) : null, databaseDigest: dbDigest ?? null, storageDigest: storageDigest ?? null },
    restore: { restoreIdDigest: restoreId ? shaText(restoreId) : null, restoredRecords: Number(restored.restoredRecords) || 0, restoredObjects: Number(restored.restoredObjects) || 0, rlsPolicyCount: Number(restored.rlsPolicyCount) || 0 },
    deployment: { originalDigest: activeDeploymentId ? shaText(activeDeploymentId) : null, rollbackDigest: previousDeploymentId ? shaText(previousDeploymentId) : null },
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
    failures, checks
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (secretNeedles.some((value) => serialized.includes(value))) throw new Error("evidence_secret_leak_detected");
  fs.writeFileSync(outputJson, serialized);
  fs.writeFileSync(outputMd, `# PASS35 A51 — backup, restore, rollback and provider loss\n\nDecision: **${decision}**\n\n- Checks: ${checks.length}\n- Passed: ${checks.length - failures.length}\n- Failed: ${failures.length}\n- Fixture mode: ${fixtureMode}\n- Production backup proven: false\n- Production rollback proven: false\n- Provider SLA proven: false\n- Sale enabled: false\n\n${failures.length ? "## Failures\n\n" + failures.map((row) => `- ${row.id}: ${JSON.stringify(row.detail)}`).join("\n") : "All declared A51 checks passed."}\n`);
  console.log(JSON.stringify({ decision, summary: report.summary, output: path.relative(root, outputJson).replaceAll("\\", "/") }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  const report = { schemaVersion: "velmere.pass35.a51.error.v1", revisionId: contract.revisionId, generatedAt: nowIso(), decision: fixtureMode ? "FIXTURE_FAIL" : "ACTION_REQUIRED", error: error instanceof Error ? error.message : String(error), productionBackupProven: false, productionRollbackProven: false, providerSlaProven: false, liveProven: false, saleEnabled: false };
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
});
