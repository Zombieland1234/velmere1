#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildSanitizedChildEnv, sanitizeChildOutput } from "./sanitized-child-process-boundary.mjs";

const sentinel = "sk_test_A102R41_SENTINEL_7f93c612";
const ambient = { ...process.env, STRIPE_SECRET_KEY: sentinel, SUPABASE_SERVICE_ROLE_KEY: "service_role_A102R41_SENTINEL_8332", VELMERE_TEST_SECRET: "internal_A102R41_SENTINEL_79d4" };
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const childEnv = buildSanitizedChildEnv(ambient, { FORCE_COLOR: "0" });
add("env:system-runtime-retained", typeof childEnv.PATH === "string" && (typeof childEnv.SYSTEMROOT === "string" || process.platform !== "win32"));
add("env:stripe-secret-denied", !("STRIPE_SECRET_KEY" in childEnv));
add("env:supabase-service-role-denied", !("SUPABASE_SERVICE_ROLE_KEY" in childEnv));
add("env:generic-secret-denied", !("VELMERE_TEST_SECRET" in childEnv));

const probe = spawnSync(process.execPath, ["-e", "process.stdout.write(process.env.VELMERE_TEST_SECRET ?? 'ABSENT')"], { encoding: "utf8", shell: false, windowsHide: true, env: childEnv });
add("child:exact-process-exec-path", probe.status === 0);
add("child:sentinel-not-received", probe.stdout === "ABSENT" && !probe.stdout.includes("SENTINEL"));

const scan = sanitizeChildOutput(`prefix ${sentinel} suffix whsec_A102R41_SENTINEL_123456`, ambient);
add("log:sensitive-output-detected", scan.sensitiveOutputDetected === true);
add("log:raw-env-secret-redacted", !scan.sanitized.includes(sentinel));
add("log:token-pattern-redacted", !scan.sanitized.includes("whsec_A102R41_SENTINEL_123456"));
const tempFile = path.join(os.tmpdir(), `velmere-a102r41-redacted-${process.pid}.txt`);
let cleanupSafetyError = null;
try {
  fs.writeFileSync(tempFile, scan.sanitized, { flag: "wx" });
  const persisted = fs.readFileSync(tempFile, "utf8");
  add("artifact:no-raw-secret-persisted", !persisted.includes(sentinel) && !persisted.includes("whsec_A102R41_SENTINEL_123456"));
} finally {
  if (path.dirname(path.resolve(tempFile)) !== path.resolve(os.tmpdir()) || !path.basename(tempFile).startsWith("velmere-a102r41-redacted-")) cleanupSafetyError = new Error("unsafe_temp_cleanup_target");
  else fs.rmSync(tempFile, { force: true });
}
if (cleanupSafetyError) throw cleanupSafetyError;
let additionRejected = false;
try { buildSanitizedChildEnv(ambient, { VELMERE_EXTRA_SECRET: sentinel }); } catch { additionRejected = true; }
add("env:secret-addition-rejected", additionRejected);

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r41.sanitized-child-process-boundary-test.v1", status: failed.length ? "FAIL_A102R41_SANITIZED_CHILD_PROCESS" : "PASS_A102R41_SANITIZED_CHILD_PROCESS_NO_SECRET_PERSISTENCE", checks: checks.length, passed: checks.length-failed.length, failed: failed.length, failures: failed, globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false }, null, 2));
process.exit(failed.length ? 1 : 0);
