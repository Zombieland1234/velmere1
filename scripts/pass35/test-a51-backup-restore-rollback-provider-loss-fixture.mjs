#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const backupSecret = "a51-backup-secret-abcdefghijklmnopqrstuvwxyz";
const deploymentSecret = "a51-deployment-secret-abcdefghijklmnopqrstuvwxyz";
const chaosSecret = "a51-chaos-secret-abcdefghijklmnopqrstuvwxyz";

function json(res, status, body) { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); }
async function readJson(req) { const chunks = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
function bearer(req) { return String(req.headers.authorization ?? "").replace(/^Bearer\s+/iu, ""); }

function createServer(options = {}) {
  const state = {
    backupId: "backup-a51-fixture", restoreId: "restore-a51-fixture",
    databaseDigest: crypto.createHash("sha256").update("database-a51").digest("hex"),
    storageDigest: crypto.createHash("sha256").update("storage-a51").digest("hex"),
    activeDeploymentId: "deployment-current-a51", previousDeploymentId: "deployment-previous-a51",
    providerMode: "primary", primaryUnavailable: false,
  };
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method ?? "GET";
    try {
      if (url.pathname === "/backup/create" && method === "POST") {
        if (bearer(req) !== backupSecret) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        return json(res, 201, { backupId: state.backupId, encrypted: true, encryption: "fixture-envelope-v1", backupBytes: 4096, databaseDigest: state.databaseDigest, storageDigest: state.storageDigest, sourceRevisionId: body.sourceRevisionId, createdAt: new Date().toISOString() });
      }
      if (url.pathname === "/backup/verify" && method === "POST") {
        if (bearer(req) !== backupSecret) return json(res, 401, { error: "unauthorized" });
        return json(res, 200, { verified: true, checksumsValid: true, databaseDigest: state.databaseDigest, storageDigest: state.storageDigest });
      }
      if (url.pathname === "/restore" && method === "POST") {
        if (bearer(req) !== backupSecret) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        if (body.operation === "cleanup") return json(res, 200, { cleanupComplete: options.cleanupBroken ? false : true });
        return json(res, 202, { restoreId: state.restoreId, accepted: true });
      }
      if (url.pathname === "/restore/verify" && method === "POST") {
        if (bearer(req) !== backupSecret) return json(res, 401, { error: "unauthorized" });
        return json(res, 200, {
          databaseDigest: options.tamperRestoreDigest ? crypto.randomBytes(32).toString("hex") : state.databaseDigest,
          storageDigest: state.storageDigest,
          rlsPolicyCount: options.weakRls ? 4 : 19,
          rlsVerified: !options.weakRls,
          tenantIsolationVerified: true,
          crossTenantReadsDenied: true,
          restoredRecords: 12,
          restoredObjects: 3,
        });
      }
      if (url.pathname === "/deploy/status" && method === "GET") {
        if (bearer(req) !== deploymentSecret) return json(res, 401, { error: "unauthorized" });
        return json(res, 200, { activeDeploymentId: state.activeDeploymentId, previousDeploymentId: state.previousDeploymentId, health: "healthy", smokePassed: true });
      }
      if (url.pathname === "/deploy/action" && method === "POST") {
        if (bearer(req) !== deploymentSecret) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        if (body.operation === "rollback") state.activeDeploymentId = options.rollbackWrong ? "unexpected-deployment" : body.targetDeploymentId;
        if (body.operation === "restore_forward") state.activeDeploymentId = body.targetDeploymentId;
        return json(res, 202, { accepted: true, activeDeploymentId: state.activeDeploymentId });
      }
      if (url.pathname === "/chaos" && method === "POST") {
        if (bearer(req) !== chaosSecret) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        if (body.mode === "primary_down") { state.primaryUnavailable = true; state.providerMode = options.failoverBroken ? "failed" : "failover"; }
        if (body.mode === "primary_up") { state.primaryUnavailable = false; state.providerMode = "recovered"; }
        return json(res, 202, { accepted: true, primaryUnavailable: state.primaryUnavailable, providerMode: state.providerMode });
      }
      if (url.pathname === "/markets" && method === "GET") {
        if (state.providerMode === "failed") return json(res, 503, { providerMode: "failed", primaryUnavailable: true, assets: [] });
        return json(res, 200, { providerMode: state.providerMode, primaryUnavailable: state.primaryUnavailable, activeProviderId: state.providerMode === "failover" ? "fixture-provider-b" : "fixture-provider-a", assets: [{ symbol: "BTC", price: 1 }, { symbol: "ETH", price: 2 }] });
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
  const child = spawn(process.execPath, ["scripts/a51-backup-restore-rollback-provider-loss-acceptance.mjs", "--fixture"], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      VELMERE_A51_STAGING_BASE_URL: base,
      VELMERE_A51_BACKUP_CREATE_URL: `${base}/backup/create`,
      VELMERE_A51_BACKUP_VERIFY_URL: `${base}/backup/verify`,
      VELMERE_A51_RESTORE_URL: `${base}/restore`,
      VELMERE_A51_RESTORE_VERIFY_URL: `${base}/restore/verify`,
      VELMERE_A51_BACKUP_BEARER_SECRET: backupSecret,
      VELMERE_A51_DEPLOYMENT_STATUS_URL: `${base}/deploy/status`,
      VELMERE_A51_DEPLOYMENT_ROLLBACK_URL: `${base}/deploy/action`,
      VELMERE_A51_DEPLOYMENT_BEARER_SECRET: deploymentSecret,
      VELMERE_A51_CHAOS_CONTROL_URL: `${base}/chaos`,
      VELMERE_A51_CHAOS_BEARER_SECRET: chaosSecret,
      VELMERE_A51_MARKETS_URL: `${base}/markets`,
      VELMERE_A51_PROJECT_CLASS: "disposable_staging",
      VELMERE_A51_CONFIRM: "fixture"
    }
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
  const status = await new Promise((resolve) => child.on("close", resolve));
  await new Promise((resolve) => server.close(resolve));
  const report = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a51/PASS35_A51_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_ACCEPTANCE.json"), "utf8"));
  check(`${name}:exit`, expectedPass ? status === 0 : status !== 0, { status, stdout: stdout.trim(), stderr: stderr.trim() });
  check(`${name}:decision`, report.decision === (expectedPass ? "FIXTURE_PASS" : "FIXTURE_FAIL"), report.decision);
  check(`${name}:truth`, report.productionBackupProven === false && report.productionRollbackProven === false && report.providerSlaProven === false && report.saleEnabled === false, report);
  if (!expectedPass && expectedFailureId) check(`${name}:failure`, report.failures?.some((row) => row.id === expectedFailureId), report.failures?.map((row) => row.id));
}

await runScenario("clean", {}, true);
await runScenario("tampered_restore", { tamperRestoreDigest: true }, false, "restore-database-digest-parity");
await runScenario("weak_rls", { weakRls: true }, false, "restore-rls-revalidated");
await runScenario("bad_rollback", { rollbackWrong: true }, false, "rollback-active-deployment");
await runScenario("failover_missing", { failoverBroken: true }, false, "provider-failover-served");
await runScenario("cleanup_missing", { cleanupBroken: true }, false, "restore-cleanup-complete");
await runScenario("final_clean", {}, true);

const failures = checks.filter((row) => !row.ok);
fs.mkdirSync(path.join(root, "artifacts/pass35/a51"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a51/PASS35_A51_ADVERSARIAL_FIXTURE_SUITE.json"), `${JSON.stringify({ schemaVersion: "velmere.pass35.a51.adversarial-fixture-suite.v1", revisionId: "VELMERE_PASS35_A51_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_ACCEPTANCE", generatedAt: new Date().toISOString(), summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, checks }, null, 2)}\n`);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
