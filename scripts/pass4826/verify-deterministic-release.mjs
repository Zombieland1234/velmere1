#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  RELEASE_VERIFICATION_SCHEMA,
  canonicalJson,
  sha256,
  validateReleasePackageReceipt,
  verifyReleaseArchive,
} from "./release-package-contract.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1] || process.argv[index + 1].startsWith("--")) throw new Error(`argument_value_missing:${name}`);
  return process.argv[index + 1];
}

function relativeIfInside(root, target) {
  const relative = path.relative(root, target);
  return relative.startsWith("..") || path.isAbsolute(relative) ? target : relative.split(path.sep).join("/");
}

const sourceRoot = path.resolve(argument("--source-root", "."));
const archivePath = path.resolve(argument("--archive", "artifacts/pass4826/VELMERE_PASS4826_RELEASE.zip"));
const outputPath = path.resolve(argument("--output", "artifacts/pass4826/PASS4826_RELEASE_VERIFICATION.json"));
const packageReceiptPath = path.resolve(argument("--package-receipt", "artifacts/pass4826/PASS4826_RELEASE_PACKAGE_RECEIPT.json"));
const verified = verifyReleaseArchive(archivePath, {
  sourceRoot,
  allowedDynamicExcludedPaths: [archivePath, packageReceiptPath, outputPath],
});
let packageReceipt;
try { packageReceipt = JSON.parse(readFileSync(packageReceiptPath, "utf8")); }
catch { throw new Error("release_package_receipt_missing_or_invalid"); }
validateReleasePackageReceipt(packageReceipt, verified);
const packageReceiptFileSha256 = sha256(readFileSync(packageReceiptPath));
const core = {
  schemaVersion: RELEASE_VERIFICATION_SCHEMA,
  status: "PASS",
  archive: {
    path: relativeIfInside(sourceRoot, archivePath),
    byteLength: verified.archiveByteLength,
    sha256: verified.archiveSha256,
    entryCount: verified.archiveEntryCount,
  },
  payload: {
    fileCount: verified.payloadFileCount,
    byteLength: verified.payloadByteLength,
    aggregateSha256: verified.payloadAggregateSha256,
  },
  manifestSha256: verified.manifestSha256,
  packageReceipt: {
    path: relativeIfInside(sourceRoot, packageReceiptPath),
    fileSha256: packageReceiptFileSha256,
    receiptSha256: packageReceipt.receiptSha256,
  },
  sourceTreeCurrent: verified.sourceTreeCurrent,
  completeReleaseTreeBound: verified.manifest.sourceBinding.completeReleaseTreeBound,
  physicalExclusionsVerified: verified.physicalExclusionsVerified,
  deterministicZipStructureVerified: verified.deterministicZipStructureVerified,
};
const receipt = { ...core, receiptSha256: sha256(canonicalJson(core)) };
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ...core, outputPath: relativeIfInside(sourceRoot, outputPath) }, null, 2));
