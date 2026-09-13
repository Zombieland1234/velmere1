#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const legacyManifestPath = path.join(root, "config", "pass14", "visual-freeze-manifest.json");
const v2ManifestPath = path.join(root, "config", "pass14", "visual-freeze-manifest-v2.json");
const sha256Hex = /^[a-f0-9]{64}$/;
const sha40Hex = /^[a-f0-9]{40}$/;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function safeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  return normalized !== ".." && !normalized.startsWith("../") && normalized === value.replaceAll("\\", "/");
}

function verifyLegacyV1() {
  const manifest = JSON.parse(fs.readFileSync(legacyManifestPath, "utf8"));
  const rows = manifest.files.map((expected) => {
    const file = path.join(root, expected.path);
    if (!fs.existsSync(file)) return { ...expected, status: "MISSING", actualSha256: null };
    const actualSha256 = sha256(fs.readFileSync(file));
    return { ...expected, status: actualSha256 === expected.sha256 ? "PASS" : "CHANGED", actualSha256 };
  });
  const failed = rows.filter((row) => row.status !== "PASS");
  return {
    schemaVersion: "velmere.pass14.visual-freeze-verification.v1",
    manifestSchemaVersion: manifest.schemaVersion ?? null,
    manifestPath: path.relative(root, legacyManifestPath),
    generatedAt: new Date().toISOString(),
    ok: failed.length === 0,
    protectedFileCount: rows.length,
    failed,
  };
}

