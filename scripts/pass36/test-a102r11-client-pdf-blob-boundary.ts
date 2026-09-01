import fs from "node:fs";
import path from "node:path";
import { canonicalJson } from "@/lib/security/canonical-json";
import { sha256BytesDigest, sha256Digest } from "@/lib/security/cryptographic-digest";
import {
  PASS36_A102R11_CLIENT_PDF_BLOB_BOUNDARY_ID,
  PASS36_A102R11_OBJECT_URL_REVOKE_DELAY_MS,
  buildSafeClientPdfFilename,
  createClientPdfObjectUrl,
  parseLensPdfAccountArtifactBinding,
  triggerClientPdfDownload,
  verifyLensPdfAccountArtifactReadback,
  verifyLensPdfResponseBytes,
} from "@/lib/security/client-pdf-blob-boundary";
import type { LensReport, LensReportDepth } from "@/lib/search/lens-report";
import { PASS4823_LENS_PDF_RENDERER_ID } from "@/lib/search/lens-pdf-renderer-identity";

let checks = 0;
let failed = 0;
function check(id: string, condition: unknown, detail?: unknown) {
  checks += 1;
  if (!condition) {
    failed += 1;
    console.error(JSON.stringify({ id, passed: false, detail }));
  }
}

function pdfBytes(extra = "") {
  return new TextEncoder().encode(`%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${extra}\n%%EOF\n`);
}

function report(depth: LensReportDepth = "basic") {
  const pageCount = depth === "basic" ? 2 : depth === "pro" ? 4 : 8;
  return {
    version: "velmere-lens-report-v1",
    selectedDepth: depth,
    pass477: { selectedDepth: depth },
    pass610: { pageCount },
    brain: { checksum: `CHECKSUM-${depth}` },
    locale: "en",
    generatedAt: "2026-07-30T04:00:00.000Z",
    title: "Bound PDF",
    symbol: "VLM",
    sections: [],
    sources: [],
  } as unknown as LensReport;
}

function headersFor(bytes: Uint8Array, value: LensReport, overrides: Record<string, string | null> = {}) {
  const reportDigest = sha256Digest(canonicalJson(value));
  const rows: Record<string, string> = {
    "content-type": "application/pdf",
    "content-length": String(bytes.byteLength),
    "x-velmere-pdf-sha256": sha256BytesDigest(bytes).slice("sha256:".length),
    "x-velmere-report-id": `lens-report-${reportDigest.slice("sha256:".length)}`,
    "x-velmere-report-checksum": value.brain.checksum,
    "x-velmere-report-digest": reportDigest,
    "x-velmere-renderer-id": PASS4823_LENS_PDF_RENDERER_ID,
    "x-velmere-pdf-depth": value.selectedDepth,
    "x-velmere-pdf-page-count": String(value.pass610.pageCount),
    "x-velmere-canonical-artifact-digest": sha256Digest("artifact"),
    "x-velmere-canonical-payload-digest": reportDigest,
    "x-velmere-pdf-active-content": "none",
    "x-velmere-preview-download-parity": "same-blob-as-download",
    "x-velmere-redaction": "clean",
  };
  for (const [key, val] of Object.entries(overrides)) {
    if (val === null) delete rows[key.toLowerCase()];
    else rows[key.toLowerCase()] = val;
  }
  return { get(name: string) { return rows[name.toLowerCase()] ?? null; } };
}

