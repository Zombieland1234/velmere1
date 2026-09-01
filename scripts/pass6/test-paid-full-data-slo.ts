import assert from "node:assert/strict";
import {
  buildPass6PaidFullDataSloReceipt,
  PASS6_PAID_FULL_DATA_COHORT_IDS,
  type Pass6PaidFullDataCohortWindow,
  type Pass6PaidFullDataSloInput,
} from "../../lib/reporting/pass6-paid-full-data-slo";

const digest = (seed: string) => `sha256:${Buffer.from(seed).toString("hex").padEnd(64, "0").slice(0, 64)}`;

function cohort(cohortId: typeof PASS6_PAID_FULL_DATA_COHORT_IDS[number]): Pass6PaidFullDataCohortWindow {
  return {
    cohortId,
    requestedCount: 10_000,
    fullDeliveryCount: 10_000,
    blockedBeforeDeliveryCount: 0,
    systemErrorCount: 0,
    incompleteDeliveredCount: 0,
    paidDeliveryCount: 10_000,
    commercialReceiptCount: 10_000,
    identityBoundCount: 10_000,
    freshnessCompliantCount: 10_000,
    quorumCompliantCount: 10_000,
    telemetryCompleteCount: 10_000,
    evidenceRecordCount: 10_000,
    evidenceRoot: digest(cohortId),
  };
}

function validInput(): Pass6PaidFullDataSloInput {
  return {
    environment: "staging",
    evidenceClass: "real_shadow_observation",
    windowStartedAt: "2026-06-01T00:00:00.000Z",
    windowEndedAt: "2026-07-01T00:00:00.000Z",
    generatedAt: "2026-07-01T00:05:00.000Z",
    deploymentDigest: digest("deployment"),
    providerConfigRoot: digest("providers"),
    canonicalFieldRegistryDigest: digest("fields"),
    cohorts: PASS6_PAID_FULL_DATA_COHORT_IDS.map(cohort),
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

let assertions = 0;
function check(condition: unknown, message: string) {
  assert.ok(condition, message);
  assertions += 1;
}

const passing = buildPass6PaidFullDataSloReceipt(validInput());
check(passing.status === "pass" && passing.passingCohortCount === 18, "all 18 paid cohorts must pass independently");
check(passing.requestedCount === 180_000 && passing.fullDeliveryCount === 180_000, "receipt must preserve the exact denominator");
check(passing.cohorts.every((row) => row.fullDataAvailabilityBps === 10_000 && row.deliveredCompletenessBps === 10_000), "complete cohort is 10000/10000");

const belowSlo = validInput();
belowSlo.cohorts[0] = { ...belowSlo.cohorts[0], fullDeliveryCount: 9_989, blockedBeforeDeliveryCount: 11, paidDeliveryCount: 9_989, commercialReceiptCount: 9_989, identityBoundCount: 9_989, freshnessCompliantCount: 9_989, quorumCompliantCount: 9_989, telemetryCompleteCount: 9_989 };
const belowSloReceipt = buildPass6PaidFullDataSloReceipt(belowSlo);
check(belowSloReceipt.status === "blocked" && belowSloReceipt.blockers.some((value) => value.includes("cohort_99_9_slo_failed")), "9989 bps must fail");

const exactlySlo = validInput();
exactlySlo.cohorts[0] = { ...exactlySlo.cohorts[0], fullDeliveryCount: 9_990, blockedBeforeDeliveryCount: 10, paidDeliveryCount: 9_990, commercialReceiptCount: 9_990, identityBoundCount: 9_990, freshnessCompliantCount: 9_990, quorumCompliantCount: 9_990, telemetryCompleteCount: 9_990 };
check(buildPass6PaidFullDataSloReceipt(exactlySlo).status === "pass", "9990 bps is the inclusive availability floor");

const incomplete = validInput();
incomplete.cohorts[0] = { ...incomplete.cohorts[0], fullDeliveryCount: 9_999, blockedBeforeDeliveryCount: 1, incompleteDeliveredCount: 1, paidDeliveryCount: 10_000, commercialReceiptCount: 9_999, identityBoundCount: 9_999, freshnessCompliantCount: 9_999, quorumCompliantCount: 9_999, telemetryCompleteCount: 9_999 };
const incompleteReceipt = buildPass6PaidFullDataSloReceipt(incomplete);
check(incompleteReceipt.status === "blocked" && incompleteReceipt.blockers.some((value) => value.includes("incomplete_paid_delivery_detected")), "one incomplete paid delivery always fails");

for (const [name, mutate, blocker] of [
  ["missing cohort", (value: Pass6PaidFullDataSloInput) => { value.cohorts.pop(); }, "slo_cohort_count_invalid"],
  ["evidence gap", (value: Pass6PaidFullDataSloInput) => { value.cohorts[0].evidenceRecordCount -= 1; }, "cohort_evidence_coverage_invalid"],
  ["telemetry gap", (value: Pass6PaidFullDataSloInput) => { value.cohorts[0].telemetryCompleteCount -= 1; }, "cohort_telemetry_coverage_invalid"],
  ["short sample", (value: Pass6PaidFullDataSloInput) => { const row = value.cohorts[0]; Object.assign(row, { requestedCount: 9_999, fullDeliveryCount: 9_999, paidDeliveryCount: 9_999, commercialReceiptCount: 9_999, identityBoundCount: 9_999, freshnessCompliantCount: 9_999, quorumCompliantCount: 9_999, telemetryCompleteCount: 9_999, evidenceRecordCount: 9_999 }); }, "cohort_sample_shortfall"],
  ["short window", (value: Pass6PaidFullDataSloInput) => { value.windowStartedAt = "2026-06-02T00:00:00.000Z"; }, "slo_window_duration_invalid"],
  ["bad config digest", (value: Pass6PaidFullDataSloInput) => { value.providerConfigRoot = "self-asserted"; }, "slo_configuration_digest_invalid"],
] as const) {
  const value = clone(validInput());
  mutate(value);
  const receipt = buildPass6PaidFullDataSloReceipt(value);
  check(receipt.status === "blocked" && receipt.blockers.some((value) => value.includes(blocker)), name);
}

check(/^sha256:[a-f0-9]{64}$/.test(passing.receiptDigest), "receipt must be content bound");
check(passing.cohorts.every((row) => !row.cohortId.includes(":basic:")), "Basic preview is excluded from paid SLO cohorts");

console.log(JSON.stringify({
  suite: "PASS6_PAID_FULL_DATA_SLO",
  status: "PASS",
  assertions,
  targetAvailabilityBps: 9_990,
  paidDeliveryCompletenessRequiredBps: 10_000,
  requiredCohorts: PASS6_PAID_FULL_DATA_COHORT_IDS.length,
  minimumRequestsPerCohort: 10_000,
  minimumWindowDays: 30,
  liveClaimed: false,
}, null, 2));

