#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { executePinnedSolcReproduction, type Pass35A4SolcCase, type Pass35A4ToolSpec } from "../../lib/security/audit-a02-solc-reproduction.ts";

const caseInput = JSON.parse(readFileSync("fixtures/pass35/audit-a4/synthetic-solc-case.json", "utf8")) as Pass35A4SolcCase;
const tool = JSON.parse(readFileSync("fixtures/pass35/audit-a4/fake-solc-tool.json", "utf8")) as Pass35A4ToolSpec;
process.env.STRIPE_SECRET_KEY = "sk_live_a66_must_not_reach_compiler";
process.env.NODE_OPTIONS = "--require=/tmp/a66-evil-loader.js";
let assertions = 0;
const check = (condition: unknown, message: string) => { assertions += 1; assert.ok(condition, message); };

const receipt = executePinnedSolcReproduction(caseInput, tool);
check(receipt.compilation.status === "EXECUTED", "fixture compiler should execute");
check(receipt.tool.observedVersion === "0.8.24+commit.e11b9ed9", "version must bind exactly");
check(receipt.tool.executionBoundaryId === "velmere.pass36.external-command-boundary.v4", "shared execution boundary must be recorded");
check(receipt.tool.versionArgsSha256?.startsWith("sha256:") === true, "version args digest must be recorded");
check(receipt.tool.compileArgsSha256?.startsWith("sha256:") === true, "compile args digest must be recorded");
check(receipt.tool.isolatedWorkingDirectory === true && receipt.tool.inheritedEnvironment === false, "compiler execution must be isolated");
check(receipt.comparison.status === "MATCH_AFTER_IMMUTABLE_BINDING_AND_METADATA_STRIP", "immutable and metadata comparison should match");
check(receipt.comparison.immutableBindings.length === 1, "one immutable binding required");
check(receipt.comparison.immutableBindings[0]?.deployedValueHex === "0xbeef", "deployed immutable must be captured");
check(receipt.compilation.compilerWarningCount === 1 && receipt.compilation.compilerErrorCount === 0, "diagnostics should be counted");
check(receipt.compilation.unresolvedLinkReferenceCount === 0, "links must be fully resolved");
check(receipt.blockers.length === 0, "valid synthetic adapter case should have no contract blockers");
check(receipt.paidGateEligible === false && receipt.promotionAllowed === false, "fixture execution must never unlock sale");
check(receipt.receiptSha256 === executePinnedSolcReproduction(caseInput, tool).receiptSha256, "receipt must be deterministic");
check(receipt.inputIdentity.chainProviderReceiptSha256?.startsWith("sha256:") === true, "provider receipt binding required");

const mismatch = structuredClone(caseInput);
mismatch.deployedRuntimeBytecode = "0x60016002beef600455a1647465737441010008";
const mismatchReceipt = executePinnedSolcReproduction(mismatch, tool);
check(mismatchReceipt.comparison.status === "MISMATCH", "core mismatch must fail");
check(mismatchReceipt.blockers.includes("a4_source_to_deployed_bytecode_mismatch"), "mismatch blocker missing");

const badDigest = structuredClone(tool);
badDigest.expectedEntrypointSha256 = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const badDigestReceipt = executePinnedSolcReproduction(caseInput, badDigest);
check(badDigestReceipt.blockers.some((row) => row.includes("entrypoint_digest_mismatch")), "tool digest mismatch must block");
check(badDigestReceipt.compilation.status === "FAILED", "tool mismatch must fail execution");

const badVersion = structuredClone(tool);
badVersion.expectedVersion = "0.8.23+commit.f704f362";
const badVersionReceipt = executePinnedSolcReproduction(caseInput, badVersion);
check(badVersionReceipt.blockers.includes("a4_compiler_version_mismatch"), "compiler version mismatch must block");

const traversal = structuredClone(caseInput);
traversal.sourceFiles[0].path = "../secret.sol";
const traversalReceipt = executePinnedSolcReproduction(traversal, tool);
check(traversalReceipt.blockers.some((row) => row.startsWith("a4_source_path_invalid")), "path traversal must block");

const noChain = structuredClone(caseInput);
noChain.inputClass = "CUSTOMER_SUPPLIED_VERIFIED";
noChain.chainProviderReceiptSha256 = null;
const noChainReceipt = executePinnedSolcReproduction(noChain, tool);
check(noChainReceipt.paidGateEligible === false, "verified label without chain receipt must not unlock paid gate");

console.log(JSON.stringify({ status: "PASS_AUDIT_A4_SOLC_REPRODUCTION", assertions, comparison: receipt.comparison.status, fixtureOnly: receipt.tool.fixtureOnly, paidGateEligible: receipt.paidGateEligible, receiptSha256: receipt.receiptSha256 }, null, 2));
