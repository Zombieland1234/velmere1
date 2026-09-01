#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { computePass4823SourceTree } from "../pass4823/typecheck-source-contract.mjs";
import { verifyReleaseArchive } from "./release-package-contract.mjs";
import {
  REPEATED_DETERMINISM_REQUIRED_RUNS,
  sealRepeatedDeterminismEvidence,
  sha256Determinism,
  summarizeRepeatedDeterminism,
} from "./repeated-determinism-contract.mjs";

const ROOT = process.cwd();
const REQUIRED_NODE = "v24.18.0";
const OUTPUT_PATH = path.join(ROOT, "artifacts/pass4826/PASS4826_REPEATED_RUN_DETERMINISM_EVIDENCE.json");
const TEMP_ROOT = path.join("/tmp", `velmere-pass4826-determinism-${process.pid}`);
if (!TEMP_ROOT.startsWith("/tmp/velmere-pass4826-determinism-")) throw new Error("determinism_temp_root_invalid");

const sourceBefore = computePass4823SourceTree(ROOT);
const runs = [];
mkdirSync(TEMP_ROOT, { recursive: false });
try {
  for (let index = 1; index <= REPEATED_DETERMINISM_REQUIRED_RUNS; index += 1) {
    const archivePath = path.join(TEMP_ROOT, `run-${String(index).padStart(2, "0")}.zip`);
    const receiptPath = path.join(TEMP_ROOT, `run-${String(index).padStart(2, "0")}-package.json`);
    const verificationReceiptPath = path.join(TEMP_ROOT, `run-${String(index).padStart(2, "0")}-verification.json`);
    const startedAt = Date.now();
    const run = spawnSync(process.execPath, [
      "scripts/pass4826/package-deterministic-release.mjs",
      "--source-root", ROOT,
      "--archive", archivePath,
      "--receipt", receiptPath,
      "--verification-receipt", verificationReceiptPath,
      "--overwrite",
    ], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 10 * 60_000,
      maxBuffer: 16 * 1024 * 1024,
      killSignal: "SIGTERM",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", VELMERE_DETERMINISM_SEED: "0" },
    });
    let packageReceipt = null;
    let verification = null;
    try {
      packageReceipt = JSON.parse(readFileSync(receiptPath, "utf8"));
      verification = verifyReleaseArchive(archivePath, { sourceRoot: ROOT, allowedDynamicExcludedPaths: [] });
    } catch {
      // The normalized failed run below remains release-blocking.
    }
    const normalized = {
      index,
      seed: 0,
      executionOrder: index,
      engine: "repo_owned_zip_store_v1",
      exitCode: run.status ?? 1,
      signal: run.signal ?? null,
      timedOut: run.error?.code === "ETIMEDOUT",
      durationMs: Date.now() - startedAt,
      packageStatus: packageReceipt?.status ?? "FAIL",
      verificationStatus: verification?.status ?? "FAIL",
      sourceDigest: packageReceipt?.sourceTreeBeforeSha256 ?? null,
      outputDigest: verification?.payloadAggregateSha256 ?? null,
      releaseDigest: verification?.archiveSha256 ?? null,
      payloadFileCount: verification?.payloadFileCount ?? null,
      payloadByteLength: verification?.payloadByteLength ?? null,
      stdoutSha256: sha256Determinism(String(run.stdout ?? "")),
      stderrSha256: sha256Determinism(String(run.stderr ?? "")),
    };
    runs.push(normalized);
    console.log(`[PASS4826 determinism ${index}/${REPEATED_DETERMINISM_REQUIRED_RUNS}] ${normalized.exitCode === 0 && normalized.verificationStatus === "PASS" ? "PASS" : "FAIL"}`);
    if (normalized.exitCode !== 0 || normalized.timedOut || normalized.verificationStatus !== "PASS") break;
  }
} finally {
  rmSync(TEMP_ROOT, { recursive: true, force: true });
}

const summary = summarizeRepeatedDeterminism(runs);
const sourceAfter = computePass4823SourceTree(ROOT);
const sourceUnchanged = sourceBefore.sha256 === sourceAfter.sha256;
const exactRuntime = process.version === REQUIRED_NODE;
const passed = summary.passed && sourceUnchanged && exactRuntime;
const core = {
  schemaVersion: "velmere.pass4826.world-class-evidence.v1",
  requirementId: "repeated_run_determinism",
  status: passed ? "PASS" : "FAIL",
  passed,
  sourceTreeSha256: sourceBefore.sha256,
  postRunSourceTreeSha256: sourceAfter.sha256,
  sourceUnchanged,
  claims: {
    determinismPassed: passed,
    allRunsPassed: summary.failedRunCount === 0 && summary.executedRunCount === summary.requiredRunCount,
    sameEngineRepeated: runs.length > 0 && new Set(runs.map((run) => run.engine)).size === 1,
    seedsRecorded: runs.length > 0 && runs.every((run) => Number.isInteger(run.seed)),
    executionOrderRecorded: runs.every((run, index) => run.executionOrder === index + 1),
    requiredRunCount: summary.requiredRunCount,
    executedRunCount: summary.executedRunCount,
    passedRunCount: summary.passedRunCount,
    failedRunCount: summary.failedRunCount,
    flakeCount: summary.flakeCount,
    uniqueSourceDigestCount: summary.uniqueSourceDigestCount,
    uniqueOutputDigestCount: summary.uniqueOutputDigestCount,
    uniqueReleaseDigestCount: summary.uniqueReleaseDigestCount,
  },
  runtime: { node: process.version, requiredNode: REQUIRED_NODE, exactRuntime },
  runPolicy: {
    engine: "repo_owned_zip_store_v1",
    seed: 0,
    order: "strictly_sequential_1_to_10",
    outputStorage: "ephemeral_outside_source_tree",
  },
  runs,
  limitations: [
    "This proves ten identical local executions of the repository-owned deterministic packager, not clean-room infrastructure diversity.",
    "Builder identity, OS network namespace isolation and external signatures remain separate release requirements.",
  ],
  generatedAt: new Date().toISOString(),
};
const receipt = sealRepeatedDeterminismEvidence(core);
mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, ...summary, sourceUnchanged, exactRuntime, output: path.relative(ROOT, OUTPUT_PATH) }, null, 2));
process.exit(passed ? 0 : 1);
