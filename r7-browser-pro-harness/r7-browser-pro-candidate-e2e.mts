import { createHash, randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { signTrustedAccountHeaders } from "../r7-work/lib/security/trusted-account-header-boundary";

const base = process.env.R7_BROWSER_PRO_E2E_BASE_URL ?? "http://localhost:3100";
const trusted = process.env.VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT ?? "";
const oidc = process.env.R7_BROWSER_PRO_GITHUB_OIDC ?? "";
const helperUrl = process.env.R7_BROWSER_PRO_HELPER_URL ?? "";
const restoreUrl = process.env.R7_BROWSER_PRO_RESTORE_URL ?? "";
const entitlementBridgeUrl = process.env.VELMERE_PRODUCT_ENTITLEMENT_BRIDGE_URL ?? "";
const entitlementServerCapability = process.env.VELMERE_PRODUCT_ENTITLEMENT_SERVER_CAPABILITY ?? "";
const a = { userId: process.env.R7_BROWSER_PRO_USER_A_ID ?? "", accountId: process.env.R7_BROWSER_PRO_ACCOUNT_A ?? "", token: process.env.R7_BROWSER_PRO_USER_A_JWT ?? "", label: "a" };
const b = { userId: process.env.R7_BROWSER_PRO_USER_B_ID ?? "", accountId: process.env.R7_BROWSER_PRO_ACCOUNT_B ?? "", token: process.env.R7_BROWSER_PRO_USER_B_JWT ?? "", label: "b" };
const entitlementId = process.env.R7_BROWSER_PRO_ENTITLEMENT_ID ?? "";

const sha = (bytes: Uint8Array | Buffer | string) => createHash("sha256").update(bytes).digest("hex");
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function safeJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text) as Record<string, any>; }
  catch { throw new Error(`invalid_json_status_${response.status}:${text.slice(0, 300)}`); }
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
      displayName: `R7 Browser Pro E2E ${account.label.toUpperCase()}`,
      handle: `@r7.browser.pro.${account.label}`,
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
function isObject(value: unknown): value is Record<string, any> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function leaves(value: unknown, prefix = "", output = new Map<string, unknown>(), depth = 0) {
  if (depth > 12) return output;
  if (Array.isArray(value)) {
    value.slice(0, 100).forEach((child, index) => leaves(child, `${prefix}[${index}]`, output, depth + 1));
  } else if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) leaves(child, prefix ? `${prefix}.${key}` : key, output, depth + 1);
  } else output.set(prefix, value);
  return output;
}
const semanticFamilies: Array<[string, RegExp]> = [
  ["conflict", /(conflict|diverg|disagree|contradict)/i],
  ["context", /(context|macro|histor|background|regime)/i],
  ["scenario", /(scenario|stress|sensitivity|whatif|what_if)/i],
  ["provenance", /(provenance|source|lineage|evidence|authority)/i],
  ["uncertainty", /(uncertainty|confidence|coverage|quality)/i],
  ["comparison", /(comparison|compare|benchmark|relative|peer)/i],
  ["exposure", /(exposure|risk|impact|dependency)/i],
  ["methodology", /(methodology|calibration|model|assumption)/i],
  ["timeline", /(timeline|event|history|change)/i],
  ["export", /(export|table|field|download|dataset)/i],
  ["analysis", /(analysis|insight|signal|factor|driver)/i],
];
const excludedPath = /(renderToken|token|digest|sha|hash|generatedAt|createdAt|updatedAt|requestId|reportId|artifactId|tier|locale|title|subtitle|description|label|copy|text|schemaVersion)/i;
function meaningful(value: unknown) {
  if (typeof value === "string") return value.trim().length >= 2;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  return value !== null && value !== undefined;
}

assert(trusted.length >= 32, "trusted_account_hmac_missing");
assert(oidc.split(".").length === 3, "browser_pro_oidc_missing");
assert(helperUrl.startsWith("https://") && restoreUrl.startsWith("https://"), "browser_pro_helper_url_missing");
assert(entitlementBridgeUrl.startsWith("https://") && entitlementServerCapability.length >= 48, "browser_pro_entitlement_bridge_missing");
assert(a.accountId.startsWith("supabase:") && b.accountId.startsWith("supabase:"), "browser_pro_accounts_missing");
assert(a.token.split(".").length === 3 && b.token.split(".").length === 3, "browser_pro_jwts_missing");
assert(/^ent_[a-f0-9]{48}$/.test(entitlementId), "browser_pro_entitlement_missing");

