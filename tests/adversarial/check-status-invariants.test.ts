import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateCheckStatuses,
  type EvaluatedCheck,
  type CheckStatus,
} from "@/lib/security/status-contract";

test("Check Status Invariants: NOT_APPLICABLE is NEVER counted as PASS or successful execution", () => {
  const checks: EvaluatedCheck[] = [
    { checkId: "c1", name: "Check 1", category: "Core", status: "PASS", riskWeight: 5 },
    { checkId: "c2", name: "Check 2", category: "Core", status: "NOT_APPLICABLE", riskWeight: 5, reason: "Non-EVM asset" },
    { checkId: "c3", name: "Check 3", category: "Core", status: "NOT_APPLICABLE", riskWeight: 5, reason: "Non-EVM asset" },
  ];

  const result = aggregateCheckStatuses(checks);

  assert.strictEqual(result.totalChecks, 3);
  assert.strictEqual(result.passedCount, 1);
  assert.strictEqual(result.notApplicableCount, 2);
  assert.strictEqual(result.applicableChecksCount, 1);
  assert.strictEqual(result.executedApplicableChecksCount, 1);
  assert.strictEqual(result.passRatePercentage, 100);
});

test("Check Status Invariants: NOT_EXECUTED is NEVER counted as PASS and drops pass rate", () => {
  const checks: EvaluatedCheck[] = [
    { checkId: "c1", name: "Pass 1", category: "Security", status: "PASS", riskWeight: 5 },
    { checkId: "c2", name: "Unexecuted 1", category: "Security", status: "NOT_EXECUTED", riskWeight: 5 },
    { checkId: "c3", name: "Unexecuted 2", category: "Security", status: "NOT_EXECUTED", riskWeight: 5 },
    { checkId: "c4", name: "Unexecuted 3", category: "Security", status: "NOT_EXECUTED", riskWeight: 5 },
  ];

  const result = aggregateCheckStatuses(checks);

  // 1 pass out of 4 applicable checks = 25% pass rate (NOT 100%!)
  assert.strictEqual(result.passedCount, 1);
  assert.strictEqual(result.notExecutedCount, 3);
  assert.strictEqual(result.passRatePercentage, 25);
  // Execution coverage is 25% (1/4 executed) -> below 60% threshold -> RISK_UNDETERMINED!
  assert.strictEqual(result.riskClassification, "RISK_UNDETERMINED");
});

test("Check Status Invariants: UNVERIFIED cannot result in LOW_RISK classification", () => {
  const checks: EvaluatedCheck[] = [
    { checkId: "c1", name: "Pass 1", category: "Security", status: "PASS", riskWeight: 5 },
    { checkId: "c2", name: "Pass 2", category: "Security", status: "PASS", riskWeight: 5 },
    { checkId: "c3", name: "Pass 3", category: "Security", status: "PASS", riskWeight: 5 },
    { checkId: "c4", name: "Pass 4", category: "Security", status: "PASS", riskWeight: 5 },
    { checkId: "c5", name: "Pass 5", category: "Security", status: "PASS", riskWeight: 5 },
    { checkId: "c6", name: "Unverified 1", category: "Security", status: "UNVERIFIED", riskWeight: 5 },
  ];

  const result = aggregateCheckStatuses(checks, 50);

  assert.strictEqual(result.unverifiedCount, 1);
  // Presence of UNVERIFIED must elevate risk to at least MODERATE_RISK, never LOW_RISK!
  assert.notStrictEqual(result.riskClassification, "LOW_RISK");
  assert.strictEqual(result.riskClassification, "MODERATE_RISK");
});

test("Check Status Invariants: Critical failures mandate CRITICAL_RISK classification", () => {
  const checks: EvaluatedCheck[] = [
    { checkId: "c1", name: "Pass 1", category: "Security", status: "PASS", riskWeight: 5 },
    { checkId: "c2", name: "Critical Fail", category: "Security", status: "FAIL", riskWeight: 9, reason: "Arbitrary drain detected" },
  ];

  const result = aggregateCheckStatuses(checks, 50);

  assert.strictEqual(result.failedCount, 1);
  assert.strictEqual(result.riskClassification, "CRITICAL_RISK");
});
