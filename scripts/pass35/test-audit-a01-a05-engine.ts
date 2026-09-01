#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { executePass35AuditA01A05, type Pass35AuditA01A05Input } from "../../lib/security/audit-a01-a05-engine.ts";

const fixture = JSON.parse(readFileSync("fixtures/pass35/audit-a01-a05/synthetic-risky-upgradeable.json", "utf8")) as Pass35AuditA01A05Input;
const report = executePass35AuditA01A05(fixture);
let assertions = 0;
const check = (condition: unknown, message: string) => { assertions += 1; assert.ok(condition, message); };

check(report.controls.A01.state === "VERIFIED_LOCAL_STRUCTURE", "A01 local structure should verify");
check(report.controls.A01.passEligible === false, "synthetic A01 must not receive real-case credit");
check(report.controls.A02.state === "VERIFIED_METADATA_STRIPPED_BYTECODE", "A02 should match after strict metadata strip");
check(report.bytecodeComparison.status === "MATCH_AFTER_SOLIDITY_METADATA_STRIP", "bytecode status mismatch");
check(report.bytecodeComparison.compiledMetadataBytes === 8 && report.bytecodeComparison.deployedMetadataBytes === 8, "metadata length should be 8 bytes");
check(report.controls.A03.state === "GENERATED_LOCAL_HEURISTIC_NOT_REVIEWED", "A03 preliminary model should execute");
check(report.controls.A04.state === "GENERATED_LOCAL_HEURISTIC_NOT_REVIEWED", "A04 map should execute");
check(report.controls.A05.state === "EXECUTED_LOCAL_HEURISTIC_NOT_BENCHMARKED", "A05 local lanes should execute");
check(report.controls.A05.passEligible === false, "A05 local heuristics must not pass paid gate");
check(report.staticFamilies.length === 2, "exactly two local static lanes required");
check(report.staticFamilies.every((family) => family.status === "EXECUTED" && family.paidGateEligible === false), "static lanes must be executed but not paid eligible");
check(report.findings.some((finding) => finding.title.includes("tx.origin")), "tx.origin should be detected");
check(report.findings.some((finding) => finding.title.includes("Delegatecall")), "source delegatecall should be detected");
check(report.findings.some((finding) => finding.title.includes("DELEGATECALL opcode")), "bytecode delegatecall should be detected");
check(report.findings.some((finding) => finding.title.includes("SELFDESTRUCT opcode")), "bytecode selfdestruct should be detected");
check(report.findings.some((finding) => finding.title.includes("Privileged ABI surface: upgradeTo")), "upgrade ABI surface should be detected");
check(report.privilegeMap.some((row) => row.category === "upgrade"), "upgrade privilege category required");
check(report.threatModel.trustBoundaries.includes("proxy storage -> implementation code"), "proxy trust boundary required");
check(report.summary.paidDeliveryAllowed === false && report.summary.fullAuditClaimAllowed === false, "sale/full-audit must remain blocked");
check(report.inputIdentity.sourceBundleSha256?.startsWith("sha256:") === true, "source digest must be canonical");
check(report.reportSha256 === executePass35AuditA01A05(fixture).reportSha256, "report must be deterministic");

const mismatch = structuredClone(fixture);
mismatch.deployedRuntimeBytecode = "0x60013560e01c80633659cfe6146016575b60006000f4600055ff";
const mismatchReport = executePass35AuditA01A05(mismatch);
check(mismatchReport.bytecodeComparison.status === "MISMATCH", "bytecode mismatch must fail closed");
check(mismatchReport.controls.A02.passEligible === false && mismatchReport.controls.A02.blockers.includes("a02_runtime_bytecode_mismatch"), "A02 mismatch blocker missing");

const traversal = structuredClone(fixture);
traversal.sourceFiles[0].path = "../secret.sol";
const traversalReport = executePass35AuditA01A05(traversal);
check(traversalReport.controls.A01.blockers.some((blocker) => blocker.startsWith("a01_source_path_invalid")), "path traversal must be rejected");

const invalidAbi = structuredClone(fixture);
invalidAbi.abi = [{ type: "function", name: "not valid name", inputs: [] }];
const invalidAbiReport = executePass35AuditA01A05(invalidAbi);
check(invalidAbiReport.controls.A01.blockers.some((blocker) => blocker.startsWith("a01_abi_function_name_invalid")), "invalid ABI name must be rejected");

const verified = structuredClone(fixture);
verified.inputClass = "CUSTOMER_SUPPLIED_VERIFIED";
verified.sourceProvenance.verifiedSource = true;
const verifiedReport = executePass35AuditA01A05(verified);
check(verifiedReport.controls.A01.passEligible === true && verifiedReport.controls.A02.passEligible === true, "verified input may receive A01/A02 local pass eligibility");
check(verifiedReport.controls.A05.passEligible === false, "verified input cannot turn heuristic A05 into paid proof");

const pushData = structuredClone(fixture);
pushData.compiledRuntimeBytecode = `0x7f${"ff".repeat(32)}00`;
pushData.deployedRuntimeBytecode = pushData.compiledRuntimeBytecode;
const pushDataReport = executePass35AuditA01A05(pushData);
check(!pushDataReport.findings.some((finding) => finding.title.includes("SELFDESTRUCT opcode")), "PUSH data must not be decoded as opcode");

console.log(JSON.stringify({
  status: "PASS",
  assertions,
  controlStates: Object.fromEntries(Object.entries(report.controls).map(([id, value]) => [id, value.state])),
  findings: report.summary.findings,
  staticFamilies: report.staticFamilies.map((family) => family.familyId),
  bytecodeComparison: report.bytecodeComparison.status,
  paidDeliveryAllowed: false,
  fullAuditClaimAllowed: false,
}, null, 2));
