import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relative) => readFileSync(join(root, relative), "utf8");

const migration = read("supabase/migrations/20260821000007_v4_verify_continuous_monitor_worker.sql");
const worker = read("lib/verify/verify-continuous-monitor-worker.ts");
const route = read("lib/server/internal-worker-route-modules/verify-continuous-monitor.ts");
const registry = read("lib/server/route-registries/internal-workers.ts");
const rpcRegistry = read("lib/db/supabase-rpc-operation-registry.ts");
const quorum = read("lib/security/audit-current-deployment-readonly-quorum-v2.ts");
const vercel = JSON.parse(read("vercel.json"));

for (const token of [
  "velmere_verify_monitor_jobs",
  "velmere_claim_verify_monitor_jobs_v1",
  "velmere_settle_verify_monitor_job_v1",
  "velmere_get_verify_monitor_health_v1",
  "for update skip locked",
  "expected_event_digest",
  "lease_token_digest",
  "REVALIDATION_REQUIRED",
  "MONITORING_FAILURE",
  "dead_letter",
  "lease_expired_dead_letter",
  "grant execute",
  "to service_role",
]) assert.ok(migration.toLowerCase().includes(token.toLowerCase()), `migration missing ${token}`);

for (const token of [
  "collectP82CurrentDeploymentReadonlyQuorumFromEnvironment",
  "verifyP82CurrentDeploymentReadonlyQuorumReceiptFromEnvironment",
  "verify_monitor_job_claim",
  "verify_monitor_job_settle",
  "verify_monitor_health",
  "MONITORED_UNCHANGED",
  "REVALIDATION_REQUIRED",
  "MONITORING_UNAVAILABLE",
  "batchDeadlineReached",
]) assert.ok(worker.includes(token), `worker missing ${token}`);

assert.ok(route.includes("authorizeInternalWorkerMutation"), "route must use signed mutation envelope");
assert.ok(route.includes("authorizeVercelCron"), "scheduled GET must use strict Vercel cron authentication");
assert.ok(route.includes("assertExactWorkerBodyKeys"), "route must reject unknown body fields");
assert.ok(route.includes("cache-control"));
assert.ok(route.includes("no-store"));
assert.ok(registry.includes('"verify-continuous-monitor"'));
assert.ok(rpcRegistry.includes("verify_monitor_job_claim"));
assert.ok(rpcRegistry.includes("verify_monitor_job_settle"));
assert.ok(rpcRegistry.includes("verify_monitor_health"));
assert.ok(quorum.includes("timeoutMs?: number"), "environment quorum wrapper must expose a bounded timeout");
assert.deepEqual(vercel.crons, [{
  path: "/api/internal/workers/verify-continuous-monitor",
  schedule: "0 3 * * *",
}], "daily bounded scheduler binding must be explicit and secret-free");

for (const forbidden of ["console.log", "console.error", "rpcUrl", "providers:"]) {
  assert.ok(!route.includes(forbidden), `route leaks topology/log data via ${forbidden}`);
}

console.log("V4 Verify continuous monitor static boundary: PASS");
