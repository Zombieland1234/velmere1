import assert from "node:assert/strict";
import {
  getProviderObservationOperationalSnapshot,
  runProviderObservationOperations,
} from "../../lib/market-integrity/provider-observation-operations.ts";

const zeroSnapshot = {
  total_observations: 0,
  asset_count: 0,
  stable_assets: 0,
  watch_assets: 0,
  anomalous_assets: 0,
  stale_assets: 0,
  insufficient_assets: 0,
  retention_violations: 0,
  oldest_observation_age_seconds: 0,
  latest_observation_age_seconds: 0,
  max_asset_observations: 0,
};

const validSnapshot = {
  ...zeroSnapshot,
  total_observations: 6,
  asset_count: 3,
  stable_assets: 1,
  watch_assets: 1,
  insufficient_assets: 1,
  stale_assets: 1,
  oldest_observation_age_seconds: 120,
  latest_observation_age_seconds: 5,
  max_asset_observations: 3,
};

const validCompaction = {
  affected_assets: 0,
  deleted_observations: 0,
  remaining_retention_violations: 0,
};

function dependenciesFor(reconcileData: unknown, compactData: unknown = validCompaction) {
  const calls: string[] = [];
  return {
    calls,
    dependencies: {
      async rpc(input: { operation: string }) {
        calls.push(input.operation);
        if (input.operation === "provider_observation_reconcile") return { data: reconcileData };
        if (input.operation === "provider_observation_compact") return { data: compactData };
        if (input.operation === "provider_observation_alert_record") return { data: [{ state: "recorded" }] };
        throw new Error(`unexpected_operation:${input.operation}`);
      },
    },
  };
}

let assertions = 0;
async function expectInvalid(label: string, data: unknown) {
  const { dependencies, calls } = dependenciesFor(data);
  await assert.rejects(
    () => getProviderObservationOperationalSnapshot({ dependencies }),
    /provider_observation_telemetry_schema_invalid/u,
    label,
  );
  assert.deepEqual(calls, ["provider_observation_reconcile"], `${label}: no follow-on operations`);
  assertions += 2;
}

const invalidRows: Array<[string, unknown]> = [
  ["empty-object", {}],
  ["null", null],
  ["empty-array", []],
  ["multiple-rows", [zeroSnapshot, zeroSnapshot]],
  ["missing-field", { ...zeroSnapshot, max_asset_observations: undefined }],
  ["unexpected-field", { ...zeroSnapshot, schema_version: "unexpected" }],
  ["numeric-string", { ...zeroSnapshot, total_observations: "0" }],
  ["negative", { ...zeroSnapshot, stale_assets: -1 }],
  ["fractional", { ...zeroSnapshot, asset_count: 0.5 }],
  ["nan", { ...zeroSnapshot, asset_count: Number.NaN }],
  ["infinity", { ...zeroSnapshot, asset_count: Number.POSITIVE_INFINITY }],
  ["class-total-mismatch", { ...validSnapshot, stable_assets: 2 }],
  ["observations-below-assets", { ...validSnapshot, total_observations: 2 }],
  ["stale-above-assets", { ...validSnapshot, stale_assets: 4 }],
  ["retention-above-assets", { ...validSnapshot, retention_violations: 4 }],
  ["age-order-invalid", { ...validSnapshot, oldest_observation_age_seconds: 4 }],
  ["max-asset-observations-zero", { ...validSnapshot, max_asset_observations: 0 }],
];

for (const [label, data] of invalidRows) await expectInvalid(label, data);

{
  const { dependencies, calls } = dependenciesFor([zeroSnapshot]);
  const snapshot = await getProviderObservationOperationalSnapshot({ dependencies });
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.severity, "none");
  assert.deepEqual(snapshot.metrics, {
    totalObservations: 0,
    assetCount: 0,
    stableAssets: 0,
    watchAssets: 0,
    anomalousAssets: 0,
    staleAssets: 0,
    insufficientAssets: 0,
    retentionViolations: 0,
    oldestObservationAgeSeconds: 0,
    latestObservationAgeSeconds: 0,
    maxAssetObservations: 0,
  });
  assert.deepEqual(calls, ["provider_observation_reconcile"]);
  assertions += 4;
}

{
  const { dependencies } = dependenciesFor([validSnapshot], null);
  await assert.rejects(
    () => runProviderObservationOperations({ dependencies }),
    /provider_observation_compaction_telemetry_schema_invalid/u,
  );
  assertions += 1;
}

{
  const { dependencies, calls } = dependenciesFor([validSnapshot], [validCompaction]);
  const run = await runProviderObservationOperations({ dependencies });
  assert.equal(run.ok, true);
  assert.equal(run.snapshot.ok, true);
  assert.equal(run.compaction.remainingRetentionViolations, 0);
  assert.deepEqual(calls, ["provider_observation_reconcile", "provider_observation_compact"]);
  assertions += 4;
}

console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.provider-observation-telemetry-fail-closed.v1",
  status: "PASS_LOCAL_ONLY",
  assertions,
  invalidCases: invalidRows.length + 1,
  explicitValidZeroRow: true,
  malformedTelemetryCanReportHealthy: false,
  stagingCredit: false,
}, null, 2));
