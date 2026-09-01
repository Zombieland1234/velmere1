#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { executeEconomicAdversarialAnalysis } from "./audit-economic-adversarial-engine.mjs";
import { executeRemediationRetestAdapter } from "./audit-remediation-retest-adapter.mjs";
import { executeMonitoringHandoffAdapter } from "./audit-monitoring-handoff-adapter.mjs";

const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });

const economicCasePath = "fixtures/pass35/audit-a8/economic/synthetic-economic-case.json";
const economicCase = readJson(economicCasePath);
const forkReceiptBytes = readFileSync(economicCase.forkReplayReceiptPath);
const forkReceipt = JSON.parse(forkReceiptBytes.toString("utf8"));
economicCase.forkReplayReceiptFileSha256 = sha256(forkReceiptBytes);
economicCase.forkReplayEmbeddedReceiptSha256 = forkReceipt.receiptSha256;
writeJson(economicCasePath, economicCase);
const economicReceipt = executeEconomicAdversarialAnalysis({ rootPath: process.cwd(), casePath: economicCasePath, caseInput: economicCase });
if (economicReceipt.execution.status !== "VERIFIED" || economicReceipt.materialScenarioCount !== 5 || economicReceipt.execution.paidGateEligible !== false) {
  throw new Error(`a8_economic_receipt_invalid:${economicReceipt.blockers.join(",")}`);
}
const economicReceiptPath = "fixtures/pass35/audit-a8/PASS35_A8_A10_ECONOMIC_SYNTHETIC_RECEIPT.json";
writeJson(economicReceiptPath, economicReceipt);

const retestCasePath = "fixtures/pass35/audit-a8/remediation/synthetic-remediation-retest-case.json";
const retestCase = readJson(retestCasePath);
const receiptMap = [
  ["A05", "fixtures/pass35/audit-a5/PASS35_A5_SEMGREP_SYNTHETIC_RECEIPT.json"],
  ["A07", "fixtures/pass35/audit-a6/PASS35_A6_FORGE_SYNTHETIC_RECEIPT.json"],
  ["A08", "fixtures/pass35/audit-a6/PASS35_A6_A08_MODEL_FUZZ_SYNTHETIC_RECEIPT.json"],
  ["A09", "fixtures/pass35/audit-a7/PASS35_A7_FORK_REPLAY_SYNTHETIC_RECEIPT.json"],
  ["A10", economicReceiptPath],
];
retestCase.retestReceipts = receiptMap.map(([controlId, receiptPath]) => {
  const bytes = readFileSync(receiptPath);
  const parsed = JSON.parse(bytes.toString("utf8"));
  return {
    controlId,
    receiptPath,
    expectedFileSha256: sha256(bytes),
    expectedEmbeddedReceiptSha256: parsed.receiptSha256,
  };
});
writeJson(retestCasePath, retestCase);
const retestReceipt = executeRemediationRetestAdapter({ rootPath: process.cwd(), casePath: retestCasePath, caseInput: retestCase });
if (retestReceipt.status !== "VERIFIED_LOCAL_RETEST_CONTRACT" || retestReceipt.retestReceiptCount !== 5 || retestReceipt.closureEligible !== false) {
  throw new Error(`a8_retest_receipt_invalid:${retestReceipt.blockers.join(",")}`);
}
const retestReceiptPath = "fixtures/pass35/audit-a8/PASS35_A8_A15_REMEDIATION_RETEST_SYNTHETIC_RECEIPT.json";
writeJson(retestReceiptPath, retestReceipt);

const monitoringCasePath = "fixtures/pass35/audit-a8/monitoring/synthetic-monitoring-handoff-case.json";
const monitoringCase = readJson(monitoringCasePath);
const monitoringReceipt = executeMonitoringHandoffAdapter({ rootPath: process.cwd(), casePath: monitoringCasePath, caseInput: monitoringCase });
if (monitoringReceipt.status !== "VERIFIED_LOCAL_MONITORING_HANDOFF" || monitoringReceipt.ruleCount !== 6 || monitoringReceipt.liveMonitoringActive !== false) {
  throw new Error(`a8_monitoring_receipt_invalid:${monitoringReceipt.blockers.join(",")}`);
}
const monitoringReceiptPath = "fixtures/pass35/audit-a8/PASS35_A8_A17_MONITORING_HANDOFF_SYNTHETIC_RECEIPT.json";
writeJson(monitoringReceiptPath, monitoringReceipt);

console.log(JSON.stringify({
  status: "PASS_A8_SYNTHETIC_RECEIPTS_BUILT",
  economicReceiptSha256: economicReceipt.receiptSha256,
  economicScenarios: economicReceipt.scenarioCount,
  materialScenarios: economicReceipt.materialScenarioCount,
  remediationRetestReceiptSha256: retestReceipt.receiptSha256,
  retestControls: retestReceipt.retestReceiptCount,
  monitoringReceiptSha256: monitoringReceipt.receiptSha256,
  monitoringRules: monitoringReceipt.ruleCount,
  paidGateEligible: false,
}, null, 2));
