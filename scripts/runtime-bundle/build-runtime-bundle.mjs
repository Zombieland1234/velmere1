#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRuntimeArchive, receiptSha256, verifyRuntimeArchive, RUNTIME_RECEIPT_SCHEMA } from "./runtime-bundle-lib.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`argument_value_missing:${name}`);
  return value;
}

const root = path.resolve(argument("--source-root", "."));
const archivePath = path.resolve(root, argument("--archive", "artifacts/runtime/VELMERE_RUNTIME_DEPLOYMENT.zip"));
const receiptPath = path.resolve(root, argument("--receipt", "artifacts/runtime/RUNTIME_PACKAGE_RECEIPT.json"));
const overwrite = process.argv.includes("--overwrite");
const extraExcludedPaths = [
  path.relative(root, archivePath).split(path.sep).join("/"),
  path.relative(root, receiptPath).split(path.sep).join("/"),
];
const before = createRuntimeArchive(root, archivePath, { overwrite, extraExcludedPaths });
const verified = verifyRuntimeArchive(archivePath, { policyRoot: root });
const core = {
  schemaVersion: RUNTIME_RECEIPT_SCHEMA,
  status: "PASS",
  profile: before.manifest.profile,
  archive: {
    path: path.relative(root, archivePath).split(path.sep).join("/"),
    byteLength: verified.archiveByteLength,
    sha256: verified.archiveSha256,
    entryCount: verified.archiveEntryCount,
  },
  payload: {
    fileCount: verified.payloadFileCount,
    byteLength: verified.payloadByteLength,
    pathSetSha256: verified.currentSourceBinding.pathSetSha256,
    aggregateSha256: verified.payloadAggregateSha256,
  },
  currentSourceBinding: verified.currentSourceBinding,
  manifestSha256: verified.manifestSha256,
  deploymentClosure: verified.deploymentClosure,
  excludedObservedCount: before.inventory.excluded.length,
  policyDefinedProofPlanePhysicallyAbsent: verified.manifest.exclusionPolicy.policyDefinedProofPlanePhysicallyAbsent,
  proofPlaneClaimScope: verified.manifest.exclusionPolicy.proofPlaneClaimScope,
  limitations: before.manifest.limitations,
};
const receipt = { ...core, receiptSha256: receiptSha256(core) };
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, archive: receipt.archive, payload: receipt.payload, excludedObservedCount: receipt.excludedObservedCount, receiptPath: path.relative(root, receiptPath).split(path.sep).join("/") }, null, 2));
