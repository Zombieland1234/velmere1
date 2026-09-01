import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyStripeWebhookWorkerRun,
  isStripeWebhookReconciliationRouteOk,
  normalizeStripeWebhookWorkerAggregate,
} from "../../lib/payments/stripe-webhook-reconciliation-policy";

const zeroBuckets = () => ({ provider: 0, storage: 0, entitlement: 0, order: 0, other: 0 });
const zeroRow = () => ({
  leaseAcquired: true,
  scannedCount: 0,
  staleReleasedCount: 0,
  retryReadyCount: 0,
  deadLetteredCount: 0,
  completedWithoutEventCount: 0,
  oldestProcessingAgeSeconds: null as number | null,
  errorBuckets: zeroBuckets(),
});

type RawRow = ReturnType<typeof zeroRow>;
type InvalidCase = { id: string; value: unknown };

let assertions = 0;
function equal(actual: unknown, expected: unknown, message: string) {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function ok(value: unknown, message: string) {
  assert.ok(value, message);
  assertions += 1;
}

function mutatePath(row: RawRow, path: readonly string[], value: unknown, remove = false) {
  const clone = structuredClone(row) as unknown as Record<string, unknown>;
  let cursor = clone;
  for (const segment of path.slice(0, -1)) {
    const next = cursor[segment];
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      throw new Error(`invalid_test_path:${path.join(".")}`);
    }
    cursor = next as Record<string, unknown>;
  }
  const finalSegment = path.at(-1);
  if (!finalSegment) throw new Error("invalid_empty_test_path");
  if (remove) delete cursor[finalSegment];
  else cursor[finalSegment] = value;
  return clone;
}

const healthyNormalized = normalizeStripeWebhookWorkerAggregate(zeroRow());
const healthyPolicy = classifyStripeWebhookWorkerRun(healthyNormalized);
equal(healthyNormalized.telemetryValid, true, "exact acquired zero row must decode");
equal(healthyNormalized.telemetryReasonCodes.length, 0, "valid zero row must have no telemetry errors");
equal(healthyPolicy.severity, "none", "exact acquired zero row must remain healthy");
equal(healthyPolicy.alertRequired, false, "healthy zero row must not require an alert");
ok(healthyPolicy.reasonCodes.includes("healthy"), "healthy zero row needs an explicit healthy reason");
equal(
  isStripeWebhookReconciliationRouteOk({ severity: healthyPolicy.severity, alertDelivery: "not_required" }),
  true,
  "healthy zero row with no required alert must return route ok",
);

const leaseBusyNormalized = normalizeStripeWebhookWorkerAggregate({ ...zeroRow(), leaseAcquired: false });
const leaseBusyPolicy = classifyStripeWebhookWorkerRun(leaseBusyNormalized);
equal(leaseBusyNormalized.telemetryValid, true, "exact lease-not-acquired zero row must decode");
equal(leaseBusyPolicy.severity, "none", "lease contention is not a worker health incident");
equal(leaseBusyPolicy.alertRequired, false, "lease contention must not alert");
ok(leaseBusyPolicy.reasonCodes.includes("worker_already_running"), "lease contention reason must stay explicit");
equal(
  isStripeWebhookReconciliationRouteOk({ severity: leaseBusyPolicy.severity, alertDelivery: "not_required" }),
  true,
  "valid lease contention must retain successful skipped-route semantics",
);

const invalidCases: InvalidCase[] = [
  { id: "root_null", value: null },
  { id: "root_undefined", value: undefined },
  { id: "root_string", value: "healthy" },
  { id: "root_array", value: [] },
  { id: "root_unknown_field", value: { ...zeroRow(), unexpected: 0 } },
  { id: "lease_missing", value: mutatePath(zeroRow(), ["leaseAcquired"], undefined, true) },
  { id: "lease_null", value: mutatePath(zeroRow(), ["leaseAcquired"], null) },
  { id: "lease_string", value: mutatePath(zeroRow(), ["leaseAcquired"], "false") },
  { id: "lease_numeric", value: mutatePath(zeroRow(), ["leaseAcquired"], 0) },
  { id: "buckets_missing", value: mutatePath(zeroRow(), ["errorBuckets"], undefined, true) },
  { id: "buckets_null", value: mutatePath(zeroRow(), ["errorBuckets"], null) },
  { id: "buckets_string", value: mutatePath(zeroRow(), ["errorBuckets"], "zero") },
  { id: "buckets_array", value: mutatePath(zeroRow(), ["errorBuckets"], []) },
  {
    id: "buckets_unknown_field",
    value: { ...zeroRow(), errorBuckets: { ...zeroBuckets(), unexpected: 0 } },
  },
];

