#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import crypto from "node:crypto";

const root = process.cwd();
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => { total += chunk.length; if (total > 1024 * 1024) reject(new Error("body_too_large")); else chunks.push(chunk); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch (error) { reject(error); } });
    req.on("error", reject);
  });
}

function json(res, status, payload, cookies = []) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(cookies.length ? { "set-cookie": cookies } : {}) });
  res.end(JSON.stringify(payload));
}

function createFixture({ leakArtifacts = false } = {}) {
  const credentials = {
    "a48-a@example.invalid": { password: "A48-password-a", accountId: "acct-a", displayName: "Tenant A", handle: "tenant-a", bio: "A" },
    "a48-b@example.invalid": { password: "A48-password-b", accountId: "acct-b", displayName: "Tenant B", handle: "tenant-b", bio: "B" },
  };
  const sessions = new Map();
  const profiles = new Map(Object.values(credentials).map((row) => [row.accountId, { displayName: row.displayName, handle: row.handle, bio: row.bio }]));
  const artifacts = new Map([
    ["acct-a", [{ snapshotId: "snap-a", title: "A", generatedAt: new Date().toISOString() }]],
    ["acct-b", [{ snapshotId: "snap-b", title: "B", generatedAt: new Date().toISOString() }]],
  ]);
  const cookieAccount = (req) => {
    const raw = String(req.headers.cookie ?? "");
    const match = raw.match(/a48_session=([^;]+)/u);
    return match ? sessions.get(match[1]) ?? null : null;
  };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const method = req.method ?? "GET";
    const accountId = cookieAccount(req);
    try {
      if (url.pathname === "/api/auth/session" && method === "GET") {
        return json(res, 200, { ok: true, authenticated: Boolean(accountId), session: accountId ? { accountId, displayName: profiles.get(accountId)?.displayName } : null, bindingState: accountId ? "ready" : "missing", authMode: accountId ? "supabase_http_only" : "none" });
      }
      if (url.pathname === "/api/auth/session" && method === "POST") {
        const body = await readBody(req);
        const row = credentials[String(body.email ?? "")];
        if (!row || row.password !== body.password) return json(res, 401, { ok: false, error: "invalid_credentials" });
        const token = crypto.randomBytes(12).toString("hex");
        sessions.set(token, row.accountId);
        return json(res, 200, { ok: true, authenticated: true, session: { accountId: row.accountId, displayName: row.displayName }, bindingState: "ready", authMode: "supabase_http_only" }, [`a48_session=${token}; Path=/; HttpOnly; SameSite=Lax`]);
      }
      if (url.pathname === "/api/auth/session" && method === "DELETE") {
        const raw = String(req.headers.cookie ?? "");
        const match = raw.match(/a48_session=([^;]+)/u);
        if (match) sessions.delete(match[1]);
        return json(res, 200, { ok: true, authenticated: false }, ["a48_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"]);
      }
      if (url.pathname === "/api/profile" && method === "GET") {
        if (!accountId) return json(res, 401, { error: "account_session_required" });
        return json(res, 200, { ...profiles.get(accountId), account: { accountId } });
      }
      if (url.pathname === "/api/profile" && method === "PATCH") {
        if (!accountId) return json(res, 401, { error: "account_session_required" });
        const body = await readBody(req);
        profiles.set(accountId, { displayName: body.displayName, handle: body.handle, bio: body.bio });
        return json(res, 200, { ...profiles.get(accountId), account: { accountId } });
      }
      if (url.pathname === "/api/account/customer-artifact" && method === "GET") {
        if (!accountId) return json(res, 401, { ok: false, error: "account_session_required" });
        const id = url.searchParams.get("id");
        const own = artifacts.get(accountId) ?? [];
        if (!id) {
          const rows = leakArtifacts ? [...(artifacts.get("acct-a") ?? []), ...(artifacts.get("acct-b") ?? [])] : own;
          return json(res, 200, { ok: true, artifacts: rows });
        }
        const found = own.find((row) => row.snapshotId === id);
        if (!found) return json(res, 404, { ok: false, error: "artifact_not_found" });
        return json(res, 200, { ok: true, artifact: found });
      }
      return json(res, 404, { error: "not_found" });
    } catch (error) { return json(res, 500, { error: error instanceof Error ? error.message : String(error) }); }
  });
  return server;
}

async function runScenario(name, options, expectPass) {
  const server = createFixture(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const child = spawn(process.execPath, ["scripts/a48-staging-tenant-isolation.mjs", "--fixture"], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      VELMERE_A48_STAGING_BASE_URL: `http://127.0.0.1:${port}`,
      VELMERE_A48_TENANT_A_EMAIL: "a48-a@example.invalid",
      VELMERE_A48_TENANT_A_PASSWORD: "A48-password-a",
      VELMERE_A48_TENANT_B_EMAIL: "a48-b@example.invalid",
      VELMERE_A48_TENANT_B_PASSWORD: "A48-password-b",
      VELMERE_A48_CONFIRM: "fixture",
    },
  });
  let stdout = ""; let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const status = await new Promise((resolve) => child.on("close", resolve));
  await new Promise((resolve) => server.close(resolve));
  const reportPath = path.join(root, "artifacts/pass35/a48/PASS35_A48_STAGING_TENANT_ISOLATION.json");
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  check(`${name}:exit`, expectPass ? status === 0 : status !== 0, { status, stdout: stdout.trim(), stderr: stderr.trim() });
  check(`${name}:decision`, expectPass ? report.decision === "FIXTURE_PASS" : report.decision === "FIXTURE_FAIL", report.decision);
  check(`${name}:truth_boundary`, report.stagingProven === false && report.liveProven === false && report.saleEnabled === false, { stagingProven: report.stagingProven, liveProven: report.liveProven, saleEnabled: report.saleEnabled });
  if (!expectPass) check(`${name}:detects_leak`, report.failures?.some((row) => row.id === "artifact-lists-disjoint" || row.id.includes("cannot-read")), report.failures);
}

await runScenario("clean", {}, true);
await runScenario("cross_tenant_leak", { leakArtifacts: true }, false);
const failures = checks.filter((row) => !row.ok);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
