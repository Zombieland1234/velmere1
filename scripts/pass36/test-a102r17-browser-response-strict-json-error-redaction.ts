import fs from "node:fs";
import path from "node:path";
import {
  PASS36_A102R17_BROWSER_JSON_RESPONSE_BOUNDARY_ID,
  allowlistedBrowserServerCode,
  readBrowserJsonObject,
} from "../../lib/security/browser-json-response-boundary";
import { readJsonResponseBounded } from "../../lib/network/fetch-with-deadline";

const root = process.cwd();
let passed = 0;
const failures: string[] = [];
function check(name: string, condition: unknown) {
  if (condition) passed += 1;
  else failures.push(name);
}
function source(relative: string) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}
function jsonResponse(body: BodyInit | null, init: ResponseInit = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers ?? {}) },
  });
}

const valid = await readBrowserJsonObject<{ reply?: string }>(jsonResponse('{"reply":"ok"}'));
check("boundary-id", PASS36_A102R17_BROWSER_JSON_RESPONSE_BOUNDARY_ID.endsWith("browser-json-response-boundary.v1"));
check("valid-ok", valid.ok === true);
check("valid-value", valid.ok && valid.value.reply === "ok");
check("valid-status", valid.ok && valid.status === 200 && valid.responseOk === true);
check("valid-boundary", valid.boundaryId === PASS36_A102R17_BROWSER_JSON_RESPONSE_BOUNDARY_ID);

const problem = await readBrowserJsonObject<{ error?: string }>(jsonResponse('{"error":"internal_stack_path"}', { status: 500 }));
check("http-error-still-strict", problem.ok === true && problem.responseOk === false && problem.status === 500);

const plusJson = await readBrowserJsonObject<{ ok?: boolean }>(new Response('{"ok":true}', { headers: { "content-type": "application/problem+json" } }));
check("plus-json", plusJson.ok === true && plusJson.value.ok === true);

const wrongType = await readBrowserJsonObject(new Response("<html>secret stack</html>", { headers: { "content-type": "text/html" }, status: 500 }));
check("reject-content-type", !wrongType.ok && wrongType.code === "browser_response_content_type_invalid");
check("no-raw-on-content-type", !wrongType.ok && wrongType.rawBodyIncluded === false && !("raw" in wrongType));

const empty = await readBrowserJsonObject(jsonResponse(""));
check("reject-empty", !empty.ok && empty.code === "browser_response_empty");

const malformed = await readBrowserJsonObject(jsonResponse('{"reply":'));
check("reject-malformed", !malformed.ok && malformed.code === "browser_response_invalid_json");

const duplicate = await readBrowserJsonObject(jsonResponse('{"reply":"safe","reply":"unsafe"}'));
check("reject-duplicate", !duplicate.ok && duplicate.code === "browser_response_invalid_json");

const prototype = await readBrowserJsonObject(jsonResponse('{"__proto__":{"polluted":true},"reply":"x"}'));
check("reject-prototype", !prototype.ok && prototype.code === "browser_response_invalid_json");

const constructorKey = await readBrowserJsonObject(jsonResponse('{"constructor":{"prototype":{"polluted":true}}}'));
check("reject-constructor", !constructorKey.ok && constructorKey.code === "browser_response_invalid_json");

const array = await readBrowserJsonObject(jsonResponse("[]"));
check("reject-array", !array.ok && array.code === "browser_response_invalid_json");

const oversizedDeclared = await readBrowserJsonObject(new Response('{"ok":true}', {
  headers: { "content-type": "application/json", "content-length": "999999" },
}), { maxBytes: 4096 });
check("reject-declared-oversize", !oversizedDeclared.ok && oversizedDeclared.code === "browser_response_too_large");

const invalidDeclared = await readBrowserJsonObject(new Response('{"ok":true}', {
  headers: { "content-type": "application/json", "content-length": "12,13" },
}));
check("reject-invalid-content-length", !invalidDeclared.ok && invalidDeclared.code === "browser_response_too_large");

const actualOversize = await readBrowserJsonObject(jsonResponse(`{"data":"${"a".repeat(5000)}"}`), { maxBytes: 1024 });
check("reject-actual-oversize", !actualOversize.ok && actualOversize.code === "browser_response_read_failed");

const invalidUtf8 = await readBrowserJsonObject(new Response(new Uint8Array([0xff, 0xfe, 0xfd]), {
  headers: { "content-type": "application/json" },
}));
check("reject-invalid-utf8", !invalidUtf8.ok);

check("allowlist-accepted", allowlistedBrowserServerCode("account_required", ["account_required"], "request_failed") === "account_required");
check("allowlist-block-message", allowlistedBrowserServerCode("/srv/app/secret stack", ["account_required"], "request_failed") === "request_failed");
check("allowlist-block-control", allowlistedBrowserServerCode("account_required\nsecret", ["account_required"], "request_failed") === "request_failed");

