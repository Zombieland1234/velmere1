import fs from "node:fs";
import path from "node:path";
import { executeFullAuditV2 } from "../../lib/security/v2/master-audit-orchestrator";

type Split = "DEV" | "VALIDATION" | "LOCAL_HOLDOUT";
type Case = {
  split: Split;
  name: string;
  sourcePath: string;
  expectedFindingIds: string[];
  expectedClean: boolean;
};

const root = process.cwd();
const golden = path.join(root, "golden");
const cases: Case[] = [
  { split: "DEV", name: "CleanERC20", sourcePath: path.join(golden, "known-clean", "CleanERC20.sol"), expectedFindingIds: [], expectedClean: true },
  { split: "DEV", name: "ReentrancyBank", sourcePath: path.join(golden, "known-vulnerable", "ReentrancyBank.sol"), expectedFindingIds: ["VLM-SEC-REENTRANCY-01"], expectedClean: false },
  { split: "DEV", name: "InsecureTxOriginWallet", sourcePath: path.join(golden, "known-vulnerable", "InsecureTxOriginWallet.sol"), expectedFindingIds: ["VLM-SEC-AUTH-TXORIGIN-01"], expectedClean: false },
  { split: "DEV", name: "EulerExploitModel", sourcePath: path.join(golden, "known-exploited", "EulerExploitModel.sol"), expectedFindingIds: ["VLM-SEC-DEFI-VAULT-INFLATION-01"], expectedClean: false },
  { split: "VALIDATION", name: "GuardedVault", sourcePath: path.join(golden, "known-clean", "GuardedVault.sol"), expectedFindingIds: [], expectedClean: true },
  { split: "VALIDATION", name: "SpotReserveLending", sourcePath: path.join(golden, "known-vulnerable", "SpotReserveLending.sol"), expectedFindingIds: ["VLM-SEC-ORACLE-SPOT-MANIPULATION-01"], expectedClean: false },
  { split: "VALIDATION", name: "WeirdUSDTToken", sourcePath: path.join(golden, "known-edge", "WeirdUSDTToken.sol"), expectedFindingIds: ["VLM-SEC-ERC-NON-STANDARD-RETURN-01"], expectedClean: false },
  { split: "VALIDATION", name: "SafeMoonExploitModel", sourcePath: path.join(golden, "known-exploited", "SafeMoonExploitModel.sol"), expectedFindingIds: ["VLM-SEC-AUTH-UNPROTECTED-MINT-03"], expectedClean: false },
  { split: "LOCAL_HOLDOUT", name: "FeeOnTransferToken", sourcePath: path.join(golden, "known-edge", "FeeOnTransferToken.sol"), expectedFindingIds: [], expectedClean: true },
  { split: "LOCAL_HOLDOUT", name: "VulnerableInflationVault", sourcePath: path.join(golden, "known-vulnerable", "VulnerableInflationVault.sol"), expectedFindingIds: ["VLM-SEC-DEFI-VAULT-INFLATION-01"], expectedClean: false },
  { split: "LOCAL_HOLDOUT", name: "Eip1967TransparentProxy", sourcePath: path.join(golden, "known-upgradeable", "Eip1967TransparentProxy.sol"), expectedFindingIds: [], expectedClean: true },
];

function simulatedBytecode(source: string): string {
  let hex = "608060405234801561001057600080fd5b50";
  if (source.includes("transferOwnership") && !source.includes("acceptOwnership")) hex += "63f2fde38b1461004057";
  if (source.includes("acceptOwnership")) hex += "6379ba50971461005057";
  if (source.includes("getReserves")) hex += "630902f1ac1461006057";
  if (source.includes("latestRoundData")) hex += "63feaf968c1461007057";
  if (source.includes("deposit") && source.includes("convertToShares")) hex += "6301e5237f1463c6e6f59214636e553f6514";
  if (source.includes("burn(address,uint256)")) hex += "6340c10f1914";
  if (source.includes("selfdestruct")) hex += "5b600033ff";
  if (source.includes("tx.origin")) hex += "5b3260005414";
  const guarded = source.includes("nonReentrant") || source.includes("_status") || source.includes("_ENTERED") || source.includes("ReentrancyGuard");
  const externalCall = source.includes(".call{value:") || source.includes(".call.value(") || source.includes("msg.sender.call");
  if (guarded) hex += "5b600054600260005560006000600060006000336000f1506001600055";
  else if (externalCall) hex += "5b60006000600060006000336000f1506001600055";
  if (source.includes("_IMPLEMENTATION_SLOT") || source.includes("360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc") || source.includes("eip1967")) {
    hex += "7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc54";
  }
  return `0x${hex}5b00`;
}

