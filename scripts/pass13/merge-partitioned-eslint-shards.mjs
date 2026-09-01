#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { discoverLintFiles, partitionFiles, ESLINT_FILE_CHUNK_SIZE } from "./eslint-partition-plan.mjs";
import { treeDigest, writeJson, PASS13_DIR, now } from "./common.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
function valueOf(name) {
  const prefix = `${name}=`;
  const match = args.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}
const inputDir = path.resolve(root, valueOf("--input-dir") ?? path.join("artifacts", "pass13", "eslint-shards"));
const output = path.resolve(root, valueOf("--output") ?? path.join(PASS13_DIR, "PASS13_PARTITIONED_ESLINT.json"));
const before = treeDigest({ sourceOnly: true });
const files = discoverLintFiles(root);
const chunks = partitionFiles(files, ESLINT_FILE_CHUNK_SIZE);
const shardPaths = fs.existsSync(inputDir)
  ? fs.readdirSync(inputDir).filter((name) => name.endsWith(".json")).sort().map((name) => path.join(inputDir, name))
  : [];
const shards = shardPaths.map((file) => ({ file, value: JSON.parse(fs.readFileSync(file, "utf8")) }));
const errors = [];
const partitionRows = new Map();
let staticPolicy = null;
let eslintIdentity = null;
let sourceHash = null;
let nodeExecutable = null;

function staticPolicyOf(value) {
  const policy = value.invocationPolicy ?? {};
  return {
    fileChunkSize: policy.fileChunkSize,
    maxBatchFiles: policy.maxBatchFiles,
    maxBatchBytes: policy.maxBatchBytes,
    timeoutMs: policy.timeoutMs,
    maxBufferBytes: policy.maxBufferBytes,
    shell: policy.shell,
    generatedIgnoreAllowlist: policy.generatedIgnoreAllowlist,
  };
}
function stable(value) { return JSON.stringify(value); }

for (const shard of shards) {
  const value = shard.value;
  if (value.schemaVersion !== "velmere.pass13.partitioned-eslint.v4") errors.push({ code: "schema_mismatch", file: shard.file });
  if (!value.sourceImmutable || value.sourceBefore !== value.sourceAfter) errors.push({ code: "shard_source_mutated", file: shard.file });
  if (sourceHash === null) sourceHash = value.sourceBefore;
  else if (sourceHash !== value.sourceBefore) errors.push({ code: "source_hash_mismatch", file: shard.file });
  if (nodeExecutable === null) nodeExecutable = value.nodeExecutable;
  else if (nodeExecutable !== value.nodeExecutable) errors.push({ code: "node_executable_mismatch", file: shard.file });
  const policy = staticPolicyOf(value);
  if (staticPolicy === null) staticPolicy = policy;
  else if (stable(staticPolicy) !== stable(policy)) errors.push({ code: "static_policy_mismatch", file: shard.file });
  if (eslintIdentity === null) eslintIdentity = value.eslintIdentity;
  else if (stable(eslintIdentity) !== stable(value.eslintIdentity)) errors.push({ code: "eslint_identity_mismatch", file: shard.file });
  for (const part of value.parts ?? []) {
    if (partitionRows.has(part.index)) errors.push({ code: "duplicate_partition", partition: part.index, files: [partitionRows.get(part.index).file, shard.file] });
    partitionRows.set(part.index, { file: shard.file, part });
  }
}

const orderedParts = [];
const coveredFiles = [];
let plannedInvocations = 0;
let completedInvocations = 0;
let lintErrors = 0;
let lintWarnings = 0;
let generatedIgnored = 0;
let processFailures = 0;
for (let index = 1; index <= chunks.length; index += 1) {
  const row = partitionRows.get(index);
  if (!row) {
    errors.push({ code: "missing_partition", partition: index });
    continue;
  }
  const part = row.part;
  const expected = chunks[index - 1];
  if (stable(part.expectedFiles) !== stable(expected)) errors.push({ code: "partition_expected_files_mismatch", partition: index });
  if (!part.passed || part.processFailure !== null || !part.resultPathSetMatch) errors.push({ code: "partition_not_passed", partition: index });
  if (part.plannedInvocations !== part.completedInvocations || part.invocations?.length !== part.plannedInvocations) errors.push({ code: "partition_invocation_coverage_mismatch", partition: index });
  for (const invocation of part.invocations ?? []) {
    if (invocation.processFailure !== null || !invocation.resultPathSetMatch || invocation.stderrTail !== "") errors.push({ code: "invocation_not_clean", partition: index, invocation: invocation.index });
  }
  coveredFiles.push(...part.expectedFiles);
  plannedInvocations += Number(part.plannedInvocations || 0);
  completedInvocations += Number(part.completedInvocations || 0);
  lintErrors += Number(part.lintErrors || 0);
  lintWarnings += Number(part.lintWarnings || 0);
  generatedIgnored += Number(part.generatedIgnored || 0);
  if (part.processFailure !== null) processFailures += 1;
  orderedParts.push(part);
}
const sortedCovered = [...coveredFiles].sort();
const duplicateFiles = sortedCovered.filter((file, index) => index > 0 && file === sortedCovered[index - 1]);
if (duplicateFiles.length > 0) errors.push({ code: "duplicate_file_coverage", sample: duplicateFiles.slice(0, 100) });
if (stable(sortedCovered) !== stable([...files].sort())) errors.push({ code: "global_file_coverage_mismatch" });
if (lintErrors !== 0 || lintWarnings !== 0 || processFailures !== 0) errors.push({ code: "nonzero_findings", lintErrors, lintWarnings, processFailures });
if (plannedInvocations !== completedInvocations) errors.push({ code: "global_invocation_coverage_mismatch", plannedInvocations, completedInvocations });
if (sourceHash !== before.sha256) errors.push({ code: "current_source_hash_mismatch", sourceHash, current: before.sha256 });
const after = treeDigest({ sourceOnly: true });
if (after.sha256 !== before.sha256) errors.push({ code: "merger_mutated_source", before: before.sha256, after: after.sha256 });

const out = {
  schemaVersion: "velmere.pass13.partitioned-eslint-merged.v4",
  generatedAt: now(),
  ok: errors.length === 0,
  inputDir,
  shardCount: shards.length,
  fileCount: files.length,
  partitionCount: chunks.length,
  completedPartitions: orderedParts.length,
  passedPartitions: orderedParts.filter((part) => part.passed).length,
  filesCovered: coveredFiles.length,
  uniqueFilesCovered: new Set(coveredFiles).size,
  duplicateFileCount: duplicateFiles.length,
  plannedInvocations,
  completedInvocations,
  lintErrors,
  lintWarnings,
  generatedIgnored,
  processFailureCount: processFailures,
  staticInvocationPolicy: staticPolicy,
  eslintIdentity,
  nodeExecutable,
  sourceBefore: before.sha256,
  sourceAfter: after.sha256,
  sourceImmutable: before.sha256 === after.sha256,
  errors,
  parts: orderedParts,
};
writeJson(output, out);
console.log(`PASS13 ESLint merged: ${out.passedPartitions}/${out.partitionCount} partitions · ${out.uniqueFilesCovered}/${out.fileCount} files · ${lintErrors} errors · ${lintWarnings} warnings · ${processFailures} process failures · ${plannedInvocations}/${completedInvocations} invocations`);
if (!out.ok) process.exit(1);
