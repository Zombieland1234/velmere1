#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { analyzeSolidityCompilerAst, COMPILER_AST_SIGNAL_CATALOG, verifyCompilerAstAnalysisShape } from "../../lib/security/solidity-compiler-ast-generalization.mjs";
import { R44P38_BENCHMARK_CASES, R44P38_TRANSFORMS, buildR44P38CaseSources } from "../../fixtures/pass36/r44p38-compiler-ast/benchmark-cases.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const argument = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const solcRoot = path.resolve(argument("--solc-root", process.env.VELMERE_SOLC_ROOT ?? ""));
const outRoot = path.resolve(argument("--out", path.join(ROOT, "artifacts/pass36/r44p38-compiler-ast")));
const resume = args.includes("--resume");
if (!solcRoot || !fs.existsSync(path.join(solcRoot, "node_modules/solc/index.js"))) throw new Error(`exact_solc_root_missing:${solcRoot}`);
const require = createRequire(import.meta.url);
const solc = require(path.join(solcRoot, "node_modules/solc"));
const compilerVersion = solc.version();
if (!String(compilerVersion).startsWith("0.8.24+commit.e11b9ed9")) throw new Error(`unexpected_solc_version:${compilerVersion}`);

const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

function compileSources(sources, includeIr = false) {
  const input = {
    language: "Solidity",
    sources: Object.fromEntries(Object.entries(sources).map(([sourcePath, content]) => [sourcePath, { content }])),
    settings: {
      optimizer: { enabled: false, runs: 200 },
      viaIR: false,
      outputSelection: { "*": { "*": includeIr ? ["abi", "storageLayout", "ir", "irOptimized"] : ["abi", "storageLayout"], "": ["ast"] } },
    },
  };
  const raw = solc.compile(JSON.stringify(input));
  const output = JSON.parse(raw);
  const errors = (output.errors ?? []).filter((row) => row.severity === "error");
  return { input, output, errors, rawSha256: sha256(raw) };
}