const bytes = pdfBytes();
const basic = report("basic");
const valid = verifyLensPdfResponseBytes({ bytes, headers: headersFor(bytes, basic), report: basic, depth: "basic" });
check("boundary_id", PASS36_A102R11_CLIENT_PDF_BLOB_BOUNDARY_ID.includes("a102r11"));
check("valid_exact_binding", valid.ok, valid);
if (valid.ok) {
  check("valid_digest", valid.pdfDigest === sha256BytesDigest(bytes));
  check("valid_report_digest", valid.reportDigest === sha256Digest(canonicalJson(basic)));
  check("valid_page_count", valid.pageCount === 2);

  const artifactId = `artifact-lens-${"b".repeat(16)}-${valid.artifactDigest.slice("sha256:".length)}`;
  const artifactRoute = `/api/account/customer-artifact?id=${encodeURIComponent(artifactId)}`;
  const noAccountBinding = parseLensPdfAccountArtifactBinding(headersFor(bytes, basic));
  check("anonymous_pdf_has_no_save_claim", noAccountBinding.ok && noAccountBinding.binding === null, noAccountBinding);
  const incompleteAccountBinding = parseLensPdfAccountArtifactBinding(headersFor(bytes, basic, {
    "x-velmere-account-artifact-id": artifactId,
  }));
  check("account_header_pair_is_atomic", !incompleteAccountBinding.ok && incompleteAccountBinding.error.endsWith("pair_incomplete"), incompleteAccountBinding);
  const hostileAccountRoute = parseLensPdfAccountArtifactBinding(headersFor(bytes, basic, {
    "x-velmere-account-artifact-id": artifactId,
    "x-velmere-account-artifact-route": `https://attacker.invalid/${artifactId}`,
  }));
  check("account_route_same_origin_exact", !hostileAccountRoute.ok && hostileAccountRoute.error.endsWith("route_invalid"), hostileAccountRoute);
  const accountBinding = parseLensPdfAccountArtifactBinding(headersFor(bytes, basic, {
    "x-velmere-account-artifact-id": artifactId,
    "x-velmere-account-artifact-route": artifactRoute,
  }));
  check("account_header_pair_valid", accountBinding.ok && accountBinding.binding?.route === artifactRoute, accountBinding);
  if (accountBinding.ok && accountBinding.binding) {
    const readbackPayload = {
      ok: true,
      schemaVersion: "velmere.public-account-artifact.v3",
      artifact: {
        artifactId,
        surface: "lens",
        reportId: valid.reportId,
        requestedTier: "basic",
        deliveredTier: "basic",
        locale: "en",
        title: basic.title,
        subject: basic.symbol,
        generatedAt: basic.generatedAt,
        integrityToken: valid.artifactDigest,
        pdfSha256: valid.pdfDigest,
        pageCount: valid.pageCount,
        pdfAvailability: "exact_immutable_blob",
        exactStoredPdf: true,
        previewDownloadByteIdentical: true,
        preview: { symbol: basic.symbol },
        previewRoute: `${artifactRoute}&format=pdf&disposition=preview`,
        downloadRoute: `${artifactRoute}&format=pdf&disposition=download`,
      },
    };
    const contractHeaders = { get(name: string) { return name.toLowerCase() === "x-velmere-contract" ? "velmere.public-account-artifact.v3" : null; } };
    const verifiedReadback = verifyLensPdfAccountArtifactReadback({
      payload: readbackPayload,
      headers: contractHeaders,
      binding: accountBinding.binding,
      integrity: valid,
      report: basic,
      depth: "basic",
      locale: "en",
    });
    check("account_readback_v3_exact", verifiedReadback.ok && verifiedReadback.artifact.accountRoute.includes(artifactId), verifiedReadback);
    const digestDrift = verifyLensPdfAccountArtifactReadback({
      payload: { ...readbackPayload, artifact: { ...readbackPayload.artifact, pdfSha256: sha256Digest("different") } },
      headers: contractHeaders,
      binding: accountBinding.binding,
      integrity: valid,
      report: basic,
      depth: "basic",
      locale: "en",
    });
    check("account_readback_digest_drift_fails_closed", !digestDrift.ok && digestDrift.error.endsWith("digest_mismatch"), digestDrift);
    const missingExactBytes = verifyLensPdfAccountArtifactReadback({
      payload: { ...readbackPayload, artifact: { ...readbackPayload.artifact, exactStoredPdf: false } },
      headers: contractHeaders,
      binding: accountBinding.binding,
      integrity: valid,
      report: basic,
      depth: "basic",
      locale: "en",
    });
    check("account_readback_exact_storage_required", !missingExactBytes.ok, missingExactBytes);
    const wrongContract = verifyLensPdfAccountArtifactReadback({
      payload: readbackPayload,
      headers: { get: () => "velmere.public-account-artifact.v2" },
      binding: accountBinding.binding,
      integrity: valid,
      report: basic,
      depth: "basic",
      locale: "en",
    });
    check("account_readback_contract_downgrade_denied", !wrongContract.ok && wrongContract.error.endsWith("contract_invalid"), wrongContract);
  }
}

