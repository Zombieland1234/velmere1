import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  analyzeSolidityCompilerAst,
  compareStorageLayouts,
  verifySolidityCompilerAstEvidence,
} from "../../lib/security/solidity-compiler-ast-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURE_ROOT = path.join(ROOT, "fixtures/pass36/r44p38-compiler-ast-generalization");
const argumentValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const solcRoot = path.resolve(argumentValue("--solc-root") ?? process.env.VELMERE_SOLC_ROOT ?? "");
if (!solcRoot || !fs.existsSync(path.join(solcRoot, "node_modules/solc"))) {
  throw new Error("R44P38_SOLC_ROOT_REQUIRED");
}
const require = createRequire(import.meta.url);
const solc = require(path.join(solcRoot, "node_modules/solc"));
const outputPath = argumentValue("--output");
const observedAt = "2026-08-09T09:00:00.000Z";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};

const CASES = [
  { id: "tx-origin-auth", primaryRule: "AST_TX_ORIGIN_AUTH", risk: ["txorigin/TxOriginRisk.sol"], control: ["access/Owned.sol", "txorigin/TxOriginControl.sol"] },
  { id: "open-mint", primaryRule: "AST_EXTERNALLY_CALLABLE_MINT_WITHOUT_AUTH", risk: ["mint/TokenCore.sol", "mint/OpenMintRisk.sol"], control: ["access/Owned.sol", "mint/TokenCore.sol", "mint/OpenMintControl.sol"] },
  { id: "unguarded-initializer", primaryRule: "AST_UNGUARDED_INITIALIZER", risk: ["initializer/InitializerRisk.sol"], control: ["initializer/Initializable.sol", "initializer/InitializerControl.sol"] },
  { id: "unchecked-call", primaryRule: "AST_UNCHECKED_LOW_LEVEL_CALL", risk: ["calls/UncheckedCallRisk.sol"], control: ["calls/UncheckedCallControl.sol"] },
  { id: "reentrancy-order", primaryRule: "AST_EXTERNAL_INTERACTION_BEFORE_STATE_EFFECT", risk: ["vault/ReentrancyRisk.sol"], control: ["vault/ReentrancyControl.sol"] },
  { id: "unguarded-delegatecall", primaryRule: "AST_UNGUARDED_DELEGATECALL_TARGET", risk: ["delegate/DelegateRisk.sol"], control: ["access/Owned.sol", "delegate/DelegateControl.sol"] },
  { id: "signature-replay", primaryRule: "AST_SIGNATURE_REPLAY_DOMAIN_OR_NONCE_MISSING", risk: ["signature/SignatureReplayRisk.sol"], control: ["signature/SignatureReplayControl.sol"] },
  { id: "permit-deadline", primaryRule: "AST_PERMIT_DEADLINE_MISSING", risk: ["permit/PermitRisk.sol"], control: ["permit/PermitControl.sol"] },
  { id: "privileged-write", primaryRule: "AST_UNPROTECTED_PRIVILEGED_STATE_WRITE", risk: ["roles/PrivilegeWriteRisk.sol"], control: ["access/Owned.sol", "roles/PrivilegeWriteControl.sol"] },
];
const VARIANTS = ["baseline", "comment-injection", "whitespace", "renamed-identifiers", "equivalent-conditions", "wrapper-functions"];

function readSources(paths) {
  return paths.map((relativePath) => ({
    path: relativePath,
    content: fs.readFileSync(path.join(FIXTURE_ROOT, relativePath), "utf8"),
  }));
}

function replaceWords(value, replacements) {
  let result = value;
  for (const [from, to] of Object.entries(replacements)) result = result.replace(new RegExp(`\\b${from}\\b`, "gu"), to);
  return result;
}

function insertBeforeLastBrace(value, body) {
  const index = value.lastIndexOf("}");
  if (index < 0) return value;
  return `${value.slice(0, index)}\n${body}\n${value.slice(index)}`;
}

function wrapperMutation(source, caseId, role, isPrimary) {
  let value = source.content;
  if (source.path.endsWith("access/Owned.sol")) {
    value = value.replace('require(msg.sender == owner, "owner");', 'require(_isOwner(msg.sender), "owner");');
  }
  if (caseId === "tx-origin-auth" && role === "risk" && source.path.endsWith("TxOriginRisk.sol")) {
    value = value.replace('require(tx.origin == owner, "origin");', 'require(_authorizedOrigin(), "origin");');
    value = insertBeforeLastBrace(value, "    function _authorizedOrigin() internal view returns (bool) { return tx.origin == owner; }");
  } else if (caseId === "open-mint" && /OpenMint(?:Risk|Control)\.sol$/u.test(source.path)) {
    value = value.replace("_mint(recipient, amount);", "_issue(recipient, amount);");
    value = insertBeforeLastBrace(value, "    function _issue(address recipient, uint256 amount) internal { _mint(recipient, amount); }");
  } else if (caseId === "reentrancy-order" && /Reentrancy(?:Risk|Control)\.sol$/u.test(source.path)) {
    value = value.replace('payable(msg.sender).call{value: amount}("")', '_send(payable(msg.sender), amount)');
    value = insertBeforeLastBrace(value, '    function _send(address payable recipient, uint256 amount) internal returns (bool, bytes memory) { return recipient.call{value: amount}(""); }');
  } else if ((caseId === "signature-replay" || caseId === "permit-deadline") && /(?:SignatureReplay|Permit)(?:Risk|Control)\.sol$/u.test(source.path)) {
    value = value.replaceAll("ecrecover(digest, v, r, s)", "_recover(digest, v, r, s)");
    value = insertBeforeLastBrace(value, "    function _recover(bytes32 digest, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) { return ecrecover(digest, v, r, s); }");
  } else if (isPrimary && !["tx-origin-auth", "open-mint", "reentrancy-order", "signature-replay", "permit-deadline"].includes(caseId)) {
    value = insertBeforeLastBrace(value, "    function _r44p38SemanticIdentity(uint256 value) internal pure returns (uint256) { return value; }");
  }
  return { ...source, content: value };
}

