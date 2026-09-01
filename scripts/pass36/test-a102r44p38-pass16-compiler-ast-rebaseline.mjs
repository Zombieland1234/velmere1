#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { analyzeSolidityCompilerAst, verifySolidityCompilerAstEvidence } from "../../lib/security/solidity-compiler-ast-runtime.mjs";

const REVISION = "VELMERE_PASS36_A102R44P38_ACTION_REQUIRED_COMPILER_AST_IR_LOCAL_GENERALIZATION24_METAMORPHIC7_AND_AUDIT_ACCURACY_TEST_CYCLE_1_OF_3_NO_LIVE_CREDIT";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; };
const solcRoot = path.resolve(arg("--solc-root", process.env.VELMERE_SOLC_ROOT ?? ""));
const output = arg("--output");
const require = createRequire(import.meta.url);
const solc = require(path.join(solcRoot, "node_modules/solc"));
const contractsRoot = path.join(ROOT, "fixtures/pass16/contracts");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};

const PAIRS = Object.freeze([
  ["01_reentrant-vault.sol", "02_guarded-vault.sol", "AST_EXTERNAL_INTERACTION_BEFORE_STATE_EFFECT", "reentrancy-ordering"],
  ["03_tx-origin-admin.sol", "04_sender-admin.sol", "AST_TX_ORIGIN_AUTH", "tx-origin-auth"],
  ["05_uninitialized-owner.sol", "06_one-time-initializer.sol", "AST_UNGUARDED_INITIALIZER", "initializer-guard"],
  ["07_unchecked-call.sol", "08_checked-call.sol", "AST_UNCHECKED_LOW_LEVEL_CALL", "unchecked-call"],
  ["09_delegate-user-target.sol", "10_delegate-allowlist.sol", "AST_UNGUARDED_DELEGATECALL_TARGET", "delegatecall-target-policy"],
  ["11_spot-oracle.sol", "12_twap-oracle.sol", "AST_R44P38_INSTANT_SPOT_ORACLE", "spot-oracle"],
  ["13_donation-share-price.sol", "14_prebalance-shares.sol", "AST_R44P38_POST_BALANCE_SHARE_ACCOUNTING", "share-denominator"],
  ["17_open-mint.sol", "18_role-mint.sol", "AST_EXTERNALLY_CALLABLE_MINT_WITHOUT_AUTH", "open-mint"],
  ["23_signature-replay.sol", "24_signature-domain.sol", "AST_SIGNATURE_REPLAY_DOMAIN_OR_NONCE_MISSING", "signature-domain-nonce"],
  ["25_permit-no-deadline.sol", "26_permit-deadline.sol", "AST_PERMIT_DEADLINE_MISSING", "permit-expiry"],
  ["27_storage-collision.sol", "28_namespaced-storage.sol", "AST_R44P38_STORAGE_LAYOUT_COLLISION", "storage-layout"],
  ["29_selfdestruct-admin.sol", "30_immutable-vault.sol", "AST_SELFDESTRUCT_SURFACE", "selfdestruct-surface"],
  ["31_hook-reentrancy.sol", "32_cei-token.sol", "AST_EXTERNAL_INTERACTION_BEFORE_STATE_EFFECT", "hook-reentrancy"],
  ["33_fee-token-mismatch.sol", "34_balance-delta.sol", "AST_R44P38_FEE_TOKEN_ACCOUNTING_MISMATCH", "fee-token-accounting"],
  ["35_blacklist-bypass.sol", "36_policy-consistent.sol", "AST_R44P38_TRANSFER_POLICY_BYPASS", "transfer-policy"],
  ["39_insolvent-withdraw.sol", "40_solvency-guard.sol", "AST_R44P38_INSOLVENT_WITHDRAW", "solvency-guard"],
  ["41_low-quorum.sol", "42_snapshot-quorum.sol", "AST_R44P38_LOW_QUORUM", "governance-quorum"],
  ["47_cross-chain-replay.sol", "48_cross-chain-domain.sol", "AST_R44P38_CROSS_CHAIN_REPLAY", "cross-domain-replay"],
]);
const UNSUPPORTED = Object.freeze([
  ["15_rounding-loss.sol", "16_rounding-guard.sol", "rounding-invariant-needs-domain-spec"],
  ["19_unbounded-loop.sol", "20_paged-loop.sol", "gas-liveness-needs-bounds-and-workload"],
  ["21_timestamp-lottery.sol", "22_deadline-window.sol", "timestamp-intent-needs-business-context"],
  ["37_no-pause.sol", "38_pausable.sol", "absence-of-emergency-control-needs-system-requirement"],
  ["43_front-run-reveal.sol", "44_commit-reveal.sol", "ordering-risk-needs-protocol-state-model"],
  ["45_blockhash-random.sol", "46_vrf-consumer.sol", "randomness-quality-needs-oracle-and-chain-context"],
  ["49_minimal-vault-clean.sol", "50_external-dependency-ambiguous.sol", "clean-and-ambiguous-boundary-cases"],
]);