const mutations: Array<[string, Uint8Array, LensReport, LensReportDepth, Record<string, string | null>, string]> = [
  ["content_type", bytes, basic, "basic", { "content-type": "text/html" }, "lens_pdf_client_content_type_invalid"],
  ["content_length", bytes, basic, "basic", { "content-length": String(bytes.byteLength + 1) }, "lens_pdf_client_content_length_mismatch"],
  ["pdf_digest_missing", bytes, basic, "basic", { "x-velmere-pdf-sha256": null }, "lens_pdf_client_sha256_mismatch"],
  ["pdf_digest", bytes, basic, "basic", { "x-velmere-pdf-sha256": "0".repeat(64) }, "lens_pdf_client_sha256_mismatch"],
  ["report_id", bytes, basic, "basic", { "x-velmere-report-id": "lens-report-wrong" }, "lens_pdf_client_report_id_mismatch"],
  ["report_digest", bytes, basic, "basic", { "x-velmere-report-digest": `sha256:${"1".repeat(64)}` }, "lens_pdf_client_report_digest_mismatch"],
  ["payload_digest", bytes, basic, "basic", { "x-velmere-canonical-payload-digest": `sha256:${"2".repeat(64)}` }, "lens_pdf_client_payload_digest_mismatch"],
  ["artifact_digest", bytes, basic, "basic", { "x-velmere-canonical-artifact-digest": "bad" }, "lens_pdf_client_artifact_digest_invalid"],
  ["checksum", bytes, basic, "basic", { "x-velmere-report-checksum": "other" }, "lens_pdf_client_report_checksum_mismatch"],
  ["renderer", bytes, basic, "basic", { "x-velmere-renderer-id": "other" }, "lens_pdf_client_renderer_mismatch"],
  ["depth_header", bytes, basic, "basic", { "x-velmere-pdf-depth": "advanced" }, "lens_pdf_client_depth_mismatch"],
  ["page_count", bytes, basic, "basic", { "x-velmere-pdf-page-count": "3" }, "lens_pdf_client_page_count_mismatch"],
  ["active_content", bytes, basic, "basic", { "x-velmere-pdf-active-content": "detected" }, "lens_pdf_client_active_content_not_clean"],
  ["redaction", bytes, basic, "basic", { "x-velmere-redaction": "unknown" }, "lens_pdf_client_redaction_not_clean"],
  ["parity", bytes, basic, "basic", { "x-velmere-preview-download-parity": "layout-only" }, "lens_pdf_client_preview_download_parity_invalid"],
];
for (const [id, sample, sampleReport, depth, overrides, expectedError] of mutations) {
  const result = verifyLensPdfResponseBytes({ bytes: sample, headers: headersFor(sample, sampleReport, overrides), report: sampleReport, depth });
  check(`reject_${id}`, !result.ok && result.error === expectedError, result);
}

const badMagic = new TextEncoder().encode("NOTPDF\n%%EOF\n");
check("reject_magic", verifyLensPdfResponseBytes({ bytes: badMagic, headers: headersFor(badMagic, basic), report: basic, depth: "basic" }).ok === false);
const noEof = new TextEncoder().encode("%PDF-1.7\nbody\n");
check("reject_missing_eof", verifyLensPdfResponseBytes({ bytes: noEof, headers: headersFor(noEof, basic), report: basic, depth: "basic" }).ok === false);
const trailing = new TextEncoder().encode("%PDF-1.7\nbody\n%%EOF\n<script>leak</script>");
check("reject_trailing_payload", verifyLensPdfResponseBytes({ bytes: trailing, headers: headersFor(trailing, basic), report: basic, depth: "basic" }).ok === false);
const wrongDepthReport = report("pro");
check("reject_report_depth_substitution", verifyLensPdfResponseBytes({ bytes, headers: headersFor(bytes, wrongDepthReport), report: wrongDepthReport, depth: "basic" }).ok === false);
const invalidExpectedPages = { ...basic, pass610: { pageCount: 7 } } as LensReport;
check("reject_expected_page_contract", verifyLensPdfResponseBytes({ bytes, headers: headersFor(bytes, invalidExpectedPages), report: invalidExpectedPages, depth: "basic" }).ok === false);

check("safe_filename_extension", buildSafeClientPdfFilename("Client / report.pdf") === "Client-report.pdf");
let controlFilenameRejected = false;
try { buildSafeClientPdfFilename("report\nheader"); } catch { controlFilenameRejected = true; }
check("safe_filename_control_rejected", controlFilenameRejected);
check("safe_filename_windows_reserved", buildSafeClientPdfFilename("CON").toLowerCase() !== "con.pdf");

