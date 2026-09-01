import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  analyzeSolidityCompilerOutputAst,
  LEGACY_UNCHECKED_MULTIPLICATION_ECONOMIC_SINK_RULE_ID as RULE,
  verifySolidityCompilerAstEvidence,
} from "../../lib/security/solidity-compiler-ast-runtime.mjs";
import {
  buildAuditCompilerAstReviewLayer,
  verifyAuditCompilerAstReviewLayer,
} from "../../lib/security/audit-compiler-ast-review-layer.mjs";
import { compileLegacyStandardJson } from "../../lib/security/solidity-compiler-legacy-evaluation.mjs";

const REVISION = "VELMERE_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT";
const OBSERVED_AT = "2026-08-11T00:00:00.000Z";

function argsFrom(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key?.startsWith("--") || !argv[index + 1]) throw new Error(`invalid_argument:${key ?? "missing"}`);
    result[key.slice(2)] = path.resolve(argv[index + 1]);
  }
  return result;
}

const args = argsFrom(process.argv.slice(2));
const required = ["solc-0-4-25-root", "solc-0-5-17-root", "solc-0-6-12-root", "solc-0-7-6-root", "solc-0-8-24-root", "output"];
for (const key of required) if (!args[key]) throw new Error(`missing_argument:${key}`);

const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const source = (version, body, declarations = "", prefix = "") => `// SPDX-License-Identifier: MIT
pragma solidity ${version};
${prefix}
contract CaseContract {
${declarations}
${body}
}
`;