const caseReceipts = [];
const evaluations = [];
let compilationCount = 0;
let resumedCompilerRuns = 0;
for (const caseRow of R44P38_BENCHMARK_CASES) {
  const caseReceiptPath = path.join(outRoot, "cases", `${caseRow.caseId}.json`);
  if (resume && fs.existsSync(caseReceiptPath)) {
    const cached = JSON.parse(fs.readFileSync(caseReceiptPath, "utf8"));
    const digest = sha256(stable((cached.evaluations ?? []).map((row) => ({ evaluationId: row.evaluationId, pass: row.pass, signals: row.signals, sourceBundleSha256: row.sourceBundleSha256, compilerOutputBindingSha256: row.compilerOutputBindingSha256 }))));
    const valid = cached.schemaVersion === "velmere.pass36.a102r44p38.compiler-ast-case-receipt.v1"
      && cached.caseId === caseRow.caseId
      && cached.family === caseRow.family
      && cached.split === caseRow.split
      && Array.isArray(cached.evaluations)
      && cached.evaluations.length === R44P38_TRANSFORMS.length * 2
      && cached.failed === 0
      && cached.passed === cached.evaluations.length
      && cached.caseDigestSha256 === digest
      && cached.evaluations.every((row) => row.pass === true && String(row.compilerVersion).startsWith("0.8.24+commit.e11b9ed9"));
    if (!valid) throw new Error(`invalid_resume_receipt:${caseRow.caseId}`);
    caseReceipts.push(cached);
    evaluations.push(...cached.evaluations);
    resumedCompilerRuns += cached.evaluations.length;
    continue;
  }
  const caseEvaluations = [];
  for (const transform of R44P38_TRANSFORMS) {
    for (const risk of [true, false]) {
      const variant = risk ? "RISK" : "CONTROL";
      const built = buildR44P38CaseSources(caseRow, risk, transform);
      const includeIr = caseRow.split === "DISCLOSED_LOCAL_TUNING" && risk && transform === "baseline";
      const compiled = compileSources(built.sources, includeIr);
      compilationCount += 1;
      if (compiled.errors.length) {
        throw new Error(`compiler_error:${caseRow.caseId}:${variant}:${transform}:${sha256(stable(compiled.errors))}`);
      }
      const analysis = analyzeSolidityCompilerAst({
        compilerOutput: compiled.output,
        sources: built.sources,
        storageComparisonPairs: built.storagePairs,
      });
      if (!verifyCompilerAstAnalysisShape(analysis)) throw new Error(`analysis_shape_invalid:${caseRow.caseId}:${variant}:${transform}`);
      const targetFindings = analysis.findings.filter((finding) => finding.signalId === caseRow.family);
      const targetDetected = targetFindings.length > 0;
      const targetPassed = risk ? targetDetected : !targetDetected;
      const severityPassed = !risk || targetFindings.every((finding) => finding.severity === caseRow.expectedSeverity);
      const unexpectedControlSignals = risk ? [] : analysis.signals.filter((signalId) => signalId !== caseRow.family);
      const noUnexpectedControlSignals = unexpectedControlSignals.length === 0;
      const evaluation = {
        evaluationId: `${caseRow.caseId}:${variant}:${transform}`,
        caseId: caseRow.caseId,
        family: caseRow.family,
        split: caseRow.split,
        variant,
        transform,
        expectedTarget: risk,
        expectedSeverity: caseRow.expectedSeverity,
        targetDetected,
        targetFindingCount: targetFindings.length,
        targetPassed,
        severityPassed,
        noUnexpectedControlSignals,
        unexpectedControlSignals,
        signals: analysis.signals,
        findings: analysis.findings,
        sourceBundleSha256: analysis.sourceBundleSha256,
        compilerOutputBindingSha256: analysis.compilerOutputBindingSha256,
        compilerRawSha256: compiled.rawSha256,
        compilerVersion,
        irSampleIncluded: includeIr,
        sourceFiles: Object.keys(built.sources).sort().map((sourcePath) => ({ sourcePath, content: built.sources[sourcePath], byteLength: Buffer.byteLength(built.sources[sourcePath]), sha256: sha256(built.sources[sourcePath]) })),
        storageComparisonPairs: built.storagePairs,
        pass: targetPassed && severityPassed && noUnexpectedControlSignals,
        truthBoundary: "Local compiler-backed synthetic/developer-holdout evaluation only. No independent labels, real protocol or customer accuracy credit.",
      };
      evaluations.push(evaluation);
      caseEvaluations.push(evaluation);
    }
  }
  const caseReceipt = {
    schemaVersion: "velmere.pass36.a102r44p38.compiler-ast-case-receipt.v1",
    caseId: caseRow.caseId,
    family: caseRow.family,
    split: caseRow.split,
    expectedSeverity: caseRow.expectedSeverity,
    transforms: R44P38_TRANSFORMS,
    evaluations: caseEvaluations,
    passed: caseEvaluations.filter((row) => row.pass).length,
    failed: caseEvaluations.filter((row) => !row.pass).length,
    caseDigestSha256: sha256(stable(caseEvaluations.map((row) => ({ evaluationId: row.evaluationId, pass: row.pass, signals: row.signals, sourceBundleSha256: row.sourceBundleSha256, compilerOutputBindingSha256: row.compilerOutputBindingSha256 })) )),
  };
  caseReceipts.push(caseReceipt);
  writeJson(caseReceiptPath, caseReceipt);
}

