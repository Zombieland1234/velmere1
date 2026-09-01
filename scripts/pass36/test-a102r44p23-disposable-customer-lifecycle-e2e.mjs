#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  DisposableAuditLifecycleStore,
  sha256,
} from "../../lib/security/audit-disposable-customer-lifecycle.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(__dirname, "a102r44p23-disposable-lifecycle-worker.mjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p23-lifecycle-"));
fs.chmodSync(root, 0o700);
let nowMs = Date.parse("2026-08-06T10:00:00.000Z");
const downloadSecret = "download-secret-r44p23-" + "a".repeat(40);
const webhookSecret = "webhook-secret-r44p23-" + "b".repeat(40);
const store = new DisposableAuditLifecycleStore({ root, downloadSecret, webhookSecret, now: () => nowMs });

const sessionA = store.createSession({ accountId: "account-a", ttlMs: 60_000 });
const sessionB = store.createSession({ accountId: "account-b", ttlMs: 60_000 });

function noStoreHeaders(contentType = "application/json; charset=utf-8") {
  return {
    "content-type": contentType,
    "cache-control": "no-store, private, max-age=0",
    pragma: "no-cache",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "cross-origin-resource-policy": "same-origin",
  };
}

function respond(res, status, payload, extraHeaders = {}) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
  const contentType = Buffer.isBuffer(payload) ? "application/pdf" : "application/json; charset=utf-8";
  res.writeHead(status, { ...noStoreHeaders(contentType), ...extraHeaders });
  res.end(body);
}

function bearer(req) {
  const raw = String(req.headers.authorization ?? "");
  return raw.startsWith("Bearer ") ? raw.slice(7) : "";
}

function readBody(req, maxBytes = 72 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let tooLarge = false;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        tooLarge = true;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) {
        reject(Object.assign(new Error("body_too_large"), { code: "BODY_TOO_LARGE" }));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

function safeError(error) {
  return { ok: false, error: error?.code === "BODY_TOO_LARGE" ? "BODY_TOO_LARGE" : "REQUEST_FAILED" };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const sessionToken = bearer(req);
    if (req.method === "POST" && url.pathname === "/intake") {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw.toString("utf8")); }
      catch { return respond(res, 400, { ok: false, error: "JSON_INVALID" }); }
      const result = store.createIntake({
        sessionToken,
        idempotencyKey: req.headers["idempotency-key"],
        tier: body.tier,
        source: body.source,
        simulateInterruptOnce: body.simulateInterruptOnce,
      });
      return respond(res, result.status, result);
    }
    const statusMatch = url.pathname.match(/^\/status\/([A-Za-z0-9._:@-]+)$/u);
    if (req.method === "GET" && statusMatch) {
      const result = store.readOwnedJob(sessionToken, statusMatch[1]);
      if (!result.ok) return respond(res, result.status, result);
      const { source: _source, accountId: _accountId, ...safeJob } = result.job;
      return respond(res, 200, { ok: true, job: safeJob });
    }
    if (req.method === "POST" && url.pathname === "/webhook") {
      const raw = await readBody(req, 16 * 1024);
      const result = store.processWebhook(raw.toString("utf8"), req.headers["x-velmere-signature"]);
      return respond(res, result.status, result);
    }
    const tokenMatch = url.pathname.match(/^\/download-token\/([A-Za-z0-9._:@-]+)$/u);
    if (req.method === "POST" && tokenMatch) {
      const raw = await readBody(req, 4 * 1024);
      let body = {};
      if (raw.length) {
        try { body = JSON.parse(raw.toString("utf8")); }
        catch { return respond(res, 400, { ok: false, error: "JSON_INVALID" }); }
      }
      const result = store.issueDownloadToken({ sessionToken, jobId: tokenMatch[1], ttlMs: body.ttlMs });
      return respond(res, result.status, result);
    }
    if (req.method === "GET" && url.pathname === "/download") {
      const result = store.consumeDownload({ sessionToken, token: url.searchParams.get("token") });
      if (!result.ok) return respond(res, result.status, result);
      return respond(res, 200, result.bytes, { "x-velmere-digest": result.digest });
    }
    if (req.method === "POST" && url.pathname === "/account/delete") {
      const raw = await readBody(req, 4 * 1024);
      let body;
      try { body = JSON.parse(raw.toString("utf8")); }
      catch { return respond(res, 400, { ok: false, error: "JSON_INVALID" }); }
      const result = store.deleteAccount({ sessionToken, idempotencyKey: body.idempotencyKey });
      return respond(res, result.status, result);
    }
    return respond(res, 404, { ok: false, error: "ROUTE_NOT_FOUND" });
  } catch (error) {
    return respond(res, error?.code === "BODY_TOO_LARGE" ? 413 : 500, safeError(error));
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

async function api(method, pathname, token, body, extraHeaders = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";
  let json = null;
  if (contentType.includes("json")) json = JSON.parse(bytes.toString("utf8"));
  return { status: response.status, bytes, json, headers: response.headers };
}

const rows = [];
function check(id, condition, detail = {}) {
  const row = { id, ok: Boolean(condition), detail };
  rows.push(row);
  if (!row.ok) throw new Error(`assertion_failed:${id}`);
}

function worker(jobId) {
  return spawnSync(process.execPath, [workerPath, root, jobId], {
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "", HOME: root, TMPDIR: root, NO_COLOR: "1", CI: "true" },
    timeout: 30_000,
  });
}

