#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const REV = "VELMERE_PASS36_A101R0_MEASURED_SLO_ERROR_BUDGET_VENDOR_EXIT_AND_RECOVERY_TRUTH_BOUNDARY";
const PARENT = "VELMERE_PASS36_A100R0_INCIDENT_KILL_SWITCH_ALERT_ACK_AND_CUSTOMER_COMMUNICATION_TRUTH_BOUNDARY";
const policy = JSON.parse(fs.readFileSync("config/pass36/a101-slo-error-budget-vendor-exit-recovery-policy.json", "utf8"));
const boundary = fs.readFileSync("scripts/pass36/a101-slo-vendor-exit-recovery-boundary.mjs", "utf8");
const testSource = fs.readFileSync("scripts/pass36/test-a101-slo-vendor-exit-recovery-boundaries.mjs", "utf8");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

add("policy:identity", policy.revisionId === REV && policy.parentRevisionId === PARENT);
add("policy:no-credit", policy.localPassCredit === false && policy.promotion?.exactReleaseCredit === false && policy.promotion?.stagingCredit === false && policy.promotion?.productionSloProven === false && policy.promotion?.continuousMonitoringProven === false && policy.promotion?.live === false && policy.promotion?.saleEnabled === false && policy.promotion?.productionApproved === false);
add("policy:denominators", policy.localDenominators?.boundaryAssertions === 94 && policy.localDenominators?.fixtureScenarios === 15 && policy.localDenominators?.realSloWindows === 0 && policy.localDenominators?.realVendorExitRuns === 0 && policy.localDenominators?.realPrimaryRestoreConfirmations === 0);
add("policy:slo-bounds", policy.slo?.targetAvailabilityPercent === 99 && policy.slo?.minimumWindowSeconds === 900 && policy.slo?.maximumWindowSeconds === 1800 && policy.slo?.minimumSamples === 50 && policy.slo?.p95MillisecondsMaximum === 1500 && policy.slo?.p99MillisecondsMaximum === 3000);
add("policy:vendor-exit", policy.vendorExit?.maximumSeconds === 120 && policy.vendorExit?.independenceDimensions === 6 && policy.vendorExit?.dualControlRequired === true && policy.vendorExit?.webauthnRequired === true);
add("policy:recovery", policy.recovery?.primaryRestoreAttempts === 3 && policy.recovery?.finalPrimaryBaselineRequired === true && policy.recovery?.unconfirmedRestoreDecision === "RECOVERY_REQUIRED");
add("boundary:strict-types", boundary.includes('typeof value !== "number"') && boundary.includes("Number.isSafeInteger") && boundary.includes("a101_slo_count_algebra_invalid"));
add("boundary:current-window", boundary.includes("MIN_WINDOW_MS = 900_000") && boundary.includes("MAX_WINDOW_MS = 1_800_000") && boundary.includes("MAX_WINDOW_AGE_MS = 180_000"));
add("boundary:recomputed-slo", boundary.includes("calculatedAvailability") && boundary.includes("calculatedBudget") && boundary.includes("a101_slo_availability_mismatch") && boundary.includes("a101_slo_error_budget_mismatch"));
add("boundary:independent-planes", boundary.includes("a101_slo_telemetry_not_independent") && boundary.includes("a101_vendor_exit_observer_not_independent") && boundary.includes("a101_service_probe_observer_not_independent"));
add("boundary:provider-independence", boundary.includes("assertIndependentProviderPair") && boundary.includes("a101_vendor_exit_provider_binding_mismatch"));
add("boundary:credential-rejection", boundary.includes("[401, 403]") && boundary.includes("credentialAccepted !== false"));
add("boundary:service-probes", boundary.includes("MIN_SERVICE_PROBES = 10") && boundary.includes("SERVICE_AVAILABILITY_FLOOR_PERCENT = 90") && boundary.includes("SERVICE_P95_LIMIT_MS = 2_000") && boundary.includes("a101_service_probe_duplicate_sample"));
add("boundary:restore-finally", boundary.includes("RESTORE_ATTEMPTS = 3") && boundary.includes("a101_recovery_required_primary_restore_unconfirmed") && boundary.includes("primaryRestoreAttempts"));
add("boundary:zero-mutation", boundary.includes("a101_preflight_failed_zero_mutation") && boundary.includes("mutationStarted: false"));
add("boundary:journal", boundary.includes("createA99Journal") && boundary.includes('journal.append("completed"'));
add("test:adversarial-cases", testSource.includes("slo_preflight_zero_mutation") && testSource.includes("credential_failure_safe_restore") && testSource.includes("restore_failure_recovery_required") && testSource.includes("final_baseline_mismatch_recovery_required"));

let first = null;
for (const iteration of [1, 2]) {
  const result = spawnSync(process.execPath, ["scripts/pass36/test-a101-slo-vendor-exit-recovery-boundaries.mjs"], { encoding: "utf8", timeout: 600_000 });
  add(`test:iteration-${iteration}`, result.status === 0, { status: result.status, stdout: (result.stdout ?? "").slice(-2000), stderr: (result.stderr ?? "").slice(-2000) });
  if (result.status === 0) {
    try {
      const parsed = JSON.parse(result.stdout);
      add(`test:truth-${iteration}`, parsed.status === "PASS_A101_SLO_ERROR_BUDGET_VENDOR_EXIT_RECOVERY_BOUNDARY_LOCAL_ONLY" && parsed.revisionId === REV && parsed.assertions === 94 && parsed.fixtureScenarios === 15 && parsed.realSloWindows === 0 && parsed.realVendorExitRuns === 0 && parsed.realCredentialRevocationProbes === 0 && parsed.realAlternateServiceProbeSets === 0 && parsed.realPrimaryRestoreConfirmations === 0 && parsed.productionSloProven === false && parsed.continuousMonitoringProven === false && parsed.stagingCredit === false && parsed.live === false && parsed.saleEnabled === false, parsed);
      if (iteration === 1) first = parsed;
      else add("test:deterministic-summary", JSON.stringify(parsed) === JSON.stringify(first), { first, second: parsed });
    } catch (error) { add(`test:parse-${iteration}`, false, String(error)); }
  }
}

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  status: failed.length ? "FAIL_A101_SLO_ERROR_BUDGET_VENDOR_EXIT_RECOVERY_BOUNDARY" : "PASS_A101_SLO_ERROR_BUDGET_VENDOR_EXIT_RECOVERY_BOUNDARY_LOCAL_ONLY",
  revisionId: REV,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  realSloWindows: 0,
  realVendorExitRuns: 0,
  realCredentialRevocationProbes: 0,
  realAlternateServiceProbeSets: 0,
  realPrimaryRestoreConfirmations: 0,
  productionSloProven: false,
  continuousMonitoringProven: false,
  stagingCredit: false,
  live: false,
  saleEnabled: false
}, null, 2));
process.exit(failed.length ? 1 : 0);