function runFile(fileName, { storageComparisonPairs = [] } = {}) {
  const sourcePath = path.join(contractsRoot, fileName);
  const content = fs.readFileSync(sourcePath, "utf8");
  const sourceFiles = [{ path: fileName, content }];
  const evidence = analyzeSolidityCompilerAst({
    solc,
    sourceFiles,
    storageComparisonPairs,
    observedAt: "2026-08-09T00:00:00.000Z",
  });
  const verification = verifySolidityCompilerAstEvidence(evidence, sourceFiles);
  return {
    fileName,
    byteLength: Buffer.byteLength(content),
    sourceSha256: sha256(content),
    compilationStatus: evidence.compilation.status,
    compilerErrors: evidence.compilation.errorCount,
    compilerWarnings: evidence.compilation.warningCount,
    evidenceSha256: evidence.evidenceSha256,
    verified: verification.ok,
    rules: evidence.findings.map((row) => row.ruleId),
    findings: evidence.findings.map((row) => ({ ruleId: row.ruleId, severity: row.severity, line: row.line, functionName: row.functionName })),
  };
}

const scoredRows = [];
for (const [riskFile, controlFile, primaryRule, family] of PAIRS) {
  const riskOptions = riskFile === "27_storage-collision.sol"
    ? { storageComparisonPairs: [{ baselineContract: "ImplV1", candidateContract: "ImplV2" }] }
    : {};
  const risk = runFile(riskFile, riskOptions);
  const control = runFile(controlFile);
  const riskDetected = risk.rules.includes(primaryRule);
  const controlDetected = control.rules.includes(primaryRule);
  scoredRows.push({
    family,
    primaryRule,
    risk: { ...risk, expectedPrimarySignal: true, primarySignalDetected: riskDetected },
    control: { ...control, expectedPrimarySignal: false, primarySignalDetected: controlDetected },
    pairPassed: risk.verified && control.verified && riskDetected && !controlDetected,
  });
}

const unsupportedRows = UNSUPPORTED.map(([riskFile, controlFile, reason]) => ({
  risk: runFile(riskFile),
  control: runFile(controlFile),
  status: "OUT_OF_CURRENT_BOUNDED_SIGNAL_SCOPE",
  reason,
  scoredForAccuracy: false,
}));

