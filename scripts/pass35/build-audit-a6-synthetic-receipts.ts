#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { executeForgeAdapter } from "./audit-forge-adapter.mjs";
import { executeModelFuzzInvariants, type Pass35A6A08Case } from "../../lib/security/audit-a08-model-fuzz.ts";

const forgeCase = JSON.parse(readFileSync("fixtures/pass35/audit-a6/synthetic-forge-case.json", "utf8"));
const forgeTool = JSON.parse(readFileSync("fixtures/pass35/audit-a6/fake-forge-tool.json", "utf8"));
const forgeReceipt = executeForgeAdapter({ caseInput: forgeCase, toolSpec: forgeTool });
writeFileSync("fixtures/pass35/audit-a6/PASS35_A6_FORGE_SYNTHETIC_RECEIPT.json", `${JSON.stringify(forgeReceipt, null, 2)}\n`);
const fuzzCase = JSON.parse(readFileSync("fixtures/pass35/audit-a6/synthetic-a08-model-fuzz-case.json", "utf8")) as Pass35A6A08Case;
fuzzCase.a07ExactTestReceiptSha256 = forgeReceipt.receiptSha256;
writeFileSync("fixtures/pass35/audit-a6/synthetic-a08-model-fuzz-case.json", `${JSON.stringify(fuzzCase, null, 2)}\n`);
const fuzzReceipt = executeModelFuzzInvariants(fuzzCase);
writeFileSync("fixtures/pass35/audit-a6/PASS35_A6_A08_MODEL_FUZZ_SYNTHETIC_RECEIPT.json", `${JSON.stringify(fuzzReceipt, null, 2)}\n`);
console.log(JSON.stringify({
  status: "PASS35_A6_SYNTHETIC_RECEIPTS_BUILT",
  forge: { status: forgeReceipt.status, tests: forgeReceipt.testCount, receiptSha256: forgeReceipt.receiptSha256 },
  a08: { status: fuzzReceipt.execution.status, iterations: fuzzReceipt.iterations, invariantChecks: fuzzReceipt.invariantChecks, receiptSha256: fuzzReceipt.receiptSha256 },
  paidGateEligible: false,
}, null, 2));
