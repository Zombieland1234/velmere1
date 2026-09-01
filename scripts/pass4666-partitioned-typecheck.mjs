import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  PASS4823_PARTITIONS,
  PASS4823_TYPECHECK_RECEIPT_ID,
  PASS4823_TYPECHECK_RUNNER_VERSION,
  computePass4823SourceTree,
} from "./pass4823/typecheck-source-contract.mjs";

const root = process.cwd();
const artifactDir = path.join(root, "artifacts/pass4666");
const receiptPath = path.join(artifactDir, "partitioned-typecheck.json");
const scriptPath = fileURLToPath(import.meta.url);
fs.mkdirSync(artifactDir, { recursive: true });

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const relativePath = (fileName) => path.relative(root, fileName).replaceAll(path.sep, "/");

function parseConfig(config) {
  const configPath = path.join(root, config);
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  const configDiagnostics = read.error ? [read.error] : [];
  const parsed = ts.parseJsonConfigFileContent(
    read.config ?? {},
    ts.sys,
    path.dirname(configPath),
    { noEmit: true, incremental: false },
    configPath,
  );
  return { configPath, parsed, configDiagnostics };
}

function loadPartition(index) {
  const definition = PASS4823_PARTITIONS[index];
  const { configPath, parsed, configDiagnostics } = parseConfig(definition.config);
  const files = parsed.fileNames
    .filter((fileName) => fs.existsSync(fileName))
    .map((fileName) => ({ relative: relativePath(fileName), absolute: fileName }))
    .sort((left, right) => left.relative.localeCompare(right.relative));
  const sourceFingerprint = sha256(JSON.stringify({
    config: definition.config,
    configSha256: sha256(fs.readFileSync(configPath)),
    files: files.map((file) => [file.relative, sha256(fs.readFileSync(file.absolute))]),
  }));
  return { ...definition, parsed, configDiagnostics, files, sourceFingerprint };
}

function buildActiveSourceInventory() {
  const { parsed, configDiagnostics } = parseConfig("tsconfig.json");
  const configErrors = [...configDiagnostics, ...parsed.errors];
  const activeFiles = parsed.fileNames
    .map(relativePath)
    .filter((relative) => relative.startsWith("app/") && /\.(?:ts|tsx)$/u.test(relative))
    .sort();
  const owners = new Map(activeFiles.map((relative) => [relative, []]));
  const partitionRootCounts = {};

  for (let index = 0; index < PASS4823_PARTITIONS.length; index += 1) {
    const partition = loadPartition(index);
    let ownedRootCount = 0;
    for (const file of partition.files) {
      if (!owners.has(file.relative)) continue;
      owners.get(file.relative).push(partition.name);
      ownedRootCount += 1;
    }
    partitionRootCounts[partition.name] = ownedRootCount;
  }

  const orphanFiles = [];
  const duplicateOwnerFiles = [];
  for (const [relative, fileOwners] of owners) {
    if (fileOwners.length === 0) orphanFiles.push(relative);
    else if (fileOwners.length > 1) duplicateOwnerFiles.push({ file: relative, owners: fileOwners });
  }
  const coveredFileCount = activeFiles.length - orphanFiles.length;
  const criticalResidualFiles = activeFiles.filter((relative) => (
    relative.startsWith("app/api/internal/") ||
    relative.startsWith("app/api/proof-status/") ||
    relative.startsWith("app/api/provenance/")
  ));
  const criticalResidualOwnership = criticalResidualFiles.map((file) => ({ file, owners: owners.get(file) ?? [] }));
  const criticalResidualUncovered = criticalResidualOwnership.filter(({ owners: fileOwners }) => (
    fileOwners.length !== 1 || fileOwners[0] !== "api-residual"
  ));

  return {
    schemaVersion: "velmere.pass4823.active-typescript-inventory.v1",
    scope: "root app/**/*.ts and app/**/*.tsx from tsconfig.json; imported dependencies are checked transitively by each TypeScript Program",
    activeFileCount: activeFiles.length,
    coveredFileCount,
    coveragePercent: activeFiles.length === 0 ? 100 : Math.round((coveredFileCount / activeFiles.length) * 100_000) / 1_000,
    orphanCount: orphanFiles.length,
    orphanFiles,
    duplicateOwnerCount: duplicateOwnerFiles.length,
    duplicateOwnerFiles,
    criticalResidualCount: criticalResidualFiles.length,
    criticalResidualFiles,
    criticalResidualUncovered,
    partitionRootCounts,
    configDiagnosticCount: configErrors.length,
  };
}

