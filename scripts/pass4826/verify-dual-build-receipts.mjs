#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { computePass4823SourceTree } from "../pass4823/typecheck-source-contract.mjs";
import { evaluateDualBuildGate, sealDualBuildGate } from "./dual-build-gate-contract.mjs";
import { verifyExternalBuildEvidence } from "./build-evidence-file-verifier.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1] || process.argv[index + 1].startsWith("--")) throw new Error(`argument_value_missing:${name}`);
  return process.argv[index + 1];
}

function readReceipt(relativePath) {
  try { return JSON.parse(readFileSync(path.resolve(relativePath), "utf8")); }
  catch { return null; }
}

const root = process.cwd();
const webpackPath = argument("--webpack", "artifacts/pass4826/PASS4826_WEBPACK_BUILD_OUTPUT_BINDING.json");
const turbopackPath = argument("--turbopack", "artifacts/pass4826/PASS4826_TURBOPACK_BUILD_OUTPUT_BINDING.json");
const outputPath = path.resolve(argument("--output", "artifacts/pass4826/PASS4826_DUAL_BUILD_GATE.json"));
const sourceTree = computePass4823SourceTree(root);
const receipts = {
  webpack: readReceipt(webpackPath),
  turbopack: readReceipt(turbopackPath),
};
const externalEvidence = {
  webpack: verifyExternalBuildEvidence({ root, engine: "webpack", currentSourceTreeSha256: sourceTree.sha256, binding: receipts.webpack }),
  turbopack: verifyExternalBuildEvidence({ root, engine: "turbopack", currentSourceTreeSha256: sourceTree.sha256, binding: receipts.turbopack }),
};
const core = evaluateDualBuildGate(sourceTree.sha256, receipts, externalEvidence);
const receipt = sealDualBuildGate({
  ...core,
  evidence: {
    webpackPath,
    turbopackPath,
    externalEvidence,
  },
  sourceTreeFileCount: sourceTree.fileCount,
  sourceTreeByteLength: sourceTree.totalBytes,
});
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  status: receipt.status,
  dualBuildGatePassed: receipt.dualBuildGatePassed,
  blockers: receipt.blockers,
  externalEvidence,
  outputPath: path.relative(root, outputPath),
  receiptFileSha256: createHash("sha256").update(readFileSync(outputPath)).digest("hex"),
}, null, 2));
process.exit(receipt.ok ? 0 : 1);
