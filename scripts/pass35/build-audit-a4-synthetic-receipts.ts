#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { executePinnedSolcReproduction, type Pass35A4SolcCase, type Pass35A4ToolSpec } from "../../lib/security/audit-a02-solc-reproduction.ts";
import { collectProviderBoundChainReceipt, type Pass35A4ChainInput } from "../../lib/security/audit-chain-provider-receipt.ts";
import { executeSlitherAdapter } from "./audit-slither-adapter.mjs";

const root = process.cwd();
const solcCase = JSON.parse(readFileSync("fixtures/pass35/audit-a4/synthetic-solc-case.json", "utf8")) as Pass35A4SolcCase;
const solcTool = JSON.parse(readFileSync("fixtures/pass35/audit-a4/fake-solc-tool.json", "utf8")) as Pass35A4ToolSpec;
const chainCase = JSON.parse(readFileSync("fixtures/pass35/audit-a4/synthetic-chain-case.json", "utf8")) as Pass35A4ChainInput;
const slitherCase = JSON.parse(readFileSync("fixtures/pass35/audit-a4/synthetic-slither-case.json", "utf8"));
const slitherTool = JSON.parse(readFileSync("fixtures/pass35/audit-a4/fake-slither-tool.json", "utf8"));
const runtimeCode = solcCase.deployedRuntimeBytecode;
const txHash = chainCase.deploymentTxHash!;
const fakeFetch: typeof fetch = async (_input, init) => {
  const body = JSON.parse(String(init?.body ?? "{}"));
  let result: unknown;
  if (body.method === "eth_chainId") result = "0x1";
  else if (body.method === "eth_blockNumber") result = "0x10";
  else if (body.method === "eth_getCode") result = runtimeCode;
  else if (body.method === "eth_getTransactionReceipt") result = { transactionHash: txHash, status: "0x1", blockNumber: "0x10", contractAddress: chainCase.contractAddress };
  else if (body.method === "eth_getTransactionByHash") result = { hash: txHash, blockNumber: "0x10", to: null };
  else result = null;
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }), { status: 200, headers: { "content-type": "application/json" } });
};
const chainReceipt = await collectProviderBoundChainReceipt(chainCase, { rpcUrl: "http://127.0.0.1:8545/rpc", fetchImpl: fakeFetch });
const boundSolcCase = structuredClone(solcCase);
boundSolcCase.chainProviderReceiptSha256 = chainReceipt.receiptSha256;
const solcReceipt = executePinnedSolcReproduction(boundSolcCase, solcTool, { rootPath: root });
const slitherReceipt = executeSlitherAdapter({ rootPath: root, caseInput: slitherCase, toolSpec: slitherTool });
const outputs = [
  ["fixtures/pass35/audit-a4/PASS35_A4_CHAIN_SYNTHETIC_RECEIPT.json", chainReceipt],
  ["fixtures/pass35/audit-a4/PASS35_A4_SOLC_SYNTHETIC_RECEIPT.json", solcReceipt],
  ["fixtures/pass35/audit-a4/PASS35_A4_SLITHER_SYNTHETIC_RECEIPT.json", slitherReceipt],
] as const;
for (const [filePath, value] of outputs) writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: "PASS_BUILD_AUDIT_A4_SYNTHETIC_RECEIPTS", receipts: outputs.map(([filePath, value]) => ({ filePath, receiptSha256: value.receiptSha256 })), paidGateEligible: false }, null, 2));
