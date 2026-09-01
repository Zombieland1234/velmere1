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
const anonKey = "anon_a50_fixture_key_abcdefghijklmnopqrstuvwxyz";
const serviceKey = "service_role_a50_fixture_key_abcdefghijklmnopqrstuvwxyz";
const kmsSecret = "a50-kms-fixture-secret-abcdefghijklmnopqrstuvwxyz";
const resendKey = "re_a50_fixture_abcdefghijklmnopqrstuvwxyz";
const bucket = "a50-private";
const tenantA = { email: "a50-a@example.invalid", password: "A50-a-password", id: "user-a50-a", token: "token-a50-a" };
const tenantB = { email: "a50-b@example.invalid", password: "A50-b-password", id: "user-a50-b", token: "token-a50-b" };

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}
async function readBytes(req) { const chunks = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks); }
function bearer(req) { return String(req.headers.authorization ?? "").replace(/^Bearer\s+/iu, ""); }
function objectKeyFromPath(pathname, prefix) { return pathname.slice(prefix.length).split("/").map(decodeURIComponent).join("/"); }

function createServer({ publicBucket = false, crossTenantLeak = false, badKms = false, emailNotDelivered = false } = {}) {
  const objects = new Map();
  const wrappedKeys = new Map();
  const signedTokens = new Map();
  const emails = new Map();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method ?? "GET";
    try {
      if (url.pathname === "/auth/v1/token" && method === "POST") {
        const body = JSON.parse((await readBytes(req)).toString("utf8"));
        const tenant = body.email === tenantA.email && body.password === tenantA.password ? tenantA : body.email === tenantB.email && body.password === tenantB.password ? tenantB : null;
        return tenant ? json(res, 200, { access_token: tenant.token, token_type: "bearer", user: { id: tenant.id } }) : json(res, 400, { error: "invalid_grant" });
      }
      if (url.pathname === `/storage/v1/bucket/${bucket}` && method === "GET") {
        if (bearer(req) !== serviceKey) return json(res, 401, { error: "unauthorized" });
        return json(res, 200, { id: bucket, name: bucket, public: publicBucket });
      }
      if (url.pathname.startsWith(`/storage/v1/object/sign/${bucket}/`) && method === "POST") {
        const token = bearer(req);
        if (token !== tenantA.token) return json(res, 403, { error: "access_denied" });
        const objectPath = objectKeyFromPath(url.pathname, `/storage/v1/object/sign/${bucket}/`);
        if (!objects.has(objectPath)) return json(res, 404, { error: "not_found" });
        const body = JSON.parse((await readBytes(req)).toString("utf8"));
        const signed = crypto.randomBytes(12).toString("hex");
        signedTokens.set(signed, { objectPath, expiresAt: Date.now() + Number(body.expiresIn) * 1000 });
        return json(res, 200, { signedURL: `/storage/v1/object/sign/${bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}?token=${signed}` });
      }
      if (url.pathname.startsWith(`/storage/v1/object/sign/${bucket}/`) && method === "GET") {
        const signed = signedTokens.get(url.searchParams.get("token"));
        if (!signed || Date.now() > signed.expiresAt) return json(res, 403, { error: "expired" });
        const bytes = objects.get(signed.objectPath);
        if (!bytes) return json(res, 404, { error: "not_found" });
        res.writeHead(200, { "content-type": "application/vnd.velmere.encrypted+json", "cache-control": "no-store" });
        return res.end(bytes);
      }
      if (url.pathname === `/storage/v1/object/list/${bucket}` && method === "POST") {
        const token = bearer(req);
        if (![tenantA.token, tenantB.token].includes(token)) return json(res, 403, { error: "access_denied" });
        const body = JSON.parse((await readBytes(req)).toString("utf8"));
        const rows = [];
        for (const objectPath of objects.keys()) {
          const ownerA = objectPath.includes(`/${tenantA.id}/`);
          if (String(objectPath).startsWith(String(body.prefix ?? "")) && (token === tenantA.token || crossTenantLeak || !ownerA)) rows.push({ name: objectPath.split("/").at(-1), id: crypto.randomUUID() });
        }
        return json(res, 200, rows);
      }
      if (url.pathname.startsWith(`/storage/v1/object/${bucket}/`)) {
        const objectPath = objectKeyFromPath(url.pathname, `/storage/v1/object/${bucket}/`);
        const token = bearer(req);
        if (method === "POST") {
          if (token !== tenantA.token || !objectPath.includes(`/${tenantA.id}/`)) return json(res, 403, { error: "access_denied" });
          objects.set(objectPath, await readBytes(req));
          return json(res, 200, { Key: objectPath });
        }
        if (method === "DELETE") {
          if (token !== serviceKey) return json(res, 401, { error: "unauthorized" });
          objects.delete(objectPath); return json(res, 200, { message: "success" });
        }
        if (method === "GET") {
          const bytes = objects.get(objectPath);
          if (!bytes) return json(res, 404, { error: "not_found" });
          const allowed = token === serviceKey || token === tenantA.token || (crossTenantLeak && token === tenantB.token) || publicBucket;
          if (!allowed) return json(res, 403, { error: "access_denied" });
          res.writeHead(200, { "content-type": "application/vnd.velmere.encrypted+json", "cache-control": "no-store" });
          return res.end(bytes);
        }
      }
      if (url.pathname === "/kms/wrap" && method === "POST") {
        if (bearer(req) !== kmsSecret) return json(res, 401, { error: "unauthorized" });
        const body = JSON.parse((await readBytes(req)).toString("utf8"));
        const wrapped = `wrapped:${crypto.randomBytes(12).toString("hex")}`;
        wrappedKeys.set(wrapped, body.plaintextKeyBase64);
        return json(res, 200, { wrappedKeyBase64: Buffer.from(wrapped).toString("base64"), keyId: "kms-fixture-a50", algorithm: "fixture-wrap-v1" });
      }
      if (url.pathname === "/kms/unwrap" && method === "POST") {
        if (bearer(req) !== kmsSecret) return json(res, 401, { error: "unauthorized" });
        const body = JSON.parse((await readBytes(req)).toString("utf8"));
        const wrapped = Buffer.from(body.wrappedKeyBase64, "base64").toString("utf8");
        const key = wrappedKeys.get(wrapped);
        if (!key) return json(res, 404, { error: "key_not_found" });
        const output = badKms ? crypto.randomBytes(32).toString("base64") : key;
        return json(res, 200, { plaintextKeyBase64: output, keyId: "kms-fixture-a50" });
      }
      if (url.pathname === "/emails" && method === "POST") {
        if (bearer(req) !== resendKey) return json(res, 401, { message: "invalid_api_key" });
        const body = JSON.parse((await readBytes(req)).toString("utf8"));
        const id = crypto.randomUUID(); emails.set(id, { object: "email", id, to: body.to, from: body.from, subject: body.subject, text: body.text, last_event: emailNotDelivered ? "bounced" : "delivered" });
        return json(res, 200, { id });
      }
      if (url.pathname.startsWith("/emails/") && method === "GET") {
        if (bearer(req) !== resendKey) return json(res, 401, { message: "invalid_api_key" });
        const row = emails.get(url.pathname.slice("/emails/".length)); return row ? json(res, 200, row) : json(res, 404, { message: "not_found" });
      }
      return json(res, 404, { error: "not_found" });
    } catch (error) { return json(res, 500, { error: error instanceof Error ? error.message : String(error) }); }
  });
  return server;
}

