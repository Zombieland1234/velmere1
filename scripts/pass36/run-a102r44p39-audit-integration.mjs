#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { analyzeSolidityCompilerAst } from "../../lib/security/solidity-compiler-ast-runtime.mjs";
import { buildAuditCompilerAstReviewLayer } from "../../lib/security/audit-compiler-ast-review-layer.mjs";
import { buildAuditCompilerDeploymentBinding, buildAuditEip1967ProxyBinding, EIP1967_IMPLEMENTATION_SLOT } from "../../lib/security/audit-compiler-deployment-binding.mjs";
import { buildAuditCompilerCanonicalPacket, verifyAuditCompilerPacketSet } from "../../lib/security/audit-compiler-canonical-packet.mjs";
import { R44P38_BENCHMARK_CASES, buildR44P38CaseSources } from "../../fixtures/pass36/r44p38-compiler-ast/benchmark-cases.mjs";
import { R44P39_PROTOCOL_HOLDOUT } from "../../fixtures/pass36/r44p39-protocol-holdout.mjs";

const root = path.resolve(process.argv[2] ?? process.cwd());
const solcRoot = path.resolve(process.argv[3] ?? "");
const out = path.resolve(process.argv[4] ?? path.join(root, "artifacts/pass36/r44p39-audit-integration"));
const require = createRequire(pathToFileURL(path.join(solcRoot, "package.json")));
const solc = require("solc");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "packets"), { recursive: true });
fs.mkdirSync(path.join(out, "cases"), { recursive: true });
const selected = R44P38_BENCHMARK_CASES.filter((row) => row.split === "DISCLOSED_LOCAL_TUNING");
const rows = [];
for (const row of selected) {
  const bundle = buildR44P38CaseSources(row, true, "baseline");
  const sourceFiles = Object.entries(bundle.sources).map(([sourcePath, content]) => ({ path: sourcePath, content }));
  const evidence = analyzeSolidityCompilerAst({ solc, sourceFiles, observedAt: "2026-08-09T00:00:00.000Z", storageComparisonPairs: bundle.storagePairs });
  const candidate = evidence.bytecodeArtifacts.find((item) => /Risk|Bad/u.test(item.contractName) && item.deployedBytecode.length > 0) ?? evidence.bytecodeArtifacts.find((item) => item.deployedBytecode.length > 0);
  if (!candidate) throw new Error(`compiled_candidate_missing:${row.caseId}`);
  const address = `0x${sha256(row.caseId).slice(0, 40)}`;
  const deploymentBinding = buildAuditCompilerDeploymentBinding({ evidence, sourceFiles, sourcePath: candidate.sourcePath, contractName: candidate.contractName, deployedRuntimeBytecode: `0x${candidate.deployedBytecode}`, chainId: "31337", address, blockNumber: 1, evidenceClass: "LOCAL_COMPILER_OUTPUT_LOOPBACK_FOR_BINDING_TEST" });
  let proxyBinding = null;
  if (row.family === "unprotected_upgrade") {
    const implementationAddress = address;
    const proxyAddress = `0x${sha256(`${row.caseId}:proxy`).slice(0, 40)}`;
    const word = `0x${"0".repeat(24)}${implementationAddress.slice(2)}`;
    proxyBinding = buildAuditEip1967ProxyBinding({ implementationBinding: deploymentBinding, proxyAddress, implementationAddress, implementationSlot: EIP1967_IMPLEMENTATION_SLOT, rawImplementationStorageWord: word, proxyRuntimeBytecode: `0x${candidate.deployedBytecode}`, chainId: "31337", blockNumber: 1 });
  }
  const reviewLayer = buildAuditCompilerAstReviewLayer({ evidence, sourceFiles, deploymentBinding, proxyBinding });
  const packets = ["basic", "pro", "advanced"].map((tier) => buildAuditCompilerCanonicalPacket({ tier, caseRef: row.caseId, reviewLayer, deploymentBinding, proxyBinding }));
  const parity = verifyAuditCompilerPacketSet(packets);
  if (parity.failed) throw new Error(`packet_parity_failed:${row.caseId}`);
  for (const packet of packets) fs.writeFileSync(path.join(out, "packets", `${row.caseId}_${packet.tier}.json`), `${JSON.stringify(packet, null, 2)}\n`);
  const caseReceipt = { caseId: row.caseId, family: row.family, findings: evidence.findings.length, deploymentStatus: deploymentBinding.status, proxyStatus: proxyBinding?.status ?? "NOT_APPLICABLE", packetParity: parity, evidenceSha256: evidence.evidenceSha256, reviewLayerSha256: reviewLayer.reviewLayerSha256, findingIdentitySha256: packets[0].findingIdentitySha256 };
  fs.writeFileSync(path.join(out, "cases", `${row.caseId}.json`), `${JSON.stringify(caseReceipt, null, 2)}\n`);
  rows.push(caseReceipt);
}

