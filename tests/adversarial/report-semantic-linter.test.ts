import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lintCanonicalReport,
  isPlaceholderAddress,
  type SemanticLintResult,
} from "@/lib/security/report-semantic-linter";
import { buildCanonicalAuditReport } from "@/lib/security/audit-canonical-report";

test("Report Semantic Linter: Flags placeholder addresses and synthetic fixtures", () => {
  assert.strictEqual(isPlaceholderAddress("fixture:sample"), true);
  assert.strictEqual(isPlaceholderAddress("mock:token"), true);
  assert.strictEqual(isPlaceholderAddress("0x1111111111111111111111111111111111111111"), true);
  assert.strictEqual(isPlaceholderAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), true);
  assert.strictEqual(isPlaceholderAddress("0xdac17f958d2ee523a2206206994597c13d831ec7"), false);
  assert.strictEqual(isPlaceholderAddress("nasdaq:aapl"), false);
});

test("Report Semantic Linter: Flags contradictory confidence vs evidence coverage", () => {
  const validReport = buildCanonicalAuditReport({
    reportId: "rep_test_contradiction",
    contractName: "Test Coin",
    contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    network: "Ethereum Mainnet",
    chainId: "1",
    tokenSymbol: "TEST",
  }, "basic");

  // Mutate report to introduce contradiction: high confidence with minimal evidence coverage
  const invalidReport = {
    ...validReport,
    verdict: {
      ...validReport.verdict,
      confidenceScore: 95,
      evidenceCoverage: 20,
    },
  };

  const result = lintCanonicalReport(invalidReport, "evm_contract");
  assert.strictEqual(result.valid, false);
  assert.ok(result.issues.some((i) => i.code === "CONTRADICTORY_CONFIDENCE_COVERAGE"));
});

test("Report Semantic Linter: Flags numeric bounds violations", () => {
  const validReport = buildCanonicalAuditReport({
    reportId: "rep_test_bounds",
    contractName: "Test Coin",
    contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    network: "Ethereum Mainnet",
    chainId: "1",
    tokenSymbol: "TEST",
  }, "basic");

  const invalidReport = {
    ...validReport,
    verdict: {
      ...validReport.verdict,
      riskScore: 150, // Out of bounds (> 100)
    },
  };

  const result = lintCanonicalReport(invalidReport, "evm_contract");
  assert.strictEqual(result.valid, false);
  assert.ok(result.issues.some((i) => i.code === "NUMERIC_BOUNDS_VIOLATION"));
});

test("Report Semantic Linter: Flags unhedged marketing absolutes", () => {
  const validReport = buildCanonicalAuditReport({
    reportId: "rep_test_marketing",
    contractName: "Test Coin",
    contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    network: "Ethereum Mainnet",
    chainId: "1",
    tokenSymbol: "TEST",
  }, "basic");

  const invalidReport = {
    ...validReport,
    verdict: {
      ...validReport.verdict,
      summary: "This protocol is guaranteed 100% secure and unhackable by our audit.",
    },
  };

  const result = lintCanonicalReport(invalidReport, "evm_contract");
  assert.strictEqual(result.valid, false);
  assert.ok(result.issues.some((i) => i.code === "UNHEDGED_MARKETING_ABSOLUTE"));
});

test("Report Semantic Linter: Passes legitimate canonical reports", () => {
  const validReport = buildCanonicalAuditReport({
    reportId: "rep_valid_usdt",
    contractName: "Tether USD",
    contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    network: "Ethereum Mainnet",
    chainId: "1",
    tokenSymbol: "USDT",
  }, "pro");

  const result = lintCanonicalReport(validReport, "evm_contract");
  assert.strictEqual(result.valid, true, `Expected valid report, but got issues: ${JSON.stringify(result.issues)}`);
  assert.strictEqual(result.criticalCount, 0);
  assert.strictEqual(result.highCount, 0);
});
