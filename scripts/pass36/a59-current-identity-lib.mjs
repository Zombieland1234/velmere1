import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function fail(code, detail = null) {
  const error = new Error(detail === null ? code : `${code}: ${detail}`);
  error.code = code;
  error.detail = detail;
  throw error;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertPlainObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
}

function assertCanonicalRelativePath(relative, { root, allowedRoots, extension = null, codePrefix }) {
  if (typeof relative !== "string" || relative.length === 0) fail(`${codePrefix}_EMPTY`);
  if (relative.includes("\\") || relative.includes("\0")) fail(`${codePrefix}_NON_POSIX`, relative);
  if (path.posix.isAbsolute(relative) || path.win32.isAbsolute(relative)) fail(`${codePrefix}_ABSOLUTE`, relative);
  if (relative.includes("//")) fail(`${codePrefix}_NON_CANONICAL`, relative);
  const segments = relative.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    fail(`${codePrefix}_NON_CANONICAL`, relative);
  }
  if (path.posix.normalize(relative) !== relative) fail(`${codePrefix}_NON_CANONICAL`, relative);
  if (!allowedRoots.includes(segments[0])) fail(`${codePrefix}_ROOT`, relative);
  if (extension !== null && path.posix.extname(relative).toLowerCase() !== extension) {
    fail(`${codePrefix}_EXTENSION`, relative);
  }

  const rootReal = fs.realpathSync(root);
  let cursor = rootReal;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch (error) {
      fail(`${codePrefix}_MISSING`, `${relative}: ${error.code ?? error.message}`);
    }
    if (stat.isSymbolicLink()) fail(`${codePrefix}_SYMLINK`, relative);
  }
  const finalStat = fs.statSync(cursor);
  if (!finalStat.isFile()) fail(`${codePrefix}_NOT_REGULAR`, relative);
  const finalReal = fs.realpathSync(cursor);
  const withinRoot = finalReal === rootReal || finalReal.startsWith(`${rootReal}${path.sep}`);
  if (!withinRoot) fail(`${codePrefix}_ESCAPE`, relative);
  return { absolute: finalReal, stat: finalStat };
}

function uniqueMap(rows, keyOf, code) {
  const result = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (result.has(key)) fail(code, key);
    result.set(key, row);
  }
  return result;
}

