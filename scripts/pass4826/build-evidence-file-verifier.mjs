import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DIGEST_RE = /^[a-f0-9]{64}$/u;

function cleanDigest(value) {
  return String(value ?? "").replace(/^sha256:/u, "");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function resolveEvidencePath(root, relativePath, errors, codePrefix) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    errors.push(`${codePrefix}_path_missing`);
    return null;
  }
  if (relativePath.includes("\\") || path.isAbsolute(relativePath)) {
    errors.push(`${codePrefix}_path_invalid`);
    return null;
  }
  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath || normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    errors.push(`${codePrefix}_path_traversal`);
    return null;
  }
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    errors.push(`${codePrefix}_path_outside_root`);
    return null;
  }
  return absolute;
}

export function verifyExternalBuildEvidence({ root, engine, currentSourceTreeSha256, binding }) {
  const errors = [];
  const result = {
    engine,
    ok: false,
    errors,
    receiptPath: null,
    receiptFileSha256: null,
    logPath: null,
    logFileSha256: null,
  };
  if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
    errors.push("binding_missing_or_invalid");
    return result;
  }

  const receiptPath = resolveEvidencePath(root, binding.buildReceiptPath, errors, "build_receipt");
  result.receiptPath = typeof binding.buildReceiptPath === "string" ? binding.buildReceiptPath : null;
  const expectedReceiptSha256 = cleanDigest(binding.buildReceiptSha256);
  if (!DIGEST_RE.test(expectedReceiptSha256)) errors.push("build_receipt_digest_invalid");

  let buildReceipt = null;
  if (receiptPath) {
    if (!existsSync(receiptPath)) {
      errors.push("build_receipt_file_missing");
    } else {
      const bytes = readFileSync(receiptPath);
      result.receiptFileSha256 = sha256(bytes);
      if (DIGEST_RE.test(expectedReceiptSha256) && result.receiptFileSha256 !== expectedReceiptSha256) {
        errors.push("build_receipt_digest_mismatch");
      }
      try {
        buildReceipt = JSON.parse(bytes.toString("utf8"));
      } catch {
        errors.push("build_receipt_json_invalid");
      }
    }
  }

  if (buildReceipt && typeof buildReceipt === "object") {
    if (buildReceipt.id !== "pass4805-source-bound-production-build-v1") errors.push("build_receipt_schema_mismatch");
    if (buildReceipt.ok !== true || buildReceipt.releaseEligible !== true) errors.push("build_receipt_not_release_eligible");
    if (buildReceipt.selectedEngine !== engine) errors.push("build_receipt_engine_mismatch");
    if (buildReceipt.exactNode !== true) errors.push("build_receipt_runtime_not_exact");
    if (buildReceipt.sourceUnchanged !== true) errors.push("build_receipt_source_changed");
    if (buildReceipt.sourceFingerprint !== currentSourceTreeSha256) errors.push("build_receipt_source_not_current");
    if (buildReceipt.postBuildSourceFingerprint !== currentSourceTreeSha256) errors.push("build_receipt_post_source_not_current");
    if (buildReceipt.buildId !== binding.buildId) errors.push("build_receipt_build_id_mismatch");

    const attempt = Array.isArray(buildReceipt.attempts)
      ? buildReceipt.attempts.find((entry) => entry?.engine === engine && entry?.exitCode === 0 && entry?.buildIdMatches === true)
      : null;
    if (!attempt) errors.push("build_receipt_success_attempt_missing");
    if (attempt && binding.attempt) {
      if (attempt.buildId !== binding.attempt.buildId) errors.push("build_attempt_build_id_mismatch");
      if (attempt.logPath !== binding.attempt.logPath) errors.push("build_attempt_log_path_mismatch");
    }
  }

  const logPathValue = binding.buildLogPath ?? binding.attempt?.logPath;
  const logPath = resolveEvidencePath(root, logPathValue, errors, "build_log");
  result.logPath = typeof logPathValue === "string" ? logPathValue : null;
  const expectedLogSha256 = cleanDigest(binding.buildLogSha256);
  if (!DIGEST_RE.test(expectedLogSha256)) errors.push("build_log_digest_invalid");
  if (logPath) {
    if (!existsSync(logPath)) {
      errors.push("build_log_file_missing");
    } else {
      const bytes = readFileSync(logPath);
      result.logFileSha256 = sha256(bytes);
      if (DIGEST_RE.test(expectedLogSha256) && result.logFileSha256 !== expectedLogSha256) {
        errors.push("build_log_digest_mismatch");
      }
      const text = bytes.toString("utf8");
      if (!/Compiled successfully|compiled successfully|✓ Compiled/u.test(text)) errors.push("build_log_success_marker_missing");
      if (/Build failed|Failed to compile|FATAL|uncaught exception/iu.test(text)) errors.push("build_log_failure_marker_present");
    }
  }

  result.ok = errors.length === 0;
  return result;
}
