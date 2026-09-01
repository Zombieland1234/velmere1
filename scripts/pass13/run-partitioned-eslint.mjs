#!/usr/bin/env node

import path from "node:path";
import {
  boundedTextTail,
  resolveInstalledEslintCli,
  runInstalledEslint,
} from "./eslint-cli-runtime.mjs";
import {
  discoverLintFiles,
  partitionFiles,
  planSubBatches,
  generatedIgnoreMatch,
  ESLINT_FILE_CHUNK_SIZE,
  ESLINT_MAX_BATCH_FILES,
  ESLINT_MAX_BATCH_BYTES,
  GENERATED_IGNORE_ALLOWLIST,
} from "./eslint-partition-plan.mjs";
import { treeDigest, writeJson, PASS13_DIR, now, rel } from "./common.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
function valueOf(name) {
  const prefix = `${name}=`;
  const match = args.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}
function positiveInteger(name, fallback = null) {
  const raw = valueOf(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name.slice(2)}_invalid`);
  return value;
}

const files = discoverLintFiles(root);
const chunks = partitionFiles(files, ESLINT_FILE_CHUNK_SIZE);
const partition = positiveInteger("--partition");
const start = partition ?? positiveInteger("--partition-start", 1);
const end = partition ?? positiveInteger("--partition-end", chunks.length);
if (start > end || end > chunks.length) throw new Error("eslint_partition_range_invalid");
const output = valueOf("--output")
  ? path.resolve(root, valueOf("--output"))
  : path.join(PASS13_DIR, partition ? `PASS13_ESLINT_PARTITION_${String(partition).padStart(3, "0")}.json` : "PASS13_PARTITIONED_ESLINT.json");

const before = treeDigest({ sourceOnly: true });
let eslintIdentity = null;
const parts = [];
const messages = [];
const processFailures = [];
const coveredFiles = new Set();
let ok = true;

function addProcessFailure(code, detail = {}) {
  const row = { code, ...detail };
  processFailures.push(row);
  return row;
}

try {
  eslintIdentity = resolveInstalledEslintCli(root);
} catch (error) {
  ok = false;
  addProcessFailure("eslint_cli_resolution_failed", { message: error instanceof Error ? error.message : String(error) });
}

if (eslintIdentity !== null) {
  for (let partitionIndex = start; partitionIndex <= end; partitionIndex += 1) {
    const expectedFiles = chunks[partitionIndex - 1];
    const batches = planSubBatches(root, expectedFiles);
    const started = Date.now();
    const invocationRows = [];
    const partitionResultFiles = [];
    let lintErrors = 0;
    let lintWarnings = 0;
    let generatedIgnored = 0;
    let partitionProcessFailure = null;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      const execution = runInstalledEslint({
        root,
        args: ["--format", "json", ...batch.files],
        timeout: 180_000,
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, FORCE_COLOR: "0", ESLINT_USE_FLAT_CONFIG: "true" },
      });
      const result = execution.result;
      const stderrTail = boundedTextTail(result.stderr, 8_000);
      const stdoutTail = boundedTextTail(result.stdout, 8_000);
      let parsed = null;
      let parseFailure = null;
      try {
        const candidate = JSON.parse(result.stdout || "[]");
        if (!Array.isArray(candidate)) throw new Error("eslint_json_not_array");
        parsed = candidate;
      } catch (error) {
        parseFailure = error instanceof Error ? error.message : String(error);
      }

      const batchResultFiles = [];
      let batchErrors = 0;
      let batchWarnings = 0;
      let batchGeneratedIgnored = 0;
      if (parsed !== null) {
        for (const resultRow of parsed) {
          const file = rel(resultRow.filePath);
          batchResultFiles.push(file);
          partitionResultFiles.push(file);
          coveredFiles.add(file);
          const rowMessages = Array.isArray(resultRow.messages) ? resultRow.messages : [];
          const allowlistedIgnored = rowMessages.length === 1
            && Number(resultRow.errorCount || 0) === 0
            && Number(resultRow.warningCount || 0) === 1
            && rowMessages[0]?.ruleId === null
            && Number(rowMessages[0]?.severity || 0) === 1
            && generatedIgnoreMatch(file, rowMessages[0]?.message);
          if (allowlistedIgnored) {
            batchGeneratedIgnored += 1;
            generatedIgnored += 1;
            continue;
          }
          batchErrors += Number(resultRow.errorCount || 0);
          batchWarnings += Number(resultRow.warningCount || 0);
          lintErrors += Number(resultRow.errorCount || 0);
          lintWarnings += Number(resultRow.warningCount || 0);
          for (const message of rowMessages) messages.push({ file, ...message });
        }
      }

      const expectedSorted = [...batch.files].sort();
      const resultSorted = [...batchResultFiles].sort();
      const duplicateResultFiles = resultSorted.filter((file, rowIndex) => rowIndex > 0 && file === resultSorted[rowIndex - 1]);
      const resultPathSetMatch = duplicateResultFiles.length === 0
        && expectedSorted.length === resultSorted.length
        && expectedSorted.every((file, rowIndex) => file === resultSorted[rowIndex]);
      const timedOut = Boolean(result.error?.code === "ETIMEDOUT");
      let processFailure = null;
      if (result.error) {
        processFailure = addProcessFailure("eslint_spawn_failed", { partition: partitionIndex, batch: batchIndex + 1, errorCode: result.error.code ?? null, message: result.error.message, stderrTail });
      } else if (timedOut) {
        processFailure = addProcessFailure("eslint_timeout", { partition: partitionIndex, batch: batchIndex + 1, stderrTail });
      } else if (result.status === null) {
        processFailure = addProcessFailure("eslint_exit_code_missing", { partition: partitionIndex, batch: batchIndex + 1, signal: result.signal ?? null, stderrTail });
      } else if (parseFailure !== null) {
        processFailure = addProcessFailure("eslint_json_parse_failed", { partition: partitionIndex, batch: batchIndex + 1, exitCode: result.status, parseFailure, stdoutTail, stderrTail });
      } else if (result.status >= 2) {
        processFailure = addProcessFailure("eslint_process_failed", { partition: partitionIndex, batch: batchIndex + 1, exitCode: result.status, signal: result.signal ?? null, stderrTail });
      } else if (!resultPathSetMatch) {
        processFailure = addProcessFailure("eslint_result_path_set_mismatch", {
          partition: partitionIndex,
          batch: batchIndex + 1,
          expectedFileCount: expectedSorted.length,
          resultFileCount: resultSorted.length,
          duplicateResultFiles,
          missing: expectedSorted.filter((file) => !resultSorted.includes(file)).slice(0, 100),
          extra: resultSorted.filter((file) => !expectedSorted.includes(file)).slice(0, 100),
        });
      } else if (result.status === 1 && batchErrors === 0) {
        processFailure = addProcessFailure("eslint_exit_one_without_errors", { partition: partitionIndex, batch: batchIndex + 1, warnings: batchWarnings, generatedIgnored: batchGeneratedIgnored, stderrTail });
      } else if (result.status === 0 && batchErrors > 0) {
        processFailure = addProcessFailure("eslint_zero_exit_with_errors", { partition: partitionIndex, batch: batchIndex + 1, errors: batchErrors });
      }

      invocationRows.push({
        index: batchIndex + 1,
        fileCount: batch.files.length,
        sourceBytes: batch.bytes,
        resultFileCount: batchResultFiles.length,
        resultPathSetMatch,
        exitCode: result.status,
        signal: result.signal ?? null,
        timedOut,
        lintErrors: batchErrors,
        lintWarnings: batchWarnings,
        generatedIgnored: batchGeneratedIgnored,
        processFailure,
        stderrTail,
      });
      if (processFailure !== null) {
        partitionProcessFailure = processFailure;
        break;
      }
    }

    const expectedSorted = [...expectedFiles].sort();
    const resultSorted = [...partitionResultFiles].sort();
    const duplicateResultFiles = resultSorted.filter((file, rowIndex) => rowIndex > 0 && file === resultSorted[rowIndex - 1]);
    const resultPathSetMatch = duplicateResultFiles.length === 0
      && expectedSorted.length === resultSorted.length
      && expectedSorted.every((file, rowIndex) => file === resultSorted[rowIndex]);
    if (partitionProcessFailure === null && !resultPathSetMatch) {
      partitionProcessFailure = addProcessFailure("eslint_partition_path_set_mismatch", {
        partition: partitionIndex,
        expectedFileCount: expectedSorted.length,
        resultFileCount: resultSorted.length,
        duplicateResultFiles,
        missing: expectedSorted.filter((file) => !resultSorted.includes(file)).slice(0, 100),
        extra: resultSorted.filter((file) => !expectedSorted.includes(file)).slice(0, 100),
      });
    }
    const passed = partitionProcessFailure === null
      && lintErrors === 0
      && lintWarnings === 0
      && invocationRows.length === batches.length
      && resultPathSetMatch;
    if (!passed) ok = false;
    parts.push({
      index: partitionIndex,
      expectedFiles,
      fileCount: expectedFiles.length,
      resultFileCount: partitionResultFiles.length,
      resultPathSetMatch,
      plannedInvocations: batches.length,
      completedInvocations: invocationRows.length,
      lintErrors,
      lintWarnings,
      generatedIgnored,
      processFailure: partitionProcessFailure,
      invocations: invocationRows,
      durationMs: Date.now() - started,
      passed,
    });
    console.log(`PASS13 ESLint ${String(partitionIndex).padStart(3, "0")}/${chunks.length}: ${passed ? "PASS" : "FAIL"} · ${expectedFiles.length} files · ${lintErrors} errors · ${lintWarnings} warnings · ${partitionProcessFailure ? 1 : 0} process failures · ${batches.length} invocations`);
    if (partitionProcessFailure !== null) break;
  }
}

const after = treeDigest({ sourceOnly: true });
if (after.sha256 !== before.sha256) ok = false;
const lintErrors = parts.reduce((sum, part) => sum + part.lintErrors, 0);
const lintWarnings = parts.reduce((sum, part) => sum + part.lintWarnings, 0);
const out = {
  schemaVersion: "velmere.pass13.partitioned-eslint.v4",
  generatedAt: now(),
  ok,
  requestedPartitionStart: start,
  requestedPartitionEnd: end,
  fileCount: files.length,
  partitionCount: chunks.length,
  completedPartitions: parts.length,
  passedPartitions: parts.filter((part) => part.passed).length,
  filesCovered: coveredFiles.size,
  lintErrors,
  lintWarnings,
  processFailureCount: processFailures.length,
  firstProcessFailure: processFailures[0] ?? null,
  messages,
  processFailures,
  parts,
  invocationPolicy: {
    fileChunkSize: ESLINT_FILE_CHUNK_SIZE,
    maxBatchFiles: ESLINT_MAX_BATCH_FILES,
    maxBatchBytes: ESLINT_MAX_BATCH_BYTES,
    timeoutMs: 180_000,
    maxBufferBytes: 64 * 1024 * 1024,
    shell: false,
    generatedIgnoreAllowlist: GENERATED_IGNORE_ALLOWLIST,
  },
  eslintIdentity,
  nodeExecutable: process.execPath,
  sourceBefore: before.sha256,
  sourceAfter: after.sha256,
  sourceImmutable: before.sha256 === after.sha256,
};
writeJson(output, out);
console.log(`PASS13 ESLint shard: ${out.passedPartitions}/${end - start + 1} passed · ${out.filesCovered} files · ${lintErrors} errors · ${lintWarnings} warnings · ${out.processFailureCount} process failures`);
if (!ok) process.exit(1);
