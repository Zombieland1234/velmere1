#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverLintFiles,
  partitionFiles,
  planSubBatches,
  ESLINT_FILE_CHUNK_SIZE,
  ESLINT_MAX_BATCH_FILES,
  ESLINT_MAX_BATCH_BYTES,
} from "../pass13/eslint-partition-plan.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p30-eslint-batching-migration.json"), "utf8"));
const parent = JSON.parse(fs.readFileSync(path.join(ROOT, "_velmere/PASS36_A102R44P29_SOURCE_ONLY_MANIFEST.json"), "utf8"));
const extensions = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts"]);
const excluded = new Set(["node_modules", ".next", ".velmere", "artifacts", "archive", "out", "coverage"]);
function parentLintable(rel) {
  const parts = rel.split("/");
  if (!extensions.has(path.extname(rel))) return false;
  if (parts.some((part) => excluded.has(part) || part.startsWith(".next-pass25-"))) return false;
  if (parts[0] === "build") return false;
  return true;
}
const files = discoverLintFiles(ROOT);
const chunks = partitionFiles(files);
const batches = chunks.flatMap((chunk) => planSubBatches(ROOT, chunk));
const flattened = batches.flatMap((row) => row.files);
const currentSet = new Set(files);
const parentFiles = parent.entries.map((row) => row.path).filter(parentLintable);
const parentMissing = parentFiles.filter((file) => !currentSet.has(file));
const duplicates = flattened.filter((file, index) => flattened.indexOf(file) !== index);
const checks = [];
const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
add("schema", policy.schemaVersion === "velmere.pass36.a102r44p30.eslint-batching-migration.v1");
add("revision", policy.revisionId === "VELMERE_PASS36_A102R44P30_ACTION_REQUIRED_EXACT_CURRENT_BYTE_LINUX_DUAL_BUILD_BROWSER_PDF_AND_PARENT_EXTERNAL_RLS_NO_LIVE_CREDIT");
add("constants", ESLINT_FILE_CHUNK_SIZE === 500 && ESLINT_MAX_BATCH_FILES === 3 && ESLINT_MAX_BATCH_BYTES === 150_000);
add("discovery-unchanged", policy.contract.discoveryRulesChanged === false);
add("current-nonempty", files.length > 3500, files.length);
add("parent-retained", parentMissing.length === 0, parentMissing.slice(0, 20));
add("exact-flattened-count", flattened.length === files.length, { flattened: flattened.length, files: files.length });
add("exact-order-and-pathset", flattened.length === files.length && flattened.every((file, index) => file === files[index]));
add("no-duplicates", duplicates.length === 0, duplicates.slice(0, 20));
add("partition-count-reduced", chunks.length < Math.ceil(files.length / policy.previous.fileChunkSize), { current: chunks.length, previous: Math.ceil(files.length / policy.previous.fileChunkSize) });
add("batch-max-files", batches.every((row) => row.files.length > 0 && row.files.length <= ESLINT_MAX_BATCH_FILES));
add("batch-max-bytes", batches.every((row) => row.bytes > 0 && (row.bytes <= ESLINT_MAX_BATCH_BYTES || row.files.length === 1)));
add("blocking-contract-retained", policy.contract.errorsAndWarningsStillBlocking === true && policy.contract.processFailuresStillBlocking === true && policy.contract.sourceImmutabilityStillRequired === true);
const persistentPath = path.join(ROOT, policy.persistentRunner.script);
const persistentSource = fs.readFileSync(persistentPath, "utf8");
add("persistent-runner-policy", policy.persistentRunner.batchSize === 25 && policy.persistentRunner.oneEslintInstancePerPartition === true && policy.persistentRunner.exactPathSetRequired === true && policy.persistentRunner.sourceImmutabilityRequired === true);
add("persistent-runner-source", fs.existsSync(persistentPath) && persistentSource.includes("new ESLint({ cwd: root })") && persistentSource.includes("discoverLintFiles(root)") && persistentSource.includes("resultPathSetMatch") && persistentSource.includes("treeDigest({ sourceOnly: true })"));
const failed = checks.filter((row) => !row.ok);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p30.eslint-batching-migration-verification.v1",
  status: failed.length ? "FAIL" : "PASS",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  currentFileCount: files.length,
  parentLintableFileCount: parentFiles.length,
  partitionCount: chunks.length,
  invocationCount: batches.length,
  rows: checks,
}, null, 2));
if (failed.length) process.exit(1);
