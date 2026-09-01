#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { collectPass35Inventory } from "./source-inventory.mjs";

export const A57_SOURCE_MANIFEST_SUPPLEMENTS = Object.freeze([
  "_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json",
  "_velmere/pass35/PASS35_LOCAL_PDF_QA_SUMMARY.json",
  "_velmere/pass35/PASS35_LOCAL_PRODUCT_QUALITY_RECEIPT.json",
  "_velmere/pass35/PASS35_READINESS_DASHBOARD.json",
]);

const root = path.resolve(process.cwd());
const outputRelativePath = "config/pass35/a57-source-manifest.json";
const outputPath = path.join(root, outputRelativePath);
const deterministicEpoch = "2026-07-26T00:00:00.000Z";
const revisionId =
  "VELMERE_PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE";

function lexical(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readRegular(relativePath) {
  if (
    typeof relativePath !== "string"
    || !relativePath
    || path.isAbsolute(relativePath)
    || relativePath.includes("\\")
    || relativePath.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`a57_source_manifest_path_invalid:${String(relativePath)}`);
  }
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error(`a57_source_manifest_path_escape:${relativePath}`);
  }
  let cursor = root;
  for (const segment of relativePath.split("/")) {
    cursor = path.join(cursor, segment);
    const metadata = fs.lstatSync(cursor);
    if (metadata.isSymbolicLink()) {
      throw new Error(`a57_source_manifest_symlink_forbidden:${relativePath}`);
    }
  }
  if (!fs.statSync(absolute).isFile()) {
    throw new Error(`a57_source_manifest_not_regular_file:${relativePath}`);
  }
  return fs.readFileSync(absolute);
}

const inventory = collectPass35Inventory(root);
if (inventory.unknownCount !== 0) {
  throw new Error(`a57_source_manifest_unknown_inventory:${inventory.unknownCount}`);
}

const expectedPaths = [
  ...inventory.entries
    .filter((entry) => entry.sourceIncluded && entry.path !== outputRelativePath)
    .map((entry) => entry.path),
  ...A57_SOURCE_MANIFEST_SUPPLEMENTS,
].sort(lexical);

if (new Set(expectedPaths).size !== expectedPaths.length) {
  throw new Error("a57_source_manifest_duplicate_expected_path");
}

const files = expectedPaths.map((relativePath) => {
  const bytes = readRegular(relativePath);
  return {
    path: relativePath,
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
});

const manifest = {
  schemaVersion: "velmere.pass35.a57.source-manifest.v1",
  revisionId,
  generatedAt: deterministicEpoch,
  files,
};

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      status: "PASS",
      output: outputRelativePath,
      files: files.length,
      unknownInventory: inventory.unknownCount,
      sha256: sha256(fs.readFileSync(outputPath)),
    },
    null,
    2,
  ),
);
