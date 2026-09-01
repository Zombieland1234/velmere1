#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { executeForgeAdapter } from "./audit-forge-adapter.mjs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const caseInput = readJson("fixtures/pass35/audit-a6/synthetic-forge-case.json");
const toolSpec = readJson("fixtures/pass35/audit-a6/fake-forge-tool.json");
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };

const receipt = executeForgeAdapter({ caseInput, toolSpec });
check(receipt.status === "VERIFIED", "fixture Forge adapter should verify");
check(receipt.toolVersion === "1.2.3", "Forge version must bind");
check(receipt.testCount === 4 && receipt.passCount === 4 && receipt.failCount === 0 && receipt.skipCount === 0, "Forge test summary invalid");
check(receipt.tests.every((row) => row.status === "passed" && row.testId.includes("::")), "normalized test rows invalid");
check(receipt.projectFileCount === 3, "project file inventory invalid");
check(receipt.binaryOrImageSha256?.startsWith("sha256:") && receipt.entrypointSha256?.startsWith("sha256:"), "binary/entrypoint binding missing");
check(receipt.rawOutputSha256?.startsWith("sha256:") && receipt.versionOutputSha256?.startsWith("sha256:"), "raw/version binding missing");
check(receipt.realCaseExecution === false && receipt.paidGateEligible === false, "fixture Forge received real/paid credit");
check(receipt.fullAuditClaimAllowed === false && receipt.promotionAllowed === false, "fixture Forge unlocked claim/promotion");
check(receipt.receiptSha256 === executeForgeAdapter({ caseInput, toolSpec }).receiptSha256, "Forge receipt not deterministic");

const badBundle = structuredClone(caseInput);
badBundle.sourceBundleSha256 = `sha256:${"f".repeat(64)}`;
check(executeForgeAdapter({ caseInput: badBundle, toolSpec }).blockers.includes("a6_forge_source_bundle_digest_mismatch"), "source bundle mismatch not blocked");

const traversal = structuredClone(caseInput);
traversal.projectPath = "../private";
check(executeForgeAdapter({ caseInput: traversal, toolSpec }).blockers.some((row) => row.startsWith("a6_forge_project_outside_root")), "project traversal not blocked");

const fakeReal = structuredClone(caseInput);
fakeReal.inputClass = "CUSTOMER_SUPPLIED_VERIFIED";
const fakeRealReceipt = executeForgeAdapter({ caseInput: fakeReal, toolSpec });
check(fakeRealReceipt.realCaseExecution === false && fakeRealReceipt.paidGateEligible === false, "fixture relabeling produced real credit");

const badEntrypoint = structuredClone(toolSpec);
badEntrypoint.expectedEntrypointSha256 = `sha256:${"e".repeat(64)}`;
check(executeForgeAdapter({ caseInput, toolSpec: badEntrypoint }).blockers.includes("a6_forge_entrypoint_digest_mismatch"), "entrypoint mismatch not blocked");

const failureSpec = structuredClone(toolSpec);
failureSpec.entrypointPath = "fixtures/pass35/audit-a6/fake-forge-fail.mjs";
failureSpec.expectedEntrypointSha256 = sha256(readFileSync(failureSpec.entrypointPath));
const failedReceipt = executeForgeAdapter({ caseInput, toolSpec: failureSpec });
check(failedReceipt.status === "BLOCKED" && failedReceipt.failCount === 1, "failed Forge test not reflected");
check(failedReceipt.blockers.includes("a6_forge_test_failure"), "failed Forge test blocker missing");

const nativeWithoutHash = structuredClone(toolSpec);
nativeWithoutHash.executionMode = "NATIVE_BINARY";
nativeWithoutHash.fixtureOnly = false;
delete nativeWithoutHash.entrypointPath;
delete nativeWithoutHash.expectedEntrypointSha256;
delete nativeWithoutHash.expectedExecutableSha256;
check(executeForgeAdapter({ caseInput, toolSpec: nativeWithoutHash }).blockers.includes("a6_forge_executable_digest_invalid"), "native executable hash not required");

console.log(JSON.stringify({ status: "PASS_AUDIT_A6_FORGE_ADAPTER", assertions, tests: receipt.testCount, fixtureOnly: true, paidGateEligible: false, receiptSha256: receipt.receiptSha256 }, null, 2));
