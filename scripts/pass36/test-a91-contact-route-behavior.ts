import assert from "node:assert/strict";
import { File } from "node:buffer";
import { POST } from "../../app/api/contact/message/route.ts";

type Check = { id: string; passed: boolean; detail?: unknown };
const checks: Check[] = [];
function check(id: string, condition: unknown, detail: unknown = null) {
  const passed = Boolean(condition);
  checks.push({ id, passed, detail });
  assert.ok(passed, id);
}
async function json(response: Response) {
  return await response.json() as Record<string, unknown>;
}
function baseHeaders(requestId: string) {
  return {
    origin: "https://example.test",
    "x-velmere-client-request-id": requestId,
  };
}

process.env.RESEND_API_KEY = "a91-local-fixture-key";
process.env.CONTACT_TO_EMAIL = "to@example.test";
process.env.CONTACT_FROM_EMAIL = "Velmere <from@example.test>";
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const originalFetch = globalThis.fetch;
let providerCalls = 0;
globalThis.fetch = async () => {
  providerCalls += 1;
  return new Response("{\"id\":\"provider-fixture\"}", {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

try {
  const attachmentForm = new FormData();
  attachmentForm.set("subject", "Security report");
  attachmentForm.set("message", "Please review the attached passive document.");
  attachmentForm.set("attachment", new File([
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
  ], "proof.pdf", { type: "application/pdf" }));
  const attachmentResponse = await POST(new Request("https://example.test/api/contact/message", {
    method: "POST",
    headers: baseHeaders("a91-attachment-1"),
    body: attachmentForm,
  }));
  const attachmentPayload = await json(attachmentResponse);
  check("attachment_block_status_exact", attachmentResponse.status === 503, attachmentResponse.status);
  check(
    "attachment_block_schema_exact",
    attachmentPayload.ok === false
      && attachmentPayload.delivered === false
      && attachmentPayload.queued === false
      && attachmentPayload.state === "blocked"
      && attachmentPayload.deliveryMode === "blocked_external"
      && attachmentPayload.error === "contact_attachment_processing_unavailable",
    attachmentPayload,
  );
  check(
    "attachment_block_truth_boundary",
    Array.isArray(attachmentPayload.blockedExternal)
      && attachmentPayload.blockedExternal.includes("malware_scanning")
      && attachmentPayload.blockedExternal.includes("content_disarm_and_reconstruction")
      && attachmentPayload.blockedExternal.includes("private_quarantine"),
    attachmentPayload.blockedExternal,
  );
  check("provider_zero_after_attachment_block", providerCalls === 0, providerCalls);

  const nestedForm = new FormData();
  nestedForm.set("subject", "Nested");
  nestedForm.set("message", "Nested content");
  nestedForm.set("attachment", new File(["--inner--"], "nested.bin", {
    type: "multipart/mixed; boundary=inner",
  }));
  const nestedResponse = await POST(new Request("https://example.test/api/contact/message", {
    method: "POST",
    headers: baseHeaders("a91-nested-1"),
    body: nestedForm,
  }));
  const nestedPayload = await json(nestedResponse);
  check("nested_route_status_exact", nestedResponse.status === 415, nestedResponse.status);
  check("nested_route_code_exact", nestedPayload.error === "contact_upload_nested_multipart_forbidden", nestedPayload);
  check("provider_zero_after_nested_block", providerCalls === 0, providerCalls);

  const duplicateBoundaryResponse = await POST(new Request("https://example.test/api/contact/message", {
    method: "POST",
    headers: {
      ...baseHeaders("a91-boundary-1"),
      "content-type": "multipart/form-data; boundary=a; boundary=b",
    },
    body: "--a--\r\n",
  }));
  const duplicateBoundaryPayload = await json(duplicateBoundaryResponse);
  check("duplicate_boundary_route_status", duplicateBoundaryResponse.status === 415, duplicateBoundaryResponse.status);
  check("duplicate_boundary_route_code", duplicateBoundaryPayload.error === "contact_upload_content_type_invalid", duplicateBoundaryPayload);
  check("provider_zero_after_boundary_block", providerCalls === 0, providerCalls);

  const transferResponse = await POST(new Request("https://example.test/api/contact/message", {
    method: "POST",
    headers: {
      ...baseHeaders("a91-transfer-1"),
      "content-type": "multipart/form-data; boundary=a91",
      "transfer-encoding": "chunked",
    },
    body: "--a91--\r\n",
  }));
  const transferPayload = await json(transferResponse);
  check("transfer_route_status", transferResponse.status === 415, transferResponse.status);
  check("transfer_route_code", transferPayload.error === "contact_upload_transfer_encoding_forbidden", transferPayload);
  check("provider_zero_after_transfer_block", providerCalls === 0, providerCalls);

  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_TO_EMAIL;
  delete process.env.CONTACT_FROM_EMAIL;
  const plainForm = new FormData();
  plainForm.set("name", "Local fixture");
  plainForm.set("subject", "Plain message");
  plainForm.set("message", "No attachment.");
  const plainResponse = await POST(new Request("https://example.test/api/contact/message", {
    method: "POST",
    headers: baseHeaders("a91-plain-1"),
    body: plainForm,
  }));
  const plainPayload = await json(plainResponse);
  check("plain_message_preview_status", plainResponse.status === 202, plainResponse.status);
  check(
    "plain_message_preview_schema",
    plainPayload.ok === true
      && plainPayload.delivered === false
      && plainPayload.queued === false
      && plainPayload.state === "preview"
      && plainPayload.deliveryMode === "development_preview"
      && plainPayload.file === null,
    plainPayload,
  );
  check("plain_preview_no_provider_call", providerCalls === 0, providerCalls);
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_TO_EMAIL;
  delete process.env.CONTACT_FROM_EMAIL;
}

const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a91.contact-route-behavior-test.v1",
  revisionId: "VELMERE_PASS36_A91R0_FILE_UPLOAD_DOWNLOAD_PARSER_AND_STORAGE_HARDENING",
  status: failed.length ? "FAIL" : "PASS_LOCAL_ROUTE_BEHAVIOR",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  providerCallsAfterBlockedInputs: providerCalls,
  blockedExternal: ["real_av", "real_cdr", "private_quarantine", "staging_delivery"],
  liveProven: false,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
