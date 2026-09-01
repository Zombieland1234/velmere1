#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { executeEconomicAdversarialAnalysis } from "./audit-economic-adversarial-engine.mjs";
const casePath = "fixtures/pass35/audit-a8/economic/synthetic-economic-case.json";
const base = JSON.parse(readFileSync(casePath, "utf8"));
let assertions = 0;
const check = (value, message) => { assertions += 1; assert.ok(value, message); };
const run = (patch = {}) => executeEconomicAdversarialAnalysis({ rootPath: process.cwd(), casePath, caseInput: { ...structuredClone(base), ...patch } });
const runExactMutated = (patch = {}) => {
  const input = { ...structuredClone(base), ...patch };
  const tempPath = "fixtures/pass35/audit-a8/economic/.tmp-mutated-economic-case.json";
  writeFileSync(tempPath, `${JSON.stringify(input, null, 2)}\n`);
  try { return executeEconomicAdversarialAnalysis({ rootPath: process.cwd(), casePath: tempPath, caseInput: input }); }
  finally { unlinkSync(tempPath); }
};
const reference = run();
check(reference.execution.status === "VERIFIED" && reference.blockers.length === 0, "reference A10 must verify");
check(reference.scenarioCount === 5 && reference.materialScenarioCount === 5, "A10 scenario counts invalid");
check(reference.highestSeverity === "CRITICAL" && reference.deterministicEconomicRiskRanking === 100, "A10 ranking invalid");
check(reference.probabilityClaimAllowed === false && reference.execution.paidGateEligible === false, "A10 unlocked probability/paid claim");
check(reference.upstreamBindings.forkReplayEmbeddedReceiptSha256?.startsWith("sha256:"), "A10 fork receipt binding missing");
check(reference.scenarios.every((row) => row.material === true), "reference material scenarios missing");
check(run().receiptSha256 === reference.receiptSha256, "A10 receipt must be deterministic");
check(!JSON.stringify(reference).includes(process.cwd()), "A10 receipt leaked workspace path");
const scenarioMutations = [
  ["ORACLE_MANIPULATION", (row) => { row.parameters.manipulatedPriceE6 = row.parameters.referencePriceE6; }],
  ["MEV_SANDWICH", (row) => { row.parameters.estimatedLossUsdE6 = "0"; }],
  ["LIQUIDITY_DRAIN", (row) => { row.parameters.removableLiquidityUsdE6 = "0"; }],
  ["GOVERNANCE_TAKEOVER", (row) => { row.parameters.attackerVotingPower = "100000"; row.parameters.emergencyPauseAvailable = true; }],
  ["PRIVILEGED_KEY_COMPROMISE", (row) => { row.parameters.threshold = "2"; row.parameters.timelockSec = "86400"; row.parameters.emergencyPauseAvailable = true; }],
];
for (const [type, mutate] of scenarioMutations) {
  const scenarios = structuredClone(base.scenarios);
  mutate(scenarios.find((row) => row.type === type));
  const receipt = runExactMutated({ scenarios });
  check(receipt.execution.status === "VERIFIED" && receipt.scenarios.find((row) => row.type === type)?.material === false, `${type} safe mutation not detected`);
}
const wrongForkHash = run({ forkReplayReceiptFileSha256: `sha256:${"0".repeat(64)}` });
check(wrongForkHash.blockers.includes("a8_economic_fork_receipt_file_digest_mismatch"), "wrong fork file hash not blocked");
const missingScenario = run({ scenarios: base.scenarios.filter((row) => row.type !== "ORACLE_MANIPULATION") });
check(missingScenario.blockers.includes("a8_economic_required_scenario_missing:ORACLE_MANIPULATION"), "missing scenario not blocked");
const duplicateScenarios = structuredClone(base.scenarios); duplicateScenarios[1].scenarioId = duplicateScenarios[0].scenarioId;
check(run({ scenarios: duplicateScenarios }).blockers.includes("a8_economic_scenario_duplicate_id"), "duplicate scenario ID not blocked");
const relabeled = run({ inputClass: "CUSTOMER_SUPPLIED_VERIFIED", providerCommercialRightsEvidenceSha256: `sha256:${"9".repeat(64)}` });
check(relabeled.blockers.includes("a8_economic_real_case_requires_real_fork_receipt"), "fixture relabel not blocked");
check(relabeled.execution.realCaseExecution === false && relabeled.execution.paidGateEligible === false, "fixture relabel received real/paid credit");
check(/^sha256:[a-f0-9]{64}$/u.test(reference.receiptSha256), "A10 receipt hash invalid");
console.log(JSON.stringify({ status: "PASS_AUDIT_A8_ECONOMIC_ADVERSARIAL", assertions, scenarioMutations: scenarioMutations.length, killedMutations: scenarioMutations.length + 4, scenarioCount: reference.scenarioCount, materialScenarioCount: reference.materialScenarioCount, paidGateEligible: false, receiptSha256: reference.receiptSha256 }, null, 2));
