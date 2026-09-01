#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  RELEASE_PACKAGE_RECEIPT_SCHEMA,
  buildReleaseManifest,
  canonicalJson,
  collectReleaseInventory,
  releaseEntriesFromInventory,
  sha256,
  verifyReleaseArchive,
  writeDeterministicZip,
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
const receiptPath = path.resolve(argument("--receipt", "artifacts/pass4826/PASS4826_RELEASE_PACKAGE_RECEIPT.json"));
const verificationReceiptPath = path.resolve(argument("--verification-receipt", "artifacts/pass4826/PASS4826_RELEASE_VERIFICATION.json"));
const overwrite = process.argv.includes("--overwrite");
const dynamicExcludedPaths = [archivePath, receiptPath, verificationReceiptPath];

const before = collectReleaseInventory(sourceRoot, { dynamicExcludedPaths });
const manifest = buildReleaseManifest(before);
const entries = releaseEntriesFromInventory(before, manifest);
const archive = writeDeterministicZip(archivePath, entries, { overwrite });
const verified = verifyReleaseArchive(archivePath, { sourceRoot, allowedDynamicExcludedPaths: dynamicExcludedPaths });
const after = collectReleaseInventory(sourceRoot, { dynamicExcludedPaths });
if (before.aggregateSha256 !== after.aggregateSha256 || before.pathSetSha256 !== after.pathSetSha256) {
  throw new Error("release_source_tree_changed_during_packaging");
}
if (archive.sha256 !== verified.archiveSha256 || archive.byteLength !== verified.archiveByteLength) {
  throw new Error("release_archive_post_write_verification_mismatch");
}

const receiptCore = {
  schemaVersion: RELEASE_PACKAGE_RECEIPT_SCHEMA,
  status: "PASS",
  deterministicWriter: "repo_owned_zip_store_v1",
  sourceRootClass: "complete_release_tree",
  sourceTreeBeforeSha256: before.aggregateSha256,
  sourceTreeAfterSha256: after.aggregateSha256,
  sourcePathSetSha256: before.pathSetSha256,
  sourceUnchanged: true,
  payloadFileCount: before.fileCount,
  payloadByteLength: before.byteLength,
  manifestSha256: manifest.manifestSha256,
  archive: {
    path: relativeIfInside(sourceRoot, archivePath),
    byteLength: archive.byteLength,
    sha256: archive.sha256,
    entryCount: archive.entryCount,
  },
  physicalExclusionsVerified: verified.physicalExclusionsVerified,
  deterministicZipStructureVerified: verified.deterministicZipStructureVerified,
  packager: {
    path: "scripts/pass4826/package-deterministic-release.mjs",
    sha256: sha256(readFileSync(new URL(import.meta.url))),
  },
  contract: {
    path: "scripts/pass4826/release-package-contract.mjs",
    sha256: sha256(readFileSync(new URL("./release-package-contract.mjs", import.meta.url))),
  },
  limitations: [
    "The payload manifest cannot include its own digest recursively; the external package receipt binds the complete ZIP including that manifest.",
    "This package receipt proves deterministic local construction and integrity, not an independent organizational signature or external certification.",
  ],
};
const receipt = { ...receiptCore, receiptSha256: sha256(canonicalJson(receiptCore)) };
mkdirSync(path.dirname(receiptPath), { recursive: true });
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  status: receipt.status,
  archive: receipt.archive,
  payloadFileCount: receipt.payloadFileCount,
  payloadByteLength: receipt.payloadByteLength,
  sourceTreeSha256: receipt.sourceTreeBeforeSha256,
  manifestSha256: receipt.manifestSha256,
  receiptPath: relativeIfInside(sourceRoot, receiptPath),
}, null, 2));