async function runScenario(name, options, expectedPass, expectedFailureId = null) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["scripts/a50-email-storage-kms-acceptance.mjs", "--fixture"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      VELMERE_A50_STAGING_BASE_URL: base,
      VELMERE_A50_TENANT_A_EMAIL: tenantA.email,
      VELMERE_A50_TENANT_A_PASSWORD: tenantA.password,
      VELMERE_A50_TENANT_B_EMAIL: tenantB.email,
      VELMERE_A50_TENANT_B_PASSWORD: tenantB.password,
      SUPABASE_URL: base,
      SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      VELMERE_A50_SUPABASE_PROJECT_CLASS: "disposable_staging",
      VELMERE_A50_STORAGE_BUCKET: bucket,
      VELMERE_A50_KMS_WRAP_URL: `${base}/kms/wrap`,
      VELMERE_A50_KMS_UNWRAP_URL: `${base}/kms/unwrap`,
      VELMERE_A50_KMS_BEARER_SECRET: kmsSecret,
      RESEND_API_KEY: resendKey,
      VELMERE_A50_RESEND_API_BASE: base,
      VELMERE_A50_EMAIL_FROM: "Velmere Staging <staging@example.invalid>",
      VELMERE_A50_EMAIL_TO: "a50-inbox@example.invalid",
      VELMERE_A50_CONFIRM: "fixture",
    },
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
  const status = await new Promise((resolve) => child.on("close", resolve));
  await new Promise((resolve) => server.close(resolve));
  const report = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a50/PASS35_A50_TRANSACTIONAL_EMAIL_PRIVATE_STORAGE_KMS_ACCEPTANCE.json"), "utf8"));
  check(`${name}:exit`, expectedPass ? status === 0 : status !== 0, { status, stdout: stdout.trim(), stderr: stderr.trim() });
  check(`${name}:decision`, expectedPass ? report.decision === "FIXTURE_PASS" : report.decision === "FIXTURE_FAIL", report.decision);
  check(`${name}:truth`, report.saleEnabled === false && report.productionEmailProven === false && report.productionStorageProven === false && report.productionKmsProven === false, { saleEnabled: report.saleEnabled, productionEmailProven: report.productionEmailProven, productionStorageProven: report.productionStorageProven, productionKmsProven: report.productionKmsProven });
  if (!expectedPass && expectedFailureId) check(`${name}:failure`, report.failures?.some((row) => row.id === expectedFailureId), report.failures?.map((row) => row.id));
}

await runScenario("clean", {}, true);
await runScenario("public_bucket", { publicBucket: true }, false, "storage-bucket-private");
await runScenario("cross_tenant_leak", { crossTenantLeak: true }, false, "storage-cross-tenant-denied");
await runScenario("bad_kms", { badKms: true }, false, "storage-decryption-exact");
await runScenario("email_not_delivered", { emailNotDelivered: true }, false, "email-retrieve-delivered");
await runScenario("final_clean", {}, true);

const failures = checks.filter((row) => !row.ok);
fs.mkdirSync(path.join(root, "artifacts/pass35/a50"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a50/PASS35_A50_ADVERSARIAL_FIXTURE_SUITE.json"), `${JSON.stringify({ schemaVersion: "velmere.pass35.a50.adversarial-fixture-suite.v1", revisionId: "VELMERE_PASS35_A50_TRANSACTIONAL_EMAIL_PRIVATE_STORAGE_KMS_ACCEPTANCE", generatedAt: new Date().toISOString(), summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, checks }, null, 2)}\n`);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
