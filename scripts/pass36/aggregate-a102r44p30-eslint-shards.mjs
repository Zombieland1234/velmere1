#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { discoverLintFiles } from "../pass13/eslint-partition-plan.mjs";
import { writeJson, now } from "../pass13/common.mjs";

const root = process.cwd();
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split("=");
  return [key, rest.join("=")];
}));
const shardDir = path.resolve(root, args.get("--shard-dir") || "artifacts/pass13/r44p30-eslint-shards");
const output = path.resolve(root, args.get("--output") || "artifacts/pass13/PASS13_PARTITIONED_ESLINT.json");
const files = discoverLintFiles(root);
const shardFiles = fs.readdirSync(shardDir).filter((name) => /^partition-\d{3}\.json$/u.test(name)).sort();
const shards = shardFiles.map((name) => JSON.parse(fs.readFileSync(path.join(shardDir, name), "utf8")));
const expectedPartitions = shards[0]?.partitionCount ?? 0;
const checks = [];
const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
add("shard-count", expectedPartitions > 0 && shardFiles.length === expectedPartitions, { expectedPartitions, shardFiles: shardFiles.length });
add("partition-identity", shards.every((s, i) => s.requestedPartitionStart === i + 1 && s.requestedPartitionEnd === i + 1 && s.completedPartitions === 1 && s.passedPartitions === 1));
add("common-denominator", shards.every((s) => s.fileCount === files.length && s.partitionCount === expectedPartitions));
add("all-green", shards.every((s) => s.ok === true && s.lintErrors === 0 && s.lintWarnings === 0 && s.processFailureCount === 0));
add("source-immutable", shards.every((s) => s.sourceImmutable === true && s.sourceBefore === shards[0].sourceBefore && s.sourceAfter === shards[0].sourceAfter && s.sourceBefore === s.sourceAfter));
const parts = shards.flatMap((s) => s.parts);
const covered = parts.flatMap((part) => part.expectedFiles);
const duplicates = covered.filter((file, index) => covered.indexOf(file) !== index);
add("part-count", parts.length === expectedPartitions);
add("exact-file-count", covered.length === files.length, { covered: covered.length, files: files.length });
add("exact-file-order", covered.length === files.length && covered.every((file, index) => file === files[index]));
add("no-duplicates", duplicates.length === 0, duplicates.slice(0, 20));
add("all-parts-pass", parts.every((part) => part.passed === true && part.processFailure === null && part.resultPathSetMatch === true && part.lintErrors === 0 && part.lintWarnings === 0 && part.completedInvocations === part.plannedInvocations));
add("eslint-identity", shards.every((s) => s.eslintIdentity?.packageVersion === "10.8.0" && s.eslintIdentity?.cliSha256 === shards[0].eslintIdentity?.cliSha256));
const failedChecks = checks.filter((row) => !row.ok);
const out = {
  schemaVersion: "velmere.pass13.partitioned-eslint.v4",
  aggregationSchemaVersion: "velmere.pass36.a102r44p30.parallel-eslint-aggregation.v1",
  generatedAt: now(),
  ok: failedChecks.length === 0,
  requestedPartitionStart: 1,
  requestedPartitionEnd: expectedPartitions,
  fileCount: files.length,
  partitionCount: expectedPartitions,
  completedPartitions: parts.length,
  passedPartitions: parts.filter((part) => part.passed).length,
  filesCovered: covered.length,
  lintErrors: parts.reduce((sum, part) => sum + part.lintErrors, 0),
  lintWarnings: parts.reduce((sum, part) => sum + part.lintWarnings, 0),
  processFailureCount: shards.reduce((sum, shard) => sum + shard.processFailureCount, 0),
  firstProcessFailure: shards.find((s) => s.firstProcessFailure)?.firstProcessFailure ?? null,
  messages: shards.flatMap((s) => s.messages || []),
  processFailures: shards.flatMap((s) => s.processFailures || []),
  parts,
  invocationPolicy: shards[0]?.invocationPolicy ?? null,
  eslintIdentity: shards[0]?.eslintIdentity ?? null,
  nodeExecutable: shards[0]?.nodeExecutable ?? null,
  sourceBefore: shards[0]?.sourceBefore ?? null,
  sourceAfter: shards[0]?.sourceAfter ?? null,
  sourceImmutable: shards.every((s) => s.sourceImmutable === true),
  shardBindings: shardFiles.map((name, index) => ({ name, partition: index + 1 })),
  aggregationChecks: checks,
};
writeJson(output, out);
console.log(JSON.stringify({ status: out.ok ? "PASS" : "FAIL", checks: checks.length, passed: checks.length - failedChecks.length, failed: failedChecks.length, partitions: parts.length, files: files.length, invocations: parts.reduce((sum, part) => sum + part.completedInvocations, 0) }, null, 2));
if (!out.ok) process.exit(1);
