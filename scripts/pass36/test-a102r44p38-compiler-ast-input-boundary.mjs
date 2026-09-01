#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { analyzeSolidityCompilerAst as analyzeRuntimeAst, verifySolidityCompilerAstEvidence } from "../../lib/security/solidity-compiler-ast-runtime.mjs";
import { analyzeSolidityCompilerAst as analyzeGeneralizationAst, verifyCompilerAstAnalysisShape } from "../../lib/security/solidity-compiler-ast-generalization.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; };
const solcRoot = path.resolve(arg("--solc-root", process.env.VELMERE_SOLC_ROOT ?? ""));
const output = arg("--output");
if (!fs.existsSync(path.join(solcRoot, "node_modules/solc/index.js"))) throw new Error(`exact_solc_root_missing:${solcRoot}`);
const require = createRequire(import.meta.url);
const solc = require(path.join(solcRoot, "node_modules/solc"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const rows = [];
const check = (id, ok, detail = null) => rows.push({ id, ok: Boolean(ok), detail });
const expectSafeRejection = (id, fn) => {
  try {
    const value = fn();
    const rejected = value?.creditBoundary?.localCompilerAstCredit === false
      || value?.compilation?.status === "BLOCKED_OR_FAILED"
      || value?.ok === false;
    check(id, rejected, { returned: value?.status ?? value?.compilation?.status ?? null });
  } catch (error) {
    check(id, true, { error: String(error?.message ?? error) });
  }
};
const sourceFiles = [{ path: "Risk.sol", content: "pragma solidity 0.8.24; contract Risk { uint256 public totalSupply; mapping(address=>uint256) public balances; function mint(address to,uint256 amount) external { totalSupply += amount; balances[to] += amount; } }\n" }];
const evidence = analyzeRuntimeAst({ solc, sourceFiles, observedAt: "2026-08-09T00:00:00.000Z" });
check("exact-compiler", evidence.compiler.exactExpectedVersion === true && evidence.compiler.version.startsWith("0.8.24+commit.e11b9ed9"), evidence.compiler);
check("valid-evidence", verifySolidityCompilerAstEvidence(evidence, sourceFiles).ok === true);
check("generalization-layer-present", evidence.r44p38Generalization?.signalFamilies === 16 && evidence.r44p38Generalization?.localCompilerAstCredit === true, evidence.r44p38Generalization);
check("no-promotion", evidence.creditBoundary.realProtocolAccuracyCredit === false && evidence.creditBoundary.independentGroundTruthCredit === false && evidence.creditBoundary.customerCredit === false && evidence.creditBoundary.saleCredit === false && evidence.creditBoundary.liveCredit === false);

const tamperedDigest = structuredClone(evidence);
tamperedDigest.evidenceSha256 = `sha256:${"0".repeat(64)}`;
check("tampered-self-digest-rejected", verifySolidityCompilerAstEvidence(tamperedDigest, sourceFiles).ok === false);
const changedSources = [{ ...sourceFiles[0], content: `${sourceFiles[0].content}\n// byte change\n` }];
check("source-binding-tamper-rejected", verifySolidityCompilerAstEvidence(evidence, changedSources).ok === false);
expectSafeRejection("path-traversal-rejected", () => analyzeRuntimeAst({ solc, sourceFiles: [{ path: "../evil.sol", content: sourceFiles[0].content }] }));
expectSafeRejection("duplicate-path-rejected", () => analyzeRuntimeAst({ solc, sourceFiles: [sourceFiles[0], sourceFiles[0]] }));
expectSafeRejection("empty-source-rejected", () => analyzeRuntimeAst({ solc, sourceFiles: [] }));
expectSafeRejection("oversized-source-rejected", () => analyzeRuntimeAst({ solc, sourceFiles: [{ path: "Huge.sol", content: `pragma solidity 0.8.24; /*${"x".repeat(4 * 1024 * 1024 + 1)}*/ contract Huge {}` }] }));
expectSafeRejection("wrong-compiler-rejected", () => analyzeRuntimeAst({ solc: { version: () => "0.8.23+commit.fake", compile: solc.compile.bind(solc) }, sourceFiles }));
expectSafeRejection("malformed-compiler-output-rejected", () => analyzeRuntimeAst({ solc: { version: solc.version.bind(solc), compile: () => "not-json" }, sourceFiles }));

const standardInput = {
  language: "Solidity",
  sources: { "Risk.sol": { content: sourceFiles[0].content } },
  settings: { optimizer: { enabled: false, runs: 200 }, outputSelection: { "*": { "*": ["abi", "storageLayout"], "": ["ast"] } } },
};
const compilerOutput = JSON.parse(solc.compile(JSON.stringify(standardInput)));
const generalization = analyzeGeneralizationAst({ compilerOutput, sources: { "Risk.sol": sourceFiles[0].content } });
check("generalization-shape", verifyCompilerAstAnalysisShape(generalization) === true);
const malformedShape = structuredClone(generalization);
malformedShape.localCompilerAstCredit = false;
check("generalization-shape-tamper-rejected", verifyCompilerAstAnalysisShape(malformedShape) === false);
expectSafeRejection("generalization-missing-ast-rejected", () => analyzeGeneralizationAst({ compilerOutput: { sources: { "Risk.sol": {} }, contracts: {} }, sources: { "Risk.sol": sourceFiles[0].content } }));
expectSafeRejection("generalization-compiler-error-rejected", () => analyzeGeneralizationAst({ compilerOutput: { errors: [{ severity: "error", message: "synthetic" }], sources: { "Risk.sol": { ast: {} } }, contracts: {} }, sources: { "Risk.sol": sourceFiles[0].content } }));
expectSafeRejection("generalization-storage-pair-missing-rejected", () => analyzeGeneralizationAst({ compilerOutput, sources: { "Risk.sol": sourceFiles[0].content }, storageComparisonPairs: [{ baselineContract: "MissingA", candidateContract: "MissingB" }] }));

const failed = rows.filter((row) => !row.ok);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p38.compiler-ast-input-boundary.v1",
  revisionId: "VELMERE_PASS36_A102R44P38_ACTION_REQUIRED_COMPILER_AST_IR_LOCAL_GENERALIZATION24_METAMORPHIC7_AND_AUDIT_ACCURACY_TEST_CYCLE_1_OF_3_NO_LIVE_CREDIT",
  status: failed.length ? "FAIL_R44P38_COMPILER_AST_INPUT_BOUNDARY" : "PASS_R44P38_COMPILER_AST_INPUT_BOUNDARY",
  compilerVersion: solc.version(),
  checks: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
  sourceIdentitySha256: sha256(Buffer.from(sourceFiles[0].content)),
  creditBoundary: { independentGroundTruthCredit: false, realProtocolAccuracyCredit: false, customerCredit: false, saleCredit: false, liveCredit: false, worldClassCredit: false },
};
if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(path.resolve(output), `${JSON.stringify(receipt, null, 2)}\n`); }
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
