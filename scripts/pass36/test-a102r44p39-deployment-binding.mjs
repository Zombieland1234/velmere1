#!/usr/bin/env node
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { analyzeSolidityCompilerAst } from "../../lib/security/solidity-compiler-ast-runtime.mjs";
import {
  buildAuditCompilerDeploymentBinding,
  buildAuditEip1967ProxyBinding,
  EIP1967_IMPLEMENTATION_SLOT,
  verifyAuditCompilerDeploymentBinding,
  verifyAuditEip1967ProxyBinding,
} from "../../lib/security/audit-compiler-deployment-binding.mjs";

const root = process.argv[2];
const require = createRequire(pathToFileURL(`${root}/package.json`));
const solc = require("solc");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const sha256 = (value) => `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
const reseal = (value, digestKey) => {
  const copy = structuredClone(value);
  delete copy[digestKey];
  copy[digestKey] = sha256(stable(copy));
  return copy;
};

const sourceFiles = [{
  path: "Binding.sol",
  content: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24; contract Implementation { address public owner; function initialize(address next) external { owner=next; } } contract ProxyShell { fallback() external payable {} }`,
}];
const evidence = analyzeSolidityCompilerAst({ solc, sourceFiles, observedAt: "2026-08-09T00:00:00.000Z" });
const impl = evidence.bytecodeArtifacts.find((row) => row.contractName === "Implementation");
const proxy = evidence.bytecodeArtifacts.find((row) => row.contractName === "ProxyShell");
const address = "0x1111111111111111111111111111111111111111";
const binding = buildAuditCompilerDeploymentBinding({
  evidence,
  sourceFiles,
  sourcePath: impl.sourcePath,
  contractName: impl.contractName,
  deployedRuntimeBytecode: `0x${impl.deployedBytecode}`,
  chainId: "31337",
  address,
  blockNumber: 7,
});
const bad = buildAuditCompilerDeploymentBinding({
  evidence,
  sourceFiles,
  sourcePath: impl.sourcePath,
  contractName: impl.contractName,
  deployedRuntimeBytecode: `0x${impl.deployedBytecode.slice(0, -2)}00`,
  chainId: "31337",
  address,
  blockNumber: 7,
});
const word = `0x${"0".repeat(24)}${address.slice(2)}`;
const proxyBinding = buildAuditEip1967ProxyBinding({
  implementationBinding: binding,
  proxyAddress: "0x2222222222222222222222222222222222222222",
  implementationAddress: address,
  implementationSlot: EIP1967_IMPLEMENTATION_SLOT,
  rawImplementationStorageWord: word,
  proxyRuntimeBytecode: `0x${proxy.deployedBytecode}`,
  chainId: "31337",
  blockNumber: 7,
});
const tamperedProxy = buildAuditEip1967ProxyBinding({
  implementationBinding: binding,
  proxyAddress: "0x2222222222222222222222222222222222222222",
  implementationAddress: "0x3333333333333333333333333333333333333333",
  implementationSlot: EIP1967_IMPLEMENTATION_SLOT,
  rawImplementationStorageWord: word,
  proxyRuntimeBytecode: `0x${proxy.deployedBytecode}`,
  chainId: "31337",
  blockNumber: 7,
});
const forgedBinding = structuredClone(bad);
forgedBinding.status = "EXACT_MATCH";
forgedBinding.blockers = [];
forgedBinding.creditBoundary.localSuppliedBytecodeBindingCredit = true;
const forgedBindingResealed = reseal(forgedBinding, "bindingSha256");
const forgedProxy = structuredClone(tamperedProxy);
forgedProxy.status = "BOUND_LOCAL_EIP1967_SNAPSHOT";
forgedProxy.blockers = [];
forgedProxy.creditBoundary.localSuppliedProxyBindingCredit = true;
const forgedProxyResealed = reseal(forgedProxy, "proxyBindingSha256");

const checks = [
  ["binding-valid", verifyAuditCompilerDeploymentBinding(binding)],
  ["binding-exact", binding.status === "EXACT_MATCH"],
  ["binding-local-only", binding.creditBoundary.realChainObservationCredit === false],
  ["mismatch-rejected", bad.status === "MISMATCH" && bad.blockers.includes("runtime_bytecode_mismatch")],
  ["forged-resealed-binding-rejected", verifyAuditCompilerDeploymentBinding(forgedBindingResealed) === false],
  ["proxy-valid", verifyAuditEip1967ProxyBinding(proxyBinding)],
  ["proxy-bound", proxyBinding.status === "BOUND_LOCAL_EIP1967_SNAPSHOT"],
  ["proxy-local-only", proxyBinding.creditBoundary.realChainObservationCredit === false],
  ["proxy-tamper-blocked", tamperedProxy.status === "BLOCKED" && tamperedProxy.blockers.includes("implementation_slot_address_mismatch")],
  ["forged-resealed-proxy-rejected", verifyAuditEip1967ProxyBinding(forgedProxyResealed) === false],
];
const failed = checks.filter(([, ok]) => !ok);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p39.deployment-binding-test.v2",
  status: failed.length ? "FAIL_R44P39_DEPLOYMENT_BINDING" : "PASS_R44P39_DEPLOYMENT_BINDING",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  rows: checks.map(([id, passed]) => ({ id, passed })),
}, null, 2));
if (failed.length) process.exit(1);