function mutateSources(sources, variant, caseId, role) {
  if (variant === "baseline") return sources;
  if (variant === "comment-injection") {
    const dangerComment = "// tx.origin delegatecall selfdestruct onlyOwner initializer deadline ecrecover mint owner = attacker;";
    return sources.map((source) => ({ ...source, content: `${dangerComment}\n${source.content.replace("pragma solidity", `/* require(allowed[target]); nonReentrant; */\npragma solidity`)}` }));
  }
  if (variant === "whitespace") {
    return sources.map((source) => ({
      ...source,
      content: source.content
        .replace(/\{/gu, " {\n")
        .replace(/;/gu, ";\n")
        .replace(/\n/gu, "\n\n")
        .replace(/[ \t]+/gu, " "),
    }));
  }
  if (variant === "renamed-identifiers") {
    const replacements = {
      owner: "controller",
      nextOwner: "nextController",
      recipient: "beneficiary",
      amount: "quantity",
      target: "destination",
      payload: "calldataBlob",
      initialized: "bootstrapped",
      nonces: "sequence",
      deadline: "expiresAt",
      signer: "authorizer",
      credit: "entitlementUnits",
      allowance: "spendingLimit",
    };
    return sources.map((source) => ({ ...source, content: replaceWords(source.content, replacements) }));
  }
  if (variant === "equivalent-conditions") {
    return sources.map((source) => ({
      ...source,
      content: source.content
        .replaceAll("msg.sender == owner", "owner == msg.sender")
        .replaceAll("tx.origin == owner", "owner == tx.origin")
        .replaceAll("block.timestamp <= deadline", "deadline >= block.timestamp")
        .replaceAll("signer != address(0)", "address(0) != signer"),
    }));
  }
  if (variant === "wrapper-functions") return sources.map((source, index) => wrapperMutation(source, caseId, role, index === sources.length - 1));
  throw new Error(`unknown_variant:${variant}`);
}

const rows = [];
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
let truePositive = 0;
let falseNegative = 0;
let falsePositive = 0;
let trueNegative = 0;

for (const testCase of CASES) {
  for (const role of ["risk", "control"]) {
    const base = readSources(testCase[role]);
    for (const variant of VARIANTS) {
      const sourceFiles = mutateSources(base, variant, testCase.id, role);
      const evidence = analyzeSolidityCompilerAst({ solc, sourceFiles, observedAt });
      const repeat = analyzeSolidityCompilerAst({ solc, sourceFiles, observedAt });
      const verification = verifySolidityCompilerAstEvidence(evidence, sourceFiles);
      const detected = evidence.findings.some((finding) => finding.ruleId === testCase.primaryRule);
      const expected = role === "risk";
      if (expected && detected) truePositive += 1;
      else if (expected) falseNegative += 1;
      else if (detected) falsePositive += 1;
      else trueNegative += 1;
      const row = {
        caseId: testCase.id,
        role,
        variant,
        primaryRule: testCase.primaryRule,
        expected,
        detected,
        compilationStatus: evidence.compilation.status,
        compilerErrors: evidence.compilation.errorCount,
        compilerWarnings: evidence.compilation.warningCount,
        findingRules: evidence.findings.map((finding) => finding.ruleId),
        sourceBundleSha256: evidence.inputIdentity.sourceBundleSha256,
        evidenceSha256: evidence.evidenceSha256,
        deterministic: evidence.evidenceSha256 === repeat.evidenceSha256,
        verified: verification.ok,
      };
      rows.push(row);
      check(`compile:${testCase.id}:${role}:${variant}`, evidence.compilation.status === "EXECUTED" && evidence.compilation.errorCount === 0, evidence.compilation.diagnostics.filter((item) => item.severity === "error"));
      check(`expected:${testCase.id}:${role}:${variant}`, detected === expected, row.findingRules);
      check(`deterministic:${testCase.id}:${role}:${variant}`, row.deterministic);
      check(`verify:${testCase.id}:${role}:${variant}`, verification.ok, verification.failed);
    }
  }
}

const neutral = [{
  path: "Neutral.sol",
  content: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\n// tx.origin delegatecall selfdestruct mint initializer ecrecover deadline owner attacker\ncontract Neutral { uint256 public value; function set(uint256 next) external { value = next; } }\n`,
}];
const neutralEvidence = analyzeSolidityCompilerAst({ solc, sourceFiles: neutral, observedAt });
check("comment-only-neutral-no-findings", neutralEvidence.findings.length === 0, neutralEvidence.findings.map((finding) => finding.ruleId));

const baselineRisk = mutateSources(readSources(CASES[0].risk), "baseline", CASES[0].id, "risk");
const baselineEvidence = analyzeSolidityCompilerAst({ solc, sourceFiles: baselineRisk, observedAt });
const sourceTamper = baselineRisk.map((row, index) => index === 0 ? { ...row, content: `${row.content}\n// tampered` } : row);
check("tamper-source-binding-rejected", verifySolidityCompilerAstEvidence(baselineEvidence, sourceTamper).ok === false);
const evidenceTamper = structuredClone(baselineEvidence);
evidenceTamper.findings[0].title = `${evidenceTamper.findings[0].title} tampered`;
check("tamper-self-digest-rejected", verifySolidityCompilerAstEvidence(evidenceTamper, baselineRisk).ok === false);
const compilerTamper = structuredClone(baselineEvidence);
compilerTamper.compiler.version = "0.8.25+commit.invalid";
check("wrong-compiler-rejected", verifySolidityCompilerAstEvidence(compilerTamper, baselineRisk).ok === false);

const storageSources = readSources(["storage/StorageV1.sol", "storage/StorageV2Good.sol", "storage/StorageV2Bad.sol"]);
const storageEvidence = analyzeSolidityCompilerAst({ solc, sourceFiles: storageSources, observedAt });
const byName = new Map(storageEvidence.storageLayouts.map((row) => [row.contractName, row]));
const goodLayout = compareStorageLayouts({ before: byName.get("StorageV1"), after: byName.get("StorageV2Good") });
const badLayout = compareStorageLayouts({ before: byName.get("StorageV1"), after: byName.get("StorageV2Bad") });
check("storage-append-only-compatible", goodLayout.compatibleAppendOnlyPrefix === true, goodLayout);
check("storage-reorder-rejected", badLayout.compatibleAppendOnlyPrefix === false && badLayout.issues.length >= 1, badLayout);

const precision = truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : 0;
const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : 0;
const specificity = trueNegative + falsePositive ? trueNegative / (trueNegative + falsePositive) : 0;
const failed = checks.filter((row) => !row.ok);
const core = {
  schemaVersion: "velmere.pass36.a102r44p38.compiler-ast-generalization-benchmark.v1",
  status: failed.length ? "FAIL_R44P38_COMPILER_AST_GENERALIZATION" : "PASS_R44P38_PROJECT_DESIGNED_COMPILER_AST_GENERALIZATION",
  revisionId: "VELMERE_PASS36_A102R44P38_ACTION_REQUIRED_COMPILER_AST_IR_LOCAL_GENERALIZATION24_METAMORPHIC7_AND_AUDIT_ACCURACY_TEST_CYCLE_1_OF_3_NO_LIVE_CREDIT",
  compiler: { version: solc.version(), exact: solc.version().startsWith("0.8.24+commit.e11b9ed9") },
  denominator: {
    cases: CASES.length,
    rolesPerCase: 2,
    variantsPerRole: VARIANTS.length,
    compilerRuns: rows.length * 2 + 2,
    scoredRows: rows.length,
    checks: checks.length,
  },
  metrics: {
    truePositive,
    falseNegative,
    falsePositive,
    trueNegative,
    recall: Number(recall.toFixed(6)),
    precision: Number(precision.toFixed(6)),
    specificity: Number(specificity.toFixed(6)),
  },
  storageLayout: { good: goodLayout, bad: badLayout },
  neutralCommentOnlyFindings: neutralEvidence.findings.length,
  rows,
  checks,
  failed: failed.length,
  creditBoundary: {
    projectDesignedCompilerAstBenchmarkCredit: failed.length === 0,
    independentGroundTruthCredit: false,
    realProtocolAccuracyCredit: false,
    exploitabilityCredit: false,
    customerCredit: false,
    saleCredit: false,
    liveCredit: false,
  },
  truthBoundary: "This benchmark proves exact solc 0.8.24 AST/IR-bound behavior for nine project-designed risk/control pairs across comments, whitespace, renames, equivalent conditions and bounded wrappers. It does not prove recall on unseen real protocols, exploitability, independent accuracy or world-class assurance.",
};
const result = { ...core, receiptSha256: sha256(stable(core)) };
if (outputPath) {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: result.status,
  compiler: result.compiler.version,
  scoredRows: rows.length,
  metrics: result.metrics,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  receiptSha256: result.receiptSha256,
}, null, 2));
process.exitCode = failed.length ? 1 : 0;
