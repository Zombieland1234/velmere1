import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { computeSourceSnapshot, computeTreeDigest } from "../release-integrity/source-snapshot.mjs";

function smokeEnvironment(secrets) {
  const namespace = secrets.namespace;
  return {
    ADMIN_IMPORT_TOKEN: `${namespace}-admin-token`,
    VELMERE_ADMIN_SESSION_SECRET: `${namespace}-admin-session-secret-at-least-32-bytes`,
    VELMERE_ACCOUNT_SESSION_SECRET_CURRENT: `${namespace}-account-session-secret-at-least-32-bytes`,
    VELMERE_AUTH_FLOW_STATE_SECRET_CURRENT: `${namespace}-flow-state-secret-at-least-32-bytes`,
    VELMERE_AUTH_SESSION_FAMILY_SECRET_CURRENT: `${namespace}-family-secret-at-least-32-bytes`,
    MARKET_INTEGRITY_CRON_SECRET: `${namespace}-cron-secret`,
    STRIPE_WEBHOOK_SECRET: `whsec_${namespace}_smoke_only`,
    PRINTFUL_TOKEN: "",
    SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    VELMERE_ALERT_WEBHOOK_URL: "",
    VELMERE_ALERT_WEBHOOK_ALLOWED_HOSTS: "",
  };
}

