import assert from "node:assert/strict";
import { runAuthSecurityAlertWorker } from "../../lib/auth/auth-security-alert-worker";
import { runDurableComputationAlertDelivery } from "../../lib/jobs/durable-computation-alert-delivery";

let assertions = 0;
async function rejects(run: () => Promise<unknown>, pattern: RegExp, message: string) {
  await assert.rejects(run, pattern, message);
  assertions += 1;
}

const authBase = {
  workerToken: () => "alert-worker-token",
  emit: async () => ({ state: "delivered" as const, status: 204 }),
};

await rejects(
  () => runAuthSecurityAlertWorker({}, { ...authBase, rpc: async () => ({ data: null }) }),
  /auth_alert_claim_telemetry_invalid/u,
  "null auth claim telemetry must not become an empty healthy batch",
);
await rejects(
  () =>
    runAuthSecurityAlertWorker({}, {
      ...authBase,
      rpc: async ({ operation }) =>
        operation === "auth_alert_worker_claim"
          ? {
              data: [
                {
                  id: 1,
                  event_family: "session",
                  outcome: "rejected",
                  severity: "critical",
                  event_count: "1",
                  time_bucket: "2026-08-21T10:00:00.000Z",
                },
              ],
            }
          : { data: "delivered" },
    }),
  /auth_alert_claim_telemetry_invalid/u,
  "coerced auth counters must fail closed",
);

const authConflict = await runAuthSecurityAlertWorker({}, {
  ...authBase,
  rpc: async ({ operation }) =>
    operation === "auth_alert_worker_claim"
      ? {
          data: [
            {
              id: 1,
              event_family: "session",
              outcome: "rejected",
              severity: "critical",
              event_count: 1,
              time_bucket: "2026-08-21T10:00:00.000Z",
            },
          ],
        }
      : { data: "lease_mismatch" },
});
assert.equal(authConflict.delivered, 0, "lease mismatch must not count as delivered");
assert.equal(authConflict.conflicts, 1, "lease mismatch must remain visible as a conflict");
assertions += 2;

const durableBase = {
  env: {
    VELMERE_ALERT_WEBHOOK_URL: "https://alerts.example.test/velmere",
    VELMERE_ALERT_WEBHOOK_ALLOWED_HOSTS: "alerts.example.test",
    VELMERE_ALERT_WEBHOOK_SIGNING_SECRET: "test-signing-secret-at-least-thirty-two-characters",
  },
  workerId: "strict-telemetry-worker",
  dependencies: {
    token: () => "00000000-0000-4000-8000-000000000001",
    now: () => new Date("2026-08-21T10:00:00.000Z"),
    deliver: async () => ({ status: 204 }),
  },
} as const;

await rejects(
  () =>
    runDurableComputationAlertDelivery({
      ...durableBase,
      dependencies: { ...durableBase.dependencies, rpc: async () => ({ data: null }) },
    }),
  /durable_alert_claim_telemetry_invalid/u,
  "null durable claim telemetry must not become an empty healthy batch",
);
await rejects(
  () =>
    runDurableComputationAlertDelivery({
      ...durableBase,
      dependencies: {
        ...durableBase.dependencies,
        rpc: async () => ({
          data: [
            {
              alert_id: "00000000-0000-4000-8000-000000000002",
              code: "dead_letter_nonzero",
              severity: "critical",
              observed_value: "1",
              threshold_value: 0,
              attempt_count: 1,
            },
          ],
        }),
      },
    }),
  /durable_alert_claim_telemetry_invalid/u,
  "coerced durable counters must fail closed",
);

console.log(JSON.stringify({ status: "PASS", assertions }));
