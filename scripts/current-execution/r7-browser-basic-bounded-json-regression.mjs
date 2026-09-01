import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  R7_BROWSER_BASIC_MAX_REQUEST_BYTES,
  R7_BROWSER_BASIC_REQUEST_SCHEMA,
  mapR7RestoreFailure,
  readR7BoundedJsonRequest,
  validateR7BrowserBasicRequest,
} from "../../supabase/functions/r7-browser-basic-staging-proof/bounded-json.mts";

const encoder = new TextEncoder();

function streamRequest(chunks, contentLength) {
  const headers = new Headers();
  if (contentLength !== undefined) headers.set("content-length", contentLength);
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Request("https://staging.invalid/r7-browser-basic", {
    method: "POST",
    headers,
    body,
    duplex: "half",
  });
}

export async function runR7BoundedJsonRegression() {
  const checks = [];
  const check = (id, condition, detail = null) => {
    assert.equal(Boolean(condition), true, `${id}${detail ? `: ${JSON.stringify(detail)}` : ""}`);
    checks.push({ id, pass: true });
  };

  const validBytes = encoder.encode(JSON.stringify({ schemaVersion: "velmere.r7.staging-http-request.v1", action: "receipt" }));
  const valid = await readR7BoundedJsonRequest(streamRequest([validBytes], String(validBytes.byteLength)));
  check("valid_declared_json", valid.ok && valid.byteLength === validBytes.byteLength, valid);

  const exactPrefix = '{"padding":"';
  const exactSuffix = '"}';
  const exactPayload = `${exactPrefix}${"x".repeat(
    R7_BROWSER_BASIC_MAX_REQUEST_BYTES - encoder.encode(exactPrefix + exactSuffix).byteLength,
  )}${exactSuffix}`;
  const exactBytes = encoder.encode(exactPayload);
  const exactLimit = await readR7BoundedJsonRequest(streamRequest([exactBytes], undefined));
  check(
    "exact_limit_without_content_length",
    exactBytes.byteLength === R7_BROWSER_BASIC_MAX_REQUEST_BYTES
      && exactLimit.ok
      && exactLimit.byteLength === R7_BROWSER_BASIC_MAX_REQUEST_BYTES,
    exactLimit,
  );

  const oversizedBytes = encoder.encode(`{"padding":"${"x".repeat(R7_BROWSER_BASIC_MAX_REQUEST_BYTES)}"}`);
  const chunkedOversized = await readR7BoundedJsonRequest(streamRequest([
    oversizedBytes.subarray(0, 4096),
    oversizedBytes.subarray(4096),
  ], undefined));
  check(
    "chunked_missing_content_length_fails_closed",
    !chunkedOversized.ok && chunkedOversized.status === 413 && chunkedOversized.error === "request_too_large",
    chunkedOversized,
  );

  const falseSmall = await readR7BoundedJsonRequest(streamRequest([oversizedBytes], "1"));
  check(
    "false_small_content_length_fails_closed",
    !falseSmall.ok && falseSmall.status === 413 && falseSmall.error === "request_too_large",
    falseSmall,
  );

  const mismatchBytes = encoder.encode("{}");
  const mismatch = await readR7BoundedJsonRequest(streamRequest([mismatchBytes], "1"));
  check(
    "content_length_mismatch_fails_closed",
    !mismatch.ok && mismatch.status === 400 && mismatch.error === "content_length_mismatch",
    mismatch,
  );

  const invalidLength = await readR7BoundedJsonRequest(streamRequest([validBytes], "-1"));
  check(
    "invalid_content_length_fails_closed",
    !invalidLength.ok && invalidLength.status === 400 && invalidLength.error === "content_length_invalid",
    invalidLength,
  );

  const invalidUtf8 = await readR7BoundedJsonRequest(streamRequest([new Uint8Array([0xc3, 0x28])], "2"));
  check(
    "invalid_utf8_fails_closed",
    !invalidUtf8.ok && invalidUtf8.status === 400 && invalidUtf8.error === "invalid_json",
    invalidUtf8,
  );

  const malformedBytes = encoder.encode("{");
  const malformed = await readR7BoundedJsonRequest(streamRequest([malformedBytes], "1"));
  check(
    "malformed_json_fails_closed",
    !malformed.ok && malformed.status === 400 && malformed.error === "invalid_json",
    malformed,
  );

  const receiptShape = validateR7BrowserBasicRequest({
    schemaVersion: R7_BROWSER_BASIC_REQUEST_SCHEMA,
    action: "receipt",
  });
  check("receipt_exact_shape_allowed", receiptShape.ok && receiptShape.request.action === "receipt", receiptShape);
  const receiptExtra = validateR7BrowserBasicRequest({
    schemaVersion: R7_BROWSER_BASIC_REQUEST_SCHEMA,
    action: "receipt",
    ignored: true,
  });
  check(
    "receipt_extra_key_rejected",
    !receiptExtra.ok && receiptExtra.error === "request_shape_invalid",
    receiptExtra,
  );
  const backupId = `r7-backup-${"a".repeat(64)}`;
  const restoreShape = validateR7BrowserBasicRequest({
    schemaVersion: R7_BROWSER_BASIC_REQUEST_SCHEMA,
    action: "restore",
    backupId,
  });
  check(
    "restore_exact_shape_allowed",
    restoreShape.ok && restoreShape.request.action === "restore" && restoreShape.request.backupId === backupId,
    restoreShape,
  );
  const restoreExtra = validateR7BrowserBasicRequest({
    schemaVersion: R7_BROWSER_BASIC_REQUEST_SCHEMA,
    action: "restore",
    backupId,
    ignored: true,
  });
  check(
    "restore_extra_key_rejected",
    !restoreExtra.ok && restoreExtra.error === "request_shape_invalid",
    restoreExtra,
  );
  const restoreInvalidId = validateR7BrowserBasicRequest({
    schemaVersion: R7_BROWSER_BASIC_REQUEST_SCHEMA,
    action: "restore",
    backupId: "r7-backup-invalid",
  });
  check(
    "restore_invalid_id_rejected",
    !restoreInvalidId.ok && restoreInvalidId.error === "request_shape_invalid",
    restoreInvalidId,
  );
  const invalidAction = validateR7BrowserBasicRequest({
    schemaVersion: R7_BROWSER_BASIC_REQUEST_SCHEMA,
    action: "unknown",
  });
  check(
    "unknown_action_rejected",
    !invalidAction.ok && invalidAction.error === "action_invalid",
    invalidAction,
  );

  const notOwnedFailure = mapR7RestoreFailure("42501");
  const notFoundFailure = mapR7RestoreFailure("P0002");
  check(
    "restore_existence_oracle_collapsed",
    JSON.stringify(notOwnedFailure) === JSON.stringify(notFoundFailure)
      && notOwnedFailure?.status === 404
      && notOwnedFailure.error === "restore_backup_not_found"
      && mapR7RestoreFailure("XX000") === null,
    { notOwnedFailure, notFoundFailure },
  );

  return {
    schemaVersion: "velmere.r7.browser-basic-bounded-json-regression.v1",
    ok: true,
    checks: checks.length,
    maxRequestBytes: R7_BROWSER_BASIC_MAX_REQUEST_BYTES,
  };
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  process.stdout.write(`${JSON.stringify(await runR7BoundedJsonRegression())}\n`);
}
