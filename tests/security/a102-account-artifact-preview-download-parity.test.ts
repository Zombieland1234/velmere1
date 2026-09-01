import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const route = fs.readFileSync(path.join(root, "lib/server/lazy-route-modules/account--customer-artifact.ts"), "utf8");
const snapshot = fs.readFileSync(path.join(root, "lib/reporting/account-customer-artifact-snapshot.ts"), "utf8");
const blob = fs.readFileSync(path.join(root, "lib/reporting/account-customer-artifact-pdf-blob.ts"), "utf8");
const availability = fs.readFileSync(path.join(root, "lib/reporting/customer-artifact-pdf-availability.ts"), "utf8");

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

check(route.includes('["id", "format", "limit", "disposition"]'), "route must pin the preview/download disposition query");
check(route.includes('dispositionRaw !== "preview" && dispositionRaw !== "download"'), "unknown disposition must fail closed");
check(route.includes('buildExactCustomerPdfDelivery'), "route must use the shared exact PDF delivery authority");
check(route.includes('disposition: disposition === "preview" ? "inline" : "attachment"'), "preview and download may differ only by HTTP disposition");
check(route.includes('"x-velmere-preview-download-parity": "byte-identical"'), "served PDFs must always declare exact byte parity");
check(route.includes('"x-velmere-pdf-storage": "exact_immutable_blob"'), "served PDFs must declare immutable storage");
check(route.includes('error: "artifact_pdf_exact_bytes_unavailable"'), "legacy PDF delivery must fail closed");
check(!route.includes('full_preview_requires_exact_stored_pdf'), "preview-only legacy exception must be removed");
check(!route.includes('renderCustomerTierPdf('), "account route must never rerender market PDFs");
check(!route.includes('buildPdf('), "account route must never rerender Lens PDFs");
check(!route.includes('artifact_market_rerender_failed'), "legacy market rerender branch must be removed");
check(!route.includes('artifact_rerender_digest_mismatch'), "rerender digest comparison is not immutable delivery");
check(route.includes('P86_PUBLIC_ACCOUNT_ARTIFACT_SCHEMA'), "detail response must use the pinned v3 schema authority");
check(route.includes('P86_PUBLIC_ACCOUNT_ARTIFACT_LIST_SCHEMA'), "list response must use the pinned v3 schema authority");
check(route.includes('P86_PUBLIC_ACCOUNT_ARTIFACT_ERROR_SCHEMA'), "error response must use the pinned v3 schema authority");
check(!route.includes('source: found.source'), "public artifact response must not expose storage source");
check(!route.includes('source: listed.source'), "public artifact list must not expose storage source");
check(!route.includes('canonicalArtifact: snapshot.canonicalArtifact'), "public response must not expose raw canonical artifact internals");
check(route.includes('previewDownloadByteIdentical: exactRequired && Boolean(exactMetadata)'), "metadata must surface verified exact-byte parity truth");
check(availability.includes('P86_LEGACY_EXACT_PDF_UNAVAILABLE'), "availability policy must have an explicit legacy unavailable state");
check(availability.includes(': null,'), "legacy artifacts must publish nullable routes");
check(availability.includes('&format=pdf&disposition=preview'), "exact full preview route must be explicit");
check(availability.includes('&format=pdf&disposition=download'), "exact download route must be explicit");
check(snapshot.includes('account_customer_artifact_new_write_exact_pdf_required'), "new non-Audit legacy snapshot construction must fail closed");
check(snapshot.includes('account_customer_artifact_audit_exact_pdf_required'), "historical Audit-specific fail-closed contract must remain compatible");
check(blob.includes('const pdfDigest = sha256BytesDigest(pdfBytes);'), "stored blob must hash exact PDF bytes");
check(blob.includes('account_customer_artifact_pdf_digest_mismatch'), "PDF byte tampering must fail closed");
check(blob.includes('account_customer_artifact_pdf_immutable_conflict'), "stored PDF must be immutable");

console.log(`Account artifact preview/download parity: PASS (${assertions}/${assertions})`);
