import { createHash, randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { signTrustedAccountHeaders } from "../r7-work/lib/security/trusted-account-header-boundary";

const base = process.env.R7_BROWSER_ADVANCED_E2E_BASE_URL ?? "http://localhost:3100";
const trusted = process.env.VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT ?? "";
const oidc = process.env.R7_BROWSER_ADVANCED_GITHUB_OIDC ?? "";
const helperUrl = process.env.R7_BROWSER_ADVANCED_HELPER_URL ?? "";
const restoreUrl = process.env.R7_BROWSER_ADVANCED_RESTORE_URL ?? "";
const a = { userId: process.env.R7_BROWSER_ADVANCED_USER_A_ID ?? "", accountId: process.env.R7_BROWSER_ADVANCED_ACCOUNT_A ?? "", token: process.env.R7_BROWSER_ADVANCED_USER_A_JWT ?? "", label: "a" };
const b = { userId: process.env.R7_BROWSER_ADVANCED_USER_B_ID ?? "", accountId: process.env.R7_BROWSER_ADVANCED_ACCOUNT_B ?? "", token: process.env.R7_BROWSER_ADVANCED_USER_B_JWT ?? "", label: "b" };
const entitlementId = process.env.R7_BROWSER_ADVANCED_ENTITLEMENT_ID ?? "";

const sha = (bytes: Uint8Array | Buffer | string) => createHash("sha256").update(bytes).digest("hex");
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function isObject(value: unknown): value is Record<string, any> { return typeof value === "object" && value !== null && !Array.isArray(value); }
async function safeJson(response: Response) { const text = await response.text(); try { return JSON.parse(text) as Record<string, any>; } catch { throw new Error(`invalid_json_${response.status}:${text.slice(0, 300)}`); } }
function signed(account: typeof a, url: string, method = "GET", body = "") {
  const contentType = body ? "application/json" : "";
  const headers: Record<string, string> = {
    ...signTrustedAccountHeaders({ requestUrl: url, method, timestamp: Math.floor(Date.now() / 1000), nonce: randomBytes(24).toString("base64url"), accountId: account.accountId, displayName: `R7 Browser Advanced ${account.label.toUpperCase()}`, handle: `@r7.browser.advanced.${account.label}`, provider: "server", contentType, body, secret: trusted }),
    authorization: `Bearer ${account.token}`,
  };
  if (contentType) headers["content-type"] = contentType;
  return headers;
}
function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`; return JSON.stringify(value); }
function leaves(value: unknown, prefix = "", output = new Map<string, unknown>(), depth = 0) { if (depth > 12) return output; if (Array.isArray(value)) value.slice(0, 100).forEach((child, index) => leaves(child, `${prefix}[${index}]`, output, depth + 1)); else if (isObject(value)) for (const [key, child] of Object.entries(value)) leaves(child, prefix ? `${prefix}.${key}` : key, output, depth + 1); else output.set(prefix, value); return output; }
const families: Array<[string, RegExp]> = [
  ["conflict", /(conflict|diverg|disagree|contradict)/i], ["scenario", /(scenario|stress|sensitivity|whatif|what_if)/i], ["uncertainty", /(uncertainty|confidence|coverage|quality)/i],
  ["provenance", /(provenance|source|lineage|evidence|authority)/i], ["comparison", /(comparison|compare|benchmark|relative|peer)/i], ["context", /(context|macro|histor|background|regime)/i],
  ["exposure", /(exposure|risk|impact|dependency)/i], ["methodology", /(methodology|calibration|model|assumption)/i], ["timeline", /(timeline|event|history|change)/i],
  ["export", /(export|table|field|download|dataset)/i], ["analysis", /(analysis|insight|signal|factor|driver)/i],
];
const excluded = /(renderToken|token|digest|sha|hash|generatedAt|createdAt|updatedAt|requestId|reportId|artifactId|tier|locale|title|subtitle|description|label|copy|text|schemaVersion)/i;
function meaningful(value: unknown) { if (typeof value === "string") return value.trim().length >= 2; if (typeof value === "number") return Number.isFinite(value); if (typeof value === "boolean") return true; return value !== null && value !== undefined; }

assert(trusted.length >= 32, "trusted_account_hmac_missing");
assert(oidc.split(".").length === 3, "browser_advanced_oidc_missing");
assert(helperUrl.startsWith("https://") && restoreUrl.startsWith("https://"), "browser_advanced_helper_missing");
assert(a.accountId.startsWith("supabase:") && b.accountId.startsWith("supabase:"), "browser_advanced_accounts_missing");
assert(a.token.split(".").length === 3 && b.token.split(".").length === 3, "browser_advanced_jwts_missing");
assert(/^ent_[a-f0-9]{48}$/.test(entitlementId), "browser_advanced_entitlement_missing");

const searchUrl = `${base}/api/search?q=EUR%2FUSD&mode=market&intent=detail&locale=en`;
const searchResponse = await fetch(searchUrl, { headers: { accept: "application/json", "cache-control": "no-store" }, cache: "no-store" });
if (searchResponse.status !== 200) throw new Error(`search_status_${searchResponse.status}:${(await searchResponse.text()).slice(0, 320)}`);
const search = await safeJson(searchResponse);
const result = (Array.isArray(search.results) ? search.results : []).find((row: any) => typeof row?.lensSourceToken === "string" && row.lensSourceToken.length > 40);
assert(result, "search_no_tokenized_real_result");
assert(Array.isArray(result.sources) && result.sources.some((source: any) => source?.id === "ecb-statistics"), "search_not_ecb_reference_result");
assert(result.officialReferenceSnapshot && typeof result.officialReferenceSnapshot.responseSha256 === "string", "ecb_exact_response_receipt_missing");
const sourceToken = result.lensSourceToken as string;

async function preview(account: typeof a, tier: "basic" | "pro" | "advanced") {
  const url = `${base}/api/search/lens-report?format=json&tier=${tier}&transport=token`;
  const body = JSON.stringify({ sourceToken });
  const response = await fetch(url, { method: "POST", headers: signed(account, url, "POST", body), body, cache: "no-store" });
  const text = response.status === 200 ? "" : await response.text();
  return { response, json: response.status === 200 ? await safeJson(response) : null, errorText: text };
}
const basic = await preview(a, "basic");
const pro = await preview(a, "pro");
const advanced = await preview(a, "advanced");
assert(basic.response.status === 200 && basic.json?.ok === true, "advanced_candidate_basic_failed");
assert(pro.response.status === 200 && pro.json?.ok === true && typeof pro.json?.renderToken === "string", `advanced_entitlement_did_not_cover_pro_${pro.response.status}`);
if (advanced.response.status !== 200) throw new Error(`advanced_preview_status_${advanced.response.status}:${advanced.errorText.slice(0, 360)}`);
assert(advanced.json?.ok === true && typeof advanced.json?.renderToken === "string", "advanced_preview_invalid");
const bAdvanced = await preview(b, "advanced");
assert([401, 402, 403, 404].includes(bAdvanced.response.status), `advanced_cross_account_not_denied_${bAdvanced.response.status}`);

const proReport = pro.json.report ?? pro.json;
const advancedReport = advanced.json.report ?? advanced.json;
assert(stable(proReport) !== stable(advancedReport), "advanced_report_identical_to_pro");
const proLeaves = leaves(proReport);
const advancedLeaves = leaves(advancedReport);
const changed: Array<{ path: string; family: string }> = [];
const familySet = new Set<string>();
for (const [pathName, advancedValue] of advancedLeaves.entries()) {
  if (excluded.test(pathName) || !meaningful(advancedValue)) continue;
  const proValue = proLeaves.get(pathName);
  if (proLeaves.has(pathName) && stable(proValue) === stable(advancedValue)) continue;
  const family = families.find(([, pattern]) => pattern.test(pathName))?.[0];
  if (!family) continue;
  familySet.add(family);
  changed.push({ path: pathName, family });
}
assert(changed.length >= 3, `advanced_semantic_delta_too_small:${JSON.stringify(changed.slice(0, 20))}`);
assert(familySet.size >= 2, `advanced_semantic_families_too_few:${[...familySet].join(",")}`);

async function pdf(tier: "pro" | "advanced", renderToken: string) {
  const url = `${base}/api/search/lens-report?format=pdf&tier=${tier}`;
  const body = JSON.stringify({ renderToken });
  const response = await fetch(url, { method: "POST", headers: signed(a, url, "POST", body), body, cache: "no-store" });
  if (response.status !== 200) throw new Error(`${tier}_pdf_status_${response.status}:${(await response.text()).slice(0, 360)}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert((response.headers.get("content-type") ?? "").startsWith("application/pdf") && bytes.subarray(0, 5).toString("ascii") === "%PDF-", `${tier}_pdf_invalid`);
  const digest = sha(bytes);
  assert((response.headers.get("x-velmere-pdf-sha256") ?? "").replace(/^sha256:/, "") === digest, `${tier}_pdf_digest_mismatch`);
  return { bytes, digest, artifactId: response.headers.get("x-velmere-account-artifact-id") ?? "", durable: response.headers.get("x-velmere-durable-computation") ?? "" };
}
const proPdf = await pdf("pro", pro.json.renderToken);
const advancedPdf = await pdf("advanced", advanced.json.renderToken);
assert(proPdf.digest !== advancedPdf.digest, "advanced_pdf_identical_to_pro_pdf");
assert(advancedPdf.artifactId.length >= 8 && advancedPdf.durable === "supabase", "advanced_pdf_not_durable_supabase");