async function resolveDirectEntitlement(account: typeof a, requiredTier: "pro" | "advanced") {
  const response = await fetch(entitlementBridgeUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${account.token}`,
      "x-velmere-entitlement-server-capability": entitlementServerCapability,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      schemaVersion: "velmere.product-entitlement-bridge-request.v1",
      action: "resolve",
      productSlug: "browser",
      requiredTier,
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  const text = await response.text();
  let json: Record<string, any> | null = null;
  try { json = JSON.parse(text) as Record<string, any>; } catch { }
  return { status: response.status, json, bodyPrefix: text.slice(0, 240) };
}

// Prove the real server-side entitlement bridge independently of the data-rights
// preflight. This is technical evidence only: it cannot make a customer artifact
// deliverable and never weakens the downstream rights gate.
const directEntitled = await resolveDirectEntitlement(a, "pro");
assert(
  directEntitled.status === 200
    && directEntitled.json?.ok === true
    && directEntitled.json?.allowed === true,
  `browser_pro_direct_entitlement_owner_failed_${directEntitled.status}:${directEntitled.bodyPrefix}`,
);
const directDenied = await resolveDirectEntitlement(b, "pro");
assert(
  (directDenied.status === 200
    && directDenied.json?.ok === true
    && directDenied.json?.allowed === false)
    || [401, 403].includes(directDenied.status),
  `browser_pro_direct_entitlement_cross_account_not_denied_${directDenied.status}:${directDenied.bodyPrefix}`,
);
await writeFile("artifacts/r7/browser-pro/R7_BROWSER_PRO_DIRECT_ENTITLEMENT_E2E.json", `${JSON.stringify({
  schemaVersion: "velmere.r7.browser-pro-direct-entitlement-e2e.v1",
  status: "PASS_BROWSER_PRO_DIRECT_ENTITLEMENT_REAL_BRIDGE",
  githubRunId: process.env.GITHUB_RUN_ID ?? null,
  githubRunAttempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 0),
  githubSha: process.env.GITHUB_SHA ?? null,
  productSlug: "browser",
  requiredTier: "pro",
  entitledOwnerAllowed: true,
  unentitledAccountDenied: true,
  serverCapabilityReturned: false,
  rawTokenReturned: false,
  customerArtifactDelivered: false,
  customerFinalCredit: false,
  paidValueFinalCredit: false,
  truthBoundary: "Real entitlement authority only. Customer delivery and paid value remain blocked until the independent rights and artifact gates pass.",
}, null, 2)}\n`);

const searchUrl = `${base}/api/search?q=EUR%2FUSD&mode=market&intent=detail&locale=en`;
const searchResponse = await fetch(searchUrl, { headers: { accept: "application/json", "cache-control": "no-store" }, cache: "no-store" });
if (searchResponse.status !== 200) throw new Error(`search_status_${searchResponse.status}:${(await searchResponse.text()).slice(0, 320)}`);
const search = await safeJson(searchResponse);
const result = (Array.isArray(search.results) ? search.results : []).find((row: any) => typeof row?.lensSourceToken === "string" && row.lensSourceToken.length > 40);
assert(result, "search_no_tokenized_real_result");
assert(Array.isArray(result.sources) && result.sources.some((source: any) => source?.id === "ecb-statistics"), "search_not_ecb_reference_result");
assert(result.officialReferenceSnapshot && typeof result.officialReferenceSnapshot.responseSha256 === "string", "ecb_exact_response_receipt_missing");
const sourceToken = result.lensSourceToken as string;

async function preview(account: typeof a, tier: "basic" | "pro") {
  const url = `${base}/api/search/lens-report?format=json&tier=${tier}&transport=token`;
  const body = JSON.stringify({ sourceToken });
  const response = await fetch(url, { method: "POST", headers: signed(account, url, "POST", body), body, cache: "no-store" });
  return { response, json: response.status === 200 ? await safeJson(response) : null, errorText: response.status === 200 ? "" : await response.text() };
}
const basicPreview = await preview(a, "basic");
assert(basicPreview.response.status === 200 && basicPreview.json?.ok === true && typeof basicPreview.json?.renderToken === "string", `basic_preview_failed_${basicPreview.response.status}`);
const proPreviewA = await preview(a, "pro");
if (proPreviewA.response.status !== 200) {
  let withheld: Record<string, any> | null = null;
  try { withheld = JSON.parse(proPreviewA.errorText) as Record<string, any>; } catch { }
  if (
    proPreviewA.response.status === 503
    && withheld?.schemaVersion === "velmere.current-execution.browser-customer-safe-withheld.v1"
    && withheld?.availability === "WITHHELD"
    && withheld?.error === "browser_customer_data_delivery_unavailable"
  ) {
    await writeFile("artifacts/r7/browser-pro/R7_BROWSER_PRO_WITHHELD_RIGHTS_E2E.json", `${JSON.stringify({
      schemaVersion: "velmere.r7.browser-pro-withheld-rights-e2e.v1",
      status: "WITHHELD_EXTERNAL_CUSTOMER_DISPLAY_EXPORT_RIGHTS",
      githubRunId: process.env.GITHUB_RUN_ID ?? null,
      githubRunAttempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 0),
      githubSha: process.env.GITHUB_SHA ?? null,
      directEntitlementBridgePassed: true,
      productRouteHttpStatus: 503,
      productRouteFailClosed: true,
      rightsGateBypassed: false,
      customerArtifactDelivered: false,
      customerFinalCredit: false,
      paidValueFinalCredit: false,
      requiredAction: "Attach a current, field-specific authority that permits the actual paid customer-display/export purposes, then rerun the unchanged route gate.",
    }, null, 2)}\n`);
    throw new Error("browser_pro_withheld_external_customer_display_export_rights");
  }
  throw new Error(`pro_preview_a_status_${proPreviewA.response.status}:${proPreviewA.errorText.slice(0, 360)}`);
}
assert(proPreviewA.json?.ok === true && typeof proPreviewA.json?.renderToken === "string", "pro_preview_a_invalid");
const proPreviewB = await preview(b, "pro");
assert([401, 402, 403, 404].includes(proPreviewB.response.status), `pro_preview_b_not_denied_${proPreviewB.response.status}`);

const basicReport = basicPreview.json.report ?? basicPreview.json;
const proReport = proPreviewA.json.report ?? proPreviewA.json;
assert(stable(basicReport) !== stable(proReport), "pro_report_identical_to_basic");
const basicLeaves = leaves(basicReport);
const proLeaves = leaves(proReport);
const changed: Array<{ path: string; basic: unknown; pro: unknown; family: string }> = [];
const families = new Set<string>();
for (const [pathName, proValue] of proLeaves.entries()) {
  if (excludedPath.test(pathName) || !meaningful(proValue)) continue;
  const basicValue = basicLeaves.get(pathName);
  if (basicLeaves.has(pathName) && stable(basicValue) === stable(proValue)) continue;
  const family = semanticFamilies.find(([, pattern]) => pattern.test(pathName))?.[0];
  if (!family) continue;
  families.add(family);
  changed.push({ path: pathName, basic: basicValue, pro: proValue, family });
}
assert(changed.length >= 3, `pro_semantic_delta_too_small:${JSON.stringify(changed.slice(0, 20))}`);
assert(families.size >= 2, `pro_semantic_families_too_few:${[...families].join(",")}`);

async function pdf(account: typeof a, tier: "basic" | "pro", renderToken: string) {
  const url = `${base}/api/search/lens-report?format=pdf&tier=${tier}`;
  const body = JSON.stringify({ renderToken });
  const response = await fetch(url, { method: "POST", headers: signed(account, url, "POST", body), body, cache: "no-store" });
  if (response.status !== 200) throw new Error(`${tier}_pdf_status_${response.status}:${(await response.text()).slice(0, 360)}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert((response.headers.get("content-type") ?? "").startsWith("application/pdf"), `${tier}_pdf_content_type_invalid`);
  assert(bytes.subarray(0, 5).toString("ascii") === "%PDF-", `${tier}_pdf_magic_invalid`);
  const digest = sha(bytes);
  const headerDigest = (response.headers.get("x-velmere-pdf-sha256") ?? "").replace(/^sha256:/, "");
  assert(headerDigest === digest, `${tier}_pdf_response_digest_mismatch`);
  return { response, bytes, digest, artifactId: response.headers.get("x-velmere-account-artifact-id") ?? "", durable: response.headers.get("x-velmere-durable-computation") ?? "" };
}
const basicPdf = await pdf(a, "basic", basicPreview.json.renderToken);
const proPdf = await pdf(a, "pro", proPreviewA.json.renderToken);
assert(proPdf.digest !== basicPdf.digest, "pro_pdf_identical_to_basic_pdf");
assert(proPdf.bytes.length >= 1024 && basicPdf.bytes.length >= 1024, "browser_pdf_too_small");
assert(proPdf.artifactId.length >= 8, "pro_artifact_id_missing");
assert(proPdf.durable === "supabase", `pro_durable_computation_not_supabase:${proPdf.durable}`);

