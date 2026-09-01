import assert from "node:assert/strict";
import { executeBoundedPathAnalysis } from "../../lib/security/audit-a06-bounded-path-analysis.ts";

let assertions = 0;
const check = (condition: unknown, message: string) => { assertions += 1; assert.ok(condition, message); };
const base = {
  schemaVersion: "velmere.pass35.audit-a5-a06-case.v1" as const,
  inputClass: "SYNTHETIC_OFFLINE" as const,
  caseRef: "AUD-PASS35-A5-A06-0001",
  observedAt: "2026-07-22T19:00:00.000Z",
  chainId: "1",
  contractAddress: `0x${"1".repeat(40)}`,
  deployedRuntimeBytecode: "0x600457005b60006000fd",
  chainProviderReceiptSha256: `sha256:${"a".repeat(64)}`,
  limits: { maxPaths: 32, maxDepth: 16, maxVisitsPerBlock: 2 },
};
const receipt = executeBoundedPathAnalysis(base);
check(receipt.execution.status === "VERIFIED_LOCAL_BOUNDED_CFG", "A06 should execute");
check(receipt.execution.assuranceClass === "LOCAL_BOUNDED_CFG_NOT_SYMBOLIC", "assurance boundary invalid");
check(receipt.execution.realCaseExecution === false, "synthetic case received real credit");
check(receipt.execution.paidGateEligible === false && receipt.execution.fullAuditClaimAllowed === false, "paid/full audit unlocked");
check(receipt.decoder.instructionCount === 7, "push-aware instruction count invalid");
check(receipt.decoder.pushInstructionCount === 3, "push count invalid");
check(receipt.cfg.blockCount === 3, "block count invalid");
check(receipt.cfg.edgeCount === 2, "edge count invalid");
check(receipt.cfg.conditionalJumpCount === 1, "conditional jump missing");
check(receipt.cfg.unresolvedDynamicJumpCount === 0, "static jump marked dynamic");
check(receipt.paths.completedPathCount === 2, "expected two structural paths");
check(receipt.paths.uniqueTerminalKinds.includes("STOP") && receipt.paths.uniqueTerminalKinds.includes("REVERT"), "terminal paths invalid");
check(receipt.cfg.reachableCoveragePercent === 100, "reachable coverage invalid");
check(/^sha256:[a-f0-9]{64}$/u.test(receipt.rawAnalysisSha256), "raw analysis digest invalid");
check(/^sha256:[a-f0-9]{64}$/u.test(receipt.receiptSha256), "receipt digest invalid");

const pushData = executeBoundedPathAnalysis({ ...base, caseRef: "AUD-PASS35-A5-A06-PUSHDATA", deployedRuntimeBytecode: "0x605b00" });
check(pushData.cfg.blockCount === 1, "PUSH data was misread as JUMPDEST");
check(pushData.decoder.instructionCount === 2, "PUSH data decoder invalid");

const dynamic = executeBoundedPathAnalysis({ ...base, caseRef: "AUD-PASS35-A5-A06-DYNAMIC", deployedRuntimeBytecode: "0x3556" });
check(dynamic.cfg.unresolvedDynamicJumpCount === 1, "dynamic jump not identified");
check(dynamic.paths.uniqueTerminalKinds.includes("UNRESOLVED_DYNAMIC_JUMP"), "dynamic path terminal missing");

const risky = executeBoundedPathAnalysis({ ...base, caseRef: "AUD-PASS35-A5-A06-RISKY", deployedRuntimeBytecode: "0x60006000f4ff" });
check(risky.riskSignals.some((row) => row.opcode === "DELEGATECALL" && row.severity === "medium"), "delegatecall signal missing");
check(risky.riskSignals.some((row) => row.opcode === "SELFDESTRUCT" && row.severity === "high"), "selfdestruct signal missing");
check(risky.riskSignals.every((row) => row.evidence.includes("not inferred")), "risk signal overclaims exploitability");

const malformed = executeBoundedPathAnalysis({ ...base, caseRef: "AUD-PASS35-A5-A06-BADHEX", deployedRuntimeBytecode: "0x123" });
check(malformed.execution.status === "BLOCKED", "malformed bytecode not blocked");
check(malformed.blockers.includes("a5_a06_runtime_bytecode_invalid"), "malformed bytecode blocker missing");

const badLimit = executeBoundedPathAnalysis({ ...base, caseRef: "AUD-PASS35-A5-A06-BADLIMIT", limits: { maxPaths: 0, maxDepth: 16, maxVisitsPerBlock: 2 } });
check(badLimit.blockers.includes("a5_a06_max_paths_invalid"), "invalid path limit not blocked");

const noProvider = executeBoundedPathAnalysis({ ...base, inputClass: "CUSTOMER_SUPPLIED_VERIFIED", caseRef: "AUD-PASS35-A5-A06-NOPROVIDER", chainProviderReceiptSha256: null });
check(noProvider.execution.realCaseExecution === false, "verified label without provider received real credit");
check(noProvider.execution.paidGateEligible === false, "verified label unlocked paid gate");

const realBound = executeBoundedPathAnalysis({ ...base, inputClass: "CUSTOMER_SUPPLIED_VERIFIED", caseRef: "AUD-PASS35-A5-A06-BOUNDCASE" });
check(realBound.execution.realCaseExecution === true, "provider-bound non-synthetic execution flag missing");
check(realBound.execution.paidGateEligible === false, "provider-bound local CFG unlocked paid gate");
check(realBound.limitations.some((row) => row.includes("does not solve symbolic constraints")), "symbolic limitation missing");

console.log(JSON.stringify({
  status: "PASS_AUDIT_A5_A06_BOUNDED_PATH",
  assertions,
  blockCount: receipt.cfg.blockCount,
  paths: receipt.paths.completedPathCount,
  paidGateEligible: false,
  fullAuditClaimAllowed: false,
}, null, 2));
