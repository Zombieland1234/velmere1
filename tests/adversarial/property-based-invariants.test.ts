import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateCheckStatuses,
  type EvaluatedCheck,
  type CheckStatus,
} from "@/lib/security/status-contract";

test("Property-Based Invariants #1: Status partition identity holds for 1,000 random status vectors", () => {
  const possibleStatuses: CheckStatus[] = [
    "PASS",
    "FAIL",
    "UNVERIFIED",
    "NOT_APPLICABLE",
    "NOT_EXECUTED",
    "LOCKED",
    "UNAVAILABLE",
  ];

  // Seeded pseudo-random PRNG for reproducibility
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let trial = 0; trial < 1000; trial++) {
    const numChecks = 1 + Math.floor(rnd() * 20);
    const checks: EvaluatedCheck[] = [];

    for (let i = 0; i < numChecks; i++) {
      const statusIdx = Math.floor(rnd() * possibleStatuses.length);
      const riskWeight = 1 + Math.floor(rnd() * 10);
      checks.push({
        checkId: `chk_${trial}_${i}`,
        name: `Random Check ${i}`,
        category: "fuzz",
        status: possibleStatuses[statusIdx],
        riskWeight,
      });
    }

    const res = aggregateCheckStatuses(checks);

    // Invariant 1: Total count equals sum of all status partitions
    const partitionSum =
      res.passedCount +
      res.failedCount +
      res.unverifiedCount +
      res.notApplicableCount +
      res.notExecutedCount +
      res.lockedCount +
      res.unavailableCount;

    assert.strictEqual(
      res.totalChecks,
      partitionSum,
      `Partition identity violated on trial ${trial}: total ${res.totalChecks} != sum ${partitionSum}`,
    );

    // Invariant 2: Applicable checks equals total minus NOT_APPLICABLE
    assert.strictEqual(
      res.applicableChecksCount,
      res.totalChecks - res.notApplicableCount,
      `Applicable checks calculation violated on trial ${trial}`,
    );

    // Invariant 3: Pass rate is always bounded between 0 and 100
    assert.ok(
      res.passRatePercentage >= 0 && res.passRatePercentage <= 100,
      `Pass rate percentage out of bounds on trial ${trial}: ${res.passRatePercentage}`,
    );

    // Invariant 4: Coverage percentage is always bounded between 0 and 100
    assert.ok(
      res.executionCoveragePercentage >= 0 && res.executionCoveragePercentage <= 100,
      `Coverage percentage out of bounds on trial ${trial}: ${res.executionCoveragePercentage}`,
    );

    // Invariant 5: If coverage < 60%, risk must ALWAYS be RISK_UNDETERMINED
    if (res.applicableChecksCount > 0 && res.executionCoveragePercentage < 60) {
      assert.strictEqual(
        res.riskClassification,
        "RISK_UNDETERMINED",
        `Risk must be RISK_UNDETERMINED when coverage is ${res.executionCoveragePercentage}% on trial ${trial}`,
      );
    }
  }
});

test("Property-Based Invariants #2: Market OHLC Price Invariants", () => {
  // OHLC Price bars invariant: High >= max(Open, Close) and Low <= min(Open, Close)
  const validateBar = (o: number, h: number, l: number, c: number) => {
    return h >= Math.max(o, c) && l <= Math.min(o, c) && h >= l;
  };

  assert.strictEqual(validateBar(100, 105, 95, 102), true);
  assert.strictEqual(validateBar(100, 99, 95, 98), false, "High lower than Open must fail");
  assert.strictEqual(validateBar(100, 105, 101, 102), false, "Low higher than Open must fail");
});
