#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { R44P39_PROTOCOL_CASES, buildR44P39ProtocolCaseSources } from "../../fixtures/pass36/r44p39-multifile-protocol/benchmark-cases.mjs";
import { analyzeSolidityCompilerAst } from "../../lib/security/solidity-compiler-ast-runtime.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; };
const solcRoot = path.resolve(arg("--solc-root", process.env.VELMERE_SOLC_ROOT ?? ""));
const output = arg("--output");
const require = createRequire(import.meta.url);
const solc = require(path.join(solcRoot, "node_modules/solc"));
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const sha256 = (value) => `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
const rows = [];
for (const caseRow of R44P39_PROTOCOL_CASES) {
  for (const risk of [true, false]) {
    const built = buildR44P39ProtocolCaseSources(caseRow, risk);
    const evidence = analyzeSolidityCompilerAst({
      solc,
      sourceFiles: built.sourceFiles,
      storageComparisonPairs: built.storagePairs,
      observedAt: "2026-08-09T00:00:00.000Z",
    });
    const signalRows = evidence.r44p38Generalization?.observedSignals ?? [];
    const observed = signalRows.includes(caseRow.family);
    const expected = risk;
    rows.push({
      caseId: caseRow.caseId,
      family: caseRow.family,
      split: caseRow.split,
      variant: risk ? "RISK" : "CONTROL",
      sourceFiles: built.sourceFiles.length,
      contracts: evidence.compilation.contracts,
      compilerVersion: evidence.compiler.version,
      expectedSignal: expected,
      observedSignal: observed,
      passed: observed === expected,
      findingCount: evidence.findings.length,
      evidenceSha256: evidence.evidenceSha256,
      sourceBundleSha256: evidence.inputIdentity.sourceBundleSha256,
      compilerOutputSha256: evidence.compilation.outputSha256,
    });
  }
}
const tp = rows.filter((row) => row.expectedSignal && row.observedSignal).length;
const fn = rows.filter((row) => row.expectedSignal && !row.observedSignal).length;
const tn = rows.filter((row) => !row.expectedSignal && !row.observedSignal).length;
const fp = rows.filter((row) => !row.expectedSignal && row.observedSignal).length;
const failed = rows.filter((row) => !row.passed);
const metrics = {
  truePositive: tp,
  falseNegative: fn,
  trueNegative: tn,
  falsePositive: fp,
  recall: tp + fn ? tp / (tp + fn) : null,
  precision: tp + fp ? tp / (tp + fp) : null,
  specificity: tn + fp ? tn / (tn + fp) : null,
  falsePositiveRate: tn + fp ? fp / (tn + fp) : null,
};
const core = {
  schemaVersion: "velmere.pass36.a102r44p39.multifile-protocol-accuracy.v1",
  revisionId: "VELMERE_PASS36_A102R44P39_ACTION_REQUIRED_AUDIT_PACKET_PARITY_BYTECODE_PROXY_BINDING_AND_EXTERNAL_ACCURACY_REGISTRY_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT",
  status: failed.length ? "FAIL_R44P39_MULTI_FILE_PROTOCOL_ACCURACY" : "PASS_R44P39_MULTI_FILE_PROTOCOL_ACCURACY",
  compilerVersion: solc.version(),
  cases: R44P39_PROTOCOL_CASES.length,
  evaluatedRows: rows.length,
  multiFileRows: rows.filter((row) => row.sourceFiles >= 3).length,
  passed: rows.length - failed.length,
  failed: failed.length,
  metrics,
  rows,
  creditBoundary: {
    localMultiFileProtocolCredit: failed.length === 0,
    internalHoldoutCredit: failed.length === 0,
    independentGroundTruthCredit: false,
    realProtocolAccuracyCredit: false,
    customerCredit: false,
    saleCredit: false,
    liveCredit: false,
    worldClassCredit: false,
  },
  truthBoundary: "The corpus uses multi-file compiler inputs and inheritance but remains authored inside the Velmere development process. It is not independent ground truth or real deployed protocol accuracy.",
};
const receipt = { ...core, receiptSha256: sha256(stable(core)) };
if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(path.resolve(output), `${JSON.stringify(receipt, null, 2)}\n`); }
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