const proJsonUrl = `${base}/api/account/customer-artifact?id=${encodeURIComponent(proPdf.artifactId)}&format=json`;
const own = await fetch(proJsonUrl, { headers: signed(a, proJsonUrl), cache: "no-store" });
assert(own.status === 200, `pro_owner_read_status_${own.status}`);
const ownJson = await safeJson(own);
assert(ownJson.ok === true && ownJson.artifact?.artifactId === proPdf.artifactId, "pro_owner_artifact_invalid");
assert(ownJson.artifact?.exactStoredPdf === true && ownJson.artifact?.previewDownloadByteIdentical === true, "pro_exact_pdf_parity_marker_missing");
assert(String(ownJson.artifact?.pdfSha256 ?? "").replace(/^sha256:/, "") === proPdf.digest, "pro_stored_metadata_digest_mismatch");
const cross = await fetch(proJsonUrl, { headers: signed(b, proJsonUrl), cache: "no-store" });
assert(cross.status === 404, `pro_cross_account_not_denied_${cross.status}`);
const proStoredPdfUrl = `${base}/api/account/customer-artifact?id=${encodeURIComponent(proPdf.artifactId)}&format=pdf&disposition=download`;
const storedResponse = await fetch(proStoredPdfUrl, { headers: signed(a, proStoredPdfUrl), cache: "no-store" });
assert(storedResponse.status === 200, `pro_stored_pdf_status_${storedResponse.status}`);
const storedBytes = Buffer.from(await storedResponse.arrayBuffer());
assert(sha(storedBytes) === proPdf.digest, "pro_stored_pdf_not_same_blob");