function paymentEvent(eventId, type, jobId, accountId = "account-a") {
  const raw = JSON.stringify({ eventId, type, jobId, accountId, amountMinor: 4900, currency: "EUR" });
  return { raw, signature: store.signWebhook(raw) };
}

try {
  check("01-private-root-mode", process.platform === "win32" || (fs.statSync(root).mode & 0o777) === 0o700, { mode: (fs.statSync(root).mode & 0o777).toString(8) });
  check("02-session-a-created", sessionA.token.length >= 32 && sessionA.record.accountId === "account-a");
  check("03-session-b-created", sessionB.token.length >= 32 && sessionB.record.accountId === "account-b");

  const basicIntake = await api("POST", "/intake", sessionA.token, { tier: "basic", source: "contract Basic { function ok() external {} }" }, { "idempotency-key": "basic-intake-0001" });
  check("04-basic-intake-accepted-without-payment", basicIntake.status === 202 && basicIntake.json?.job?.tier === "basic", { status: basicIntake.status });
  const basicJobId = basicIntake.json.job.jobId;
  const basicReplay = await api("POST", "/intake", sessionA.token, { tier: "basic", source: "contract Basic { function ok() external {} }" }, { "idempotency-key": "basic-intake-0001" });
  check("05-basic-intake-idempotent", basicReplay.status === 200 && basicReplay.json?.idempotentReplay === true && basicReplay.json?.job?.jobId === basicJobId);
  const basicConflict = await api("POST", "/intake", sessionA.token, { tier: "basic", source: "contract Changed {}" }, { "idempotency-key": "basic-intake-0001" });
  check("06-intake-idempotency-conflict", basicConflict.status === 409 && basicConflict.json?.error === "IDEMPOTENCY_CONFLICT");
  const advanced = await api("POST", "/intake", sessionA.token, { tier: "advanced", source: "contract A{}" }, { "idempotency-key": "advanced-intake-0001" });
  check("07-advanced-not-for-sale", advanced.status === 409 && advanced.json?.error === "ADVANCED_NOT_FOR_SALE");
  const unauth = await api("POST", "/intake", "bad-token", { tier: "basic", source: "contract X{}" }, { "idempotency-key": "bad-intake-0001" });
  check("08-unauthenticated-intake-denied", unauth.status === 401);
  const oversized = await api("POST", "/intake", sessionA.token, { tier: "basic", source: "x".repeat(80 * 1024) }, { "idempotency-key": "oversized-0001" });
  check("09-oversized-intake-denied", oversized.status === 413);

  const basicWorker = worker(basicJobId);
  check("10-basic-worker-separate-process", basicWorker.status === 0, { exitCode: basicWorker.status, stderr: basicWorker.stderr.slice(0, 300) });
  const basicStatus = await api("GET", `/status/${basicJobId}`, sessionA.token);
  check("11-basic-job-completed", basicStatus.status === 200 && basicStatus.json?.job?.state === "COMPLETED");
  check("12-status-does-not-return-source", !JSON.stringify(basicStatus.json).includes("contract Basic"));
  const basicToken = await api("POST", `/download-token/${basicJobId}`, sessionA.token, { ttlMs: 30_000 });
  check("13-basic-token-without-payment", basicToken.status === 201 && typeof basicToken.json?.token === "string");
  const basicDownload = await api("GET", `/download?token=${encodeURIComponent(basicToken.json.token)}`, sessionA.token);
  check("14-basic-download-success", basicDownload.status === 200 && basicDownload.bytes.subarray(0, 8).toString() === "%PDF-1.4");
  check("15-basic-download-no-store", /no-store/u.test(basicDownload.headers.get("cache-control") ?? ""));
  const basicReplayDownload = await api("GET", `/download?token=${encodeURIComponent(basicToken.json.token)}`, sessionA.token);
  check("16-basic-token-one-time", basicReplayDownload.status === 409 && basicReplayDownload.json?.error === "TOKEN_REPLAYED");

  const proIntake = await api("POST", "/intake", sessionA.token, { tier: "pro", source: "contract Pro { function risky() external {} }", simulateInterruptOnce: true }, { "idempotency-key": "pro-intake-0001" });
  check("17-pro-intake-created", proIntake.status === 202 && proIntake.json?.job?.entitlementId, { status: proIntake.status });
  const proJobId = proIntake.json.job.jobId;
  const beforeWorkerToken = await api("POST", `/download-token/${proJobId}`, sessionA.token, {});
  check("18-token-before-report-denied", beforeWorkerToken.status === 409 && beforeWorkerToken.json?.error === "REPORT_NOT_READY");
  const firstWorker = worker(proJobId);
  check("19-worker-interruption-recorded", firstWorker.status === 75, { exitCode: firstWorker.status });
  const interrupted = await api("GET", `/status/${proJobId}`, sessionA.token);
  check("20-interrupted-state-visible", interrupted.status === 200 && interrupted.json?.job?.state === "INTERRUPTED_RETRYABLE");
  const secondWorker = worker(proJobId);
  check("21-worker-retry-completes", secondWorker.status === 0, { exitCode: secondWorker.status, stderr: secondWorker.stderr.slice(0, 300) });
  const thirdWorker = worker(proJobId);
  check("22-worker-completion-idempotent", thirdWorker.status === 0 && JSON.parse(thirdWorker.stdout).idempotentReplay === true);
  const proStatus = await api("GET", `/status/${proJobId}`, sessionA.token);
  check("23-pro-report-ready", proStatus.status === 200 && proStatus.json?.job?.state === "COMPLETED");
  const wrongStatus = await api("GET", `/status/${proJobId}`, sessionB.token);
  check("24-wrong-account-status-denied", wrongStatus.status === 403);
  const beforePaymentToken = await api("POST", `/download-token/${proJobId}`, sessionA.token, {});
  check("25-pro-before-payment-denied", beforePaymentToken.status === 403 && beforePaymentToken.json?.error === "ENTITLEMENT_NOT_ACTIVE");

  const invalidWebhook = paymentEvent("evt_payment_0001", "payment_succeeded", proJobId);
  const invalidWebhookResponse = await api("POST", "/webhook", "", invalidWebhook.raw, { "x-velmere-signature": "sha256=" + "0".repeat(64) });
  check("26-invalid-webhook-signature-denied", invalidWebhookResponse.status === 401);
  const wrongAmountRaw = JSON.stringify({ eventId: "evt_payment_wrong_amount", type: "payment_succeeded", jobId: proJobId, accountId: "account-a", amountMinor: 1, currency: "EUR" });
  const wrongAmount = await api("POST", "/webhook", "", wrongAmountRaw, { "x-velmere-signature": store.signWebhook(wrongAmountRaw) });
  check("27-payment-amount-binding-denied", wrongAmount.status === 409 && wrongAmount.json?.error === "PAYMENT_AMOUNT_BINDING_INVALID");
  const paid = await api("POST", "/webhook", "", invalidWebhook.raw, { "x-velmere-signature": invalidWebhook.signature });
  check("29-payment-webhook-activates-entitlement", paid.status === 200 && paid.json?.entitlement?.status === "ACTIVE");
  const paidReplay = await api("POST", "/webhook", "", invalidWebhook.raw, { "x-velmere-signature": invalidWebhook.signature });
  check("29-payment-webhook-idempotent", paidReplay.status === 200 && paidReplay.json?.idempotentReplay === true);
  const conflictWebhook = paymentEvent("evt_payment_0001", "refund_succeeded", proJobId);
  const conflictWebhookResponse = await api("POST", "/webhook", "", conflictWebhook.raw, { "x-velmere-signature": conflictWebhook.signature });
  check("30-webhook-id-conflict-denied", conflictWebhookResponse.status === 409 && conflictWebhookResponse.json?.error === "WEBHOOK_IDEMPOTENCY_CONFLICT");

  const proTokenResponse = await api("POST", `/download-token/${proJobId}`, sessionA.token, { ttlMs: 30_000 });
  check("31-pro-token-after-payment", proTokenResponse.status === 201);
  const proToken = proTokenResponse.json.token;
  const encodedPayload = JSON.parse(Buffer.from(proToken.split(".")[0], "base64url").toString("utf8"));
  check("32-token-does-not-contain-raw-account", !JSON.stringify(encodedPayload).includes("account-a") && encodedPayload.accountHash === sha256("account-a"));
  const wrongAccountDownload = await api("GET", `/download?token=${encodeURIComponent(proToken)}`, sessionB.token);
  check("33-wrong-account-download-denied", wrongAccountDownload.status === 403);
  const tamperedToken = `${proToken.slice(0, -1)}${proToken.endsWith("a") ? "b" : "a"}`;
  const tamperedTokenResult = await api("GET", `/download?token=${encodeURIComponent(tamperedToken)}`, sessionA.token);
  check("34-token-tamper-denied", tamperedTokenResult.status === 403);
  const concurrent = await Promise.all([
    api("GET", `/download?token=${encodeURIComponent(proToken)}`, sessionA.token),
    api("GET", `/download?token=${encodeURIComponent(proToken)}`, sessionA.token),
  ]);
  const concurrentStatuses = concurrent.map((item) => item.status).sort((a, b) => a - b);
  check("35-concurrent-token-exactly-once", concurrentStatuses[0] === 200 && concurrentStatuses[1] === 409, { concurrentStatuses });

  const expiringToken = await api("POST", `/download-token/${proJobId}`, sessionA.token, { ttlMs: 1_000 });
  check("36-expiring-token-issued", expiringToken.status === 201);
  nowMs += 1_500;
  const expiredDownload = await api("GET", `/download?token=${encodeURIComponent(expiringToken.json.token)}`, sessionA.token);
  check("37-expired-download-token-denied", expiredDownload.status === 410 && expiredDownload.json?.error === "TOKEN_EXPIRED");

  const tokenBeforeRefund = await api("POST", `/download-token/${proJobId}`, sessionA.token, { ttlMs: 30_000 });
  check("38-token-before-refund-issued", tokenBeforeRefund.status === 201);
  const refundEvent = paymentEvent("evt_refund_0001", "refund_succeeded", proJobId);
  const refund = await api("POST", "/webhook", "", refundEvent.raw, { "x-velmere-signature": refundEvent.signature });
  check("39-refund-revokes-entitlement", refund.status === 200 && refund.json?.entitlement?.status === "REFUNDED");
  const refundReplay = await api("POST", "/webhook", "", refundEvent.raw, { "x-velmere-signature": refundEvent.signature });
  check("40-refund-webhook-idempotent", refundReplay.status === 200 && refundReplay.json?.idempotentReplay === true);
  const issuedBeforeRefund = await api("GET", `/download?token=${encodeURIComponent(tokenBeforeRefund.json.token)}`, sessionA.token);
  check("41-issued-token-revoked-after-refund", issuedBeforeRefund.status === 410 && issuedBeforeRefund.json?.error === "TOKEN_REVOKED");
  const reactivationEvent = paymentEvent("evt_payment_after_refund", "payment_succeeded", proJobId);
  const reactivation = await api("POST", "/webhook", "", reactivationEvent.raw, { "x-velmere-signature": reactivationEvent.signature });
  check("42-terminal-entitlement-reactivation-denied", reactivation.status === 409 && reactivation.json?.error === "TERMINAL_ENTITLEMENT_CANNOT_REACTIVATE");
  const tokenAfterRefund = await api("POST", `/download-token/${proJobId}`, sessionA.token, {});
  check("44-new-token-after-refund-denied", tokenAfterRefund.status === 403 && tokenAfterRefund.json?.error === "ENTITLEMENT_NOT_ACTIVE");

  const tamperBasicIntake = await api("POST", "/intake", sessionB.token, { tier: "basic", source: "contract Tamper {}" }, { "idempotency-key": "tamper-basic-0001" });
  const tamperJobId = tamperBasicIntake.json.job.jobId;
  check("44-second-account-basic-intake", tamperBasicIntake.status === 202);
  check("45-second-account-worker", worker(tamperJobId).status === 0);
  const tamperJob = JSON.parse(fs.readFileSync(path.join(root, "jobs", `${tamperJobId}.json`), "utf8"));
  const originalPdf = fs.readFileSync(tamperJob.pdfPath);
  const tamperTokenResponse = await api("POST", `/download-token/${tamperJobId}`, sessionB.token, {});
  fs.appendFileSync(tamperJob.pdfPath, Buffer.from("tamper"));
  const tamperedArtifact = await api("GET", `/download?token=${encodeURIComponent(tamperTokenResponse.json.token)}`, sessionB.token);
  check("46-artifact-tamper-denied", tamperedArtifact.status === 409 && tamperedArtifact.json?.error === "ARTIFACT_TAMPERED");
  fs.writeFileSync(tamperJob.pdfPath, originalPdf, { mode: 0o600 });

  const shortSession = store.createSession({ accountId: "account-expiring", ttlMs: 1_000 });
  nowMs += 1_500;
  const expiredSessionResult = await api("POST", "/intake", shortSession.token, { tier: "basic", source: "contract Expired {}" }, { "idempotency-key": "expired-session-0001" });
  check("47-expired-session-denied", expiredSessionResult.status === 401 && expiredSessionResult.json?.error === "SESSION_EXPIRED");

  const accountAArtifactRoot = path.join(root, "private-artifacts", sha256("account-a"));
  check("48-account-a-artifacts-exist-before-delete", fs.existsSync(accountAArtifactRoot));
  const deleteResult = await api("POST", "/account/delete", sessionA.token, { idempotencyKey: "delete-account-a-0001" });
  check("49-account-delete-success", deleteResult.status === 200 && deleteResult.json?.receipt?.artifactsPurged === true);
  check("50-account-delete-purges-artifacts", !fs.existsSync(accountAArtifactRoot));
  const afterDelete = await api("GET", `/status/${proJobId}`, sessionA.token);
  check("51-deleted-account-session-revoked", afterDelete.status === 401);
  const persistedAfterDelete = [];
  const scanStack = [root];
  while (scanStack.length) {
    const current = scanStack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) scanStack.push(full);
      if (entry.isFile()) persistedAfterDelete.push(fs.readFileSync(full));
    }
  }
  const persistedBytes = Buffer.concat(persistedAfterDelete).toString("utf8");
  check("52-account-delete-redacts-raw-account-and-source", !persistedBytes.includes("account-a") && !persistedBytes.includes("contract Pro { function risky() external {} }"));
  const accountBStillWorks = await api("GET", `/status/${tamperJobId}`, sessionB.token);
  check("54-other-account-unaffected", accountBStillWorks.status === 200);

  const ledger = store.verifyLedger();
  check("54-append-only-ledger-chain-valid", ledger.ok && ledger.sequence >= 10, ledger);
  const leakageHits = store.scanForRawSensitive([sessionA.token, sessionB.token, proToken, "contract Pro { function risky() external {} }"]);
  check("55-ledger-and-webhook-no-raw-token-or-source", leakageHits.length === 0, { leakageHits });

  const privateFiles = [];
  for (const directory of ["accounts", "sessions", "jobs", "entitlements", "tokens", "webhooks", "tombstones", "ledger"]) {
    const start = path.join(root, directory);
    if (!fs.existsSync(start)) continue;
    const stack = [start];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(full);
        if (entry.isFile()) privateFiles.push(full);
      }
    }
  }
  check("56-private-files-mode-600", process.platform === "win32" || privateFiles.every((file) => (fs.statSync(file).mode & 0o777) === 0o600), {
    bad: privateFiles.filter((file) => (fs.statSync(file).mode & 0o777) !== 0o600).map((file) => path.relative(root, file)),
  });
  check("57-no-public-artifact-route", (await api("GET", `/public/${proJobId}`, sessionB.token)).status === 404);
  check("58-error-responses-hide-stack-and-paths", !JSON.stringify(wrongStatus.json).includes(root) && !JSON.stringify(wrongStatus.json).includes("stack"));
  check("59-basic-packet-has-no-pro-or-advanced-content", !fs.readFileSync(JSON.parse(fs.readFileSync(path.join(root, "jobs", `${tamperJobId}.json`), "utf8")).packetPath, "utf8").includes("advanced"));
  check("60-refund-does-not-delete-audit-ledger", store.verifyLedger().ok);
  check("61-webhook-records-only-digest-not-raw-secret", !fs.readFileSync(path.join(root, "webhooks", "evt_payment_0001.json"), "utf8").includes(webhookSecret));
  check("62-download-token-record-stores-hash-not-raw-token", !fs.readFileSync(store.tokenPath(tamperTokenResponse.json.token), "utf8").includes(tamperTokenResponse.json.token));
  check("63-basic-remains-free", basicIntake.json.job.entitlementId === null && basicIntake.json.job.tier === "basic");

  const receipt = {
    schemaVersion: "velmere.pass36.a102r44p23.disposable-customer-lifecycle-e2e.v1",
    status: "PASS_LOCAL_DISPOSABLE_CUSTOMER_LIFECYCLE_E2E",
    assertions: rows.length,
    passed: rows.filter((row) => row.ok).length,
    failed: rows.filter((row) => !row.ok).length,
    flows: [
      "HTTP_INTAKE",
      "IDEMPOTENT_DURABLE_JOB",
      "SEPARATE_WORKER_PROCESS",
      "PRIVATE_PACKET_AND_PDF_STORAGE",
      "PAYMENT_WEBHOOK_SIGNATURE_AND_IDEMPOTENCY",
      "ACCOUNT_BOUND_ONE_TIME_DOWNLOAD",
      "WRONG_ACCOUNT_DENIAL",
      "EXPIRY_AND_REPLAY_DENIAL",
      "REFUND_ENTITLEMENT_REVOCATION",
      "SESSION_EXPIRY",
      "ACCOUNT_DELETION_AND_PURGE",
      "APPEND_ONLY_HASH_CHAIN_LEDGER",
    ],
    creditBoundary: {
      localDisposableRuntimeCredit: true,
      productionRouteCredit: false,
      externalStripeCredit: false,
      supabaseRlsCredit: false,
      stagingCredit: false,
      customerCredit: false,
      paidSaleCredit: false,
      liveCredit: false,
    },
    rows,
  };
  console.log(JSON.stringify(receipt, null, 2));
  if (rows.length !== 63) process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(root, { recursive: true, force: true });
}
