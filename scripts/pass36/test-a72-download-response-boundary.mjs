import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PASS36_A72_DOWNLOAD_RESPONSE_BOUNDARY_ID,
  DownloadResponseBoundaryError,
  buildSafeDownloadDisposition,
} from "../../lib/security/download-response-boundary.ts";

const REVISION = "VELMERE_PASS36_A72R0_DOWNLOAD_RESPONSE_AND_CONTENT_DISPOSITION_TRUST_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, id);
};
const expectCode = (id, fn, code) => {
  try {
    fn();
    check(id, false, "unexpected_success");
  } catch (error) {
    check(id, error instanceof DownloadResponseBoundaryError && error.code === code, error instanceof Error ? error.message : String(error));
  }
};

check("boundary_id_exact", PASS36_A72_DOWNLOAD_RESPONSE_BOUNDARY_ID === "velmere.pass36.a72.download-response-boundary.v1");
const pdf = buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "Velmere BTC report", mediaKind: "pdf" });
check("pdf_content_type_exact", pdf.contentType === "application/pdf" && pdf.extension === "pdf");
check("pdf_attachment_exact", pdf.contentDisposition.startsWith('attachment; filename="Velmere-BTC-report.pdf"; filename*=UTF-8\'\''));
check("pdf_no_duplicate_extension", !pdf.filename.endsWith(".pdf.pdf"));
const inline = buildSafeDownloadDisposition({ disposition: "inline", filenameStem: "velmere-generated-logo", mediaKind: "svg" });
check("inline_svg_exact", inline.contentType === "image/svg+xml; charset=utf-8" && inline.contentDisposition.startsWith("inline;"));
const unicode = buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "Zażółć gęślą raport", mediaKind: "pdf" });
check("unicode_filename_preserved", unicode.filename.includes("Zażółć") && unicode.contentDisposition.includes("filename*=UTF-8''Za%C5%BC"));
check("ascii_fallback_only", /^[\x20-\x7E]+$/u.test(unicode.asciiFilename) && !/[\r\n]/u.test(unicode.contentDisposition));
const special = buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "O'Brien (final)* 100%", mediaKind: "json" });
check("rfc5987_specials_encoded", !special.contentDisposition.includes("O'Brien") && special.contentDisposition.includes("%27") === false && special.filename.endsWith(".json"));
const traversal = buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "../BTC\\USD/report", mediaKind: "markdown" });
check("path_separators_removed", !/[\\/]/u.test(traversal.filename) && traversal.filename.endsWith(".md"));
const reserved = buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "CON", mediaKind: "json" });
check("windows_reserved_avoided", reserved.filename.toLowerCase().startsWith("velmere-con."));
const dot = buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "..", mediaKind: "json", fallbackStem: "receipt" });
check("dot_segment_fallback", dot.filename === "receipt.json");
const long = buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "ą".repeat(400), mediaKind: "pdf" });
check("header_budget_bounded", Buffer.byteLength(long.contentDisposition, "utf8") <= 512 && Buffer.byteLength(long.filename, "utf8") <= 148);
for (const [kind, extension, contentType] of [
  ["json", "json", "application/json; charset=utf-8"],
  ["markdown", "md", "text/markdown; charset=utf-8"],
  ["png", "png", "image/png"],
  ["jpeg", "jpg", "image/jpeg"],
  ["gif", "gif", "image/gif"],
  ["webp", "webp", "image/webp"],
  ["avif", "avif", "image/avif"],
  ["ico", "ico", "image/x-icon"],
]) {
  const result = buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "sample", mediaKind: kind });
  check(`media_${kind}`, result.extension === extension && result.contentType === contentType && result.filename === `sample.${extension}`);
}
expectCode("crlf_rejected", () => buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "report\r\nX-Test: yes", mediaKind: "pdf" }), "download_filename_control_character");
expectCode("nul_rejected", () => buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "report\0evil", mediaKind: "pdf" }), "download_filename_control_character");
expectCode("bidi_rejected", () => buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "report\u202Efdp.exe", mediaKind: "pdf" }), "download_filename_bidi_character");
expectCode("invalid_disposition_rejected", () => buildSafeDownloadDisposition({ disposition: "form-data", filenameStem: "x", mediaKind: "pdf" }), "download_disposition_invalid");
expectCode("invalid_media_rejected", () => buildSafeDownloadDisposition({ disposition: "attachment", filenameStem: "x", mediaKind: "html" }), "download_media_kind_invalid");

const root = process.cwd();
const coveredFiles = [
  "lib/security/file-content-signatures.ts",
  "lib/server/search-route-modules/lens-report.ts",
  "lib/server/market-integrity-route-modules/evidence-export.ts",
  "lib/server/market-integrity-route-modules/report-pdf.ts",
  "lib/server/market-integrity-route-modules/asset-logo.ts",
  "lib/server/lazy-route-modules/security--audit-watch--support-handoff.ts",
  "lib/server/lazy-route-modules/security--audit-watch--customer-safe-report.ts",
  "lib/server/lazy-route-modules/account--customer-artifact.ts",
  "lib/server/lazy-route-modules/security--audit-watch--delivery-receipt.ts",
  "lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts",
  "lib/server/security-route-modules/export.ts",
];
for (const file of coveredFiles) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  check(`covered:${file}`, text.includes("download-response-boundary") && text.includes("contentDisposition"));
}
const productionRoots = ["app", "lib"];
const assignments = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile() && /\.(?:ts|tsx|js|mjs|cjs)$/u.test(entry.name)) {
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      const text = fs.readFileSync(absolute, "utf8");
      for (const [index, line] of text.split(/\r?\n/u).entries()) {
        if (/['"]content-disposition['"]\s*:/u.test(line)) assignments.push({ relative, line: index + 1, text: line.trim() });
      }
    }
  }
}
for (const directory of productionRoots) walk(path.join(root, directory));
check("assignment_count_complete", assignments.length === 12, assignments);
check("all_assignments_centralized", assignments.every((row) => row.text.includes("contentDisposition")), assignments.filter((row) => !row.text.includes("contentDisposition")));
const sourceText = coveredFiles.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
check("legacy_encode_uri_removed", !sourceText.includes("filename*=UTF-8''${encodeURIComponent"));
check("legacy_dynamic_filename_templates_removed", !/content-disposition[^\n]*filename=\\?"?\$\{/u.test(sourceText));

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a72.download-response-boundary-test.v1",
  revisionId: REVISION,
  counts: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
  coveredProductionFiles: coveredFiles.length,
  contentDispositionAssignments: assignments.length,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
