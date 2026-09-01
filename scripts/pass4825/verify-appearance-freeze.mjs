#!/usr/bin/env node

import { lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  APPEARANCE_FREEZE_OUTPUT,
  createAppearanceFreezeReceipt,
  sha256Appearance,
  validateAppearanceFreezeReceipt,
} from "./appearance-freeze-contract.mjs";

let outputWritten = false;

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function parseArguments(argv) {
  const allowed = new Set(["baseline-root", "current-root", "output"]);
  const values = {};
  invariant(argv.length > 0 && argv.length % 2 === 0, "appearance_cli_arguments_invalid");
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    invariant(key?.startsWith("--") && typeof value === "string" && value.length > 0,
      `appearance_cli_argument_invalid:${key ?? "missing"}`);
    const name = key.slice(2);
    invariant(allowed.has(name) && !Object.hasOwn(values, name),
      `appearance_cli_argument_rejected:${name}`);
    values[name] = value;
  }
  invariant(typeof values["baseline-root"] === "string", "appearance_cli_baseline_root_required");
  return {
    baselineRoot: values["baseline-root"],
    currentRoot: values["current-root"] ?? ".",
    output: values.output ?? APPEARANCE_FREEZE_OUTPUT,
  };
}

function outputInsideCurrentRoot(currentRoot, candidate) {
  const absoluteRoot = path.resolve(currentRoot);
  const absoluteOutput = path.resolve(absoluteRoot, candidate);
  const relative = path.relative(absoluteRoot, absoluteOutput);
  invariant(relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    "appearance_output_outside_current_root");
  invariant(relative.split(path.sep).join("/") === candidate,
    "appearance_output_path_not_normalized");
  return absoluteOutput;
}

async function atomicWrite(outputPath, bytes) {
  const directory = path.dirname(outputPath);
  await mkdir(directory, { recursive: true });
  const directoryStats = await lstat(directory).catch(() => null);
  invariant(directoryStats?.isDirectory() && !directoryStats.isSymbolicLink(),
    "appearance_output_directory_invalid");
  const existing = await lstat(outputPath).catch(() => null);
  invariant(existing === null || (existing.isFile() && !existing.isSymbolicLink()),
    "appearance_output_target_invalid");
  const temporary = `${outputPath}.tmp-${process.pid}`;
  invariant(await lstat(temporary).catch(() => null) === null,
    "appearance_output_temporary_exists");
  try {
    await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
    await rename(temporary, outputPath);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const receipt = await createAppearanceFreezeReceipt({
    currentRoot: args.currentRoot,
    baselineRoot: args.baselineRoot,
  });
  validateAppearanceFreezeReceipt(receipt);
  const outputPath = outputInsideCurrentRoot(args.currentRoot, args.output);
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  await atomicWrite(outputPath, bytes);
  outputWritten = true;
  const persisted = await readFile(outputPath);
  invariant(persisted.equals(bytes), "appearance_persisted_bytes_mismatch");
  validateAppearanceFreezeReceipt(JSON.parse(persisted.toString("utf8")));
  console.log(JSON.stringify({
    status: receipt.status,
    rawTsxAppearanceProjectionEqual: receipt.claimBoundary.rawTsxAppearanceProjectionEqual,
    appearanceProjectionEqualAfterApprovedDataTruthSubstitutions:
      receipt.claimBoundary.appearanceProjectionEqualAfterApprovedDataTruthSubstitutions,
    approvedDataTruthSubstitutionsApplied:
      receipt.claimBoundary.approvedDataTruthSubstitutionsApplied,
    tsxFileCount: receipt.comparison.tsxFileCount,
    fullByteMaterialCount: receipt.comparison.fullByteMaterialCount,
    logicOnlyTsxDifferenceCount: receipt.comparison.logicOnlyTsxDifferenceCount,
    failureCount: receipt.comparison.failureCount,
    output: args.output,
    outputFileSha256: sha256Appearance(persisted),
    checksumSha256: receipt.checksumSha256,
  }, null, 2));
  if (receipt.status !== "PASS") process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "BLOCKED",
    errorCode: error instanceof Error ? error.message : "appearance_verification_failed",
    outputWritten,
  }));
  process.exitCode = 2;
});
