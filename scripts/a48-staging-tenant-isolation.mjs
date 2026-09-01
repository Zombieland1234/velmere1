#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a48-staging-tenant-isolation.json"), "utf8"));
const outputDir = path.join(root, "artifacts/pass35/a48");
const outputJson = path.join(outputDir, "PASS35_A48_STAGING_TENANT_ISOLATION.json");
const outputMd = path.join(outputDir, "PASS35_A48_STAGING_TENANT_ISOLATION.md");
fs.mkdirSync(outputDir, { recursive: true });

const sha256Buffer = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256Text = (value) => sha256Buffer(Buffer.from(String(value), "utf8"));
const nowIso = () => new Date().toISOString();
const checks = [];
const addCheck = (id, ok, detail = null, status = ok ? "PASS" : "FAIL") => checks.push({ id, ok: Boolean(ok), status, detail });

function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a48-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "a48_source_manifest_missing", digest: null, rows: 0 };
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const hash = crypto.createHash("sha256");
  for (const row of manifest.files ?? []) {
    const absolute = path.join(root, row.path);
    if (!fs.existsSync(absolute)) return { ok: false, reason: `source_file_missing:${row.path}`, digest: null, rows: manifest.files.length };
    const current = sha256Buffer(fs.readFileSync(absolute));
    if (current !== row.sha256) return { ok: false, reason: `source_hash_mismatch:${row.path}`, digest: null, rows: manifest.files.length };
    hash.update(row.path); hash.update("\0"); hash.update(current); hash.update("\0");
  }
  return { ok: true, reason: null, digest: hash.digest("hex"), rows: manifest.files.length };
}

function safeStagingUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: "invalid_url" }; }
  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (fixtureMode && local) return { ok: true, url, hostClass: "fixture_localhost" };
  if (contract.stagingSafety.httpsRequired && url.protocol !== "https:") return { ok: false, reason: "https_required" };
  if (local) return { ok: false, reason: "localhost_not_staging" };
  if (contract.stagingSafety.rejectHostnameTokens.some((token) => host.includes(token))) return { ok: false, reason: "production_like_hostname" };
  if (!contract.stagingSafety.requireHostnameHint.some((token) => host.includes(token))) return { ok: false, reason: "staging_hostname_hint_missing" };
  return { ok: true, url, hostClass: host.endsWith(".vercel.app") ? "vercel_preview" : "staging_host" };
}

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]+)/u).map((part) => part.trim()).filter(Boolean);
}