const singleReceiptPath = (index) => path.join(
  artifactDir,
  `partitioned-typecheck-single-${String(index + 1).padStart(2, "0")}.json`,
);

function runSingle(index, runId) {
  if (!Number.isInteger(index) || index < 0 || index >= PASS4823_PARTITIONS.length || !runId) process.exit(2);
  const started = Date.now();
  const sourceTree = computePass4823SourceTree(root);
  const partition = loadPartition(index);
  console.log(`[PASS4823 single ${index + 1}/${PASS4823_PARTITIONS.length}] start ${partition.name}`);
  let diagnostics = [...partition.configDiagnostics, ...partition.parsed.errors];
  try {
    const program = ts.createProgram({
      rootNames: partition.parsed.fileNames,
      options: partition.parsed.options,
      projectReferences: partition.parsed.projectReferences,
    });
    diagnostics.push(...ts.getPreEmitDiagnostics(program));
    diagnostics = ts.sortAndDeduplicateDiagnostics(diagnostics);
  } catch (error) {
    diagnostics.push({
      category: ts.DiagnosticCategory.Error,
      code: 90001,
      file: undefined,
      start: undefined,
      length: undefined,
      messageText: error instanceof Error ? error.stack ?? error.message : String(error),
    });
  }
  const receipt = {
    id: "pass4666-partitioned-runtime-typecheck-single-v2",
    runnerVersion: PASS4823_TYPECHECK_RUNNER_VERSION,
    runId,
    index,
    name: partition.name,
    config: partition.config,
    heapMb: partition.heapMb,
    node: process.version,
    typescript: ts.version,
    sourceTreeSchema: sourceTree.schemaVersion,
    sourceTreeSha256: sourceTree.sha256,
    sourceTreeFileCount: sourceTree.fileCount,
    sourceFingerprint: partition.sourceFingerprint,
    fileCount: partition.files.length,
    diagnosticCount: diagnostics.length,
    exitCode: diagnostics.length === 0 ? 0 : 1,
    signal: null,
    timedOut: false,
    durationMs: Date.now() - started,
    completedAt: new Date().toISOString(),
  };
  fs.writeFileSync(singleReceiptPath(index), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`[PASS4823 single ${index + 1}/${PASS4823_PARTITIONS.length}] end ${partition.name} exit=${receipt.exitCode} files=${receipt.fileCount} diagnostics=${receipt.diagnosticCount} durationMs=${receipt.durationMs}`);
  if (diagnostics.length > 0) {
    const host = {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => root,
      getNewLine: () => "\n",
    };
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  }
  process.exit(receipt.exitCode);
}