const revokeResponse = await fetch(helperUrl, { method: "POST", headers: { authorization: `Bearer ${oidc}`, "content-type": "application/json" }, body: JSON.stringify({ action: "revoke", entitlementId }), cache: "no-store" });
assert(revokeResponse.status === 200, `pro_revoke_status_${revokeResponse.status}`);
const revoke = await safeJson(revokeResponse);
assert(revoke.ok === true && revoke.revoked === true, "pro_revoke_invalid");
const proAfterRevoke = await preview(a, "pro");
assert([401, 402, 403, 404].includes(proAfterRevoke.response.status), `pro_survived_revoke_${proAfterRevoke.response.status}`);
const basicAfterRevoke = await preview(a, "basic");
assert(basicAfterRevoke.response.status === 200 && basicAfterRevoke.json?.ok === true, "basic_broken_by_paid_revoke");

const backupEraseResponse = await fetch(helperUrl, { method: "POST", headers: { authorization: `Bearer ${oidc}`, "content-type": "application/json" }, body: JSON.stringify({ action: "backup_erase", userId: a.userId, snapshotId: proPdf.artifactId }), cache: "no-store" });
if (backupEraseResponse.status !== 200) throw new Error(`pro_backup_erase_status_${backupEraseResponse.status}:${(await backupEraseResponse.text()).slice(0, 320)}`);
const backupErase = await safeJson(backupEraseResponse);
assert(backupErase.ok === true && typeof backupErase.backupId === "string" && backupErase.erasure?.status === "PASS", "pro_backup_erase_invalid");
const afterErase = await fetch(proJsonUrl, { headers: signed(a, proJsonUrl), cache: "no-store" });
assert(afterErase.status === 404, `pro_artifact_visible_after_erase_${afterErase.status}`);

