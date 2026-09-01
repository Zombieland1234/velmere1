#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { collectProviderBoundChainReceipt, type Pass35A4ChainInput } from "../../lib/security/audit-chain-provider-receipt.ts";

const base = JSON.parse(readFileSync("fixtures/pass35/audit-a4/synthetic-chain-case.json", "utf8")) as Pass35A4ChainInput;
const runtimeCode = "0x60016002beef600355a1647465737441010008";
const txHash = base.deploymentTxHash!;
let mode: "ok" | "wrong-chain" | "empty-code" | "wrong-address" = "ok";
const server = createServer(async (request, response) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  let result: unknown;
  if (body.method === "eth_chainId") result = mode === "wrong-chain" ? "0x5" : "0x1";
  else if (body.method === "eth_blockNumber") result = "0x10";
  else if (body.method === "eth_getCode") result = mode === "empty-code" ? "0x" : runtimeCode;
  else if (body.method === "eth_getTransactionReceipt") result = { transactionHash: txHash, status: "0x1", blockNumber: "0x10", contractAddress: mode === "wrong-address" ? "0x2222222222222222222222222222222222222222" : base.contractAddress };
  else if (body.method === "eth_getTransactionByHash") result = { hash: txHash, blockNumber: "0x10", to: null };
  else result = null;
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("test_server_address_invalid");
const rpcUrl = `http://127.0.0.1:${address.port}/rpc`;
let assertions = 0;
const check = (condition: unknown, message: string) => { assertions += 1; assert.ok(condition, message); };
try {
  mode = "ok";
  const receipt = await collectProviderBoundChainReceipt(base, { rpcUrl });
  check(receipt.blockers.length === 0, "local provider contract should pass");
  check(receipt.observations.observedChainIdDecimal === "1", "chain id must bind");
  check(receipt.observations.observedBlockNumberDecimal === "16", "block number must bind");
  check(receipt.observations.runtimeBytecode === runtimeCode, "runtime code mismatch");
  check(receipt.observations.runtimeByteLength === 19, "runtime byte length mismatch");
  check(receipt.rpc.methodCount === 5, "exact five RPC methods required");
  check(receipt.rpc.rawResponseRootSha256?.startsWith("sha256:") === true, "response root required");
  check(receipt.realProviderExecution === false && receipt.paidGateEligible === false, "local fixture provider must not get external credit");
  check(receipt.provider.endpointIdentitySha256?.startsWith("sha256:") === true, "endpoint identity should be redacted to digest");
  check(!JSON.stringify(receipt).includes(String(address.port)), "receipt must not expose raw endpoint/port");

  mode = "wrong-chain";
  const wrongChain = await collectProviderBoundChainReceipt(base, { rpcUrl });
  check(wrongChain.blockers.includes("a4_rpc_chain_id_mismatch"), "wrong chain must block");

  mode = "empty-code";
  const emptyCode = await collectProviderBoundChainReceipt(base, { rpcUrl });
  check(emptyCode.blockers.includes("a4_rpc_runtime_bytecode_missing"), "empty runtime code must block");

  mode = "wrong-address";
  const wrongAddress = await collectProviderBoundChainReceipt(base, { rpcUrl });
  check(wrongAddress.blockers.includes("a4_rpc_deployment_receipt_contract_mismatch"), "deployment address mismatch must block");

  const credentials = await collectProviderBoundChainReceipt(base, { rpcUrl: `http://user:secret@127.0.0.1:${address.port}/rpc` });
  check(credentials.blockers.includes("a4_rpc_url_credentials_forbidden"), "credentials in URL must block before request");

  const realOnLoopback = structuredClone(base);
  realOnLoopback.inputClass = "CUSTOMER_SUPPLIED_VERIFIED";
  realOnLoopback.provider.endpointClass = "PRODUCTION";
  const realLoopback = await collectProviderBoundChainReceipt(realOnLoopback, { rpcUrl });
  check(realLoopback.blockers.includes("a4_real_rpc_requires_non_loopback_https"), "real case on loopback HTTP must block");

  console.log(JSON.stringify({ status: "PASS_AUDIT_A4_CHAIN_PROVIDER", assertions, methods: receipt.rpc.methods, paidGateEligible: receipt.paidGateEligible, receiptSha256: receipt.receiptSha256 }, null, 2));
} finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
