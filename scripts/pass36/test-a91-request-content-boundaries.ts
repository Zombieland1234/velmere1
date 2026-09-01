import assert from "node:assert/strict";
import { File } from "node:buffer";
import {
  ContactUploadBoundaryError,
  inspectStrictContactFormData,
  validateContactFormContentType,
  validateContactMultipartRequestFraming,
} from "../../lib/security/multipart-upload-boundary.ts";
import {
  readBoundedBodyBytes,
  readBoundedFormDataBody,
  readBoundedJsonBody,
  validateCheckoutRequestBoundary,
} from "../../lib/security/payment-webhook-guard.ts";
import { classifyContactDeliveryResponse } from "../../components/contact/FloatingMailWidget.tsx";

type Check = { id: string; passed: boolean; detail?: unknown };
const checks: Check[] = [];
function check(id: string, condition: unknown, detail: unknown = null) {
  const passed = Boolean(condition);
  checks.push({ id, passed, detail });
  assert.ok(passed, id);
}
async function responseError(response: Response) {
  return await response.json() as { error?: string };
}
function expectUploadError(id: string, run: () => unknown, code: string) {
  try {
    run();
    check(id, false, "unexpected_success");
  } catch (error) {
    check(
      id,
      error instanceof ContactUploadBoundaryError && error.code === code,
      error instanceof Error ? error.message : String(error),
    );
  }
}

const strictMultipart = validateContactFormContentType(
  'multipart/form-data; boundary="----VelmereA91"',
  { allowUrlEncoded: false },
);
check("multipart_single_boundary_accepted", strictMultipart.boundary === "----VelmereA91");
expectUploadError(
  "multipart_duplicate_boundary_rejected",
  () => validateContactFormContentType("multipart/form-data; boundary=a; boundary=b", { allowUrlEncoded: false }),
  "contact_upload_content_type_invalid",
);
expectUploadError(
  "multipart_comma_joined_rejected",
  () => validateContactFormContentType("multipart/form-data; boundary=a, multipart/form-data; boundary=b", { allowUrlEncoded: false }),
  "contact_upload_content_type_invalid",
);
expectUploadError(
  "contact_urlencoded_rejected",
  () => validateContactFormContentType("application/x-www-form-urlencoded", { allowUrlEncoded: false }),
  "contact_upload_content_type_invalid",
);

const transferEncoded = new Request("https://example.test/api/contact/message", {
  method: "POST",
  headers: {
    "content-type": "multipart/form-data; boundary=a91",
    "transfer-encoding": "chunked",
  },
  body: "--a91--\r\n",
});
expectUploadError(
  "contact_transfer_encoding_rejected",
  () => validateContactMultipartRequestFraming(transferEncoded),
  "contact_upload_transfer_encoding_forbidden",
);

const nested = new FormData();
nested.set("message", "safe text");
nested.set("attachment", new File(["--nested--"], "nested.bin", { type: "multipart/mixed; boundary=nested" }));
expectUploadError(
  "nested_multipart_attachment_rejected",
  () => inspectStrictContactFormData(nested),
  "contact_upload_nested_multipart_forbidden",
);

const goodCheckout = new Request("https://example.test/api/checkout", {
  method: "POST",
  headers: { "content-type": "application/json; charset=UTF-8" },
  body: "{}",
});
check("checkout_strict_json_accepted", validateCheckoutRequestBoundary(goodCheckout).ok);

for (const [id, contentType] of [
  ["json_suffix_rejected", "application/json-patch+json"],
  ["json_comma_join_rejected", "application/json, text/plain"],
  ["json_shadow_media_rejected", "text/plain; application/json"],
] as const) {
  const decision = validateCheckoutRequestBoundary(new Request("https://example.test/api/checkout", {
    method: "POST",
    headers: { "content-type": contentType },
    body: "{}",
  }));
  check(id, !decision.ok && decision.response.status === 415);
}

const invalidLengthDecision = validateCheckoutRequestBoundary(new Request("https://example.test/api/checkout", {
  method: "POST",
  headers: { "content-type": "application/json", "content-length": "1, 2" },
  body: "{}",
}));
check("ambiguous_content_length_rejected", !invalidLengthDecision.ok && invalidLengthDecision.response.status === 400);

const transferDecision = validateCheckoutRequestBoundary(new Request("https://example.test/api/checkout", {
  method: "POST",
  headers: { "content-type": "application/json", te: "trailers" },
  body: "{}",
}));
check("checkout_transfer_framing_rejected", !transferDecision.ok && transferDecision.response.status === 400);

const streamedOversize = await readBoundedBodyBytes(new Request("https://example.test/read", {
  method: "POST",
  body: "12345",
}), 4);
check("actual_streamed_bytes_limited", !streamedOversize.ok && streamedOversize.response.status === 413);

const lengthMismatch = await readBoundedBodyBytes(new Request("https://example.test/read", {
  method: "POST",
  headers: { "content-length": "1" },
  body: "12345",
}), 8);
check(
  "declared_actual_length_mismatch_rejected",
  !lengthMismatch.ok
    && lengthMismatch.response.status === 400
    && (await responseError(lengthMismatch.response)).error === "Content-Length does not match request body.",
);

const strictJson = await readBoundedJsonBody<Record<string, unknown>>(new Request("https://example.test/json", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{\"ok\":true}",
}), 64);
check("strict_json_behavior_success", strictJson.ok && strictJson.value.ok === true);

const ambiguousJson = await readBoundedJsonBody(new Request("https://example.test/json", {
  method: "POST",
  headers: { "content-type": "application/json, application/json" },
  body: "{}",
}), 64);
check("json_duplicate_media_rejected", !ambiguousJson.ok && ambiguousJson.response.status === 415);

const malformedMultipart = await readBoundedFormDataBody(new Request("https://example.test/form", {
  method: "POST",
  headers: { "content-type": "multipart/form-data; boundary=a; boundary=b" },
  body: "--a--\r\n",
}), 128);
check("form_reader_duplicate_boundary_rejected", !malformedMultipart.ok && malformedMultipart.response.status === 415);

check("widget_delivered_requires_explicit_true", classifyContactDeliveryResponse(true, { ok: true, delivered: true }) === "sent");
check("widget_generic_2xx_not_delivered", classifyContactDeliveryResponse(true, { ok: true }) === "error");
check("widget_false_delivery_not_delivered", classifyContactDeliveryResponse(true, { ok: true, delivered: false }) === "error");
check("widget_queue_explicit", classifyContactDeliveryResponse(true, { ok: true, delivered: false, queued: true, state: "queued" }) === "queued");
check("widget_preview_explicit", classifyContactDeliveryResponse(true, { ok: true, delivered: false, state: "preview", deliveryMode: "development_preview" }) === "preview");
check("widget_blocked_explicit", classifyContactDeliveryResponse(false, { ok: false, state: "blocked", error: "contact_attachment_processing_unavailable" }) === "blocked");
check("widget_error_cannot_claim_delivery", classifyContactDeliveryResponse(false, { ok: true, delivered: true }) === "error");

const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a91.request-content-boundary-test.v1",
  revisionId: "VELMERE_PASS36_A91R0_FILE_UPLOAD_DOWNLOAD_PARSER_AND_STORAGE_HARDENING",
  status: failed.length ? "FAIL" : "PASS_LOCAL_BEHAVIOR",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  blockedExternal: ["real_av", "real_cdr", "private_quarantine", "staging_upload_storage"],
  liveProven: false,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
