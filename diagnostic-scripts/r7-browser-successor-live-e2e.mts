import { createHash, randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { signTrustedAccountHeaders } from "../../lib/security/trusted-account-header-boundary";

const base = process.env.R7_E2E_BASE_URL ?? "http://127.0.0.1:3100";
const trusted = process.env.VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT ?? "";
const a = {
  accountId: process.env.R7_E2E_ACCOUNT_A ?? "",
  token: process.env.R7_E2E_USER_A_JWT ?? "",
  label: "a",
};
const b = {
  accountId: process.env.R7_E2E_ACCOUNT_B ?? "",
  token: process.env.R7_E2E_USER_B_JWT ?? "",
  label: "b",
};

const sha = (bytes: Uint8Array | Buffer) => createHash("sha256").update(bytes).digest("hex");
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    throw new Error(`invalid_json_status_${res.status}:${text.slice(0, 220)}`);
  }
}
function signed(account: typeof a, url: string, method = "GET", body = "") {
  const contentType = body ? "application/json" : "";
  const headers: Record<string, string> = {
    ...signTrustedAccountHeaders({
      requestUrl: url,
      method,
      timestamp: Math.floor(Date.now() / 1000),
      nonce: randomBytes(24).toString("base64url"),
      accountId: account.accountId,
      displayName: `R7 Browser E2E ${account.label.toUpperCase()}`,
      handle: `@r7.e2e.${account.label}`,
      provider: "server",
      contentType,
      body,
      secret: trusted,
    }),
    authorization: `Bearer ${account.token}`,
  };
  if (contentType) headers["content-type"] = contentType;
  return headers;
}

assert(trusted.length >= 32, "trusted_account_hmac_missing");
assert(a.accountId.startsWith("supabase:") && b.accountId.startsWith("supabase:"), "e2e_accounts_missing");
assert(a.token.split(".").length === 3 && b.token.split(".").length === 3, "e2e_jwts_missing");
assert((process.env.VELMERE_BROWSER_SERVER_CAPABILITY ?? "").length >= 48, "server_capability_missing");

const searchUrl = `${base}/api/search?q=EUR%2FUSD&mode=market&locale=en`;
const searchRes = await fetch(searchUrl, { headers: { "cache-control": "no-store" } });
assert(searchRes.status === 200, `search_status_${searchRes.status}`);
const search = await safeJson(searchRes);
const result = (Array.isArray(search.results) ? search.results : []).find(
  (row: any) => typeof row?.lensSourceToken === "string" && row.lensSourceToken.length > 40,
);
assert(result, "search_no_tokenized_real_result");
assert(
  Array.isArray(result.sources) && result.sources.some((source: any) => source?.id === "ecb-statistics"),
  "search_not_ecb_reference_result",
);
assert(
  result.officialReferenceSnapshot && typeof result.officialReferenceSnapshot.responseSha256 === "string",
  "ecb_exact_response_receipt_missing",
);
const sourceToken = result.lensSourceToken as string;

const previewBody = JSON.stringify({ sourceToken });
const previewUrl = `${base}/api/search/lens-report?format=json&tier=basic&transport=token`;
const previewRes = await fetch(previewUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: previewBody,
});
assert(previewRes.status === 200, `preview_status_${previewRes.status}`);
const preview = await safeJson(previewRes);
assert(preview.ok === true && typeof preview.renderToken === "string", "render_token_missing");
assert(preview.report?.deliveryAuthority?.rightsReceiptSha256, "rights_receipt_missing");
const renderToken = preview.renderToken as string;