class CookieJar {
  constructor() { this.cookies = new Map(); }
  absorb(headers) {
    const rows = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : splitSetCookie(headers.get("set-cookie"));
    for (const row of rows) {
      const first = String(row).split(";", 1)[0];
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (!value) this.cookies.delete(name); else this.cookies.set(name, value);
    }
  }
  header() { return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; "); }
}

async function boundedJson(response, maxBytes = contract.budgets.maximumJsonBytes) {
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
    if (total > maxBytes) { await reader.cancel(); throw new Error("json_response_too_large"); }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

async function requestJson(base, pathname, options = {}, jar = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request_timeout")), contract.budgets.requestTimeoutMs);
  try {
    const target = new URL(pathname, base);
    const headers = new Headers(options.headers ?? {});
    headers.set("accept", "application/json");
    if (options.body !== undefined) headers.set("content-type", "application/json");
    if (jar?.header()) headers.set("cookie", jar.header());
    if (!["GET", "HEAD"].includes(String(options.method ?? "GET").toUpperCase())) headers.set("origin", base.origin);
    const response = await fetch(target, { ...options, headers, redirect: "manual", signal: controller.signal, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    if (jar) jar.absorb(response.headers);
    const json = await boundedJson(response);
    return { response, json };
  } finally { clearTimeout(timer); }
}

function accountDigest(sessionPayload) {
  const accountId = sessionPayload?.session?.accountId ?? sessionPayload?.account?.accountId ?? null;
  return accountId ? sha256Text(accountId) : null;
}

async function signIn(base, email, password) {
  const jar = new CookieJar();
  const { response, json } = await requestJson(base, "/api/auth/session", { method: "POST", body: { provider: "email", mode: "signin", email, password } }, jar);
  return { jar, response, json };
}

function profileFields(payload) {
  const source = payload?.profile ?? payload?.data ?? payload ?? {};
  return {
    displayName: typeof source.displayName === "string" ? source.displayName : "Velmère Member",
    handle: typeof source.handle === "string" ? source.handle.replace(/^@/u, "") : "velmere.member",
    bio: typeof source.bio === "string" ? source.bio : "",
  };
}

async function main() {
  const startedAt = nowIso();
  const sourceBefore = verifySourceManifest();
  addCheck(
    "source-fingerprint-before",
    fixtureMode || sourceBefore.ok,
    {
      rows: sourceBefore.rows,
      digest: sourceBefore.digest,
      reason: sourceBefore.reason,
      fixtureDoesNotGrantSourceCredit: fixtureMode,
    },
    fixtureMode ? "FIXTURE_PASS" : undefined,
  );

  const a47Path = path.join(root, "artifacts/pass35/a47/PASS35_A47_ACCEPTANCE_EVIDENCE_TRIAGE.json");
  if (fixtureMode) {
    addCheck("precondition-a47-verified", true, { fixture: true, decision: contract.requiredA47Decision }, "FIXTURE_PASS");
  } else if (fs.existsSync(a47Path)) {
    const a47 = JSON.parse(fs.readFileSync(a47Path, "utf8"));
    const a47Decision = a47.decision ?? a47.status ?? null;
    addCheck("precondition-a47-verified", a47Decision === contract.requiredA47Decision, { decision: a47Decision });
  } else addCheck("precondition-a47-verified", false, { reason: "a47_verified_evidence_missing" });

  const nodeOk = fixtureMode || process.versions.node === contract.runtime.node;
  const npmObserved = currentNpmVersion();
  const npmOk = fixtureMode || npmObserved === contract.runtime.npm;
  addCheck("runtime-exact", nodeOk && npmOk, { node: process.versions.node, npm: npmObserved, expected: contract.runtime, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const confirmation = process.env.VELMERE_A48_CONFIRM ?? "";
  addCheck("confirmation-token", fixtureMode || confirmation === contract.confirmationToken, { present: Boolean(confirmation), fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);
  const rawBase = process.env.VELMERE_A48_STAGING_BASE_URL ?? "";
  const safety = safeStagingUrl(rawBase);
  addCheck("staging-url-safety", safety.ok, safety.ok ? { hostClass: safety.hostClass, originSha256: sha256Text(safety.url.origin) } : { reason: safety.reason });
  if (!safety.ok) throw new Error(`unsafe_staging_url:${safety.reason}`);
  const base = safety.url;

  const emailA = process.env.VELMERE_A48_TENANT_A_EMAIL ?? "";
  const passwordA = process.env.VELMERE_A48_TENANT_A_PASSWORD ?? "";
  const emailB = process.env.VELMERE_A48_TENANT_B_EMAIL ?? "";
  const passwordB = process.env.VELMERE_A48_TENANT_B_PASSWORD ?? "";
  addCheck("test-accounts-present", fixtureMode || (emailA && passwordA && emailB && passwordB && emailA !== emailB), { tenantA: Boolean(emailA && passwordA), tenantB: Boolean(emailB && passwordB), distinctEmails: emailA !== emailB }, fixtureMode ? "FIXTURE_PASS" : undefined);

  let databasePreflight = {
    ok: fixtureMode,
    status: fixtureMode ? "FIXTURE_PASS" : "NOT_RUN",
    structuralPreflightPassed: fixtureMode,
    casesPrepared: contract.rlsPolicyCaseMatrix.requiredCases,
    casesExecuted: 0,
    casesPassed: 0,
    fullMatrixPassed: false,
  };
  if (!fixtureMode) {
    const db = process.env.VELMERE_STAGING_DATABASE_URL ?? "";
    const run = spawnSync(process.execPath, ["scripts/pass23/run-rls-staging-harness.mjs", "--execute"], {
      cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, VELMERE_RLS_STAGING_CONFIRM: "I_UNDERSTAND_THIS_USES_A_DISPOSABLE_STAGING_DATABASE", VELMERE_STAGING_DATABASE_URL: db },
    });
    let rlsReceipt = null;
    try {
      rlsReceipt = JSON.parse(run.stdout ?? "");
    } catch {
      // An unparseable child receipt cannot grant RLS or staging credit.
    }
    const structuralPreflightPassed =
      run.status === 0 &&
      rlsReceipt?.structuralPreflightExecuted === true &&
      rlsReceipt?.structuralPreflightPassed === true;
    const fullMatrixPassed =
      rlsReceipt?.casesPrepared ===
        contract.rlsPolicyCaseMatrix.requiredCases &&
      rlsReceipt?.casesExecuted ===
        contract.rlsPolicyCaseMatrix.requiredExecuted &&
      rlsReceipt?.casesPassed ===
        contract.rlsPolicyCaseMatrix.requiredPassed;
    databasePreflight = {
      ok: structuralPreflightPassed && fullMatrixPassed,
      status: run.status,
      childStatus: rlsReceipt?.status ?? "UNPARSEABLE_RLS_RECEIPT",
      structuralPreflightPassed,
      casesPrepared: Number(rlsReceipt?.casesPrepared ?? 0),
      casesExecuted: Number(rlsReceipt?.casesExecuted ?? 0),
      casesPassed: Number(rlsReceipt?.casesPassed ?? 0),
      fullMatrixPassed,
      stdoutSha256: sha256Text(run.stdout ?? ""),
      stderrSha256: sha256Text(run.stderr ?? ""),
    };
  }
  addCheck(
    "database-structural-preflight",
    fixtureMode || databasePreflight.structuralPreflightPassed,
    databasePreflight,
    fixtureMode ? "FIXTURE_PASS" : undefined,
  );
  addCheck(
    "database-rls-19-of-19",
    fixtureMode || databasePreflight.fullMatrixPassed,
    {
      required: contract.rlsPolicyCaseMatrix,
      prepared: databasePreflight.casesPrepared,
      executed: databasePreflight.casesExecuted,
      passed: databasePreflight.casesPassed,
    },
    fixtureMode ? "FIXTURE_PASS" : undefined,
  );

  const anonymous = await requestJson(base, "/api/auth/session");
  addCheck("anonymous-session", anonymous.response.status === 200 && anonymous.json?.authenticated === false, { status: anonymous.response.status, authenticated: anonymous.json?.authenticated });

  const tenantA = await signIn(base, emailA, passwordA);
  const tenantB = await signIn(base, emailB, passwordB);
  addCheck("tenant-a-signin", tenantA.response.status === 200 && tenantA.json?.authenticated === true, { status: tenantA.response.status, bindingState: tenantA.json?.bindingState, authMode: tenantA.json?.authMode });
  addCheck("tenant-b-signin", tenantB.response.status === 200 && tenantB.json?.authenticated === true, { status: tenantB.response.status, bindingState: tenantB.json?.bindingState, authMode: tenantB.json?.authMode });
  const accountA = accountDigest(tenantA.json);
  const accountB = accountDigest(tenantB.json);
  addCheck("distinct-account-identities", Boolean(accountA && accountB && accountA !== accountB), { tenantAAccountSha256: accountA, tenantBAccountSha256: accountB });

  const profileA0 = await requestJson(base, "/api/profile", {}, tenantA.jar);
  const profileB0 = await requestJson(base, "/api/profile", {}, tenantB.jar);
  const originalA = profileFields(profileA0.json);
  const originalB = profileFields(profileB0.json);
  const nonce = crypto.randomBytes(5).toString("hex");
  const changedA = { displayName: `A48 Tenant A ${nonce.slice(0, 4)}`, handle: `a48-a-${nonce}`.slice(0, 32), bio: `A48 disposable staging isolation ${nonce}` };
  const patchA = await requestJson(base, "/api/profile", { method: "PATCH", body: changedA }, tenantA.jar);
  const profileA1 = await requestJson(base, "/api/profile", {}, tenantA.jar);
  const profileB1 = await requestJson(base, "/api/profile", {}, tenantB.jar);
  const fieldsA1 = profileFields(profileA1.json);
  const fieldsB1 = profileFields(profileB1.json);
  addCheck("tenant-a-profile-roundtrip", patchA.response.status === 200 && fieldsA1.handle === changedA.handle && fieldsA1.bio === changedA.bio, { patchStatus: patchA.response.status, handleChanged: fieldsA1.handle === changedA.handle, bioChanged: fieldsA1.bio === changedA.bio });
  addCheck("tenant-b-profile-isolation", profileB1.response.status === 200 && JSON.stringify(fieldsB1) === JSON.stringify(originalB), { status: profileB1.response.status, unchanged: JSON.stringify(fieldsB1) === JSON.stringify(originalB) });
  const restoreA = await requestJson(base, "/api/profile", { method: "PATCH", body: originalA }, tenantA.jar);
  const profileARestored = await requestJson(base, "/api/profile", {}, tenantA.jar);
  addCheck("tenant-a-profile-restored", restoreA.response.status === 200 && JSON.stringify(profileFields(profileARestored.json)) === JSON.stringify(originalA), { restoreStatus: restoreA.response.status, restored: JSON.stringify(profileFields(profileARestored.json)) === JSON.stringify(originalA) });

  const artifactsA = await requestJson(base, "/api/account/customer-artifact?limit=24", {}, tenantA.jar);
  const artifactsB = await requestJson(base, "/api/account/customer-artifact?limit=24", {}, tenantB.jar);
  const rowsA = Array.isArray(artifactsA.json?.artifacts) ? artifactsA.json.artifacts : [];
  const rowsB = Array.isArray(artifactsB.json?.artifacts) ? artifactsB.json.artifacts : [];
  const idsA = new Set(rowsA.map((row) => row?.snapshotId).filter((id) => typeof id === "string"));
  const idsB = new Set(rowsB.map((row) => row?.snapshotId).filter((id) => typeof id === "string"));
  const overlap = [...idsA].filter((id) => idsB.has(id));
  addCheck("artifact-lists-disjoint", artifactsA.response.status === 200 && artifactsB.response.status === 200 && idsA.size >= 1 && idsB.size >= 1 && overlap.length === 0, { statusA: artifactsA.response.status, statusB: artifactsB.response.status, tenantACount: idsA.size, tenantBCount: idsB.size, overlapCount: overlap.length });

  const firstA = [...idsA][0] ?? null;
  const firstB = [...idsB][0] ?? null;
  let crossA = { response: { status: 0 }, json: null };
  let crossB = { response: { status: 0 }, json: null };
  if (firstB) crossA = await requestJson(base, `/api/account/customer-artifact?id=${encodeURIComponent(firstB)}&format=json`, {}, tenantA.jar);
  if (firstA) crossB = await requestJson(base, `/api/account/customer-artifact?id=${encodeURIComponent(firstA)}&format=json`, {}, tenantB.jar);
  addCheck("tenant-a-cannot-read-tenant-b-artifact", Boolean(firstB) && crossA.response.status === 404 && crossA.json?.error === "artifact_not_found", { fixturePresent: Boolean(firstB), status: crossA.response.status, error: crossA.json?.error });
  addCheck("tenant-b-cannot-read-tenant-a-artifact", Boolean(firstA) && crossB.response.status === 404 && crossB.json?.error === "artifact_not_found", { fixturePresent: Boolean(firstA), status: crossB.response.status, error: crossB.json?.error });

  const logoutA = await requestJson(base, "/api/auth/session", { method: "DELETE" }, tenantA.jar);
  const sessionAAfter = await requestJson(base, "/api/auth/session", {}, tenantA.jar);
  const sessionBAfter = await requestJson(base, "/api/auth/session", {}, tenantB.jar);
  addCheck("tenant-a-session-revoked", [200, 204].includes(logoutA.response.status) && sessionAAfter.response.status === 200 && sessionAAfter.json?.authenticated === false, { logoutStatus: logoutA.response.status, authenticatedAfter: sessionAAfter.json?.authenticated });
  addCheck("tenant-b-session-survives", sessionBAfter.response.status === 200 && sessionBAfter.json?.authenticated === true, { status: sessionBAfter.response.status, authenticated: sessionBAfter.json?.authenticated });
  await requestJson(base, "/api/auth/session", { method: "DELETE" }, tenantB.jar);

  const sourceAfter = verifySourceManifest();
  addCheck(
    "source-fingerprint-unchanged",
    fixtureMode || (sourceAfter.ok && sourceBefore.ok && sourceAfter.digest === sourceBefore.digest),
    {
      before: sourceBefore.digest,
      after: sourceAfter.digest,
      rows: sourceAfter.rows,
      reason: sourceAfter.reason,
      fixtureDoesNotGrantSourceCredit: fixtureMode,
    },
    fixtureMode ? "FIXTURE_PASS" : undefined,
  );

  const secretNeedles = [emailA, passwordA, emailB, passwordB, tenantA.jar.header(), tenantB.jar.header()].filter(Boolean);
  const preliminary = JSON.stringify({ checks, baseOriginSha256: sha256Text(base.origin), accountA, accountB, databasePreflight });
  const leaked = secretNeedles.filter((needle) => preliminary.includes(needle));
  addCheck("evidence-redaction", leaked.length === 0, { leakedValues: leaked.length });

  const failures = checks.filter((row) => !row.ok);
  const status = fixtureMode ? (failures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : failures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_TENANT_ISOLATION";
  const report = {
    schemaVersion: "velmere.pass35.a48.staging-tenant-isolation-receipt.v1",
    revisionId: contract.revisionId,
    parentRevisionId: contract.parentRevisionId,
    generatedAt: nowIso(), startedAt, completedAt: nowIso(), fixtureMode,
    status, decision: status,
    truthBoundary: contract.truthBoundary,
    stagingProven: !fixtureMode && failures.length === 0,
    liveProven: false, saleEnabled: false, paymentsProven: false,
    baseOriginSha256: sha256Text(base.origin),
    accountDigests: { tenantA: accountA, tenantB: accountB },
    sourceFingerprint: { before: sourceBefore.digest, after: sourceAfter.digest, rows: sourceAfter.rows },
    databaseStructuralPreflight: databasePreflight,
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
    failures,
    checks,
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const finalLeaks = secretNeedles.filter((needle) => serialized.includes(needle));
  if (finalLeaks.length) throw new Error("evidence_secret_leak_detected");
  fs.writeFileSync(outputJson, serialized, "utf8");
  fs.writeFileSync(outputMd, `# PASS35 A48 — staging tenant isolation\n\nDecision: **${status}**\n\n- Checks: ${checks.length}\n- Passed: ${checks.length - failures.length}\n- Failed: ${failures.length}\n- Fixture mode: ${fixtureMode}\n- Staging proven: ${report.stagingProven}\n- LIVE proven: false\n- Sale enabled: false\n\n${failures.length ? "## Failures\n\n" + failures.map((row) => `- ${row.id}: ${JSON.stringify(row.detail)}`).join("\n") : "All declared A48 staging tenant-isolation checks passed."}\n`, "utf8");
  console.log(JSON.stringify({ status, summary: report.summary, output: path.relative(root, outputJson).replaceAll("\\", "/") }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  const report = { schemaVersion: "velmere.pass35.a48.staging-tenant-isolation-error.v1", revisionId: contract.revisionId, generatedAt: nowIso(), status: fixtureMode ? "FIXTURE_FAIL" : "ACTION_REQUIRED", error: error instanceof Error ? error.message : String(error), stagingProven: false, liveProven: false, saleEnabled: false };
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
});