const cases = [
  { id: "V01_NATIVE_TRANSFER_DIRECT_0425", category: "vulnerable", version: "0.4.25", expected: true, code: source("0.4.25", "function buy(uint q,uint p,address r) external { r.transfer(q*p); }") },
  { id: "V02_SEND_ALIAS_CHAIN_0425", category: "vulnerable", version: "0.4.25", expected: true, code: source("0.4.25", "function buy(uint q,uint p,address r) external { uint total=q*p; uint due=total; require(r.send(due)); }") },
  { id: "V03_CALL_VALUE_0425", category: "vulnerable", version: "0.4.25", expected: true, code: source("0.4.25", "function buy(uint q,uint p,address r) external { uint total=q*p; r.call.value(total)(\"\"); }") },
  { id: "V04_TOKEN_TRANSFER_0517", category: "vulnerable", version: "0.5.17", expected: true, code: source("0.5.17", "function distribute(Token token,address to,uint q,uint p) external { uint total=q*p; require(token.transfer(to,total)); }", "", "interface Token { function transfer(address,uint) external returns(bool); }") },
  { id: "V05_BALANCE_DEBIT_0517", category: "vulnerable", version: "0.5.17", expected: true, code: source("0.5.17", "function debit(uint q,uint p) external { uint total=q*p; balances[msg.sender]-=total; }", "mapping(address=>uint) public balances;") },
  { id: "V06_MSG_VALUE_VALIDATION_0612", category: "vulnerable", version: "0.6.12", expected: true, code: source("0.6.12", "function buy(uint q,uint p) external payable { uint total=q*p; require(msg.value==total); }") },
  { id: "V07_TOKEN_APPROVE_0612", category: "vulnerable", version: "0.6.12", expected: true, code: source("0.6.12", "function allow(Token token,address spender,uint q,uint p) external { uint total=q*p; require(token.approve(spender,total)); }", "", "interface Token { function approve(address,uint) external returns(bool); }") },
  { id: "V08_MINT_AMOUNT_0706", category: "vulnerable", version: "0.7.6", expected: true, code: source("0.7.6", "function _mint(address,uint) internal {} function issue(address to,uint q,uint p) external { _mint(to,q*p); }") },
  { id: "V09_SUPPLY_WRITE_0706", category: "vulnerable", version: "0.7.6", expected: true, code: source("0.7.6", "function issue(uint q,uint p) external { totalSupply+=q*p; }", "uint public totalSupply;") },

  { id: "P01_SAFEMATH_0425", category: "patched", version: "0.4.25", expected: false, code: source("0.4.25", "function buy(uint q,uint p,address r) external { r.transfer(q.mul(p)); }", "using SafeMath for uint;", "library SafeMath { function mul(uint a,uint b) internal pure returns(uint){ if(a==0)return 0; uint c=a*b; require(c/a==b); return c; } }") },
  { id: "P02_DIVISION_IDENTITY_LEFT_0425", category: "patched", version: "0.4.25", expected: false, code: source("0.4.25", "function buy(uint q,uint p,address r) external { uint total=q*p; require(q==0 || total/q==p); r.transfer(total); }") },
  { id: "P03_BOTH_OPERANDS_BOUNDED_0517", category: "patched", version: "0.5.17", expected: false, code: source("0.5.17", "function buy(uint q,uint p,address payable r) external { require(q<=1000 && p<=1000); uint total=q*p; r.transfer(total); }") },
  { id: "P04_MULTIPLY_BY_ONE_0517", category: "patched", version: "0.5.17", expected: false, code: source("0.5.17", "function buy(uint q,address payable r) external { uint total=q*1; r.transfer(total); }") },
  { id: "P05_ZERO_MULTIPLIER_0612", category: "patched", version: "0.6.12", expected: false, code: source("0.6.12", "function buy(uint q,address payable r) external { uint total=q*0; r.transfer(total); }") },
  { id: "P06_CONSTANT_WITH_BOUND_0706", category: "patched", version: "0.7.6", expected: false, code: source("0.7.6", "function buy(uint q,address payable r) external { require(q<=1000000); uint total=q*1000; r.transfer(total); }") },
  { id: "P07_DIVISION_IDENTITY_RIGHT_0706", category: "patched", version: "0.7.6", expected: false, code: source("0.7.6", "function buy(uint q,uint p,address payable r) external { uint total=q*p; require(p==0 || total/p==q); r.transfer(total); }") },
  { id: "P08_DOMINATING_BRANCH_GUARD_0706", category: "patched", version: "0.7.6", expected: false, code: source("0.7.6", "function debit(uint q,uint p,bool allowed) external { uint total=q*p; if(allowed){ require(q==0 || total/q==p); balances[msg.sender]-=total; } }", "mapping(address=>uint) balances;") },

  { id: "N01_SIGNED_MULTIPLICATION", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function buy(int q,int p,address payable r) external { int total=q*p; r.transfer(uint(total)); }") },
  { id: "N02_STATE_ONLY_INPUTS", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function settle() external { balances[msg.sender]-=price*units; }", "mapping(address=>uint) balances; uint price; uint units;") },
  { id: "N03_EVENT_ONLY", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "event Calc(uint value); function calculate(uint q,uint p) external { emit Calc(q*p); }") },
  { id: "N04_ADDITION_TO_TRANSFER", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function buy(uint q,uint p,address payable r) external { r.transfer(q+p); }") },
  { id: "N05_DIVISION_TO_TRANSFER", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function buy(uint q,uint p,address payable r) external { require(p>0); r.transfer(q/p); }") },
  { id: "N06_LOOP_BOUND_ONLY", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function work(uint q,uint p) external pure returns(uint x) { for(uint i=0;i<q*p;i++){x++;} }") },
  { id: "N07_NEUTRAL_STATE_WRITE", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function compute(uint q,uint p) external { lastComputation=q*p; }", "uint public lastComputation;") },
  { id: "N08_HASH_ONLY", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "event Digest(bytes32 value); function hash(uint q,uint p) external { emit Digest(keccak256(abi.encodePacked(q*p))); }") },
  { id: "N09_VIEW_RETURN", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function quote(uint q,uint p) external pure returns(uint){ return q*p; }") },
  { id: "N10_LOCAL_UNUSED", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function quote(uint q,uint p) external pure returns(uint){ uint ignored=q*p; return ignored>0?1:0; }") },
  { id: "N11_LITERAL_ONLY", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function pay(address payable r) external { r.transfer(2*3); }") },
  { id: "N12_UNRELATED_METHOD", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function record(Recorder recorder,uint q,uint p) external { recorder.record(q*p); }", "", "interface Recorder { function record(uint) external; }") },
  { id: "N13_ARRAY_INDEX", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function set(uint q,uint p) external { values[q*p]=1; }", "mapping(uint=>uint) values;") },
  { id: "N14_CALLDATA_NOT_VALUE", category: "hard_negative", version: "0.7.6", expected: false, code: source("0.7.6", "function callData(address r,uint q,uint p) external { (bool ok,)=r.call(abi.encode(q*p)); require(ok); }") },

  { id: "M01_REMOVE_SAFEMATH", category: "mutation", version: "0.4.25", expected: true, code: source("0.4.25", "function buy(uint q,uint p,address r) external { r.transfer(q*p); }") },
  { id: "M02_REMOVE_IDENTITY_GUARD", category: "mutation", version: "0.5.17", expected: true, code: source("0.5.17", "function debit(uint q,uint p) external { uint total=q*p; balances[msg.sender]-=total; }", "mapping(address=>uint) balances;") },
  { id: "M03_INVERT_RANGE_GUARD", category: "mutation", version: "0.6.12", expected: true, code: source("0.6.12", "function buy(uint q,uint p,address payable r) external { require(q>=1000 && p>=1000); r.transfer(q*p); }") },
  { id: "M04_ADDITION_TO_MULTIPLICATION", category: "mutation", version: "0.6.12", expected: true, code: source("0.6.12", "function buy(uint q,uint p,address payable r) external { r.transfer(q*p); }") },
  { id: "M05_ROUTE_TO_ECONOMIC_SINK", category: "mutation", version: "0.7.6", expected: true, code: source("0.7.6", "function buy(uint q,uint p,address payable r) external { uint total=q*p; r.transfer(total); }") },
  { id: "M06_GUARD_AFTER_SINK", category: "mutation", version: "0.7.6", expected: true, code: source("0.7.6", "function buy(uint q,uint p,address payable r) external { uint total=q*p; r.transfer(total); require(q==0 || total/q==p); }") },
  { id: "M07_NON_DOMINATING_BRANCH_GUARD", category: "mutation", version: "0.4.25", expected: true, code: source("0.4.25", "function debit(uint q,uint p,bool ownerPath) external { uint total=q*p; if(ownerPath){ require(q==0 || total/q==p); } balances[msg.sender]-=total; }", "mapping(address=>uint) balances;") },

  { id: "D01_MODERN_NATIVE_TRANSFER", category: "modern_not_applicable", version: "0.8.24", expected: false, code: source("0.8.24", "function buy(uint q,uint p,address payable r) external { r.transfer(q*p); }") },
  { id: "D02_MODERN_STATE_WRITE", category: "modern_not_applicable", version: "0.8.24", expected: false, code: source("0.8.24", "function issue(uint q,uint p) external { totalSupply+=q*p; }", "uint public totalSupply;") },
  { id: "D03_MODERN_MSG_VALUE", category: "modern_not_applicable", version: "0.8.24", expected: false, code: source("0.8.24", "function buy(uint q,uint p) external payable { require(msg.value==q*p); }") },
  { id: "D04_MODERN_TOKEN_TRANSFER", category: "modern_not_applicable", version: "0.8.24", expected: false, code: source("0.8.24", "function distribute(Token token,address to,uint q,uint p) external { require(token.transfer(to,q*p)); }", "", "interface Token { function transfer(address,uint) external returns(bool); }") },
  { id: "D05_MODERN_UNCHECKED_EXPLICITLY_UNSUPPORTED", category: "modern_not_applicable", version: "0.8.24", expected: false, code: source("0.8.24", "function buy(uint q,uint p,address payable r) external { uint total; unchecked { total=q*p; } r.transfer(total); }") },
  { id: "D06_MODERN_ALIAS", category: "modern_not_applicable", version: "0.8.24", expected: false, code: source("0.8.24", "function buy(uint q,uint p,address payable r) external { uint total=q*p; uint due=total; r.transfer(due); }") }
];

const roots = {
  "0.4.25": args["solc-0-4-25-root"],
  "0.5.17": args["solc-0-5-17-root"],
  "0.6.12": args["solc-0-6-12-root"],
  "0.7.6": args["solc-0-7-6-root"],
  "0.8.24": args["solc-0-8-24-root"],
};
const compilers = Object.fromEntries(Object.entries(roots).map(([version, root]) => {
  const requireFromRoot = createRequire(path.join(root, "package.json"));
  const solc = requireFromRoot("solc");
  if (!String(solc.version()).startsWith(`${version}+commit.`)) throw new Error(`compiler_version_mismatch:${version}:${solc.version()}`);
  return [version, solc];
}));

const rows = [];
for (const testCase of cases) {
  const sourceFiles = [{ path: `${testCase.id}.sol`, content: testCase.code }];
  const compiled = compileLegacyStandardJson({ solc: compilers[testCase.version], sourceFiles, expectedVersion: testCase.version });
  let evidence = null;
  let reviewLayer = null;
  if (compiled.status === "EXECUTED") {
    evidence = analyzeSolidityCompilerOutputAst({
      compilerOutput: compiled.output,
      sourceFiles,
      compilerVersion: compiled.compilerVersion,
      expectedCompilerVersionPrefix: `${testCase.version}+commit.`,
      observedAt: OBSERVED_AT,
      profile: "R44P46_SYNTHETIC_BOUNDED_LEGACY_MULTIPLICATION",
    });
    reviewLayer = buildAuditCompilerAstReviewLayer({ evidence, sourceFiles });
  }
  const detectorRows = (evidence?.findings ?? []).filter((finding) => finding.ruleId === RULE);
  const reviewRows = (reviewLayer?.findings ?? []).filter((finding) => finding.ruleId === RULE);
  const evaluation = evidence?.ruleEvaluations?.find((row) => row.ruleId === RULE) ?? null;
  const expectedEvaluationStatus = testCase.version === "0.8.24" ? "NOT_APPLICABLE_SOLC_0_8_OR_LATER" : "EVALUATED_LEGACY_COMPILER";
  const checks = {
    compilationExecuted: compiled.status === "EXECUTED",
    evidenceVerified: evidence ? verifySolidityCompilerAstEvidence(evidence, sourceFiles).ok : false,
    evaluationStatus: evaluation?.status === expectedEvaluationStatus,
    findingTruth: testCase.expected ? detectorRows.length === 1 : detectorRows.length === 0,
    reviewParity: reviewRows.length === detectorRows.length,
    reviewLayerVerified: reviewLayer ? verifyAuditCompilerAstReviewLayer(reviewLayer) : false,
    reviewBoundary: reviewRows.every((finding) => finding.reviewPriorityOnly === true && finding.broadArithmeticCoverageProven === false && finding.exploitabilityProven === false && finding.independentReview === false),
    noBroadOrExternalCredit: evidence?.creditBoundary?.broadArithmeticCoverageCredit === false
      && evidence?.creditBoundary?.independentGroundTruthCredit === false
      && evidence?.creditBoundary?.realProtocolAccuracyCredit === false
      && evidence?.creditBoundary?.exploitabilityCredit === false
      && evidence?.creditBoundary?.customerCredit === false
      && evidence?.creditBoundary?.saleCredit === false
      && evidence?.creditBoundary?.liveCredit === false,
  };
  rows.push({
    id: testCase.id,
    category: testCase.category,
    compilerVersion: compiled.compilerVersion,
    sourceSha256: sha256(testCase.code),
    expectedFinding: testCase.expected,
    observedFindingCount: detectorRows.length,
    evaluation,
    checks,
    passed: Object.values(checks).every(Boolean),
    evidenceSha256: evidence?.evidenceSha256 ?? null,
    reviewLayerSha256: reviewLayer?.reviewLayerSha256 ?? null,
    compilationBlockers: compiled.blockers,
  });
}

const categoryCounts = Object.fromEntries(["vulnerable", "patched", "hard_negative", "mutation", "modern_not_applicable"].map((category) => [category, rows.filter((row) => row.category === category).length]));
const tp = rows.filter((row) => row.expectedFinding && row.observedFindingCount === 1).length;
const fn = rows.filter((row) => row.expectedFinding && row.observedFindingCount !== 1).length;
const tn = rows.filter((row) => !row.expectedFinding && row.observedFindingCount === 0).length;
const fp = rows.filter((row) => !row.expectedFinding && row.observedFindingCount !== 0).length;
const failed = rows.filter((row) => !row.passed);
const core = {
  schemaVersion: "velmere.pass36.a102r44p46.legacy-multiplication-synthetic-receipt.v1",
  revisionId: REVISION,
  observedAt: OBSERVED_AT,
  status: failed.length === 0 ? "PASS_R44P46_BOUNDED_SYNTHETIC_DIAGNOSTIC" : "FAIL_R44P46_BOUNDED_SYNTHETIC_DIAGNOSTIC",
  ruleId: RULE,
  evidenceClass: "TESTED_SYNTHETIC",
  diagnosticOnly: true,
  formalAccuracyCredit: false,
  independentGroundTruthCredit: false,
  realProtocolAccuracyCredit: false,
  broadArithmeticCoverageCredit: false,
  denominator: { total: rows.length, ...categoryCounts, exactCompilerVersions: Object.fromEntries(Object.entries(compilers).map(([version, solc]) => [version, solc.version()])) },
  metrics: {
    tp, tn, fp, fn,
    diagnosticPrecision: tp + fp === 0 ? null : tp / (tp + fp),
    diagnosticRecall: tp + fn === 0 ? null : tp / (tp + fn),
    mutationDetectionRate: rows.filter((row) => row.category === "mutation" && row.observedFindingCount === 1).length / categoryCounts.mutation,
  },
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
  limitations: [
    "Project-authored synthetic labels are diagnostic and are not independent or formal ground truth.",
    "The detector is intentionally bounded to same-function direct/local aliases and enumerated economic sinks.",
    "Solidity 0.8+ unchecked blocks remain outside this legacy-only family and receive no false coverage credit.",
  ],
};
const receipt = { ...core, receiptSha256: sha256(stable(core)) };
fs.mkdirSync(args.output, { recursive: true });
const receiptPath = path.join(args.output, "R44P46_LEGACY_MULTIPLICATION_SYNTHETIC_RECEIPT.json");
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: receipt.status, total: rows.length, passed: receipt.passed, failed: receipt.failed, categoryCounts, metrics: receipt.metrics, receiptSha256: receipt.receiptSha256, receiptPath }, null, 2));
if (failed.length > 0) {
  console.error(JSON.stringify(failed.map((row) => ({ id: row.id, checks: row.checks, blockers: row.compilationBlockers, evaluation: row.evaluation })), null, 2));
  process.exit(1);
}