const advancedJsonUrl = `${base}/api/account/customer-artifact?id=${encodeURIComponent(advancedPdf.artifactId)}&format=json`;
const own = await fetch(advancedJsonUrl, { headers: signed(a, advancedJsonUrl), cache: "no-store" });
assert(own.status === 200, `advanced_owner_read_${own.status}`);
const ownJson = await safeJson(own);
assert(ownJson.ok === true && ownJson.artifact?.artifactId === advancedPdf.artifactId && ownJson.artifact?.exactStoredPdf === true && ownJson.artifact?.previewDownloadByteIdentical === true, "advanced_owner_artifact_invalid");
assert(String(ownJson.artifact?.pdfSha256 ?? "").replace(/^sha256:/, "") === advancedPdf.digest, "advanced_stored_digest_mismatch");
const cross = await fetch(advancedJsonUrl, { headers: signed(b, advancedJsonUrl), cache: "no-store" });
assert(cross.status === 404, `advanced_cross_account_artifact_not_denied_${cross.status}`);
const storedUrl = `${base}/api/account/customer-artifact?id=${encodeURIComponent(advancedPdf.artifactId)}&format=pdf&disposition=download`;
const stored = await fetch(storedUrl, { headers: signed(a, storedUrl), cache: "no-store" });
assert(stored.status === 200 && sha(Buffer.from(await stored.arrayBuffer())) === advancedPdf.digest, "advanced_stored_pdf_not_same_blob");