const countPaths = [
  ["scannedCount"],
  ["staleReleasedCount"],
  ["retryReadyCount"],
  ["deadLetteredCount"],
  ["completedWithoutEventCount"],
  ["errorBuckets", "provider"],
  ["errorBuckets", "storage"],
  ["errorBuckets", "entitlement"],
  ["errorBuckets", "order"],
  ["errorBuckets", "other"],
] as const;
const malformedCounts: Array<{ label: string; value: unknown }> = [
  { label: "null", value: null },
  { label: "string", value: "0" },
  { label: "nan", value: Number.NaN },
  { label: "infinity", value: Number.POSITIVE_INFINITY },
  { label: "negative", value: -1 },
  { label: "fractional", value: 0.5 },
  { label: "above_bound", value: 1_000_001 },
];
for (const path of countPaths) {
  const name = path.join("_");
  invalidCases.push({ id: `${name}_missing`, value: mutatePath(zeroRow(), path, undefined, true) });
  for (const malformed of malformedCounts) {
    invalidCases.push({
      id: `${name}_${malformed.label}`,
      value: mutatePath(zeroRow(), path, malformed.value),
    });
  }
}

const agePath = ["oldestProcessingAgeSeconds"] as const;
invalidCases.push({ id: "oldest_age_missing", value: mutatePath(zeroRow(), agePath, undefined, true) });
for (const malformed of [
  { label: "string", value: "0" },
  { label: "nan", value: Number.NaN },
  { label: "infinity", value: Number.POSITIVE_INFINITY },
  { label: "negative", value: -1 },
  { label: "fractional", value: 0.5 },
  { label: "above_bound", value: 31_536_001 },
]) {
  invalidCases.push({
    id: `oldest_age_${malformed.label}`,
    value: mutatePath(zeroRow(), agePath, malformed.value),
  });
}

invalidCases.push(
  { id: "lease_false_nonzero", value: { ...zeroRow(), leaseAcquired: false, scannedCount: 1 } },
  { id: "lease_false_age", value: { ...zeroRow(), leaseAcquired: false, oldestProcessingAgeSeconds: 0 } },
  { id: "stale_exceeds_scanned", value: { ...zeroRow(), scannedCount: 1, staleReleasedCount: 2 } },
  { id: "retry_exceeds_scanned", value: { ...zeroRow(), scannedCount: 1, retryReadyCount: 2 } },
  { id: "dead_exceeds_scanned", value: { ...zeroRow(), scannedCount: 1, deadLetteredCount: 2 } },
  {
    id: "bucket_exceeds_scanned",
    value: { ...zeroRow(), scannedCount: 1, errorBuckets: { ...zeroBuckets(), provider: 2 } },
  },
  { id: "age_without_scanned", value: { ...zeroRow(), oldestProcessingAgeSeconds: 1 } },
);

for (const invalidCase of invalidCases) {
  const normalized = normalizeStripeWebhookWorkerAggregate(invalidCase.value);
  const policy = classifyStripeWebhookWorkerRun(normalized);
  equal(normalized.telemetryValid, false, `${invalidCase.id}: malformed telemetry must be invalid`);
  ok(normalized.telemetryReasonCodes.includes("telemetry_invalid"), `${invalidCase.id}: generic invalid reason missing`);
  equal(policy.severity, "critical", `${invalidCase.id}: malformed telemetry must fail closed as critical`);
  equal(policy.alertRequired, true, `${invalidCase.id}: malformed telemetry must require an alert`);
  ok(!policy.reasonCodes.includes("healthy"), `${invalidCase.id}: malformed telemetry must never be healthy`);
}

