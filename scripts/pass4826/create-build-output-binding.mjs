#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { computePass4823SourceTree } from "../pass4823/typecheck-source-contract.mjs";
import { BUILD_BINDING_SCHEMA, sealBuildBinding } from "./dual-build-gate-contract.mjs";
import { collectReleaseInventory } from "./release-package-contract.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const engine = process.argv[2];
if (!new Set(["webpack", "turbopack"]).has(engine)) throw new Error("pass4826_build_engine_invalid");
const root = process.cwd();
const liveBuildReceiptPath = path.join(root, "artifacts/pass4805/PASS4805_PRODUCTION_BUILD.json");
const artifactDir = path.join(root, "artifacts/pass4826");
const engineUpper = engine.toUpperCase();
const buildReceiptSnapshotPath = path.join(artifactDir, `PASS4826_${engineUpper}_BUILD_RECEIPT_SNAPSHOT.json`);
const outputPath = path.join(artifactDir, `PASS4826_${engineUpper}_BUILD_OUTPUT_BINDING.json`);
const requiredNode = `v${readFileSync(path.join(root, ".nvmrc"), "utf8").trim().replace(/^v/u, "")}`;
const buildReceiptBytes = readFileSync(liveBuildReceiptPath);
const buildReceipt = JSON.parse(buildReceiptBytes.toString("utf8"));
const sourceBefore = computePass4823SourceTree(root);
const outputBefore = collectReleaseInventory(path.join(root, ".next"));
const outputAfter = collectReleaseInventory(path.join(root, ".next"));
const sourceAfter = computePass4823SourceTree(root);
const selectedAttempt = Array.isArray(buildReceipt.attempts)
  ? buildReceipt.attempts.find((attempt) => attempt.engine === engine && attempt.exitCode === 0 && attempt.buildIdMatches === true)
  : null;
const logPath = selectedAttempt?.logPath ? path.resolve(root, selectedAttempt.logPath) : null;
const logBytes = logPath ? readFileSync(logPath) : null;
const exactRuntime = process.version === requiredNode && buildReceipt.exactNode === true;
const sourceUnchanged =
  sourceBefore.sha256 === sourceAfter.sha256 &&
  buildReceipt.sourceFingerprint === sourceBefore.sha256 &&
  buildReceipt.postBuildSourceFingerprint === sourceBefore.sha256 &&
  buildReceipt.sourceUnchanged === true;
const outputUnchanged =
  outputBefore.aggregateSha256 === outputAfter.aggregateSha256 &&
  outputBefore.pathSetSha256 === outputAfter.pathSetSha256 &&
  outputBefore.fileCount === outputAfter.fileCount &&
  outputBefore.byteLength === outputAfter.byteLength;
const buildSucceeded = Boolean(
  buildReceipt.id === "pass4805-source-bound-production-build-v1" &&
  buildReceipt.ok === true &&
  buildReceipt.releaseEligible === true &&
  buildReceipt.selectedEngine === engine &&
  selectedAttempt &&
  logBytes &&
  outputBefore.fileCount > 0
);
mkdirSync(artifactDir, { recursive: true });
writeFileSync(buildReceiptSnapshotPath, buildReceiptBytes);
const snapshotBytes = readFileSync(buildReceiptSnapshotPath);
const core = {
  schemaVersion: BUILD_BINDING_SCHEMA,
  engine,
  status: buildSucceeded && exactRuntime && sourceUnchanged && outputUnchanged ? "PASS" : "FAIL",
  buildSucceeded,
  buildReceiptBound: true,
  buildReceiptPath: path.relative(root, buildReceiptSnapshotPath).replaceAll(path.sep, "/"),
  buildReceiptSha256: sha256(snapshotBytes),
  buildLogPath: selectedAttempt?.logPath ?? null,
  buildLogSha256: logBytes ? sha256(logBytes) : null,
  exactRuntime,
  node: process.version,
  requiredNode,
  sourceUnchanged,
  sourceTreeSha256: sourceBefore.sha256,
  postRunSourceTreeSha256: sourceAfter.sha256,
  outputUnchanged,
  output: {
    sha256: outputBefore.aggregateSha256,
    pathSetSha256: outputBefore.pathSetSha256,
    fileCount: outputBefore.fileCount,
    byteLength: outputBefore.byteLength,
    scope: ".next_complete_file_tree",
  },
  buildId: buildReceipt.buildId ?? null,
  attempt: selectedAttempt ?? null,
};
const receipt = sealBuildBinding(core);
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  engine,
  status: receipt.status,
  outputPath: path.relative(root, outputPath),
  buildReceiptSnapshotPath: path.relative(root, buildReceiptSnapshotPath),
  sourceTreeSha256: receipt.sourceTreeSha256,
  output: receipt.output,
}, null, 2));
if (receipt.status !== "PASS") process.exitCode = 1;