const revokeResponse = await fetch(helperUrl, { method: "POST", headers: { authorization: `Bearer ${oidc}`, "content-type": "application/json" }, body: JSON.stringify({ action: "revoke", entitlementId }), cache: "no-store" });
assert(revokeResponse.status === 200, `advanced_revoke_status_${revokeResponse.status}`);
const afterAdvanced = await preview(a, "advanced");
const afterPro = await preview(a, "pro");
const afterBasic = await preview(a, "basic");
assert([401, 402, 403, 404].includes(afterAdvanced.response.status), `advanced_survived_revoke_${afterAdvanced.response.status}`);
assert([401, 402, 403, 404].includes(afterPro.response.status), `advanced_entitlement_left_pro_after_revoke_${afterPro.response.status}`);
assert(afterBasic.response.status === 200 && afterBasic.json?.ok === true, "basic_broken_by_advanced_revoke");

const backupEraseResponse = await fetch(helperUrl, { method: "POST", headers: { authorization: `Bearer ${oidc}`, "content-type": "application/json" }, body: JSON.stringify({ action: "backup_erase", userId: a.userId, snapshotId: advancedPdf.artifactId }), cache: "no-store" });
if (backupEraseResponse.status !== 200) throw new Error(`advanced_backup_erase_${backupEraseResponse.status}:${(await backupEraseResponse.text()).slice(0, 320)}`);
const backupErase = await safeJson(backupEraseResponse);
assert(backupErase.ok === true && typeof backupErase.backupId === "string" && backupErase.erasure?.status === "PASS", "advanced_backup_erase_invalid");
assert((await fetch(advancedJsonUrl, { headers: signed(a, advancedJsonUrl), cache: "no-store" })).status === 404, "advanced_visible_after_erase");
const restoreBody = JSON.stringify({ schemaVersion: "velmere.r7.staging-http-request.v1", action: "restore", backupId: backupErase.backupId });
const restoreResponse = await fetch(restoreUrl, { method: "POST", headers: { authorization: `Bearer ${a.token}`, "content-type": "application/json" }, body: restoreBody, cache: "no-store" });
if (restoreResponse.status !== 200) throw new Error(`advanced_restore_${restoreResponse.status}:${(await restoreResponse.text()).slice(0, 320)}`);
const restore = await safeJson(restoreResponse);
assert(restore.ok === true && String(restore.pdfDigest ?? "").replace(/^sha256:/, "") === advancedPdf.digest, "advanced_restore_invalid");
assert((await fetch(advancedJsonUrl, { headers: signed(a, advancedJsonUrl), cache: "no-store" })).status === 200, "advanced_post_restore_owner_failed");
assert((await fetch(advancedJsonUrl, { headers: signed(b, advancedJsonUrl), cache: "no-store" })).status === 404, "advanced_post_restore_cross_not_denied");
const restoredPdf = await fetch(storedUrl, { headers: signed(a, storedUrl), cache: "no-store" });
assert(restoredPdf.status === 200 && sha(Buffer.from(await restoredPdf.arrayBuffer())) === advancedPdf.digest, "advanced_post_restore_pdf_not_identical");

