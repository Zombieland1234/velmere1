#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { executeSlitherAdapter } from "./audit-slither-adapter.mjs";

const caseInput = JSON.parse(readFileSync("fixtures/pass35/audit-a4/synthetic-slither-case.json", "utf8"));
const toolSpec = JSON.parse(readFileSync("fixtures/pass35/audit-a4/fake-slither-tool.json", "utf8"));
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const receipt = executeSlitherAdapter({ caseInput, toolSpec });
check(receipt.status === "VERIFIED", "fixture adapter should verify its contract");
check(receipt.toolVersion === "0.11.5", "version should bind");
check(receipt.findingCount === 2, "two normalized findings required");
check(receipt.severityCounts.high === 1 && receipt.severityCounts.medium === 1, "severity counts mismatch");
check(receipt.binaryOrImageSha256?.startsWith("sha256:") === true, "binary digest required");
check(receipt.entrypointSha256?.startsWith("sha256:") === true, "entrypoint digest required");
check(receipt.rawOutputSha256?.startsWith("sha256:") === true, "raw output digest required");
check(receipt.realCaseExecution === false && receipt.paidGateEligible === false, "fixture tool must not get real/paid credit");
check(receipt.fullAuditClaimAllowed === false && receipt.promotionAllowed === false, "full audit/promotion must stay blocked");
check(receipt.receiptSha256 === executeSlitherAdapter({ caseInput, toolSpec }).receiptSha256, "receipt must be deterministic");

const badDigest = structuredClone(toolSpec);
badDigest.expectedEntrypointSha256 = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const badDigestReceipt = executeSlitherAdapter({ caseInput, toolSpec: badDigest });
check(badDigestReceipt.blockers.includes("a4_slither_entrypoint_digest_mismatch"), "entrypoint digest mismatch must block");

const traversal = structuredClone(caseInput);
traversal.targetPath = "../secret.sol";
const traversalReceipt = executeSlitherAdapter({ caseInput: traversal, toolSpec });
check(traversalReceipt.blockers.some((row) => row.startsWith("a4_slither_target_outside_root")), "target traversal must block");

const fakeReal = structuredClone(caseInput);
fakeReal.inputClass = "CUSTOMER_SUPPLIED_VERIFIED";
const fakeRealReceipt = executeSlitherAdapter({ caseInput: fakeReal, toolSpec });
check(fakeRealReceipt.realCaseExecution === false && fakeRealReceipt.paidGateEligible === false, "fixture executable cannot become real by relabeling input");

console.log(JSON.stringify({ status: "PASS_AUDIT_A4_SLITHER_ADAPTER", assertions, findingCount: receipt.findingCount, fixtureOnly: true, paidGateEligible: receipt.paidGateEligible, receiptSha256: receipt.receiptSha256 }, null, 2));