export function inspectCssIdentity({ root, profileCssPressure, receiptFiles, allowedRoots }) {
  if (!Array.isArray(profileCssPressure) || !Array.isArray(receiptFiles)) fail("CSS_ROWS_NOT_ARRAYS");
  if (!Array.isArray(allowedRoots) || allowedRoots.length === 0) fail("CSS_ALLOWED_ROOTS_EMPTY");
  const profileByPath = uniqueMap(profileCssPressure, (row) => row?.file, "CSS_PROFILE_DUPLICATE_PATH");
  const receiptByPath = uniqueMap(receiptFiles, (row) => row?.path, "CSS_RECEIPT_DUPLICATE_PATH");
  const profilePaths = [...profileByPath.keys()].sort();
  const receiptPaths = [...receiptByPath.keys()].sort();
  if (!sameJson(profilePaths, receiptPaths)) {
    fail("CSS_PROFILE_RECEIPT_PATH_SET_MISMATCH", JSON.stringify({ profilePaths, receiptPaths }));
  }

  const identityRows = [];
  let totalBytes = 0;
  for (const relative of receiptPaths) {
    const profileRow = profileByPath.get(relative);
    const receiptRow = receiptByPath.get(relative);
    assertPlainObject(profileRow, "CSS_PROFILE_ROW_INVALID");
    assertPlainObject(receiptRow, "CSS_RECEIPT_ROW_INVALID");
    const { absolute, stat } = assertCanonicalRelativePath(relative, {
      root,
      allowedRoots,
      extension: ".css",
      codePrefix: "CSS_PATH",
    });
    const bytes = fs.readFileSync(absolute);
    const digest = sha256(bytes);
    if (!Number.isSafeInteger(profileRow.bytes) || profileRow.bytes !== stat.size) {
      fail("CSS_PROFILE_BYTES_MISMATCH", relative);
    }
    if (!Number.isSafeInteger(receiptRow.afterBytes) || receiptRow.afterBytes !== stat.size) {
      fail("CSS_RECEIPT_BYTES_MISMATCH", relative);
    }
    if (receiptRow.afterSha256 !== digest) fail("CSS_RECEIPT_HASH_MISMATCH", relative);
    if (receiptRow.parseErrorsAfter !== 0) fail("CSS_RECEIPT_PARSE_ERROR", relative);
    totalBytes += stat.size;
    identityRows.push({ path: relative, bytes: stat.size, sha256: digest });
  }

  return {
    fileCount: identityRows.length,
    totalBytes,
    pathSetSha256: sha256(identityRows.map((row) => `${row.path}\n`).join("")),
    finalIdentitySha256: sha256(identityRows.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}\n`).join("")),
    identityRows,
  };
}

export function assertCssIdentityBinding(actual, expected) {
  assertPlainObject(expected, "CSS_EXPECTED_BINDING_INVALID");
  for (const field of ["fileCount", "totalBytes", "pathSetSha256", "finalIdentitySha256"]) {
    if (actual[field] !== expected[field]) fail(`CSS_BINDING_${field.toUpperCase()}_MISMATCH`, JSON.stringify({ actual: actual[field], expected: expected[field] }));
  }
  return true;
}

function assertCanonicalApiPath(value) {
  if (typeof value !== "string" || !value.startsWith("/api/") || value.includes("\\") || value.includes("\0") || value.includes("//")) {
    fail("API_PATH_NON_CANONICAL", value);
  }
  const segments = value.slice(1).split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    fail("API_PATH_NON_CANONICAL", value);
  }
  if (`/${path.posix.normalize(value.slice(1))}` !== value) fail("API_PATH_NON_CANONICAL", value);
}

const SOURCE_CLASSES = [
  "control_plane",
  "machine_webhook",
  "admin_operator",
  "authenticated_customer",
  "public_product",
  "unclassified",
];

const BODY_HANDLING = ["stream_bounded", "body_rejected", "not_applicable"];
const HTTP_METHODS = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"];

export function inspectApiIdentity({ root, inventory, allowedFileRoots }) {
  assertPlainObject(inventory, "API_INVENTORY_INVALID");
  if (!Array.isArray(inventory.routes)) fail("API_ROUTES_NOT_ARRAY");
  if (!Array.isArray(allowedFileRoots) || allowedFileRoots.length === 0) fail("API_ALLOWED_ROOTS_EMPTY");
  const byPath = uniqueMap(inventory.routes, (row) => row?.path, "API_DUPLICATE_PATH");
  const identityRows = [];

  for (const routePath of [...byPath.keys()].sort()) {
    assertCanonicalApiPath(routePath);
    const row = byPath.get(routePath);
    assertPlainObject(row, "API_ROUTE_ROW_INVALID");
    const handlerFile = assertCanonicalRelativePath(row.file, {
      root,
      allowedRoots: allowedFileRoots,
      codePrefix: "API_FILE_PATH",
    });
    const handlerBytes = fs.readFileSync(handlerFile.absolute);
    const handlerSha256 = sha256(handlerBytes);
    if (!Array.isArray(row.methods) || row.methods.length === 0) fail("API_METHODS_INVALID", routePath);
    const methods = [...row.methods];
    if (new Set(methods).size !== methods.length || methods.some((method) => !HTTP_METHODS.includes(method))) {
      fail("API_METHODS_INVALID", routePath);
    }
    methods.sort();
    if (!SOURCE_CLASSES.includes(row.sourceClass)) fail("API_SOURCE_CLASS_INVALID", routePath);
    if (!BODY_HANDLING.includes(row.bodyHandling)) fail("API_BODY_HANDLING_INVALID", routePath);
    if (typeof row.mutating !== "boolean" || typeof row.bodyBoundary !== "boolean") fail("API_BOUNDARY_FLAGS_INVALID", routePath);
    if (!Array.isArray(row.bodyBoundaryEvidence) || row.bodyBoundaryEvidence.some((value) => typeof value !== "string")) {
      fail("API_BOUNDARY_EVIDENCE_INVALID", routePath);
    }
    identityRows.push({
      path: routePath,
      file: row.file,
      fileByteLength: handlerBytes.length,
      fileSha256: handlerSha256,
      methods,
      mutating: row.mutating,
      bodyBoundary: row.bodyBoundary,
      bodyHandling: row.bodyHandling,
      bodyBoundaryEvidence: [...row.bodyBoundaryEvidence].sort(),
      sourceClass: row.sourceClass,
    });
  }

  const counts = Object.fromEntries(SOURCE_CLASSES.map((sourceClass) => [sourceClass, 0]));
  const allMutatingBodyHandlingCounts = { stream_bounded: 0, body_rejected: 0 };
  let mutatingRouteCount = 0;
  let boundedMutatingRouteCount = 0;
  for (const row of identityRows) {
    counts[row.sourceClass] += 1;
    if (!row.mutating) continue;
    mutatingRouteCount += 1;
    if (row.bodyBoundary) boundedMutatingRouteCount += 1;
    if (row.bodyHandling === "stream_bounded" || row.bodyHandling === "body_rejected") {
      allMutatingBodyHandlingCounts[row.bodyHandling] += 1;
    }
  }
  const summary = {
    routeCount: identityRows.length,
    counts,
    controlPlaneCount: counts.control_plane,
    mutatingRouteCount,
    boundedMutatingRouteCount,
    unboundedMutatingRouteCount: mutatingRouteCount - boundedMutatingRouteCount,
    boundedMutatingCoveragePercent: mutatingRouteCount === 0 ? 100 : (boundedMutatingRouteCount / mutatingRouteCount) * 100,
    allMutatingBodyHandlingCounts,
  };

  for (const field of Object.keys(summary)) {
    if (!sameJson(inventory[field], summary[field])) {
      fail("API_DECLARED_SUMMARY_MISMATCH", field);
    }
  }

  const fileByPath = new Map();
  for (const row of identityRows) {
    const existing = fileByPath.get(row.file);
    const current = { path: row.file, byteLength: row.fileByteLength, sha256: row.fileSha256 };
    if (existing && !sameJson(existing, current)) fail("API_FILE_IDENTITY_CONFLICT", row.file);
    fileByPath.set(row.file, current);
  }
  const fileIdentityRows = [...fileByPath.values()].sort((left, right) => left.path.localeCompare(right.path));

  return {
    routeIdentitySha256: sha256(`${JSON.stringify(identityRows)}\n`),
    handlerFileBindingCount: identityRows.length,
    uniqueHandlerFileCount: fileIdentityRows.length,
    handlerFileIdentitySha256: sha256(fileIdentityRows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\n`).join("")),
    summary,
    identityRows,
    fileIdentityRows,
  };
}

