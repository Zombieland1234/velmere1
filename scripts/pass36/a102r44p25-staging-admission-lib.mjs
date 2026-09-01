#!/usr/bin/env node
import crypto from "node:crypto";
import net from "node:net";

const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const SECRET_NAMES = new Set([
  "VELMERE_STRIPE_SECRET_KEY",
  "VELMERE_STRIPE_PUBLISHABLE_KEY",
  "VELMERE_STRIPE_WEBHOOK_SECRET",
]);

export const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

function isPrivateIpv4(host) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) || parts[0] >= 224;
}

function validateUrl(name, raw, policy, checks) {
  let parsed = null;
  try { parsed = new URL(raw); } catch { /* recorded below */ }
  checks.push({ id: `${name}:valid-url`, ok: Boolean(parsed) });
  if (!parsed) return null;
  checks.push({ id: `${name}:https`, ok: parsed.protocol === "https:" });
  checks.push({ id: `${name}:no-credentials`, ok: !parsed.username && !parsed.password });
  checks.push({ id: `${name}:no-query`, ok: parsed.search === "" });
  checks.push({ id: `${name}:no-fragment`, ok: parsed.hash === "" });
  const host = parsed.hostname.toLowerCase().replace(/\.$/u, "");
  const family = net.isIP(host);
  const local = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    (family === 4 && isPrivateIpv4(host)) || family === 6;
  checks.push({ id: `${name}:public-host`, ok: !local });
  const tokens = policy.forbidden.productionHostTokens ?? [];
  checks.push({ id: `${name}:non-production-host`, ok: !tokens.some((token) => host.split(/[.-]/u).includes(token)) });
  return parsed;
}

function disposableEmail(raw) {
  const value = String(raw ?? "").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value)) return false;
  return /(test|staging|disposable|example|invalid|mailinator)/u.test(value);
}

export function evaluateStagingAdmission(environment, policy, expectedSourceSha256) {
  const env = Object.fromEntries(Object.entries(environment ?? {}).map(([k, v]) => [k, String(v)]));
  const checks = [];
  const requiredNames = Object.values(policy.required);
  for (const name of requiredNames) checks.push({ id: `required:${name}`, ok: typeof env[name] === "string" && env[name].length > 0 });
  const unknownRelevant = Object.keys(env).filter((name) => name.startsWith("VELMERE_STAGING_") && !requiredNames.includes(name));
  checks.push({ id: "unknown-staging-env-zero", ok: unknownRelevant.length === 0, detail: unknownRelevant.sort() });
  checks.push({ id: "program-id", ok: SAFE_ID.test(env.VELMERE_STAGING_PROGRAM_ID ?? "") });
  checks.push({ id: "source-sha-format", ok: SHA256.test(env.VELMERE_STAGING_SOURCE_MANIFEST_SHA256 ?? "") });
  checks.push({ id: "source-sha-match", ok: env.VELMERE_STAGING_SOURCE_MANIFEST_SHA256 === expectedSourceSha256 });
  checks.push({ id: "confirmation", ok: env.VELMERE_STAGING_CONFIRM === policy.confirmationToken });

  const tenantA = validateUrl("tenant-a", env.VELMERE_STAGING_TENANT_A_URL ?? "", policy, checks);
  const tenantB = validateUrl("tenant-b", env.VELMERE_STAGING_TENANT_B_URL ?? "", policy, checks);
  const storage = validateUrl("storage", env.VELMERE_STAGING_STORAGE_URL ?? "", policy, checks);
  checks.push({ id: "tenant-hosts-distinct", ok: Boolean(tenantA && tenantB && tenantA.hostname.toLowerCase() !== tenantB.hostname.toLowerCase()) });
  checks.push({ id: "storage-separate-from-tenants", ok: Boolean(storage && tenantA && tenantB && ![tenantA.hostname, tenantB.hostname].includes(storage.hostname)) });

  const sk = env.VELMERE_STRIPE_SECRET_KEY ?? "";
  const pk = env.VELMERE_STRIPE_PUBLISHABLE_KEY ?? "";
  const wh = env.VELMERE_STRIPE_WEBHOOK_SECRET ?? "";
  checks.push({ id: "stripe-secret-test", ok: sk.startsWith("sk_test_") && !sk.startsWith("sk_live_") });
  checks.push({ id: "stripe-publishable-test", ok: pk.startsWith("pk_test_") && !pk.startsWith("pk_live_") });
  checks.push({ id: "stripe-webhook-test", ok: wh.startsWith("whsec_") && wh.length >= 16 });
  checks.push({ id: "kms-non-production", ok: SAFE_ID.test(env.VELMERE_STAGING_KMS_KEY_ID ?? "") && !/(^|[._:-])(prod|production|live)([._:-]|$)/iu.test(env.VELMERE_STAGING_KMS_KEY_ID ?? "") });
  checks.push({ id: "disposable-email", ok: disposableEmail(env.VELMERE_STAGING_EMAIL_RECIPIENT) });

  const failed = checks.filter((row) => !row.ok);
  const metadata = {};
  for (const name of requiredNames) {
    const value = env[name];
    metadata[name] = SECRET_NAMES.has(name) ? { present: Boolean(value), redacted: true } : { present: Boolean(value), valueSha256: value ? sha256(value) : null };
  }
  return {
    schemaVersion: "velmere.pass36.a102r44p25.staging-admission-evaluation.v1",
    status: failed.length === 0 ? "READY_FOR_DISPOSABLE_TEST_EXECUTION_NO_CREDIT" : "ACTION_REQUIRED_STAGING_ADMISSION_BLOCKED",
    preflightPassed: failed.length === 0,
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    rows: checks,
    metadata,
    mutationStarted: false,
    executedExternalRequests: 0,
    secretValuesIncluded: false,
    creditBoundary: {
      stagingCredit: false,
      rls19Credit: false,
      stripeLifecycleCredit: false,
      storageKmsEmailCredit: false,
      saleCredit: false,
      liveCredit: false,
    },
  };
}
