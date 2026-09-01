#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { analyzeSolidityCompilerAst } from "../../lib/security/solidity-compiler-ast-runtime.mjs";
import { buildAuditCompilerAstReviewLayer, verifyAuditCompilerAstReviewLayer } from "../../lib/security/audit-compiler-ast-review-layer.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; };
const solcRoot = path.resolve(arg("--solc-root", process.env.VELMERE_SOLC_ROOT ?? ""));
const output = arg("--output");
const require = createRequire(import.meta.url);
const solc = require(path.join(solcRoot, "node_modules/solc"));
const rows = [];
const check = (id, ok, detail = null) => rows.push({ id, ok: Boolean(ok), detail });
const riskSources = [{ path: "Mint.sol", content: "pragma solidity 0.8.24; contract Mint { uint256 public totalSupply; mapping(address=>uint256) public balances; function mint(address to,uint256 amount) external { totalSupply += amount; balances[to] += amount; } }\n" }];
const controlSources = [{ path: "Mint.sol", content: "pragma solidity 0.8.24; contract Mint { address public owner; uint256 public totalSupply; mapping(address=>uint256) public balances; modifier onlyOwner(){require(msg.sender==owner,\"owner\");_;} function mint(address to,uint256 amount) external onlyOwner { totalSupply += amount; balances[to] += amount; } }\n" }];
const riskEvidence = analyzeSolidityCompilerAst({ solc, sourceFiles: riskSources, observedAt: "2026-08-09T00:00:00.000Z" });
const controlEvidence = analyzeSolidityCompilerAst({ solc, sourceFiles: controlSources, observedAt: "2026-08-09T00:00:00.000Z" });
const riskLayer = buildAuditCompilerAstReviewLayer({ evidence: riskEvidence, sourceFiles: riskSources });
const controlLayer = buildAuditCompilerAstReviewLayer({ evidence: controlEvidence, sourceFiles: controlSources });
check("risk-layer-accepted", riskLayer.accepted === true && verifyAuditCompilerAstReviewLayer(riskLayer) === true);
check("control-layer-accepted", controlLayer.accepted === true && verifyAuditCompilerAstReviewLayer(controlLayer) === true);
check("risk-open-mint", riskLayer.findings.some((row) => row.ruleId === "AST_EXTERNALLY_CALLABLE_MINT_WITHOUT_AUTH"), riskLayer.findings.map((row) => row.ruleId));
check("control-no-open-mint", !controlLayer.findings.some((row) => row.ruleId === "AST_EXTERNALLY_CALLABLE_MINT_WITHOUT_AUTH"), controlLayer.findings.map((row) => row.ruleId));
check("confidence-not-calibrated", riskLayer.findings.length > 0 && riskLayer.findings.every((row) => row.confidenceState === "NOT_CALIBRATED"));
check("compiler-backed-only", riskLayer.findings.every((row) => row.compilerBacked === true && row.exploitabilityProven === false && row.independentReview === false));
check("generalization-16-families", riskEvidence.r44p38Generalization?.signalFamilies === 16, riskEvidence.r44p38Generalization);
check("no-credit-promotion", riskLayer.creditBoundary.independentGroundTruthCredit === false && riskLayer.creditBoundary.realProtocolAccuracyCredit === false && riskLayer.creditBoundary.customerCredit === false && riskLayer.creditBoundary.saleCredit === false && riskLayer.creditBoundary.liveCredit === false && riskLayer.creditBoundary.worldClassCredit === false);
const tampered = structuredClone(riskEvidence);
tampered.evidenceSha256 = `sha256:${"f".repeat(64)}`;
const rejected = buildAuditCompilerAstReviewLayer({ evidence: tampered, sourceFiles: riskSources });
check("tampered-evidence-rejected", rejected.accepted === false && rejected.findings.length === 0 && verifyAuditCompilerAstReviewLayer(rejected) === true, rejected.failedChecks.map((row) => row.id));
const wrongSource = buildAuditCompilerAstReviewLayer({ evidence: riskEvidence, sourceFiles: [{ ...riskSources[0], content: `${riskSources[0].content}// changed\n` }] });
check("wrong-source-rejected", wrongSource.accepted === false && wrongSource.findings.length === 0, wrongSource.failedChecks.map((row) => row.id));
const auditEngine = fs.readFileSync(path.join(ROOT, "lib/security/audit-a01-a05-engine.ts"), "utf8");
check("active-audit-engine-imports-adapter", auditEngine.includes('buildAuditCompilerAstReviewLayer') && auditEngine.includes('compilerAstLayer.findings'));
check("active-audit-no-numeric-confidence", auditEngine.includes('confidenceState: "NOT_CALIBRATED"') && auditEngine.includes('confidence: 0'));
const failed = rows.filter((row) => !row.ok);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p38.audit-compiler-ast-adapter.v1",
  status: failed.length ? "FAIL_R44P38_AUDIT_COMPILER_AST_ADAPTER" : "PASS_R44P38_AUDIT_COMPILER_AST_ADAPTER",
  compilerVersion: solc.version(),
  checks: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
  riskFindingCount: riskLayer.findingCount,
  controlFindingCount: controlLayer.findingCount,
  truthBoundary: "The active Audit A01-A05 source lane accepts exact compiler-AST evidence through a fail-closed adapter and emits NOT_CALIBRATED review-priority findings. It does not establish exploitability, independent accuracy or customer safety.",
};
if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(path.resolve(output), `${JSON.stringify(receipt, null, 2)}\n`); }
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