export function assertApiIdentityBinding(actual, expected) {
  assertPlainObject(expected, "API_EXPECTED_BINDING_INVALID");
  if (actual.routeIdentitySha256 !== expected.routeIdentitySha256) {
    fail("API_ROUTE_IDENTITY_MISMATCH", JSON.stringify({ actual: actual.routeIdentitySha256, expected: expected.routeIdentitySha256 }));
  }
  for (const field of ["handlerFileBindingCount", "uniqueHandlerFileCount", "handlerFileIdentitySha256"]) {
    if (actual[field] !== expected[field]) {
      fail(`API_${field.toUpperCase()}_MISMATCH`, JSON.stringify({ actual: actual[field], expected: expected[field] }));
    }
  }
  if (!sameJson(actual.summary, expected.summary)) {
    fail("API_SUMMARY_BINDING_MISMATCH", JSON.stringify({ actual: actual.summary, expected: expected.summary }));
  }
  return true;
}

export function budgetTupleSha256(budgets) {
  assertPlainObject(budgets, "BUDGET_TUPLE_INVALID");
  const rows = Object.entries(budgets).sort(([left], [right]) => left.localeCompare(right));
  if (rows.length === 0 || rows.some(([, value]) => !Number.isFinite(value))) fail("BUDGET_TUPLE_INVALID");
  return sha256(rows.map(([key, value]) => `${key}\0${value}\n`).join(""));
}

export function assertBudgetTupleBinding(budgets, expectedSha256) {
  const actualSha256 = budgetTupleSha256(budgets);
  if (actualSha256 !== expectedSha256) {
    fail("BUDGET_TUPLE_BINDING_MISMATCH", JSON.stringify({ actual: actualSha256, expected: expectedSha256 }));
  }
  return true;
}