function aggregate(runId) {
  const started = Date.now();
  const sourceTree = computePass4823SourceTree(root);
  const results = [];
  const blockers = [];
  for (let index = 0; index < PASS4823_PARTITIONS.length; index += 1) {
    const file = singleReceiptPath(index);
    if (!fs.existsSync(file)) {
      blockers.push(`missing_receipt:${index + 1}`);
      continue;
    }
    const receipt = JSON.parse(fs.readFileSync(file, "utf8"));
    const current = loadPartition(index);
    if (receipt.runId !== runId) blockers.push(`run_id_mismatch:${index + 1}`);
    if (receipt.runnerVersion !== PASS4823_TYPECHECK_RUNNER_VERSION) blockers.push(`runner_version_mismatch:${index + 1}`);
    if (receipt.node !== process.version) blockers.push(`node_mismatch:${index + 1}`);
    if (receipt.typescript !== ts.version) blockers.push(`typescript_mismatch:${index + 1}`);
    if (receipt.name !== current.name || receipt.config !== current.config) blockers.push(`partition_mismatch:${index + 1}`);
    if (receipt.sourceFingerprint !== current.sourceFingerprint) blockers.push(`partition_source_changed:${index + 1}`);
    if (receipt.sourceTreeSha256 !== sourceTree.sha256) blockers.push(`source_tree_changed:${index + 1}`);
    if (receipt.exitCode !== 0 || receipt.timedOut || receipt.diagnosticCount !== 0) blockers.push(`partition_failed:${index + 1}`);
    results.push(receipt);
  }

  const inventory = buildActiveSourceInventory();
  if (inventory.configDiagnosticCount !== 0) blockers.push("inventory_config_invalid");
  if (inventory.coveragePercent !== 100 || inventory.orphanCount !== 0) blockers.push("active_source_inventory_incomplete");
  if (inventory.duplicateOwnerCount !== 0) blockers.push("active_source_inventory_duplicate_owners");
  if (inventory.criticalResidualUncovered.length !== 0) blockers.push("critical_residual_sources_uncovered");

  const report = {
    id: PASS4823_TYPECHECK_RECEIPT_ID,
    runnerVersion: PASS4823_TYPECHECK_RUNNER_VERSION,
    ok: blockers.length === 0 && results.length === PASS4823_PARTITIONS.length,
    runId,
    node: process.version,
    typescript: ts.version,
    sourceTreeSchema: sourceTree.schemaVersion,
    sourceTreeSha256: sourceTree.sha256,
    sourceTreeFileCount: sourceTree.fileCount,
    sourceTreeBytes: sourceTree.totalBytes,
    expectedPartitionCount: PASS4823_PARTITIONS.length,
    inventory,
    partitions: results,
    blockers,
    totalDurationMs: results.reduce((sum, item) => sum + Number(item.durationMs || 0), 0),
    aggregateDurationMs: Date.now() - started,
    completedAt: new Date().toISOString(),
  };
  fs.writeFileSync(receiptPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

const singleIndex = process.argv.indexOf("--single");
if (singleIndex >= 0) runSingle(Number(process.argv[singleIndex + 1]), process.argv[singleIndex + 2]);
const aggregateIndex = process.argv.indexOf("--aggregate");
if (aggregateIndex >= 0) aggregate(process.argv[aggregateIndex + 1]);
if (process.argv.includes("--inventory-only")) {
  const inventory = buildActiveSourceInventory();
  const ok = inventory.coveragePercent === 100 &&
    inventory.orphanCount === 0 &&
    inventory.duplicateOwnerCount === 0 &&
    inventory.criticalResidualUncovered.length === 0 &&
    inventory.configDiagnosticCount === 0;
  console.log(JSON.stringify({ ok, inventory }, null, 2));
  process.exit(ok ? 0 : 1);
}

const runId = `pass4823-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
for (let index = 0; index < PASS4823_PARTITIONS.length; index += 1) {
  const partition = PASS4823_PARTITIONS[index];
  const run = spawnSync(
    process.execPath,
    ["--expose-gc", `--max-old-space-size=${partition.heapMb}`, scriptPath, "--single", String(index), runId],
    {
      cwd: root,
      stdio: "inherit",
      timeout: 12 * 60 * 1000,
      killSignal: "SIGTERM",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    },
  );
  if ((run.status ?? 1) !== 0 || run.error?.code === "ETIMEDOUT") process.exit(run.status ?? 1);
}
aggregate(runId);