const warningRows = [
  { id: "stale", value: { ...zeroRow(), scannedCount: 1, staleReleasedCount: 1 } },
  { id: "age", value: { ...zeroRow(), scannedCount: 1, oldestProcessingAgeSeconds: 900 } },
  ...Object.keys(zeroBuckets()).map((bucket) => ({
    id: `bucket_${bucket}`,
    value: {
      ...zeroRow(),
      scannedCount: 1,
      errorBuckets: { ...zeroBuckets(), [bucket]: 1 },
    },
  })),
];
for (const warningRow of warningRows) {
  const policy = classifyStripeWebhookWorkerRun(normalizeStripeWebhookWorkerAggregate(warningRow.value));
  equal(policy.severity, "warning", `${warningRow.id}: valid warning telemetry must be warning`);
  equal(policy.alertRequired, true, `${warningRow.id}: warning must require alert delivery`);
  equal(
    isStripeWebhookReconciliationRouteOk({ severity: policy.severity, alertDelivery: "delivered" }),
    true,
    `${warningRow.id}: delivered warning alert may acknowledge the run`,
  );
  equal(
    isStripeWebhookReconciliationRouteOk({ severity: policy.severity, alertDelivery: "not_configured" }),
    false,
    `${warningRow.id}: missing alert sink must fail route ok`,
  );
  equal(
    isStripeWebhookReconciliationRouteOk({ severity: policy.severity, alertDelivery: "failed" }),
    false,
    `${warningRow.id}: failed alert delivery must fail route ok`,
  );
}

const criticalRows = [
  { id: "dead_letter", value: { ...zeroRow(), scannedCount: 1, deadLetteredCount: 1 } },
  { id: "completed_without_event", value: { ...zeroRow(), completedWithoutEventCount: 1 } },
];
for (const criticalRow of criticalRows) {
  const policy = classifyStripeWebhookWorkerRun(normalizeStripeWebhookWorkerAggregate(criticalRow.value));
  equal(policy.severity, "critical", `${criticalRow.id}: critical telemetry must remain critical`);
  equal(policy.alertRequired, true, `${criticalRow.id}: critical telemetry must require an alert`);
  equal(
    isStripeWebhookReconciliationRouteOk({ severity: policy.severity, alertDelivery: "delivered" }),
    false,
    `${criticalRow.id}: delivered alert must not turn a critical run into route ok`,
  );
}

equal(
  isStripeWebhookReconciliationRouteOk({ severity: "none", alertDelivery: "delivered" }),
  false,
  "unexpected alert state must fail closed even for severity none",
);
equal(
  isStripeWebhookReconciliationRouteOk({ severity: "warning", alertDelivery: "not_required" }),
  false,
  "a required warning alert cannot be silently skipped",
);
equal(
  isStripeWebhookReconciliationRouteOk({
    severity: "invalid" as never,
    alertDelivery: "not_required",
  }),
  false,
  "an impossible severity value must fail closed",
);

const internalRoute = readFileSync(
  "lib/server/internal-worker-route-modules/stripe-webhook-reconciliation.ts",
  "utf8",
);
const adminRoute = readFileSync("app/api/admin/payments/stripe-webhook-reconcile/route.ts", "utf8");
for (const [name, source] of [["internal", internalRoute], ["admin", adminRoute]] as const) {
  ok(source.includes("ok: isStripeWebhookReconciliationRouteOk("), `${name} POST must derive ok from summary policy`);
}

console.log(JSON.stringify({
  suite: "STRIPE_WEBHOOK_RECONCILIATION_TELEMETRY",
  status: "PASS",
  assertions,
  invalidCases: invalidCases.length,
  warningCases: warningRows.length,
  criticalCases: criticalRows.length,
  routePostsBound: 2,
  stagingTouched: false,
  productionPaymentAction: false,
  liveClaimed: false,
}, null, 2));