const pdfUrl = `${base}/api/search/lens-report?format=pdf&tier=basic`;
const pdfBody = JSON.stringify({ renderToken });
const pdfRes = await fetch(pdfUrl, {
  method: "POST",
  headers: signed(a, pdfUrl, "POST", pdfBody),
  body: pdfBody,
});
if (pdfRes.status !== 200) {
  const text = await pdfRes.text();
  throw new Error(`pdf_status_${pdfRes.status}:${text.slice(0, 320)}`);
}
assert((pdfRes.headers.get("content-type") ?? "").startsWith("application/pdf"), "pdf_content_type_invalid");
assert(pdfRes.headers.get("x-velmere-durable-computation") === "supabase", "durable_computation_not_supabase");
const artifactId = pdfRes.headers.get("x-velmere-account-artifact-id") ?? "";
assert(artifactId.length >= 8, "account_artifact_id_missing");
const pdf = Buffer.from(await pdfRes.arrayBuffer());
assert(pdf.subarray(0, 5).toString("ascii") === "%PDF-", "pdf_magic_invalid");
const pdfSha = sha(pdf);
const headerSha = (pdfRes.headers.get("x-velmere-pdf-sha256") ?? "").replace(/^sha256:/, "");
assert(headerSha === pdfSha, "pdf_response_sha_mismatch");

const jsonUrl = `${base}/api/account/customer-artifact?id=${encodeURIComponent(artifactId)}&format=json`;
const ownJsonRes = await fetch(jsonUrl, { headers: signed(a, jsonUrl) });
assert(ownJsonRes.status === 200, `own_json_status_${ownJsonRes.status}`);
const ownJson = await safeJson(ownJsonRes);
assert(ownJson.ok === true && ownJson.artifact?.artifactId === artifactId, "own_artifact_json_invalid");
assert(
  ownJson.artifact?.exactStoredPdf === true && ownJson.artifact?.previewDownloadByteIdentical === true,
  "exact_pdf_parity_marker_missing",
);
assert(
  String(ownJson.artifact?.pdfSha256 ?? "").replace(/^sha256:/, "") === pdfSha,
  "stored_metadata_sha_mismatch",
);

const crossRes = await fetch(jsonUrl, { headers: signed(b, jsonUrl) });
assert(crossRes.status === 404, `cross_account_not_denied_${crossRes.status}`);

const storedPdfUrl = `${base}/api/account/customer-artifact?id=${encodeURIComponent(artifactId)}&format=pdf&disposition=download`;
const storedPdfRes = await fetch(storedPdfUrl, { headers: signed(a, storedPdfUrl) });
assert(storedPdfRes.status === 200, `stored_pdf_status_${storedPdfRes.status}`);
const storedPdf = Buffer.from(await storedPdfRes.arrayBuffer());
assert(sha(storedPdf) === pdfSha, "stored_pdf_not_same_blob");

const readbackAgain = await fetch(jsonUrl, { headers: signed(a, jsonUrl) });
assert(readbackAgain.status === 200, "repeat_readback_failed");

const receipt = {
  schemaVersion: "velmere.r7.browser-basic-authenticated-successor-e2e.v2",
  status: "PASS_BROWSER_BASIC_PRODUCT_ROUTE_E2E",
  source: "ECB_OFFICIAL_REFERENCE_RATE",
  externalProvider: "ECB",
  providerNetworkReal: true,
  sourceResponseSha256: result.officialReferenceSnapshot.responseSha256,
  rightsReceiptSha256: preview.report.deliveryAuthority.rightsReceiptSha256,
  accountAOwnReadback: true,
  accountBCrossAccountDenied: true,
  durableComputation: "supabase",
  exactPdfByteParity: true,
  pdfSha256: `sha256:${pdfSha}`,
  pdfByteLength: pdf.length,
  artifactId,
  serviceRoleInApplication: false,
  serverCapabilityUsed: true,
  vercelUsed: false,
  customerFinalCredit: false,
};
await writeFile("R7_BROWSER_BASIC_AUTHENTICATED_SUCCESSOR_E2E.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  ...receipt,
  artifactId: "<redacted-id>",
  sourceResponseSha256: "<sha256>",
  rightsReceiptSha256: "<sha256>",
  pdfSha256: "<sha256>",
}, null, 2));
