import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir, readlink, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { validatePass4823TypecheckReceipt } from "../pass4823/typecheck-source-contract.mjs";

const BUILD_ENGINES = new Set(["turbopack", "webpack"]);
const REQUIRED_BUILD_DIRECTORIES = ["server", "static"];
export const REQUIRED_NODE_VERSION = "v24.18.0";

export function sha256Bytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export async function sha256File(filePath) {
  const digest = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => digest.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return `sha256:${digest.digest("hex")}`;
}

export function normalizeEngine(value) {
  const engine = String(value || "").toLowerCase();
  if (!BUILD_ENGINES.has(engine)) throw new Error(`unsupported_build_engine:${engine || "missing"}`);
  return engine;
}

export function assertExactNode() {
  if (process.version !== REQUIRED_NODE_VERSION) {
    throw new Error(`exact_node_required:${REQUIRED_NODE_VERSION}:got:${process.version}`);
  }
}

export function resolveInside(root, candidate) {
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, candidate);
  const relative = path.relative(absoluteRoot, absolute);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return absolute;
  throw new Error(`path_outside_project:${candidate}`);
}

async function collectFiles(directory, prefix, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(absolute, relative, files);
      continue;
    }
    if (entry.isSymbolicLink()) {
      const target = await readlink(absolute);
      throw new Error(`build_output_symlink_not_allowed:${relative}:${target}`);
    }
    if (entry.isFile()) files.push({ absolute, relative });
  }
}

export async function fingerprintBuildOutput(root) {
  const nextDirectory = path.join(root, ".next");
  const nextStats = await lstat(nextDirectory).catch(() => null);
  if (!nextStats?.isDirectory()) throw new Error("production_build_missing_run_build_first");

  const files = [];
  const rootEntries = await readdir(nextDirectory, { withFileTypes: true });
  rootEntries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of rootEntries) {
    if (entry.isSymbolicLink()) {
      const target = await readlink(path.join(nextDirectory, entry.name));
      throw new Error(`build_output_symlink_not_allowed:${entry.name}:${target}`);
    }
    if (entry.isFile()) {
      files.push({ absolute: path.join(nextDirectory, entry.name), relative: entry.name });
    }
  }

  for (const directory of REQUIRED_BUILD_DIRECTORIES) {
    const absolute = path.join(nextDirectory, directory);
    const directoryStats = await lstat(absolute).catch(() => null);
    if (!directoryStats?.isDirectory()) throw new Error(`build_output_destination_missing:${directory}`);
    await collectFiles(absolute, directory, files);
  }
  files.sort((left, right) => left.relative.localeCompare(right.relative, "en"));

  const aggregate = createHash("sha256");
  let byteLength = 0;
  for (const file of files) {
    const fileStats = await stat(file.absolute);
    const fileSha256 = await sha256File(file.absolute);
    byteLength += fileStats.size;
    aggregate.update(`${file.relative}\0${fileStats.size}\0${fileSha256}\n`, "utf8");
  }

  const buildIdPath = path.join(nextDirectory, "BUILD_ID");
  const buildId = (await readFile(buildIdPath, "utf8").catch(() => "")).trim();
  if (!buildId) throw new Error("build_id_missing_or_empty");

  return {
    schemaVersion: "velmere.pass4825.canonical-next-output.sha256.v1",
    canonicalDestinations: [".next root files", ".next/server/**", ".next/static/**"],
    canonicalDestinationCount: 3,
    fileCount: files.length,
    byteLength,
    sha256: `sha256:${aggregate.digest("hex")}`,
    buildId,
  };
}

