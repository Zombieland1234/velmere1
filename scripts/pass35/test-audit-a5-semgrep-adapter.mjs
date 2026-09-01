#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { executeSemgrepAdapter } from "./audit-semgrep-adapter.mjs";
const rootPath = process.cwd();
const caseInput = JSON.parse(readFileSync("fixtures/pass35/audit-a5/synthetic-semgrep-case.json", "utf8"));
const toolSpec = JSON.parse(readFileSync("fixtures/pass35/audit-a5/fake-semgrep-tool.json", "utf8"));
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const receipt = executeSemgrepAdapter({ rootPath, caseInput, toolSpec });
check(receipt.status === "VERIFIED", "fixture adapter should verify");
check(receipt.assuranceClass === "LOCAL_CONTRACT", "fixture assurance invalid");
check(receipt.realCaseExecution === false, "fixture got real-case credit");
check(receipt.paidGateEligible === false && receipt.fullAuditClaimAllowed === false, "fixture unlocked paid/full audit");
check(receipt.findingCount === 2, "finding count invalid");
check(receipt.severityCounts.high === 1 && receipt.severityCounts.medium === 1, "severity normalization invalid");
check(receipt.normalizedFindings[0].checkId === "velmere.solidity.tx-origin-auth", "finding normalization invalid");
check(receipt.rulesetSha256 === sha256(readFileSync(caseInput.rulesetPath)), "ruleset binding invalid");
check(receipt.inputBundleSha256 === sha256(readFileSync(caseInput.targetPath)), "target binding invalid");
check(/^sha256:[a-f0-9]{64}$/u.test(receipt.rawOutputSha256), "raw output digest invalid");
check(/^sha256:[a-f0-9]{64}$/u.test(receipt.receiptSha256), "receipt digest invalid");

const renamed = executeSemgrepAdapter({ rootPath, caseInput: { ...caseInput, inputClass: "CUSTOMER_SUPPLIED_VERIFIED", caseRef: "AUD-PASS35-A5-SEMGREP-RENAMED" }, toolSpec });
check(renamed.realCaseExecution === false, "renamed fixture got real credit");
check(renamed.paidGateEligible === false, "renamed fixture unlocked paid gate");

const badRules = executeSemgrepAdapter({ rootPath, caseInput: { ...caseInput, caseRef: "AUD-PASS35-A5-SEMGREP-BADRULE", rulesetSha256: `sha256:${"c".repeat(64)}` }, toolSpec });
check(badRules.blockers.includes("a5_semgrep_ruleset_digest_mismatch"), "ruleset mismatch not blocked");

const badTarget = executeSemgrepAdapter({ rootPath, caseInput: { ...caseInput, caseRef: "AUD-PASS35-A5-SEMGREP-BADTARGET", targetPath: "../outside.sol" }, toolSpec });
check(badTarget.blockers.some((row) => row.startsWith("a5_semgrep_target_outside_root")), "target path traversal not blocked");

const nativeWithoutDigest = executeSemgrepAdapter({ rootPath, caseInput, toolSpec: { ...toolSpec, executionMode: "NATIVE_BINARY", fixtureOnly: false, expectedExecutableSha256: null } });
check(nativeWithoutDigest.blockers.includes("a5_semgrep_executable_digest_invalid"), "native executable digest requirement missing");

const badEntry = executeSemgrepAdapter({ rootPath, caseInput, toolSpec: { ...toolSpec, expectedEntrypointSha256: `sha256:${"d".repeat(64)}` } });
check(badEntry.blockers.includes("a5_semgrep_entrypoint_digest_mismatch"), "entrypoint mismatch not blocked");

check(receipt.limitations.some((row) => row.includes("No official Semgrep")), "truth limitation missing");
console.log(JSON.stringify({ status: "PASS_AUDIT_A5_SEMGREP_ADAPTER", assertions, findingCount: receipt.findingCount, officialSemgrepExecuted: false, paidGateEligible: false }, null, 2));