const targetRows = scoredRows.flatMap((row) => [
  { role: "risk", expected: true, detected: row.risk.primarySignalDetected },
  { role: "control", expected: false, detected: row.control.primarySignalDetected },
]);
const truePositive = targetRows.filter((row) => row.expected && row.detected).length;
const falseNegative = targetRows.filter((row) => row.expected && !row.detected).length;
const trueNegative = targetRows.filter((row) => !row.expected && !row.detected).length;
const falsePositive = targetRows.filter((row) => !row.expected && row.detected).length;
const safeRatio = (numerator, denominator) => denominator ? numerator / denominator : null;
const mediumOrHigher = new Set(["critical", "high", "medium"]);
const highOrHigher = new Set(["critical", "high"]);
const controlAnyMediumPlus = scoredRows.filter((row) => row.control.findings.some((finding) => mediumOrHigher.has(finding.severity))).length;
const controlAnyHighPlus = scoredRows.filter((row) => row.control.findings.some((finding) => highOrHigher.has(finding.severity))).length;
const riskAnyMediumPlus = scoredRows.filter((row) => row.risk.findings.some((finding) => mediumOrHigher.has(finding.severity))).length;
const riskAnyHighPlus = scoredRows.filter((row) => row.risk.findings.some((finding) => highOrHigher.has(finding.severity))).length;
const allFiles = [...scoredRows.flatMap((row) => [row.risk, row.control]), ...unsupportedRows.flatMap((row) => [row.risk, row.control])];
const failures = scoredRows.filter((row) => !row.pairPassed);
const core = {
  schemaVersion: "velmere.pass36.a102r44p38.pass16-compiler-ast-rebaseline.v1",
  revisionId: REVISION,
  status: failures.length ? "FAIL_R44P38_PASS16_COMPILER_AST_REBASELINE" : "PASS_R44P38_PASS16_COMPILER_AST_REBASELINE",
  compiler: { family: "solc-js", version: solc.version(), exact: String(solc.version()).startsWith("0.8.24+commit.e11b9ed9") },
  denominator: {
    physicalFiles: 50,
    supportedPairs: scoredRows.length,
    scoredFiles: targetRows.length,
    unsupportedPairs: unsupportedRows.length,
    unsupportedFiles: unsupportedRows.length * 2,
    fullCorpusExecuted: allFiles.length,
  },
  primaryRuleMetrics: {
    truePositive,
    falseNegative,
    trueNegative,
    falsePositive,
    recall: safeRatio(truePositive, truePositive + falseNegative),
    precision: safeRatio(truePositive, truePositive + falsePositive),
    specificity: safeRatio(trueNegative, trueNegative + falsePositive),
    falsePositiveRate: safeRatio(falsePositive, falsePositive + trueNegative),
    passedPairs: scoredRows.length - failures.length,
    failedPairs: failures.length,
  },
  allFindingDiagnostics: {
    riskPairsWithAnyMediumPlus: riskAnyMediumPlus,
    riskPairsWithAnyHighPlus: riskAnyHighPlus,
    controlPairsWithAnyMediumPlus: controlAnyMediumPlus,
    controlPairsWithAnyHighPlus: controlAnyHighPlus,
    note: "These counts include secondary bounded signals. They are diagnostics, not independent false-positive labels.",
  },
  scoredRows,
  unsupportedRows,
  corpusBinding: {
    aggregateSha256: sha256(stable(allFiles.map((row) => ({ fileName: row.fileName, sourceSha256: row.sourceSha256, evidenceSha256: row.evidenceSha256 })).sort((a, b) => a.fileName.localeCompare(b.fileName)))),
    everyFileCompiled: allFiles.every((row) => row.compilationStatus === "EXECUTED" && row.compilerErrors === 0),
    everyEvidenceVerified: allFiles.every((row) => row.verified === true),
  },
  creditBoundary: {
    historicalProjectFixtureRebaselineCredit: failures.length === 0,
    independentGroundTruthCredit: false,
    unseenRealProtocolCredit: false,
    exploitabilityCredit: false,
    customerCredit: false,
    saleCredit: false,
    liveCredit: false,
    worldClassCredit: false,
  },
  truthBoundary: "All 50 historical project fixtures were compiled and verified. Accuracy metrics cover only 18 explicitly supported risk/control pairs and target-specific primary rules. Seven pairs remain outside the bounded signal scope. The corpus and labels are project-authored, not independent ground truth or unseen real protocols.",
};
const receipt = { ...core, receiptSha256: sha256(stable(core)) };
if (output) {
  const absolute = path.resolve(output);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(receipt, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
if (failures.length || !receipt.corpusBinding.everyFileCompiled || !receipt.corpusBinding.everyEvidenceVerified) process.exit(1);
