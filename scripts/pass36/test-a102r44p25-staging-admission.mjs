#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateStagingAdmission } from "./a102r44p25-staging-admission-lib.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p25-staging-admission-policy.json"), "utf8"));
const digest = "a".repeat(64);
const base = {
  VELMERE_STAGING_PROGRAM_ID: "velmere-r44p25-staging-test",
  VELMERE_STAGING_SOURCE_MANIFEST_SHA256: digest,
  VELMERE_STAGING_TENANT_A_URL: "https://tenant-a.staging-example.test",
  VELMERE_STAGING_TENANT_B_URL: "https://tenant-b.staging-example.test",
  VELMERE_STRIPE_SECRET_KEY: "sk" + "_test_" + "A".repeat(24),
  VELMERE_STRIPE_PUBLISHABLE_KEY: "pk" + "_test_" + "B".repeat(24),
  VELMERE_STRIPE_WEBHOOK_SECRET: "wh" + "sec_" + "C".repeat(24),
  VELMERE_STAGING_STORAGE_URL: "https://objects.staging-example.test",
  VELMERE_STAGING_KMS_KEY_ID: "kms-staging-r44p25-key",
  VELMERE_STAGING_EMAIL_RECIPIENT: "velmere+r44p25-test@example.invalid",
  VELMERE_STAGING_CONFIRM: policy.confirmationToken,
};
const checks = [];
const run = (id, mutate, expected) => {
  const env = { ...base };
  mutate(env);
  const report = evaluateStagingAdmission(env, policy, digest);
  assert.equal(report.preflightPassed, expected, id);
  assert.equal(report.mutationStarted, false, `${id}:mutation`);
  assert.equal(report.executedExternalRequests, 0, `${id}:requests`);
  assert.equal(report.secretValuesIncluded, false, `${id}:secret`);
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes(env.VELMERE_STRIPE_SECRET_KEY), false, `${id}:secret-leak`);
  checks.push({ id, ok: true });
};
run("valid", () => {}, true);
run("missing-secret", (e) => delete e.VELMERE_STRIPE_SECRET_KEY, false);
run("same-tenant", (e) => { e.VELMERE_STAGING_TENANT_B_URL = e.VELMERE_STAGING_TENANT_A_URL; }, false);
run("http-tenant", (e) => { e.VELMERE_STAGING_TENANT_A_URL = "http://tenant-a.staging-example.test"; }, false);
run("url-credentials", (e) => { e.VELMERE_STAGING_TENANT_A_URL = "https://user:pass@tenant-a.staging-example.test"; }, false);
run("url-query", (e) => { e.VELMERE_STAGING_TENANT_A_URL += "?secret=x"; }, false);
run("localhost", (e) => { e.VELMERE_STAGING_TENANT_A_URL = "https://localhost"; }, false);
run("production-host", (e) => { e.VELMERE_STAGING_TENANT_A_URL = "https://api.production.example.com"; }, false);
run("stripe-live-secret", (e) => { e.VELMERE_STRIPE_SECRET_KEY = "sk" + "_live_" + "A".repeat(24); }, false);
run("stripe-live-publishable", (e) => { e.VELMERE_STRIPE_PUBLISHABLE_KEY = "pk" + "_live_" + "B".repeat(24); }, false);
run("bad-webhook", (e) => { e.VELMERE_STRIPE_WEBHOOK_SECRET = "wrong"; }, false);
run("prod-kms", (e) => { e.VELMERE_STAGING_KMS_KEY_ID = "kms-prod-key"; }, false);
run("non-disposable-email", (e) => { e.VELMERE_STAGING_EMAIL_RECIPIENT = "customer@company.com"; }, false);
run("source-mismatch", (e) => { e.VELMERE_STAGING_SOURCE_MANIFEST_SHA256 = "b".repeat(64); }, false);
run("unknown-env", (e) => { e.VELMERE_STAGING_UNREVIEWED_SECRET = "x"; }, false);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p25.staging-admission-test.v1", status: "PASS", checks: checks.length, passed: checks.length, failed: 0, rows: checks }, null, 2));
