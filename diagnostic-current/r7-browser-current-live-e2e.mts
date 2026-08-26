import { createHash, randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { signTrustedAccountHeaders } from "../r7-work/lib/security/trusted-account-header-boundary";

const base = process.env.R7_E2E_BASE_URL ?? "http://127.0.0.1:3100";
const trusted = process.env.VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT ?? "";
const oidc = process.env.R7_E2E_GITHUB_OIDC ?? "";
const helperUrl = process.env.R7_E2E_HELPER_URL ?? "";
const restoreUrl = process.env.R7_E2E_RESTORE_URL ?? "";
const a = {
  userId: process.env.R7_E2E_USER_A_ID ?? "",
  accountId: process.env.R7_E2E_ACCOUNT_A ?? "",
  token: process.env.R7_E2E_USER_A_JWT ?? "",
  label: "a",
};
const b = {
  userId: process.env.R7_E2E_USER_B_ID ?? "",
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
  try { return JSON.parse(text) as Record<string, any>; }
  catch { throw new Error(`invalid_json_status_${res.status}:${text.slice(0, 240)}`); }
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
      displayName: `R7 Current Browser E2E ${account.label.toUpperCase()}`,
      handle: `@r7.current.e2e.${account.label}`,
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
assert(oidc.split(".").length === 3, "github_oidc_missing");
assert(helperUrl.startsWith("https://"), "helper_url_missing");
assert(restoreUrl.startsWith("https://"), "restore_url_missing");
assert(a.userId.length >= 20 && b.userId.length >= 20, "e2e_user_ids_missing");
assert(a.accountId.startsWith("supabase:") && b.accountId.startsWith("supabase:"), "e2e_accounts_missing");
assert(a.token.split(".").length === 3 && b.token.split(".").length === 3, "e2e_jwts_missing");
assert((process.env.VELMERE_BROWSER_SERVER_CAPABILITY ?? "").length >= 48, "server_capability_missing");

// Real rights-safe Browser/Lens input. intent=detail is part of the current search contract.
const searchUrl = `${base}/api/search?q=EUR%2FUSD&mode=market&intent=detail&locale=en`;
const searchRes = await fetch(searchUrl, { headers: { "cache-control": "no-store" } });
if (searchRes.status !== 200) {
  const text = await searchRes.text();
  throw new Error(`search_status_${searchRes.status}:${text.slice(0, 320)}`);
}
const search = await safeJson(searchRes);
const result = (Array.isArray(search.results) ? search.results : []).find(
  (row: any) => typeof row?.lensSourceToken === "string" && row.lensSourceToken.length > 40,
);
assert(result, "search_no_tokenized_real_result");
assert(Array.isArray(result.sources) && result.sources.some((source: any) => source?.id === "ecb-statistics"), "search_not_ecb_reference_result");
assert(result.officialReferenceSnapshot && typeof result.officialReferenceSnapshot.responseSha256 === "string", "ecb_exact_response_receipt_missing");
const sourceToken = result.lensSourceToken as string;

const previewBody = JSON.stringify({ sourceToken });
const previewUrl = `${base}/api/search/lens-report?format=json&tier=basic&transport=token`;
const previewRes = await fetch(previewUrl, { method: "POST", headers: { "content-type": "application/json" }, body: previewBody });
assert(previewRes.status === 200, `preview_status_${previewRes.status}`);
const preview = await safeJson(previewRes);
assert(preview.ok === true && typeof preview.renderToken === "string", "render_token_missing");
assert(preview.report?.deliveryAuthority?.rightsReceiptSha256, "rights_receipt_missing");
const renderToken = preview.renderToken as string;

const pdfUrl = `${base}/api/search/lens-report?format=pdf&tier=basic`;
const pdfBody = JSON.stringify({ renderToken });
const pdfRes = await fetch(pdfUrl, { method: "POST", headers: signed(a, pdfUrl, "POST", pdfBody), body: pdfBody });
if (pdfRes.status !== 200) {
  const text = await pdfRes.text();
  throw new Error(`pdf_status_${pdfRes.status}:${text.slice(0, 360)}`);
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
assert(ownJson.artifact?.exactStoredPdf === true && ownJson.artifact?.previewDownloadByteIdentical === true, "exact_pdf_parity_marker_missing");
assert(String(ownJson.artifact?.pdfSha256 ?? "").replace(/^sha256:/, "") === pdfSha, "stored_metadata_sha_mismatch");
const crossRes = await fetch(jsonUrl, { headers: signed(b, jsonUrl) });
assert(crossRes.status === 404, `cross_account_not_denied_${crossRes.status}`);

const storedPdfUrl = `${base}/api/account/customer-artifact?id=${encodeURIComponent(artifactId)}&format=pdf&disposition=download`;
const storedPdfRes = await fetch(storedPdfUrl, { headers: signed(a, storedPdfUrl) });
assert(storedPdfRes.status === 200, `stored_pdf_status_${storedPdfRes.status}`);
const storedPdf = Buffer.from(await storedPdfRes.arrayBuffer());
assert(sha(storedPdf) === pdfSha, "stored_pdf_not_same_blob");
const reconnectReadback = await fetch(jsonUrl, { headers: signed(a, jsonUrl) });
assert(reconnectReadback.status === 200, "reconnect_readback_failed");

// Strict OIDC helper may service only the ephemeral USER_A artifact for this exact workflow run.
const backupEraseRes = await fetch(helperUrl, {
  method: "POST",
  headers: { authorization: `Bearer ${oidc}`, "content-type": "application/json" },
  body: JSON.stringify({ action: "backup_erase", userId: a.userId, snapshotId: artifactId }),
});
if (backupEraseRes.status !== 200) {
  const text = await backupEraseRes.text();
  throw new Error(`backup_erase_status_${backupEraseRes.status}:${text.slice(0, 320)}`);
}
const backupErase = await safeJson(backupEraseRes);
assert(backupErase.ok === true && typeof backupErase.backupId === "string", "backup_erase_invalid");
assert(backupErase.erasure?.status === "PASS" && backupErase.erasure?.snapshotsAfter === 0 && backupErase.erasure?.pdfBlobsAfter === 0, "erasure_not_complete");

const afterErase = await fetch(jsonUrl, { headers: signed(a, jsonUrl) });
assert(afterErase.status === 404, `post_erasure_artifact_visible_${afterErase.status}`);

const restoreBody = JSON.stringify({ schemaVersion: "velmere.r7.staging-http-request.v1", action: "restore", backupId: backupErase.backupId });
const restoreRes = await fetch(restoreUrl, { method: "POST", headers: { authorization: `Bearer ${a.token}`, "content-type": "application/json" }, body: restoreBody });
if (restoreRes.status !== 200) {
  const text = await restoreRes.text();
  throw new Error(`restore_status_${restoreRes.status}:${text.slice(0, 320)}`);
}
const restore = await safeJson(restoreRes);
assert(restore.ok === true && restore.action === "restore" && restore.backupId === backupErase.backupId, "restore_receipt_invalid");
assert(String(restore.pdfDigest ?? "").replace(/^sha256:/, "") === pdfSha, "restore_pdf_digest_mismatch");

const postRestoreOwn = await fetch(jsonUrl, { headers: signed(a, jsonUrl) });
assert(postRestoreOwn.status === 200, `post_restore_owner_read_${postRestoreOwn.status}`);
const postRestoreJson = await safeJson(postRestoreOwn);
assert(postRestoreJson.ok === true && postRestoreJson.artifact?.artifactId === artifactId, "post_restore_metadata_invalid");
const postRestoreCross = await fetch(jsonUrl, { headers: signed(b, jsonUrl) });
assert(postRestoreCross.status === 404, `post_restore_cross_account_not_denied_${postRestoreCross.status}`);
const postRestorePdfRes = await fetch(storedPdfUrl, { headers: signed(a, storedPdfUrl) });
assert(postRestorePdfRes.status === 200, `post_restore_pdf_status_${postRestorePdfRes.status}`);
const postRestorePdf = Buffer.from(await postRestorePdfRes.arrayBuffer());
assert(sha(postRestorePdf) === pdfSha, "post_restore_pdf_not_same_blob");

const receipt = {
  schemaVersion: "velmere.r7.browser-basic-current-successor-zero-vercel-e2e.v1",
  status: "PASS_BROWSER_BASIC_CURRENT_PRODUCT_ROUTE_E2E",
  source: "ECB_OFFICIAL_REFERENCE_RATE",
  externalProvider: "ECB",
  providerNetworkReal: true,
  sourceResponseSha256: result.officialReferenceSnapshot.responseSha256,
  rightsReceiptSha256: preview.report.deliveryAuthority.rightsReceiptSha256,
  accountAOwnReadback: true,
  accountBCrossAccountDenied: true,
  reconnectReadback: true,
  durableComputation: "supabase",
  exactPdfByteParity: true,
  backupCreatedOrPresent: true,
  erasurePassed: true,
  restorePassed: true,
  postRestoreOwnerReadback: true,
  postRestoreCrossAccountDenied: true,
  postRestorePdfByteIdentical: true,
  pdfSha256: `sha256:${pdfSha}`,
  pdfByteLength: pdf.length,
  artifactId,
  backupId: backupErase.backupId,
  serviceRoleInApplication: false,
  serverCapabilityUsed: true,
  vercelUsed: false,
  rawSecretsReturned: false,
  customerFinalCredit: false,
};
await writeFile("R7_BROWSER_BASIC_CURRENT_SUCCESSOR_ZERO_VERCEL_E2E.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ...receipt, artifactId: "<redacted-id>", backupId: "<redacted-id>", sourceResponseSha256: "<sha256>", rightsReceiptSha256: "<sha256>", pdfSha256: "<sha256>" }, null, 2));