const created: string[] = [];
const revoked: string[] = [];
const fakeUrl = {
  createObjectURL(blob: Blob) { check("object_url_blob_mime", blob.type === "application/pdf"); const url = `blob:test-${created.length + 1}`; created.push(url); return url; },
  revokeObjectURL(url: string) { revoked.push(url); },
};
const objectUrl = createClientPdfObjectUrl({ bytes, urlApi: fakeUrl });
check("object_url_created", objectUrl.url === "blob:test-1" && created.length === 1);
objectUrl.revoke();
objectUrl.revoke();
check("object_url_revoke_idempotent", revoked.length === 1 && revoked[0] === "blob:test-1");

let clicked = 0;
let appended = 0;
let removed = 0;
let scheduledDelay = 0;
let scheduled: (() => void) | null = null;
const anchor = { href: "", download: "", rel: "", referrerPolicy: "", click() { clicked += 1; }, remove() { removed += 1; } };
const result = triggerClientPdfDownload({
  bytes,
  filenameStem: "audit/client-secret",
  urlApi: fakeUrl,
  documentApi: { createElement: () => anchor, body: { appendChild() { appended += 1; } } },
  schedule(callback, delayMs) { scheduled = callback; scheduledDelay = delayMs; return 1; },
});
check("download_triggered", result.ok && clicked === 1 && appended === 1 && removed === 1);
check("download_filename_safe", anchor.download === "audit-client-secret.pdf");
check("download_rel_referrer", anchor.rel === "noopener noreferrer" && anchor.referrerPolicy === "no-referrer");
check("download_revoke_not_immediate", revoked.length === 1 && scheduledDelay === PASS36_A102R11_OBJECT_URL_REVOKE_DELAY_MS);
scheduled?.();
check("download_revoke_scheduled", revoked.includes("blob:test-2"));

const roots = ["app", "components", "lib"];
const rows: Array<{ file: string; text: string }> = [];
function walk(relative: string) {
  for (const entry of fs.readdirSync(relative, { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) walk(child);
    else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(entry.name)) rows.push({ file: child, text: fs.readFileSync(child, "utf8") });
  }
}
roots.forEach(walk);
const createSinks = rows.filter((row) => row.text.includes("URL.createObjectURL") || row.text.includes("urlApi.createObjectURL"));
const revokeSinks = rows.filter((row) => row.text.includes("URL.revokeObjectURL") || row.text.includes("urlApi.revokeObjectURL"));
check("single_object_url_boundary", createSinks.length === 1 && createSinks[0].file.endsWith("client-pdf-blob-boundary.ts"), createSinks.map((row) => row.file));
check("single_revoke_boundary", revokeSinks.length === 1 && revokeSinks[0].file.endsWith("client-pdf-blob-boundary.ts"), revokeSinks.map((row) => row.file));
const lensSource = fs.readFileSync("components/search/VelmereIntelligenceSearchClient.tsx", "utf8");
check("lens_verifies_exact_pdf_headers", lensSource.includes("verifyLensPdfResponseBytes") && lensSource.includes("response.arrayBuffer()") && !lensSource.includes("const blob = await response.blob()"));
check("lens_verifies_account_header_pair_and_v3_readback", lensSource.includes("parseLensPdfAccountArtifactBinding") && lensSource.includes("verifyLensPdfAccountArtifactReadback") && lensSource.includes("fetchWithCustomerAuth"));
check("lens_account_save_copy_is_conditional", lensSource.includes("pdfPreview.accountArtifact ?") && lensSource.includes('data-lens-account-artifact-save="verified"'));
check("lens_immediate_close_revoke", lensSource.includes("pdfPreviewObjectUrlRef.current?.revoke()") && lensSource.includes("pdfPreviewObjectUrlRef.current = null"));
const auditSource = fs.readFileSync("components/account/AuditAccountMessagesClient.tsx", "utf8");
check("audit_uses_bounded_download_helper", auditSource.includes("triggerClientPdfDownload") && !auditSource.includes("window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0)"));
check("no_raw_blob_url_in_components", rows.filter((row) => row.file.startsWith("components/")).every((row) => !row.text.includes("createObjectURL") && !row.text.includes("revokeObjectURL")));

const status = failed === 0
  ? "PASS_A102R11_CLIENT_PDF_BYTE_BINDING_OBJECT_URL_LIFECYCLE_FAIL_CLOSED_NO_PROMOTION"
  : "FAIL_A102R11_CLIENT_PDF_BYTE_BINDING_OBJECT_URL_LIFECYCLE";
console.log(JSON.stringify({ status, checks, passed: checks - failed, failed }));
if (failed) process.exitCode = 1;