const receipt = {
  schemaVersion: "velmere.r7.browser-advanced-entitlement-candidate-e2e.v1",
  status: "PASS_BROWSER_ADVANCED_MATCHED_INPUT_ENTITLEMENT_CANDIDATE_E2E",
  githubRunId: process.env.GITHUB_RUN_ID ?? null,
  githubRunAttempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 0),
  githubSha: process.env.GITHUB_SHA ?? null,
  matchedInput: "EUR/USD",
  source: "ECB_OFFICIAL_REFERENCE_RATE",
  providerNetworkReal: true,
  sourceResponseSha256: result.officialReferenceSnapshot.responseSha256,
  advancedEntitlementCoversPro: true,
  userBAdvancedDenied: true,
  semanticDeltaPathCount: changed.length,
  semanticDeltaFamilies: [...familySet].sort(),
  semanticDeltaExamples: changed.slice(0, 20),
  advancedReportDifferentFromPro: true,
  advancedPdfDifferentFromPro: true,
  proPdfSha256: `sha256:${proPdf.digest}`,
  advancedPdfSha256: `sha256:${advancedPdf.digest}`,
  advancedPdfByteLength: advancedPdf.bytes.length,
  durableComputation: "supabase",
  exactPdfByteParity: true,
  accountAOwnReadback: true,
  accountBCrossAccountDenied: true,
  entitlementRevocationImmediate: true,
  basicUnaffectedByRevoke: true,
  backupEraseRestore: true,
  postRestoreOwnerReadback: true,
  postRestoreCrossAccountDenied: true,
  postRestorePdfByteIdentical: true,
  advancedArtifactId: advancedPdf.artifactId,
  proArtifactId: proPdf.artifactId,
  backupId: backupErase.backupId,
  serviceRoleInApplication: false,
  vercelUsed: false,
  rawSecretsReturned: false,
  exactCurrentSourceBytesAtProductExecution: false,
  promotionRequiredBeforeFinal: true,
  customerFinalCredit: false,
  paidValueFinalCredit: false,
};
await writeFile("artifacts/r7/browser-advanced/R7_BROWSER_ADVANCED_ENTITLEMENT_CANDIDATE_E2E.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ...receipt, sourceResponseSha256: "<sha256>", proPdfSha256: "<sha256>", advancedPdfSha256: "<sha256>", advancedArtifactId: "<redacted-id>", proArtifactId: "<redacted-id>", backupId: "<redacted-id>" }, null, 2));