try {
  await readJsonResponseBounded(jsonResponse('{"a":1,"a":2}'), 16 * 1024);
  check("shared-reader-reject-duplicate", false);
} catch {
  check("shared-reader-reject-duplicate", true);
}
try {
  await readJsonResponseBounded(jsonResponse('{"prototype":{}}'), 16 * 1024);
  check("shared-reader-reject-prototype", false);
} catch {
  check("shared-reader-reject-prototype", true);
}
const sharedValid = await readJsonResponseBounded<{ value: number }>(jsonResponse('{"value":7}'), 16 * 1024);
check("shared-reader-valid", sharedValid.value === 7);

const angel = source("components/angel/AngelPanel.tsx");
const aiCopy = source("components/admin/AiProductCopyButton.tsx");
const publish = source("components/admin/VlmProductPublishDecisionModal.tsx");
const importPage = source("app/[locale]/admin/import-products/page.tsx");
const brain = source("components/market-integrity/VlmBrainWorkspace.tsx");
const assetNetwork = source("components/market-integrity/asset-detail/network.ts");
const marketRuntime = source("components/market-integrity/asset-detail/market-intelligence-client-runtime.ts");
const assetModal = source("components/market-integrity/AssetDetailModal.tsx");
const contact = source("components/contact/FloatingMailWidget.tsx");
const strictJson = source("lib/security/strict-json-boundary.ts");
const network = source("lib/network/fetch-with-deadline.ts");
const boundary = source("lib/security/browser-json-response-boundary.ts");

check("angel-shared-boundary", angel.includes("readBrowserJsonObject<AngelResponsePayload>"));
check("angel-no-raw-slice", !angel.includes("raw.slice") && !angel.includes("detail: raw"));
check("angel-no-direct-json-parse", !angel.includes("JSON.parse("));
check("angel-no-session-storage", !angel.includes("sessionStorage") && angel.includes("angel-session-ephemeral"));
check("angel-generic-visible-error", angel.includes('setError(t("neuralError"))'));
check("angel-redacted-report", angel.includes("reportBrowserBoundaryFailure"));

check("ai-shared-boundary", aiCopy.includes("readBrowserJsonObject<AiProductCopyResponse>"));
check("ai-no-raw-slice", !aiCopy.includes("raw.slice") && !aiCopy.includes("data.detail"));
check("ai-generic-visible-error", aiCopy.includes('setError(t("failed"))'));

check("publish-shared-boundary", publish.includes("readBrowserJsonObject<PublishResponse>"));
check("publish-no-raw-preview", !publish.includes("raw.slice") && !publish.includes("preview:"));
check("publish-generic-errors", publish.includes('setMessage("Publish decision failed.")') && publish.includes('setMessage("Publish failed.")'));

check("import-shared-boundary", importPage.includes("readBrowserJsonObject<Record<string, unknown>>"));
check("import-no-raw-preview", !importPage.includes("raw.slice") && !importPage.includes("data.error"));
check("import-generic-errors", importPage.includes('setMessage(t("importFailed"))') && importPage.includes('setMessage("Product Brain review failed.")'));

check("brain-shared-boundary", brain.includes("readBrowserJsonObject<ApiPayload>"));
check("brain-no-provider-message-fallback", !brain.includes("data.error") && brain.includes('reason: "vlm_brain_response_unavailable"'));
check("brain-redacted-report", brain.includes("reportBrowserBoundaryFailure"));

check("asset-network-strict", assetNetwork.includes("parseStrictJsonText<T>") && assetNetwork.includes('TextDecoder("utf-8", { fatal: true })'));
check("market-runtime-strict", marketRuntime.includes("parseStrictJsonText<unknown>") && !marketRuntime.includes("JSON.parse(text)"));
check("asset-modal-shared-reader", !assetModal.includes("response.json()") && assetModal.includes("readJsonResponseBounded<"));
check("contact-shared-reader", !contact.includes("response.json()") && contact.includes("readJsonResponseBounded<unknown>"));
check("strict-json-browser-safe", !strictJson.includes('from "node:buffer"') && strictJson.includes("new TextEncoder().encode(raw).byteLength"));
check("network-shared-strict", network.includes("parseStrictJsonBytes<T>") && !network.includes("JSON.parse(new TextDecoder"));
check("boundary-no-raw-field", boundary.includes("rawBodyIncluded: false") && !boundary.includes("rawBody:"));
check("boundary-content-type", boundary.includes("browser_response_content_type_invalid"));
check("boundary-strict-json", boundary.includes("parseStrictJsonText<T>"));

const output = {
  status: failures.length
    ? "FAIL_A102R17_BROWSER_RESPONSE_STRICT_JSON_ERROR_REDACTION"
    : "PASS_A102R17_BROWSER_RESPONSE_STRICT_JSON_ERROR_REDACTION_LOCAL_ONLY",
  assertions: passed + failures.length,
  passed,
  failed: failures.length,
  failures,
  truth: {
    strictBrowserJsonResponseBoundary: true,
    duplicateAndPrototypeKeysRejected: true,
    rawServerBodyRendered: false,
    rawProviderErrorRendered: false,
    angelSessionStoragePersistence: false,
    angelCorrelationAuthority: false,
    accountBoundServerMemoryRetained: true,
    exactBrowserMatrixProven: false,
    stagingProven: false,
    legalApprovalProven: false,
    liveProven: false,
    saleEnabled: false,
  },
};
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;
