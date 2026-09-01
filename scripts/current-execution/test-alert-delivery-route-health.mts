import fs from "node:fs";
import path from "node:path";
import { runAuthSecurityAlertWorker } from "../../lib/auth/auth-security-alert-worker";
import { runDurableComputationAlertDelivery } from "../../lib/jobs/durable-computation-alert-delivery";

type Health = { ok: boolean; severity: string; reasonCodes: string[] };
type HealthBuilder = (summary: unknown) => Health;

let assertions = 0;
const failures: string[] = [];
function check(condition: unknown, message: string) {
  assertions += 1;
  if (!condition) failures.push(message);
}

const authSummary = await runAuthSecurityAlertWorker(
  { limit: 1, leaseSeconds: 60 },
  {
    workerToken: () => "alert-worker-token",
    emit: async () => ({ state: "not_configured" }),
    rpc: async ({ operation }) =>
      operation === "auth_alert_worker_claim"
        ? {
            data: [
              {
                id: 7,
                event_family: "session",
                outcome: "rejected",
                severity: "critical",
                event_count: 2,
                time_bucket: "2026-08-21T10:00:00.000Z",
              },
            ],
          }
        : { data: "retry" },
  },
);
check(authSummary.claimed === 1, "auth worker must physically claim the fixture");
check(authSummary.delivered === 0, "auth fixture must deliver zero alerts");
check(authSummary.retried === 1, "auth fixture must persist a retry");
check(authSummary.notConfigured === 1, "auth fixture must expose the missing sink");

const durableSummary = await runDurableComputationAlertDelivery({
  env: {
    VELMERE_ALERT_WEBHOOK_URL: "https://alerts.example.test/velmere",
    VELMERE_ALERT_WEBHOOK_ALLOWED_HOSTS: "alerts.example.test",
    VELMERE_ALERT_WEBHOOK_SIGNING_SECRET: "test-signing-secret-at-least-thirty-two-characters",
  },
  limit: 1,
  workerId: "health-test-worker",
  dependencies: {
    token: () => "00000000-0000-4000-8000-000000000001",
    now: () => new Date("2026-08-21T10:00:00.000Z"),
    deliver: async () => ({ status: 503 }),
    rpc: async ({ operation }) =>
      operation === "durable_computation_alert_claim_batch"
        ? {
            data: [
              {
                alert_id: "00000000-0000-4000-8000-000000000002",
                code: "dead_letter_nonzero",
                severity: "critical",
                observed_value: 1,
                threshold_value: 0,
                attempt_count: 1,
              },
            ],
          }
        : { data: { state: "retry_wait" } },
  },
});
check(durableSummary.configured, "durable alert fixture must use configured delivery");
check(durableSummary.claimed === 1, "durable worker must physically claim the fixture");
check(durableSummary.delivered === 0, "durable fixture must deliver zero alerts");
check(durableSummary.retryWait === 1, "durable fixture must persist a retry");

const authRoute = await import("../../lib/server/internal-worker-route-modules/auth-security-alerts");
const durableRoute = await import("../../lib/server/internal-worker-route-modules/durable-computation-alerts");
const authHealth = (authRoute as Record<string, unknown>).buildAuthSecurityAlertRouteHealth as HealthBuilder | undefined;
const durableHealth = (durableRoute as Record<string, unknown>).buildDurableComputationAlertRouteHealth as HealthBuilder | undefined;
check(typeof authHealth === "function", "auth route must expose a fail-closed health projection");
check(typeof durableHealth === "function", "durable route must expose a fail-closed health projection");

if (authHealth) {
  const retry = authHealth(authSummary);
  check(!retry.ok && retry.severity === "critical", "auth retry/missing sink must be unhealthy");
  check(retry.reasonCodes.includes("alert_sink_not_configured"), "auth health must name the missing sink");
  check(retry.reasonCodes.includes("alert_retry_nonzero"), "auth health must name the retry backlog");
  check(
    authHealth({ claimed: 1, delivered: 1, retried: 0, deadLettered: 0, conflicts: 0, notConfigured: 0 }).ok,
    "a fully delivered auth batch must be healthy",
  );
  check(
    authHealth({ claimed: 2, delivered: 1, retried: 0, deadLettered: 0, conflicts: 0, notConfigured: 0 }).reasonCodes.includes(
      "telemetry_schema_invalid",
    ),
    "impossible auth totals must fail closed",
  );
  check(
    authHealth({ claimed: "1", delivered: 1, retried: 0, deadLettered: 0, conflicts: 0, notConfigured: 0 }).reasonCodes.includes(
      "telemetry_schema_invalid",
    ),
    "coerced auth counters must fail closed",
  );
}

if (durableHealth) {
  const retry = durableHealth(durableSummary);
  check(!retry.ok && retry.severity === "critical", "durable retry must be unhealthy");
  check(retry.reasonCodes.includes("alert_retry_nonzero"), "durable health must name the retry backlog");
  check(
    durableHealth({
      configured: true,
      claimed: 1,
      delivered: 1,
      retryWait: 0,
      deadLetter: 0,
      conflicts: 0,
      storeFailed: 0,
    }).ok,
    "a fully delivered durable batch must be healthy",
  );
  check(
    durableHealth({
      configured: false,
      claimed: 0,
      delivered: 0,
      retryWait: 0,
      deadLetter: 0,
      conflicts: 0,
      storeFailed: 0,
    }).reasonCodes.includes("alert_sink_not_configured"),
    "durable missing sink must be unhealthy",
  );
  check(
    durableHealth({
      configured: true,
      claimed: 2,
      delivered: 1,
      retryWait: 0,
      deadLetter: 0,
      conflicts: 0,
      storeFailed: 0,
    }).reasonCodes.includes("telemetry_schema_invalid"),
    "impossible durable totals must fail closed",
  );
}

const root = process.cwd();
const authSource = fs.readFileSync(
  path.join(root, "lib/server/internal-worker-route-modules/auth-security-alerts.ts"),
  "utf8",
);
const durableSource = fs.readFileSync(
  path.join(root, "lib/server/internal-worker-route-modules/durable-computation-alerts.ts"),
  "utf8",
);
check(!authSource.includes("return json({ ok: true, summary"), "auth route must not hard-code success");
check(
  !durableSource.includes("summary.configured && summary.storeFailed === 0"),
  "durable route must include retry/dead-letter/conflict health",
);

if (failures.length) {
  console.error(JSON.stringify({ status: "FAIL", assertions, failures, authSummary, durableSummary }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASS", assertions, authSummary, durableSummary }, null, 2));