function percent(numerator: number, denominator: number): number | null {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

let expectedFindingCount = 0;
let findingTp = 0;
let findingFn = 0;
let cleanCriticalHighFp = 0;
let cleanCaseCount = 0;
const rows = [];

for (const item of cases) {
  const source = fs.readFileSync(item.sourcePath, "utf8");
  const audit = executeFullAuditV2({
    contractAddress: `0x${Buffer.from(item.name).toString("hex").padEnd(40, "0").slice(0, 40)}`,
    chainId: "1",
    bytecode: simulatedBytecode(source),
    sourceCode: source,
    contractName: item.name,
    tier: "ADVANCED",
  });
  const detectedIds = new Set(audit.findings.map((finding) => finding.findingId));
  const expectedRows = item.expectedFindingIds.map((findingId) => ({ findingId, detected: detectedIds.has(findingId) }));
  expectedFindingCount += expectedRows.length;
  findingTp += expectedRows.filter((row) => row.detected).length;
  findingFn += expectedRows.filter((row) => !row.detected).length;

  let cleanUnexpectedCriticalHigh: string[] = [];
  if (item.expectedClean) {
    cleanCaseCount += 1;
    cleanUnexpectedCriticalHigh = audit.findings
      .filter((finding) => finding.severity === "critical" || finding.severity === "high")
      .map((finding) => finding.findingId);
    cleanCriticalHighFp += cleanUnexpectedCriticalHigh.length;
  }

  rows.push({
    split: item.split,
    contract: item.name,
    oracleCompleteness: item.expectedClean ? "COMPLETE_NO_CRITICAL_HIGH" : "EXPECTED_FINDINGS_ONLY",
    expectedFindings: expectedRows,
    cleanUnexpectedCriticalHigh,
    detectedFindingCount: audit.findings.length,
  });
}

const recallPercent = percent(findingTp, findingTp + findingFn);
const cleanCriticalHighFalsePositiveCaseRatePercent = percent(rows.filter((row) => row.cleanUnexpectedCriticalHigh.length > 0).length, cleanCaseCount);
const result = {
  schemaVersion: "velmere.r11.finding-level-local-benchmark.v1",
  sourceSha: process.env.GITHUB_SHA || null,
  evidenceClass: "LOCAL_ONLY",
  benchmarkScope: "IN_REPOSITORY_DEV_VALIDATION_LOCAL_HOLDOUT",
  independent: false,
  blind: false,
  externalFrozen: false,
  caseCount: cases.length,
  expectedFindingCount,
  findingLevel: {
    truePositives: findingTp,
    falseNegatives: findingFn,
    falsePositives: null,
    precisionPercent: null,
    recallPercent,
    f1Percent: null,
    precisionStatus: "N/A_INCOMPLETE_POSITIVE_CASE_ORACLE",
  },
  cleanOracle: {
    cleanCaseCount,
    criticalHighFalsePositiveFindings: cleanCriticalHighFp,
    falsePositiveCaseRatePercent: cleanCriticalHighFalsePositiveCaseRatePercent,
  },
  rows,
  historicalExternalFailures: [
    { id: "R9_UMA_PHASE4_OPENZEPPELIN_HIGH", status: "HISTORICAL_FAIL", mutable: false },
    { id: "R9_FEI_OPENZEPPELIN_CRITICAL", status: "HISTORICAL_FAIL", mutable: false },
  ],
  passedLocalRegression: findingFn === 0 && cleanCriticalHighFp === 0,
  productionCredit: false,
  externalBenchmarkCredit: false,
  truthBoundary: "Finding-level recall is computed only over explicit expected finding IDs. Positive-case oracle completeness is not sufficient to classify every additional finding as FP, so precision/F1 are N/A rather than fabricated as 100%. Clean cases provide a complete critical/high negative oracle. This local result never upgrades historical external false negatives or grants blind/external/production credit.",
};

const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0 && process.argv[outputIndex + 1]) {
  const output = path.resolve(process.argv[outputIndex + 1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
if (!result.passedLocalRegression) process.exit(1);
