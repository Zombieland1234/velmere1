import { buildA16RiskRows } from "./a16-test-fixtures.mjs";
import { computePass35A17CalibrationMetrics, runPass35A17RiskCalibrationEvaluationRuntime, verifyPass35A17RiskCalibrationEvaluationRuntime } from "../../lib/market-integrity/pass35-a17-risk-calibration-evaluation-runtime.mjs";

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const clone = (value) => JSON.parse(JSON.stringify(value));
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks += 1; };
const rows = buildA16RiskRows();
const runtime = runPass35A17RiskCalibrationEvaluationRuntime({ rows, evaluatedAt: "2026-07-23T04:00:00.000Z" });
check(verifyPass35A17RiskCalibrationEvaluationRuntime(runtime), "a17_risk_verify");
check(runtime.rowDenominator === 600, "a17_risk_rows");
check(runtime.splitCounts.train === 360 && runtime.splitCounts.validation === 140 && runtime.splitCounts.prospective === 100, "a17_risk_splits");
check(typeof runtime.splitMetrics.validation.ece === "number", "a17_ece_present");
check(typeof runtime.splitMetrics.validation.mce === "number", "a17_mce_present");
check(typeof runtime.splitMetrics.validation.brierSkillVsHalf === "number", "a17_brier_skill_present");
check(typeof runtime.splitMetrics.validation.calibrationSlope === "number", "a17_slope_present");
check(typeof runtime.splitMetrics.validation.calibrationIntercept === "number", "a17_intercept_present");
check(runtime.splitMetrics.validation.bins.length > 1, "a17_bins_present");
check(runtime.splitMetrics.validation.bins.every((row) => row.observedRateWilson95.length === 2), "a17_bin_ci_present");
check(runtime.prospectiveReceipts.length === 100, "a17_prospective_receipts");
check(runtime.prospectiveReceipts.every((row) => !row.thresholdMutationAllowed), "a17_threshold_mutation_blocked");
check(runtime.prospectiveWindowOpenCount > 0 && runtime.prospectiveWindowClosedCount > 0, "a17_mixed_window_states");
check(!runtime.empiricalProbabilityClaimAllowed && !runtime.prospectivePerformanceClaimAllowed, "a17_claims_blocked");
check(!runtime.sellEnabled && !runtime.liveClaimed, "a17_paid_live_blocked");

const perfect = computePass35A17CalibrationMetrics([
  { prediction: 0, outcome: 0, abstained: false },
  { prediction: 1, outcome: 1, abstained: false },
  { prediction: 0, outcome: 0, abstained: false },
  { prediction: 1, outcome: 1, abstained: false },
]);
check(perfect.brier === 0, "a17_perfect_brier");
check(perfect.ece === 0, "a17_perfect_ece");

let leakageCaught = false;
try {
  const leaked = clone(rows);
  leaked[0].outcomeObservedAt = leaked[0].predictedAt;
  runPass35A17RiskCalibrationEvaluationRuntime({ rows: leaked });
} catch (error) { leakageCaught = String(error).includes("temporal_leakage"); }
check(leakageCaught, "a17_temporal_leakage_caught");

const tampered = clone(runtime);
tampered.prospectiveReceipts[0].thresholdRegistrySha256 = "sha256:" + "0".repeat(64);
check(!verifyPass35A17RiskCalibrationEvaluationRuntime(tampered), "a17_threshold_tamper_caught");
const tamperedMetric = clone(runtime);
tamperedMetric.splitMetrics.validation.ece = 0;
check(!verifyPass35A17RiskCalibrationEvaluationRuntime(tamperedMetric), "a17_metric_tamper_caught");
const replay = runPass35A17RiskCalibrationEvaluationRuntime({ rows, evaluatedAt: "2026-07-23T04:00:00.000Z" });
check(replay.integrity.digest === runtime.integrity.digest, "a17_risk_deterministic");

console.log(JSON.stringify({ status: "PASS_A17_RISK_CALIBRATION_EVALUATION", checks, rows: runtime.rowDenominator, validationEce: runtime.splitMetrics.validation.ece, validationSlope: runtime.splitMetrics.validation.calibrationSlope, prospectiveOpen: runtime.prospectiveWindowOpenCount, prospectiveClosed: runtime.prospectiveWindowClosedCount, probabilityClaimsAllowed: runtime.empiricalProbabilityClaimAllowed }, null, 2));