const sourceRoot = path.join(root, R44P39_PROTOCOL_HOLDOUT.sourceRoot);
const protocolSources = [];
const walk = (directory) => { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const absolute = path.join(directory, entry.name); if (entry.isDirectory()) walk(absolute); else if (entry.isFile() && entry.name.endsWith(".sol")) protocolSources.push({ path: path.relative(path.join(root, "fixtures/pass36/r44p11-compiler-ast/src"), absolute).replaceAll("\\", "/"), content: fs.readFileSync(absolute, "utf8") }); } };
walk(sourceRoot);
const protocolEvidence = analyzeSolidityCompilerAst({ solc, sourceFiles: protocolSources, observedAt: "2026-08-09T00:00:00.000Z", storageComparisonPairs: R44P39_PROTOCOL_HOLDOUT.storageComparisonPairs });
const signalRows = protocolEvidence.r44p38Generalization ? protocolEvidence.findings.map((row) => ({ ruleId: row.ruleId, contractName: row.contractName })) : [];
const mapping = { cross_chain_replay: "AST_R44P38_CROSS_CHAIN_REPLAY", low_quorum: "AST_R44P38_LOW_QUORUM", insolvent_withdraw: "AST_R44P38_INSOLVENT_WITHDRAW", unguarded_initializer: "AST_UNGUARDED_INITIALIZER", storage_layout_collision: "AST_R44P38_STORAGE_LAYOUT_COLLISION", post_balance_share_accounting: "AST_R44P38_POST_BALANCE_SHARE_ACCOUNTING" };
const expected = R44P39_PROTOCOL_HOLDOUT.expectedRiskSignals.map((item) => ({ ...item, observed: signalRows.some((row) => row.ruleId === mapping[item.signalId] && row.contractName === item.contractName) }));
const controls = R44P39_PROTOCOL_HOLDOUT.expectedControlAbsence.map((item) => ({ ...item, absent: !signalRows.some((row) => row.ruleId === mapping[item.signalId] && row.contractName === item.contractName) }));
const protocolReceipt = { classification: R44P39_PROTOCOL_HOLDOUT.classification, sourceFiles: protocolSources.length, contracts: protocolEvidence.compilation.contracts, expected, controls, expectedPassed: expected.filter((row) => row.observed).length, expectedTotal: expected.length, controlsPassed: controls.filter((row) => row.absent).length, controlsTotal: controls.length, independentGroundTruthCredit: false, realProtocolAccuracyCredit: false, evidenceSha256: protocolEvidence.evidenceSha256, truthBoundary: R44P39_PROTOCOL_HOLDOUT.truthBoundary };
fs.writeFileSync(path.join(out, "R44P39_PROTOCOL_HOLDOUT.json"), `${JSON.stringify(protocolReceipt, null, 2)}\n`);
if (protocolReceipt.expectedPassed !== protocolReceipt.expectedTotal || protocolReceipt.controlsPassed !== protocolReceipt.controlsTotal) throw new Error(`protocol_holdout_failed:${protocolReceipt.expectedPassed}/${protocolReceipt.expectedTotal}:${protocolReceipt.controlsPassed}/${protocolReceipt.controlsTotal}`);
const summary = { schemaVersion: "velmere.pass36.a102r44p39.audit-integration-run.v1", status: "PASS_R44P39_TARGETED_AUDIT_INTEGRATION", compilerVersion: solc.version(), cases: rows.length, packets: rows.length * 3, packetParityPassed: rows.length, localDeploymentBindings: rows.filter((row) => ["EXACT_MATCH", "MATCH_AFTER_SOLIDITY_METADATA_STRIP"].includes(row.deploymentStatus)).length, localProxyBindings: rows.filter((row) => row.proxyStatus === "BOUND_LOCAL_EIP1967_SNAPSHOT").length, protocolHoldout: protocolReceipt, independentGroundTruthCredit: false, realProtocolAccuracyCredit: false, customerPathIntegrationCredit: false, saleCredit: false, liveCredit: false };
fs.writeFileSync(path.join(out, "R44P39_AUDIT_INTEGRATION_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