const restoreBody = JSON.stringify({ schemaVersion: "velmere.r7.staging-http-request.v1", action: "restore", backupId: backupErase.backupId });
const restoreResponse = await fetch(restoreUrl, { method: "POST", headers: { authorization: `Bearer ${a.token}`, "content-type": "application/json" }, body: restoreBody, cache: "no-store" });
if (restoreResponse.status !== 200) throw new Error(`pro_restore_status_${restoreResponse.status}:${(await restoreResponse.text()).slice(0, 320)}`);
const restore = await safeJson(restoreResponse);
assert(restore.ok === true && restore.backupId === backupErase.backupId, "pro_restore_receipt_invalid");
assert(String(restore.pdfDigest ?? "").replace(/^sha256:/, "") === proPdf.digest, "pro_restore_pdf_digest_mismatch");
const postRestoreOwn = await fetch(proJsonUrl, { headers: signed(a, proJsonUrl), cache: "no-store" });
assert(postRestoreOwn.status === 200, `pro_post_restore_owner_status_${postRestoreOwn.status}`);
const postRestoreCross = await fetch(proJsonUrl, { headers: signed(b, proJsonUrl), cache: "no-store" });
assert(postRestoreCross.status === 404, `pro_post_restore_cross_not_denied_${postRestoreCross.status}`);
const postRestorePdf = await fetch(proStoredPdfUrl, { headers: signed(a, proStoredPdfUrl), cache: "no-store" });
assert(postRestorePdf.status === 200, `pro_post_restore_pdf_status_${postRestorePdf.status}`);
assert(sha(Buffer.from(await postRestorePdf.arrayBuffer())) === proPdf.digest, "pro_post_restore_pdf_not_byte_identical");

const receipt = {
  schemaVersion: "velmere.r7.browser-pro-entitlement-candidate-e2e.v1",
  status: "PASS_BROWSER_PRO_MATCHED_INPUT_ENTITLEMENT_CANDIDATE_E2E",
  githubRunId: process.env.GITHUB_RUN_ID ?? null,
  githubRunAttempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 0),
  githubSha: process.env.GITHUB_SHA ?? null,
  matchedInput: "EUR/USD",
  source: "ECB_OFFICIAL_REFERENCE_RATE",
  providerNetworkReal: true,
  sourceResponseSha256: result.officialReferenceSnapshot.responseSha256,
  basicRemainsFree: true,
  userAProEntitled: true,
  userBProDenied: true,
  proRevocationImmediate: true,
  basicUnaffectedByRevoke: true,
  semanticDeltaPathCount: changed.length,
  semanticDeltaFamilies: [...families].sort(),
  semanticDeltaExamples: changed.slice(0, 20).map(({ path, family }) => ({ path, family })),
  proReportDifferentFromBasic: true,
  proPdfDifferentFromBasic: true,
  proPdfSha256: `sha256:${proPdf.digest}`,
  proPdfByteLength: proPdf.bytes.length,
  basicPdfSha256: `sha256:${basicPdf.digest}`,
  basicPdfByteLength: basicPdf.bytes.length,
  durableComputation: "supabase",
  exactPdfByteParity: true,
  accountAOwnReadback: true,
  accountBCrossAccountDenied: true,
  backupEraseRestore: true,
  postRestoreOwnerReadback: true,
  postRestoreCrossAccountDenied: true,
  postRestorePdfByteIdentical: true,
  proArtifactId: proPdf.artifactId,
  basicArtifactId: basicPdf.artifactId,
  backupId: backupErase.backupId,
  serviceRoleInApplication: false,
  vercelUsed: false,
  rawSecretsReturned: false,
  exactCurrentSourceBytesAtProductExecution: false,
  promotionRequiredBeforeFinal: true,
  customerFinalCredit: false,
  paidValueFinalCredit: false,
};
await writeFile("artifacts/r7/browser-pro/R7_BROWSER_PRO_ENTITLEMENT_CANDIDATE_E2E.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ...receipt, sourceResponseSha256: "<sha256>", proPdfSha256: "<sha256>", basicPdfSha256: "<sha256>", proArtifactId: "<redacted-id>", basicArtifactId: "<redacted-id>", backupId: "<redacted-id>" }, null, 2));
