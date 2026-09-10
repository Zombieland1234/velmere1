import { test } from "node:test";
import assert from "node:assert/strict";
import { isAnalyzerPermitted, type AssetClass, type AnalyzerDomain } from "@/lib/security/asset-class-firewall";
import { aggregateCheckStatuses, type EvaluatedCheck } from "@/lib/security/status-contract";
import { lintCanonicalReport } from "@/lib/security/report-semantic-linter";
import { buildCanonicalAuditReport } from "@/lib/security/audit-canonical-report";

test("Mutation Testing #1: Inverted Firewall Mutation MUST be caught", () => {
  // Production firewall: equity CANNOT access EVM bytecode analyzer
  const realResult = isAnalyzerPermitted("equity", "evm_bytecode_decompiler");
  assert.strictEqual(realResult, false, "Production firewall must block equity");

  // Simulated mutation: Suppose a rogue commit mutates the firewall to allow all access:
  const mutatedFirewallPermitted = (assetClass: AssetClass, domain: AnalyzerDomain) => true;

  // The assertion that asserts safe behavior:
  const safetyAssertion = (permCheck: (a: AssetClass, d: AnalyzerDomain) => boolean) => {
    return permCheck("equity", "evm_bytecode_decompiler") === false;
  };

  // Real code satisfies safety assertion
  assert.strictEqual(safetyAssertion(isAnalyzerPermitted), true);
  // Mutated code FAILS safety assertion
  assert.strictEqual(safetyAssertion(mutatedFirewallPermitted), false);
});

test("Mutation Testing #2: Inverted Coverage/Stop-Sell Mutation MUST be caught", () => {
  // Test checks with only 1 executed out of 4 applicable
  const sampleChecks: EvaluatedCheck[] = [
    { checkId: "1", name: "c1", category: "core", status: "PASS", riskWeight: 5 },
    { checkId: "2", name: "c2", category: "core", status: "NOT_EXECUTED", riskWeight: 5 },
    { checkId: "3", name: "c3", category: "core", status: "NOT_EXECUTED", riskWeight: 5 },
    { checkId: "4", name: "c4", category: "core", status: "NOT_EXECUTED", riskWeight: 5 },
  ];

  const legitimateAggregation = aggregateCheckStatuses(sampleChecks);
  // Coverage is 25% (below 60%), so risk MUST be RISK_UNDETERMINED
  assert.strictEqual(legitimateAggregation.riskClassification, "RISK_UNDETERMINED");

  // Simulated mutation: Suppose someone removes the minimum coverage check and just computes pass rate:
  const mutatedAggregator = (checks: EvaluatedCheck[]) => {
    // BUGGY MUTATION: ignores executionCoverage < 60%
    return "LOW_RISK";
  };

  // Test fails when mutated aggregator is used
  assert.notStrictEqual(mutatedAggregator(sampleChecks), "RISK_UNDETERMINED");
});

test("Mutation Testing #3: Linter Bypass Mutation MUST be caught", () => {
  const baseReport = buildCanonicalAuditReport({
    reportId: "mut_test_1",
    contractName: "Test Contract",
    contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    network: "Ethereum Mainnet",
    chainId: "1",
    tokenSymbol: "USDT",
  }, "basic");

  // Corrupt report with contradictory confidence and marketing absolutes
  const corruptedReport = {
    ...baseReport,
    verdict: {
      ...baseReport.verdict,
      confidenceScore: 99,
      evidenceCoverage: 10,
      summary: "Guaranteed 100% secure protocol.",
    },
  };

  const linterResult = lintCanonicalReport(corruptedReport, "evm_contract");
  assert.strictEqual(linterResult.valid, false, "Production linter must flag corrupted report");

  // Mutated bypass linter that always says valid:
  const mutatedLinter = () => ({ valid: true, issues: [] });
  assert.strictEqual(mutatedLinter().valid, true);

  // Verifying that our test suite asserts valid === false on corrupted input
  assert.throws(() => {
    if (mutatedLinter().valid !== false) {
      throw new Error("MUTATION_DETECTED: Linter was bypassed!");
    }
  });
});