const metricsFor = (rows) => {
  const p = rows.filter((row) => row.expectedTarget);
  const n = rows.filter((row) => !row.expectedTarget);
  const tp = p.filter((row) => row.targetDetected).length;
  const fn = p.length - tp;
  const tn = n.filter((row) => !row.targetDetected && row.noUnexpectedControlSignals).length;
  const fp = n.length - tn;
  return {
    evaluations: rows.length,
    positives: p.length,
    negatives: n.length,
    truePositives: tp,
    falseNegatives: fn,
    trueNegatives: tn,
    falsePositives: fp,
    recall: p.length ? tp / p.length : null,
    specificity: n.length ? tn / n.length : null,
    falsePositiveRate: n.length ? fp / n.length : null,
    precision: tp + fp ? tp / (tp + fp) : null,
    exactSeverity: p.filter((row) => row.severityPassed).length,
    passed: rows.filter((row) => row.pass).length,
    failed: rows.filter((row) => !row.pass).length,
  };
};
const tuningRows = evaluations.filter((row) => row.split === "DISCLOSED_LOCAL_TUNING");
const holdoutRows = evaluations.filter((row) => row.split === "LOCAL_DEVELOPER_HOLDOUT_NOT_INDEPENDENT");
const byFamily = Object.fromEntries(Object.keys(COMPILER_AST_SIGNAL_CATALOG).map((family) => [family, metricsFor(evaluations.filter((row) => row.family === family))]));
const aggregateDigestSha256 = sha256(stable(evaluations.map((row) => ({
  evaluationId: row.evaluationId,
  pass: row.pass,
  targetDetected: row.targetDetected,
  severityPassed: row.severityPassed,
  signals: row.signals,
  sourceBundleSha256: row.sourceBundleSha256,
  compilerOutputBindingSha256: row.compilerOutputBindingSha256,
}))));
const ledger = {
  schemaVersion: "velmere.pass36.a102r44p38.compiler-ast-generalization-ledger.v1",
  revisionId: "VELMERE_PASS36_A102R44P38_ACTION_REQUIRED_COMPILER_AST_IR_LOCAL_GENERALIZATION24_METAMORPHIC7_AND_AUDIT_ACCURACY_TEST_CYCLE_1_OF_3_NO_LIVE_CREDIT",
  generatedAt: "2026-08-09T00:00:00.000Z",
  status: evaluations.every((row) => row.pass) ? "PASS_LOCAL_COMPILER_AST_GENERALIZATION" : "FAIL_LOCAL_COMPILER_AST_GENERALIZATION",
  compiler: {
    family: "solc-js",
    version: compilerVersion,
    expectedVersionPrefix: "0.8.24+commit.e11b9ed9",
    exactVersion: String(compilerVersion).startsWith("0.8.24+commit.e11b9ed9"),
  },
  denominator: {
    casePairs: R44P38_BENCHMARK_CASES.length,
    disclosedTuningPairs: R44P38_BENCHMARK_CASES.filter((row) => row.split === "DISCLOSED_LOCAL_TUNING").length,
    localDeveloperHoldoutPairs: R44P38_BENCHMARK_CASES.filter((row) => row.split === "LOCAL_DEVELOPER_HOLDOUT_NOT_INDEPENDENT").length,
    signalFamilies: Object.keys(COMPILER_AST_SIGNAL_CATALOG).length,
    transforms: R44P38_TRANSFORMS.length,
    compilerRuns: compilationCount + resumedCompilerRuns,
    compilerRunsCurrentProcess: compilationCount,
    compilerRunsResumedFromExactCaseReceipts: resumedCompilerRuns,
    irSampleCompilerRuns: evaluations.filter((row) => row.irSampleIncluded).length,
    targetSignalEvaluations: evaluations.length,
  },
  metrics: {
    overall: metricsFor(evaluations),
    disclosedTuning: metricsFor(tuningRows),
    localDeveloperHoldout: metricsFor(holdoutRows),
    byFamily,
  },
  aggregateDigestSha256,
  caseReceipts: caseReceipts.map((row) => ({ caseId: row.caseId, family: row.family, split: row.split, passed: row.passed, failed: row.failed, caseDigestSha256: row.caseDigestSha256 })),
  creditBoundary: {
    localCompilerAstCredit: true,
    localSyntheticGeneralizationCredit: true,
    independentGroundTruthCredit: false,
    realProtocolAccuracyCredit: false,
    independentReviewerCredit: false,
    customerCredit: false,
    paidSaleCredit: false,
    liveCredit: false,
    worldClassCredit: false,
  },
  truthBoundary: "The benchmark compiles 24 local risk/control pairs under seven metamorphic source transformations and evaluates 16 bounded compiler-AST/storage-layout signal families. Sixteen pairs were disclosed during local development and eight are a developer-created holdout, not independent ground truth. No real deployed protocol, exploitability, customer, paid-sale or world-class accuracy claim is allowed.",
};
writeJson(path.join(outRoot, "R44P38_COMPILER_AST_GENERALIZATION_LEDGER.json"), ledger);
writeJson(path.join(outRoot, "R44P38_COMPILER_AST_METRICS.json"), ledger.metrics);
process.stdout.write(`${JSON.stringify(ledger, null, 2)}\n`);
if (ledger.status !== "PASS_LOCAL_COMPILER_AST_GENERALIZATION") process.exit(1);
