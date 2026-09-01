import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.resolve(__dirname, "../../scripts/pass36/a102r44p10-local-e2e-worker.mjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p10-e2e-"));
const jobsDir = path.join(root, "jobs");
fs.mkdirSync(jobsDir, { recursive: true });

const tokens = new Map([["token-a", "account-a"], ["token-b", "account-b"]]);
const revoked = new Set();

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
function auth(req) {
  const raw = String(req.headers.authorization || "");
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
  return { token, accountId: tokens.get(token) || null };
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (e) { reject(e); }
    });
  });
}
function send(res, status, value, headers = {}) {
  const body = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
  res.writeHead(status, { "content-type": Buffer.isBuffer(value) ? "application/pdf" : "application/json", ...headers });
  res.end(body);
}
function jobPath(id) { return path.join(jobsDir, `${id}.json`); }
function loadJob(id) {
  const p = jobPath(id);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    const identity = auth(req);
    if (!identity.accountId) return send(res, 401, { error: "UNAUTHENTICATED" });

    if (req.method === "POST" && url.pathname === "/intake") {
      const body = await readJson(req);
      const id = crypto.randomUUID();
      const job = {
        schemaVersion: "velmere.pass36.a102r44p10.local-e2e.job.v1",
        id,
        accountId: identity.accountId,
        source: String(body.source || ""),
        simulateInterruptOnce: Boolean(body.simulateInterruptOnce),
        attempts: 0,
        state: "QUEUED",
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(jobPath(id), JSON.stringify(job, null, 2) + "\n", { flag: "wx" });
      return send(res, 202, { id, state: job.state });
    }

    const match = url.pathname.match(/^\/download\/([0-9a-f-]+)$/);
    if (req.method === "GET" && match) {
      const id = match[1];
      const job = loadJob(id);
      if (!job) return send(res, 404, { error: "NOT_FOUND" });
      if (job.accountId !== identity.accountId) return send(res, 403, { error: "WRONG_ACCOUNT" });
      if (revoked.has(id)) return send(res, 410, { error: "REVOKED" });
      if (job.state !== "COMPLETED") return send(res, 409, { error: "NOT_READY" });
      if (!job.pdfPath || !fs.existsSync(job.pdfPath)) return send(res, 404, { error: "ARTIFACT_MISSING" });
      const bytes = fs.readFileSync(job.pdfPath);
      if (sha256(bytes) !== job.pdfSha256) return send(res, 409, { error: "ARTIFACT_TAMPERED" });
      return send(res, 200, bytes, { "x-velmere-digest": job.pdfSha256 });
    }

    if (req.method === "POST" && url.pathname.startsWith("/revoke/")) {
      const id = url.pathname.slice("/revoke/".length);
      const job = loadJob(id);
      if (!job) return send(res, 404, { error: "NOT_FOUND" });
      if (job.accountId !== identity.accountId) return send(res, 403, { error: "WRONG_ACCOUNT" });
      revoked.add(id);
      return send(res, 200, { id, revoked: true });
    }

    return send(res, 404, { error: "ROUTE_NOT_FOUND" });
  } catch (error) {
    return send(res, 500, { error: "INTERNAL", type: error?.name || "Error" });
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

async function request(method, pathname, token, body) {
  const response = await fetch(base + pathname, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  let parsed = null;
  if ((response.headers.get("content-type") || "").includes("json")) parsed = JSON.parse(bytes.toString("utf8"));
  return { status: response.status, bytes, json: parsed, headers: response.headers };
}

const rows = [];
function check(id, ok, detail = {}) {
  rows.push({ id, ok: Boolean(ok), detail });
  if (!ok) throw new Error(`assertion failed: ${id}`);
}

try {
  const intake = await request("POST", "/intake", "token-a", { source: "contract A{}", simulateInterruptOnce: false });
  check("01-http-intake-accepted", intake.status === 202 && intake.json?.id, { status: intake.status });
  const id = intake.json.id;
  check("02-durable-job-created", fs.existsSync(jobPath(id)), { id });

  const worker = spawnSync(process.execPath, [workerPath, jobPath(id)], { encoding: "utf8" });
  check("03-separate-worker-completed", worker.status === 0, { exitCode: worker.status });
  const completed = loadJob(id);
  check("04-packet-created", completed?.packetPath && fs.existsSync(completed.packetPath));
  check("05-pdf-created", completed?.pdfPath && fs.existsSync(completed.pdfPath));

  const good = await request("GET", `/download/${id}`, "token-a");
  check("06-authenticated-download", good.status === 200 && good.bytes.subarray(0, 8).toString() === "%PDF-1.4");
  const wrongAccount = await request("GET", `/download/${id}`, "token-b");
  check("07-wrong-account-denied", wrongAccount.status === 403);
  const wrongToken = await request("GET", `/download/${id}`, "bad-token");
  check("08-wrong-token-denied", wrongToken.status === 401);

  const originalPdf = fs.readFileSync(completed.pdfPath);
  fs.appendFileSync(completed.pdfPath, "tamper");
  const tampered = await request("GET", `/download/${id}`, "token-a");
  check("09-tamper-denied", tampered.status === 409);
  fs.writeFileSync(completed.pdfPath, originalPdf);

  const duplicate = await request("GET", `/download/${id}`, "token-a");
  check("10-repeat-download-same-digest", duplicate.status === 200 && duplicate.headers.get("x-velmere-digest") === completed.pdfSha256);

  const revoke = await request("POST", `/revoke/${id}`, "token-a");
  const afterRevoke = await request("GET", `/download/${id}`, "token-a");
  check("11-revocation-enforced", revoke.status === 200 && afterRevoke.status === 410);

  const retryIntake = await request("POST", "/intake", "token-a", { source: "contract B{}", simulateInterruptOnce: true });
  const retryId = retryIntake.json.id;
  const first = spawnSync(process.execPath, [workerPath, jobPath(retryId)], { encoding: "utf8" });
  check("12-interruption-recorded", first.status === 75 && loadJob(retryId)?.state === "INTERRUPTED_RETRYABLE", { exitCode: first.status });
  const second = spawnSync(process.execPath, [workerPath, jobPath(retryId)], { encoding: "utf8" });
  check("13-retry-completes", second.status === 0 && loadJob(retryId)?.state === "COMPLETED");

  const missingJob = loadJob(retryId);
  fs.unlinkSync(missingJob.pdfPath);
  const missing = await request("GET", `/download/${retryId}`, "token-a");
  check("14-missing-artifact-fails-closed", missing.status === 404);

  const receipt = {
    schemaVersion: "velmere.pass36.a102r44p10.real-local-e2e.v1",
    assertions: rows.length,
    passed: rows.filter((x) => x.ok).length,
    failed: rows.filter((x) => !x.ok).length,
    flow: ["HTTP_INTAKE", "DURABLE_FILESYSTEM_JOB", "SEPARATE_WORKER", "PACKET", "PDF", "PRIVATE_STORAGE", "AUTHENTICATED_DOWNLOAD"],
    localIntegrationCredit: true,
    stagingCredit: false,
    customerCredit: false,
    liveCredit: false,
    saleCredit: false,
    rows,
  };
  console.log(JSON.stringify(receipt, null, 2));
  if (rows.length !== 14) process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(root, { recursive: true, force: true });
}
