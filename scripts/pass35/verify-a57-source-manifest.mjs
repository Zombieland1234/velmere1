#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { collectPass35Inventory } from "./source-inventory.mjs";

const root = path.resolve(process.cwd());
const manifestRelativePath = "config/pass35/a57-source-manifest.json";
const manifestPath = path.join(root, manifestRelativePath);
const revisionId =
  "VELMERE_PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE";
const supplements = Object.freeze([
  "_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json",
  "_velmere/pass35/PASS35_LOCAL_PDF_QA_SUMMARY.json",
  "_velmere/pass35/PASS35_LOCAL_PRODUCT_QUALITY_RECEIPT.json",
  "_velmere/pass35/PASS35_READINESS_DASHBOARD.json",
]);
const failures = [];

function lexical(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function failure(error, detail = null) {
  failures.push({ error, detail });
}

function validRelativePath(value) {
  return (
    typeof value === "string"
    && Boolean(value)
    && !path.isAbsolute(value)
    && !value.includes("\\")
    && value.split("/").every((segment) => segment && segment !== "." && segment !== "..")
  );
}

let manifestBytes = null;
let manifest = null;
try {
  manifestBytes = fs.readFileSync(manifestPath);
  manifest = JSON.parse(manifestBytes.toString("utf8"));
} catch (error) {
  failure("manifest_unreadable", error instanceof Error ? error.message : "unknown");
}

if (manifest?.schemaVersion !== "velmere.pass35.a57.source-manifest.v1") {
  failure("schema_mismatch", manifest?.schemaVersion ?? null);
}
if (manifest?.revisionId !== revisionId) {
  failure("revision_mismatch", manifest?.revisionId ?? null);
}
if (!Number.isFinite(Date.parse(String(manifest?.generatedAt ?? "")))) {
  failure("generated_at_invalid", manifest?.generatedAt ?? null);
}

const rows = Array.isArray(manifest?.files) ? manifest.files : [];
if (!Array.isArray(manifest?.files)) failure("files_not_array");

let expectedPaths = [];
try {
  const inventory = collectPass35Inventory(root);
  if (inventory.unknownCount !== 0) {
    failure("unknown_inventory_paths", inventory.unknownCount);
  }
  expectedPaths = [
    ...inventory.entries
      .filter((entry) => entry.sourceIncluded && entry.path !== manifestRelativePath)
      .map((entry) => entry.path),
    ...supplements,
  ].sort(lexical);
} catch (error) {
  failure("inventory_unreadable", error instanceof Error ? error.message : "unknown");
}

const declaredPaths = rows.map((row) => row?.path);
const duplicatePaths = declaredPaths.filter(
  (value, index) => declaredPaths.indexOf(value) !== index,
);
if (duplicatePaths.length) failure("duplicate_paths", [...new Set(duplicatePaths)].sort(lexical));

const sortedDeclaredPaths = [...declaredPaths].sort(lexical);
if (JSON.stringify(declaredPaths) !== JSON.stringify(sortedDeclaredPaths)) {
  failure("paths_not_sorted");
}

if (expectedPaths.length) {
  const declaredSet = new Set(declaredPaths);
  const expectedSet = new Set(expectedPaths);
  const missing = expectedPaths.filter((value) => !declaredSet.has(value));
  const unexpected = declaredPaths
    .filter((value) => typeof value === "string" && !expectedSet.has(value))
    .sort(lexical);
  if (missing.length) failure("declared_set_missing", missing);
  if (unexpected.length) failure("declared_set_unexpected", unexpected);
}

let passedFiles = 0;
for (const row of rows) {
  if (
    !validRelativePath(row?.path)
    || row.path === manifestRelativePath
    || !Number.isSafeInteger(row?.bytes)
    || row.bytes < 0
    || !/^[a-f0-9]{64}$/.test(String(row?.sha256 ?? ""))
  ) {
    failure("row_invalid", row?.path ?? null);
    continue;
  }
  const absolute = path.resolve(root, row.path);
  if (!absolute.startsWith(`${root}${path.sep}`)) {
    failure("path_escape", row.path);
    continue;
  }
  try {
    let cursor = root;
    for (const segment of row.path.split("/")) {
      cursor = path.join(cursor, segment);
      if (fs.lstatSync(cursor).isSymbolicLink()) {
        throw new Error("symlink_forbidden");
      }
    }
    if (!fs.statSync(absolute).isFile()) throw new Error("not_regular_file");
    const current = fs.readFileSync(absolute);
    if (sha256(current) !== row.sha256 || current.length !== row.bytes) {
      throw new Error("bytes_or_sha_mismatch");
    }
    passedFiles += 1;
  } catch (error) {
    failure("file_verification_failed", {
      path: row.path,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

const result = {
  schemaVersion: "velmere.pass35.a57.source-manifest-verification.v2",
  revisionId: manifest?.revisionId ?? null,
  manifestSha256: manifestBytes ? sha256(manifestBytes) : null,
  files: rows.length,
  expectedFiles: expectedPaths.length,
  passed: passedFiles,
  failed: failures.length,
  status: failures.length ? "FAIL" : "PASS",
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