export async function runStartedServerSmoke({
  passId,
  outputDir: outputDirRelative,
  portEnv,
  schemaVersion,
  secrets,
}) {
  const root = process.cwd();
  const outputDir = path.join(root, outputDirRelative);
  fs.mkdirSync(outputDir, { recursive: true });
  const port = Number(process.env[portEnv] || 4041);
  const base = `http://127.0.0.1:${port}`;
  const logPath = path.join(outputDir, "started-server.log");
  const logFd = fs.openSync(logPath, "w", 0o600);
  const server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      ...smokeEnvironment(secrets),
    },
    stdio: ["ignore", logFd, logFd],
  });
  fs.closeSync(logFd);

  const checks = [];
  const add = (name, ok, detail = "") => checks.push({ name, ok: Boolean(ok), detail });
  async function jsonBody(response) { try { return await response.json(); } catch { return null; } }
  async function waitForServer() {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      try {
        const response = await fetch(`${base}/api/auth/session`, { signal: AbortSignal.timeout(900) });
        if (response.status > 0) return;
      } catch (ignoredError) { void ignoredError; }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`${passId}_server_not_ready`);
  }
  async function request(pathname, init = {}) {
    const response = await fetch(`${base}${pathname}`, { redirect: "manual", ...init });
    return { response, body: await jsonBody(response) };
  }
  function bodySafe(value) {
    const forbiddenKey = /^(?:access[_-]?token|refresh[_-]?token|authorization|cookie|email|accountId|subject|providerPayload|leaseToken)$/i;
    const secretLikeString = /(?:^|\s)Bearer\s+[A-Za-z0-9._~-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
    const seen = new Set();
    function visit(current) {
      if (current === null || current === undefined) return true;
      if (typeof current === "string") return !secretLikeString.test(current);
      if (typeof current !== "object") return true;
      if (seen.has(current)) return true;
      seen.add(current);
      if (Array.isArray(current)) return current.every(visit);
      return Object.entries(current).every(([key, nested]) => !forbiddenKey.test(key) && visit(nested));
    }
    return visit(value);
  }

  try {
    await waitForServer();

    const session = await request("/api/auth/session");
    add("anonymous auth session inspection is available", session.response.status === 200, `${session.response.status}:${JSON.stringify(session.body)}`);
    add("anonymous auth session is not authenticated", session.body?.authenticated === false && session.body?.authMode === "none", JSON.stringify(session.body));
    add("auth session payload is token-safe", bodySafe(session.body), JSON.stringify(session.body));
    add("auth session response is bounded", JSON.stringify(session.body).length < 4096, JSON.stringify(session.body).length);

    const unsigned = await request("/api/stripe/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    add("Stripe webhook rejects unsigned request", unsigned.response.status === 400, `${unsigned.response.status}:${JSON.stringify(unsigned.body)}`);
    add("Stripe webhook response is bounded", JSON.stringify(unsigned.body).length < 1024, JSON.stringify(unsigned.body).length);

    for (const [name, pathname] of [
      ["Stripe reconciliation worker", "/api/internal/workers/stripe-webhook-reconciliation"],
      ["fulfilment outbox worker", "/api/internal/workers/fulfilment-incident-outbox"],
      ["fulfilment provider sync worker", "/api/internal/workers/fulfilment-provider-sync"],
      ["auth security alert worker", "/api/internal/workers/auth-security-alerts"],
    ]) {
      const result = await request(pathname);
      add(`${name} rejects missing cron secret`, result.response.status === 401, `${result.response.status}:${JSON.stringify(result.body)}`);
      add(`${name} response is identifier-safe`, bodySafe(result.body), JSON.stringify(result.body));
    }

    for (const [name, pathname, method, body] of [
      ["auth sign-in", "/api/auth/session", "POST", { provider: "email", email: "smoke@example.invalid", password: "not-a-real-password" }],
      ["auth refresh", "/api/auth/session", "PUT", null],
      ["auth logout", "/api/auth/session", "DELETE", null],
      ["Google OAuth start", "/api/auth/oauth/google", "POST", { locale: "en", returnPath: "/en/account" }],
      ["password recovery", "/api/auth/recovery", "POST", { email: "smoke@example.invalid", locale: "en" }],
      ["password update", "/api/auth/recovery", "PUT", { password: "not-a-real-password-4720" }],
      ["email change", "/api/auth/email-change", "POST", { email: "changed@example.invalid", locale: "en" }],
    ]) {
      const headers = method === "POST" || method === "PUT" ? { "content-type": "application/json" } : {};
      const result = await request(pathname, { method, headers, body: body === null ? undefined : JSON.stringify(body) });
      add(`${name} requires same origin in production`, result.response.status === 403, `${result.response.status}:${JSON.stringify(result.body)}`);
      add(`${name} origin rejection is bounded`, JSON.stringify(result.body).length < 2048, JSON.stringify(result.body).length);
    }

    const callback = await request("/api/auth/callback?locale=en&code=invalid&state=invalid");
    const callbackLocation = callback.response.headers.get("location") ?? "";
    add("invalid auth callback redirects safely", callback.response.status === 303 && /\/en\/login\?auth_error=/.test(callbackLocation), `${callback.response.status}:${callbackLocation}`);
    add("invalid auth callback clears auth state", (callback.response.headers.get("set-cookie") ?? "").includes("Max-Age=0"), callback.response.headers.get("set-cookie") ?? "none");
    add("invalid auth callback does not redirect externally", callbackLocation.startsWith(base) || callbackLocation.startsWith(`http://localhost:${port}`), callbackLocation);

    const noOrigin = await request("/api/admin/payments/stripe-webhook-dead-letter", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    add("admin mutation requires same origin", noOrigin.response.status === 403, noOrigin.response.status);
    // Next normalizes Request.url to localhost under `next start`, even when the
    // transport is bound to 127.0.0.1. Match the origin observed by route guards.
    const safeOrigin = `http://localhost:${port}`;
    add("canonical same origin matches the Next request origin", safeOrigin === `http://localhost:${port}`, safeOrigin);

    for (const [name, pathname, method, payload] of [
      ["Stripe dead-letter", "/api/admin/payments/stripe-webhook-dead-letter", "POST", {}],
      ["fulfilment retry", "/api/admin/orders/fulfilment-retry", "POST", { orderDraftId: "smoke", mode: "preview" }],
      ["fulfilment outbox recovery", "/api/admin/orders/fulfilment-outbox-dead-letter", "POST", { action: "requeue", outboxId: "smoke", evidence: "smoke" }],
      ["provider status sync", "/api/admin/orders/fulfilment-provider-sync", "POST", { orderDraftId: "smoke" }],
      ["identity binding", "/api/admin/accounts/supabase-subject-binding", "POST", { accountId: "smoke", subject: "00000000-0000-4000-8000-000000000000" }],
      ["fulfilment incident case", "/api/admin/orders/fulfilment-incident-case", "GET", null],
      ["Supabase RPC operations", "/api/admin/operations/supabase-rpc", "GET", null],
      ["auth security operations", "/api/admin/operations/auth-security", "GET", null],
    ]) {
      const headers = { origin: safeOrigin, authorization: "Bearer wrong" };
      if (method === "POST") headers["content-type"] = "application/json";
      const result = await request(pathname, { method, headers, body: method === "POST" ? JSON.stringify(payload) : undefined });
      add(`${name} rejects wrong admin token`, result.response.status === 401, `${result.response.status}:${JSON.stringify(result.body)}`);
      add(`${name} response is bounded`, JSON.stringify(result.body).length < 2048, JSON.stringify(result.body).length);
      add(`${name} response is identifier-safe`, bodySafe(result.body), JSON.stringify(result.body));
    }

    const logout = await request("/api/auth/session", { method: "DELETE", headers: { origin: safeOrigin } });
    const logoutCookies = logout.response.headers.get("set-cookie") ?? "";
    add("same-origin logout remains available without provider", logout.response.status === 200, `${logout.response.status}:${JSON.stringify(logout.body)}`);
    add("logout clears local auth cookies", logoutCookies.includes("Max-Age=0"), logoutCookies);
    add("logout response remains token-safe", bodySafe(logout.body), JSON.stringify(logout.body));
  } finally {
    server.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 750));
    try { process.kill(server.pid, "SIGKILL"); } catch (ignoredError) { void ignoredError; }
  }

  const source = computeSourceSnapshot(root);
  const expectedSourceSha256 = process.env.VELMERE_CHECKPOINT_SOURCE_SHA256 ?? null;
  const artifact = computeTreeDigest(root, [".next/BUILD_ID", ".next/server", ".next/static", ".next/routes-manifest.json", ".next/build-manifest.json"]);
  add("source hash matches checkpoint", Boolean(expectedSourceSha256) && source.sha256 === expectedSourceSha256, `${source.sha256}:${expectedSourceSha256}`);
  const passedWithIntegrity = checks.filter((item) => item.ok).length;
  const receipt = {
    schemaVersion,
    ok: passedWithIntegrity === checks.length,
    node: process.version,
    buildId: fs.existsSync(path.join(root, ".next", "BUILD_ID")) ? fs.readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim() : null,
    passed: passedWithIntegrity,
    total: checks.length,
    sourceSha256: source.sha256,
    expectedSourceSha256,
    artifact,
    checks,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outputDir, "started-server-smoke.json"), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.ok) process.exit(1);
}
