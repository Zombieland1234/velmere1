import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  decodeDurableComputationMetricsTelemetry,
  getDurableComputationOperationalSnapshot,
  runDurableComputationMaintenance,
  type DurableComputationMetrics,
} from "../../lib/jobs/durable-computation-operations.ts";

const zeroMetrics: DurableComputationMetrics = {
  processing: 0,
  retryWait: 0,
  deadLetter: 0,
  completedRetained: 0,
  readyForRetry: 0,
  expiredLeases: 0,
  oldestReadyAgeSeconds: 0,
  oldestLeaseAgeSeconds: 0,
  byKind: {
    vlm_analysis: { processing: 0, retryWait: 0, deadLetter: 0, completedRetained: 0 },
    lens_pdf_render: { processing: 0, retryWait: 0, deadLetter: 0, completedRetained: 0 },
    audit_pdf_render: { processing: 0, retryWait: 0, deadLetter: 0, completedRetained: 0 },
  },
};

const invalidMetrics: Array<[string, unknown]> = [
  ["empty", {}],
  ["numeric-string", { ...zeroMetrics, processing: "0" }],
  ["negative", { ...zeroMetrics, deadLetter: -1 }],
  ["fractional", { ...zeroMetrics, retryWait: 0.5 }],
  ["ready-above-retry", { ...zeroMetrics, readyForRetry: 1 }],
  ["expired-above-processing", { ...zeroMetrics, expiredLeases: 1 }],
  ["kind-total-mismatch", { ...zeroMetrics, processing: 1 }],
  ["unknown-kind", { ...zeroMetrics, byKind: { ...zeroMetrics.byKind, unknown_kind: { processing: 0, retryWait: 0, deadLetter: 0, completedRetained: 0 } } }],
  ["missing-kind-field", { ...zeroMetrics, byKind: { ...zeroMetrics.byKind, vlm_analysis: { processing: 0 } } }],
];

const zeroRpcRow = {
  processing: 0,
  retry_wait: 0,
  dead_letter: 0,
  completed_retained: 0,
  ready_for_retry: 0,
  expired_leases: 0,
  oldest_ready_age_seconds: 0,
  oldest_lease_age_seconds: 0,
  by_kind: {},
};

const invalidRpcRows: Array<[string, unknown]> = [
  ["rpc-null", null],
  ["rpc-empty-array", []],
  ["rpc-empty", {}],
  ["rpc-multiple", [zeroRpcRow, zeroRpcRow]],
  ["rpc-missing-field", { ...zeroRpcRow, by_kind: undefined }],
  ["rpc-extra-field", { ...zeroRpcRow, schema_version: "unexpected" }],
  ["rpc-numeric-string", { ...zeroRpcRow, processing: "0" }],
  ["rpc-unknown-kind", { ...zeroRpcRow, by_kind: { unknown_kind: {} } }],
  ["rpc-kind-missing-field", { ...zeroRpcRow, by_kind: { vlm_analysis: { processing: 0 } } }],
  ["rpc-kind-total-mismatch", { ...zeroRpcRow, processing: 1 }],
];

let assertions = 0;
for (const [label, metrics] of invalidMetrics) {
  await assert.rejects(
    () => getDurableComputationOperationalSnapshot({
      snapshot: async () => metrics as DurableComputationMetrics,
    }),
    /durable_computation_telemetry_schema_invalid/u,
    label,
  );
  assertions += 1;
}

for (const [label, data] of invalidRpcRows) {
  assert.throws(
    () => decodeDurableComputationMetricsTelemetry(data),
    /durable_computation_telemetry_schema_invalid/u,
    label,
  );
  assertions += 1;
}

assert.deepEqual(decodeDurableComputationMetricsTelemetry([zeroRpcRow]), zeroMetrics);
assertions += 1;

{
  const snapshot = await getDurableComputationOperationalSnapshot({ snapshot: async () => zeroMetrics });
  assert.equal(snapshot.severity, "none");
  assert.equal(snapshot.alerts.length, 0);
  assertions += 2;
}

{
  const criticalMetrics: DurableComputationMetrics = {
    ...zeroMetrics,
    deadLetter: 1,
    byKind: {
      ...zeroMetrics.byKind,
      audit_pdf_render: { ...zeroMetrics.byKind.audit_pdf_render, deadLetter: 1 },
    },
  };
  const snapshot = await getDurableComputationOperationalSnapshot({ snapshot: async () => criticalMetrics });
  assert.equal(snapshot.severity, "critical");
  assert.equal(snapshot.alerts[0]?.code, "dead_letter_nonzero");
  assertions += 2;
}

{
  const maintenance = await runDurableComputationMaintenance({
    dependencies: {
      claimMaintenance: async () => false,
      snapshot: async () => zeroMetrics,
      cleanup: async () => ({ cleanedCompletedCount: 0, cleanedDeadLetterCount: 0 }),
      recordAlert: async () => undefined,
      finishMaintenance: async () => undefined,
      requeueDeadLetter: async () => "not_found",
    },
  });
  assert.equal(maintenance.leaseAcquired, false);
  assertions += 1;
}

const routeSource = await readFile(
  new URL("../../lib/server/internal-worker-route-modules/durable-computation-operations.ts", import.meta.url),
  "utf8",
);
assert.ok(routeSource.includes('snapshot.severity !== "critical"'));
assert.ok(routeSource.includes("summary.leaseAcquired"));
assert.ok(!routeSource.includes("return json({ ok: true, skipped: !summary.leaseAcquired, summary })"));
assertions += 3;

console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.durable-computation-telemetry-fail-closed.v1",
  status: "PASS_LOCAL_ONLY",
  assertions,
  invalidCases: invalidMetrics.length + invalidRpcRows.length,
  explicitValidZeroMetrics: true,
  criticalHealthRouteFailsClosed: true,
  unexecutedMaintenanceNotReportedSuccessful: true,
  stagingCredit: false,
}, null, 2));