function verifyV2() {
  const manifest = JSON.parse(fs.readFileSync(v2ManifestPath, "utf8"));
  const failures = [];

  if (manifest.schemaVersion !== "velmere.pass14.visual-freeze-manifest.v2") {
    failures.push({ type: "SCHEMA", actual: manifest.schemaVersion ?? null });
  }
  if (!sha40Hex.test(manifest.approvedSubjectSha ?? "")) {
    failures.push({ type: "APPROVED_SUBJECT_SHA", actual: manifest.approvedSubjectSha ?? null });
  }
  if (typeof manifest.productContract !== "string" || manifest.productContract.length === 0) {
    failures.push({ type: "PRODUCT_CONTRACT" });
  }
  if (manifest.review?.visualFreezeReapproved !== true) {
    failures.push({ type: "VISUAL_FREEZE_REAPPROVAL_MISSING" });
  }
  if (manifest.review?.automatedPreconditionsPassed !== true) {
    failures.push({ type: "AUTOMATED_PRECONDITIONS_NOT_PASSED" });
  }
  if (typeof manifest.review?.reviewClass !== "string" || manifest.review.reviewClass.length === 0) {
    failures.push({ type: "REVIEW_CLASS_MISSING" });
  }

  const activeFiles = Array.isArray(manifest.activeFiles) ? manifest.activeFiles : [];
  if (activeFiles.length === 0) failures.push({ type: "EMPTY_ACTIVE_FILE_DENOMINATOR" });
  const activePaths = activeFiles.map((entry) => entry?.path);
  if (new Set(activePaths).size !== activePaths.length) failures.push({ type: "DUPLICATE_ACTIVE_PATH" });

  const rows = activeFiles.map((expected) => {
    if (!safeRelativePath(expected?.path)) {
      const row = { path: expected?.path ?? null, status: "INVALID_PATH", expectedSha256: expected?.sha256 ?? null, actualSha256: null };
      failures.push({ type: "ACTIVE_FILE", ...row });
      return row;
    }
    if (!sha256Hex.test(expected?.sha256 ?? "")) {
      const row = { path: expected.path, status: "INVALID_EXPECTED_SHA256", expectedSha256: expected?.sha256 ?? null, actualSha256: null };
      failures.push({ type: "ACTIVE_FILE", ...row });
      return row;
    }
    const file = path.join(root, expected.path);
    if (!fs.existsSync(file)) {
      const row = { path: expected.path, status: "MISSING", expectedSha256: expected.sha256, actualSha256: null };
      failures.push({ type: "ACTIVE_FILE", ...row });
      return row;
    }
    const actualSha256 = sha256(fs.readFileSync(file));
    const status = actualSha256 === expected.sha256 ? "PASS" : "CHANGED";
    const row = { path: expected.path, status, expectedSha256: expected.sha256, actualSha256 };
    if (status !== "PASS") failures.push({ type: "ACTIVE_FILE", ...row });
    return row;
  });

  const retiredLegacyPaths = Array.isArray(manifest.retiredLegacyPaths) ? manifest.retiredLegacyPaths : [];
  if (new Set(retiredLegacyPaths).size !== retiredLegacyPaths.length) failures.push({ type: "DUPLICATE_RETIRED_PATH" });
  for (const retiredPath of retiredLegacyPaths) {
    if (!safeRelativePath(retiredPath)) failures.push({ type: "INVALID_RETIRED_PATH", path: retiredPath });
    if (activePaths.includes(retiredPath)) failures.push({ type: "ACTIVE_RETIRED_OVERLAP", path: retiredPath });
  }

  const evidence = manifest.evidence ?? {};
  if (!Number.isInteger(evidence.browserRunId) || evidence.browserRunId <= 0) failures.push({ type: "BROWSER_RUN_ID" });
  if (!Number.isInteger(evidence.artifactId) || evidence.artifactId <= 0) failures.push({ type: "ARTIFACT_ID" });
  if (!sha256Hex.test(evidence.artifactSha256 ?? "")) failures.push({ type: "ARTIFACT_SHA256" });
  if (typeof evidence.receiptSchemaVersion !== "string" || evidence.receiptSchemaVersion.length === 0) failures.push({ type: "RECEIPT_SCHEMA" });
  if (!Number.isInteger(evidence.expectedCaptureCount) || evidence.expectedCaptureCount <= 0) failures.push({ type: "CAPTURE_DENOMINATOR" });
  if (evidence.capturedCount !== evidence.expectedCaptureCount) failures.push({ type: "CAPTURE_COUNT_MISMATCH", expected: evidence.expectedCaptureCount ?? null, actual: evidence.capturedCount ?? null });
  if (evidence.denominatorConserved !== true) failures.push({ type: "CAPTURE_DENOMINATOR_NOT_CONSERVED" });

  const screenshotEntries = Object.entries(evidence.screenshotSha256 ?? {});
  if (screenshotEntries.length !== evidence.expectedCaptureCount) {
    failures.push({ type: "SCREENSHOT_DENOMINATOR_MISMATCH", expected: evidence.expectedCaptureCount ?? null, actual: screenshotEntries.length });
  }
  for (const [slug, digest] of screenshotEntries) {
    if (!slug || !sha256Hex.test(digest ?? "")) failures.push({ type: "INVALID_SCREENSHOT_DIGEST", slug, digest: digest ?? null });
  }

  const result = {
    schemaVersion: "velmere.pass14.visual-freeze-verification.v2",
    manifestSchemaVersion: manifest.schemaVersion ?? null,
    manifestPath: path.relative(root, v2ManifestPath),
    generatedAt: new Date().toISOString(),
    currentSubjectSha: process.env.GITHUB_SHA ?? null,
    approvedSubjectSha: manifest.approvedSubjectSha ?? null,
    productContract: manifest.productContract ?? null,
    reviewClass: manifest.review?.reviewClass ?? null,
    releaseVisualApproval: manifest.review?.releaseVisualApproval === true,
    independentExternalReview: manifest.review?.independentExternalReview === true,
    visualFreezeVerified: failures.length === 0,
    ok: failures.length === 0,
    protectedFileCount: rows.length,
    retiredLegacyPathCount: retiredLegacyPaths.length,
    expectedCaptureCount: evidence.expectedCaptureCount ?? null,
    rows,
    failures,
    truthBoundary: "PASS means the active visual source set matches the exact rendered subject that received the declared internal visual-freeze reapproval. It does not imply independent external review, production data readiness, or overall R11B release approval.",
  };
  return result;
}

let result;
try {
  result = fs.existsSync(v2ManifestPath) ? verifyV2() : verifyLegacyV1();
} catch (error) {
  result = {
    schemaVersion: "velmere.pass14.visual-freeze-verification.error.v1",
    generatedAt: new Date().toISOString(),
    ok: false,
    error: String(error?.stack || error?.message || error),
  };
}

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
