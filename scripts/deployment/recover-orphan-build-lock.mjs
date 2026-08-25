#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  inspectSegmentedBuildLockForRecovery,
  recoverSegmentedBuildLockFromInspection,
} from "../../lib/build/segmented-build-integrity.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}
function required(name) {
  const value = argumentValue(name);
  if (!value) throw new Error(`missing_required_argument:${name}`);
  return value;
}
function readReviews(filePath) {
  const absolute = path.resolve(filePath);
  const metadata = fs.lstatSync(absolute);
  if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error("orphan_lock_reviews_must_be_regular_file");
  if (metadata.size > 128 * 1024) throw new Error("orphan_lock_reviews_too_large");
  const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (!Array.isArray(parsed.reviews)) throw new Error("orphan_lock_reviews_array_missing");
  return parsed.reviews;
}

const root = path.resolve(required("--root"));
const mode = required("--mode");
const distDir = required("--dist-dir");
const expectedSourceFingerprintSha256 = required("--source-fingerprint");
const externalLockRoot = argumentValue("--external-lock-root") ?? process.env.VELMERE_BUILD_LOCK_ROOT;
const inspection = inspectSegmentedBuildLockForRecovery({
  root,
  mode,
  distDir,
  expectedSourceFingerprintSha256,
  externalLockRoot,
});
if (process.argv.includes("--inspect-only")) {
  console.log(JSON.stringify(inspection, null, 2));
  process.exit(inspection.status === "LOCK_ABSENT" ? 2 : 0);
}
const reviewsPath = required("--reviews");
const confirmationToken = required("--confirm");
const result = recoverSegmentedBuildLockFromInspection({
  inspection,
  reviews: readReviews(reviewsPath),
  confirmationToken,
});
console.log(JSON.stringify({ inspection, recovery: result }, null, 2));
if (!result.recovered) process.exit(1);