export async function readJsonFile(filePath, errorCode) {
  let bytes;
  try {
    bytes = await readFile(filePath);
  } catch {
    throw new Error(`${errorCode}_missing`);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${errorCode}_invalid_json`);
  }
  return { bytes, value };
}

function validateBuildReceipt(receipt, { engine, sourceTreeSha256, buildId }) {
  if (receipt?.ok !== true || receipt?.releaseEligible !== true || receipt?.diagnosticMode !== false) {
    throw new Error("build_receipt_not_release_eligible");
  }
  if (receipt?.sourceUnchanged !== true || receipt?.exactNode !== true) {
    throw new Error("build_receipt_source_or_runtime_unbound");
  }
  if (receipt?.node !== REQUIRED_NODE_VERSION || receipt?.requiredNode !== REQUIRED_NODE_VERSION) {
    throw new Error("build_receipt_exact_node_mismatch");
  }
  if (receipt?.selectedEngine !== engine || receipt?.requestedEngine !== engine) {
    throw new Error(`build_receipt_engine_mismatch:${receipt?.selectedEngine || "missing"}`);
  }
  if (receipt?.sourceFingerprint !== sourceTreeSha256
      || receipt?.postBuildSourceFingerprint !== sourceTreeSha256
      || receipt?.typecheckSourceTreeSha256 !== sourceTreeSha256) {
    throw new Error("build_receipt_source_mismatch");
  }
  if (receipt?.buildId !== buildId) throw new Error("build_receipt_build_id_mismatch");
  const successfulAttempt = Array.isArray(receipt?.attempts)
    && receipt.attempts.some((attempt) => attempt?.engine === engine
      && attempt?.exitCode === 0
      && attempt?.timedOut === false
      && attempt?.buildIdMatches === true
      && attempt?.nextDirectoryCreated === true);
  if (!successfulAttempt) throw new Error("build_receipt_successful_engine_attempt_missing");
}

async function validateIndependentBuildEvidence({ root, receipt, engine, sourceTree, output }) {
  const attempt = receipt.attempts.find((candidate) => candidate?.engine === engine && candidate?.exitCode === 0);
  const logPath = resolveInside(root, attempt?.logPath || "");
  const logBytes = await readFile(logPath).catch(() => null);
  if (!logBytes || logBytes.byteLength < 100) throw new Error("build_command_log_missing_or_empty");
  const logText = logBytes.toString("utf8");
  const commandLogMarkers = {
    compiledSuccessfully: /Compiled successfully/u.test(logText),
    generatedAllStaticPages: /Generating static pages[^\n\r]*\([^)]*\/[^)]*\)/u.test(logText)
      && /Static\)\s+prerendered as static content/u.test(logText),
    routeInventoryPresent: /Dynamic\)\s+server-rendered on demand/u.test(logText),
    fatalBuildMarkerAbsent: !/(Failed to compile|Build error occurred|ELIFECYCLE|FATAL ERROR)/iu.test(logText),
  };
  if (Object.values(commandLogMarkers).some((value) => value !== true)) {
    throw new Error("build_command_log_success_contract_failed");
  }

  const typecheckPath = path.join(root, "artifacts/pass4666/partitioned-typecheck.json");
  const { bytes: typecheckBytes, value: typecheckReceipt } = await readJsonFile(typecheckPath, "bound_typecheck_receipt");
  const typecheckChecksum = sha256Bytes(typecheckBytes).slice("sha256:".length);
  if (receipt.typecheckReceiptSha256 !== typecheckChecksum
      || receipt.postBuildTypecheckReceiptSha256 !== typecheckChecksum
      || receipt.typecheckReceiptUnchanged !== true) {
    throw new Error("build_typecheck_checksum_mismatch");
  }
  const typecheckBlockers = validatePass4823TypecheckReceipt({
    receipt: typecheckReceipt,
    sourceTree,
    nodeVersion: REQUIRED_NODE_VERSION,
  });
  if (typecheckBlockers.length) throw new Error(`build_typecheck_contract_failed:${typecheckBlockers.join(",")}`);

  const driverPath = path.join(root, "scripts/pass4666-next-build.mjs");
  const nextBinPath = path.join(root, "node_modules/next/dist/bin/next");
  const driverStats = await stat(driverPath).catch(() => null);
  const nextBinStats = await stat(nextBinPath).catch(() => null);
  if (!driverStats?.isFile() || !nextBinStats?.isFile()) throw new Error("build_driver_or_next_binary_missing");

  return {
    schemaVersion: "velmere.pass4825.independent-build-evidence.v1",
    validationLayers: [
      "current source-tree contract",
      "independently parsed typecheck receipt",
      "physical build command log markers",
      "build driver and Next binary checksums",
      "canonical physical .next output checksum",
    ],
    commandLog: {
      relativePath: path.relative(root, logPath).split(path.sep).join("/"),
      byteLength: logBytes.byteLength,
      checksumSha256: sha256Bytes(logBytes),
      markers: commandLogMarkers,
    },
    typecheck: {
      relativePath: path.relative(root, typecheckPath).split(path.sep).join("/"),
      checksumSha256: sha256Bytes(typecheckBytes),
      runId: typecheckReceipt.runId,
      partitionCount: typecheckReceipt.partitions.length,
      sourceTreeSha256: typecheckReceipt.sourceTreeSha256,
    },
    buildDriver: {
      relativePath: "scripts/pass4666-next-build.mjs",
      byteLength: driverStats.size,
      checksumSha256: await sha256File(driverPath),
    },
    nextBinary: {
      relativePath: "node_modules/next/dist/bin/next",
      byteLength: nextBinStats.size,
      checksumSha256: await sha256File(nextBinPath),
    },
    physicalOutputChecksumSha256: output.sha256,
  };
}

export async function createBuildOutputBinding({ root, engine: rawEngine, buildReceiptPath, sourceTree }) {
  assertExactNode();
  const engine = normalizeEngine(rawEngine);
  const absoluteReceipt = resolveInside(root, buildReceiptPath);
  const { bytes: buildReceiptBytes, value: buildReceipt } = await readJsonFile(absoluteReceipt, "build_receipt");
  const output = await fingerprintBuildOutput(root);
  const expectedBuildId = `vlm-${sourceTree.sha256.slice(0, 20)}`;
  if (output.buildId !== expectedBuildId) throw new Error("production_build_source_mismatch");
  validateBuildReceipt(buildReceipt, {
    engine,
    sourceTreeSha256: sourceTree.sha256,
    buildId: output.buildId,
  });
  const independentEvidence = await validateIndependentBuildEvidence({
    root,
    receipt: buildReceipt,
    engine,
    sourceTree,
    output,
  });

  return {
    schemaVersion: "velmere.pass4825.build-output-binding.v1",
    evidenceClass: "local_build_output_provenance",
    createdAt: new Date().toISOString(),
    engine,
    sourceTreeSha256: sourceTree.sha256,
    sourceTreeFileCount: sourceTree.fileCount,
    buildId: output.buildId,
    expectedBuildId,
    buildReceipt: {
      relativePath: path.relative(root, absoluteReceipt).split(path.sep).join("/"),
      checksumSha256: sha256Bytes(buildReceiptBytes),
      finishedAt: buildReceipt.finishedAt,
      node: buildReceipt.node,
      selectedEngine: buildReceipt.selectedEngine,
    },
    independentEvidence,
    output,
  };
}

export function attachChecksum(unsigned) {
  return { ...unsigned, checksumSha256: sha256Bytes(JSON.stringify(unsigned)) };
}

export function verifyChecksum(receipt, errorCode = "receipt") {
  if (!receipt || typeof receipt !== "object" || typeof receipt.checksumSha256 !== "string") {
    throw new Error(`${errorCode}_checksum_missing`);
  }
  const { checksumSha256, ...unsigned } = receipt;
  if (checksumSha256 !== sha256Bytes(JSON.stringify(unsigned))) {
    throw new Error(`${errorCode}_checksum_mismatch`);
  }
}

export async function validateBuildOutputBinding({ root, bindingPath, engine: rawEngine, sourceTree, validateCurrentOutput = true }) {
  assertExactNode();
  const engine = normalizeEngine(rawEngine);
  const absoluteBinding = resolveInside(root, bindingPath);
  const { bytes: bindingBytes, value: binding } = await readJsonFile(absoluteBinding, "build_binding");
  verifyChecksum(binding, "build_binding");
  if (binding.schemaVersion !== "velmere.pass4825.build-output-binding.v1") {
    throw new Error("build_binding_schema_mismatch");
  }
  if (binding.engine !== engine) throw new Error("build_binding_engine_mismatch");
  if (binding.sourceTreeSha256 !== sourceTree.sha256 || binding.sourceTreeFileCount !== sourceTree.fileCount) {
    throw new Error("build_binding_source_mismatch");
  }

  const buildReceiptPath = resolveInside(root, binding.buildReceipt?.relativePath || "");
  const buildReceiptBytes = await readFile(buildReceiptPath).catch(() => null);
  if (!buildReceiptBytes || sha256Bytes(buildReceiptBytes) !== binding.buildReceipt.checksumSha256) {
    throw new Error("bound_build_receipt_changed_or_missing");
  }
  const { value: buildReceipt } = await readJsonFile(buildReceiptPath, "bound_build_receipt");
  validateBuildReceipt(buildReceipt, {
    engine,
    sourceTreeSha256: sourceTree.sha256,
    buildId: binding.buildId,
  });
  if (!binding.output || binding.independentEvidence?.physicalOutputChecksumSha256 !== binding.output.sha256) {
    throw new Error("build_binding_independent_output_checksum_mismatch");
  }
  const independentlyValidated = await validateIndependentBuildEvidence({
    root,
    receipt: buildReceipt,
    engine,
    sourceTree,
    output: binding.output,
  });
  if (JSON.stringify(independentlyValidated) !== JSON.stringify(binding.independentEvidence)) {
    throw new Error("build_binding_independent_evidence_changed");
  }

  const output = validateCurrentOutput ? await fingerprintBuildOutput(root) : binding.output;
  if (validateCurrentOutput
      && (output.sha256 !== binding.output.sha256
        || output.fileCount !== binding.output.fileCount
        || output.byteLength !== binding.output.byteLength
        || output.buildId !== binding.buildId)) throw new Error("bound_build_output_changed");

  return {
    binding,
    bindingRelativePath: path.relative(root, absoluteBinding).split(path.sep).join("/"),
    bindingFileChecksumSha256: sha256Bytes(bindingBytes),
    output,
  };
}
