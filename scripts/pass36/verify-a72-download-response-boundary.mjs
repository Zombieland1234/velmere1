import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (value) => fs.readFileSync(path.join(root, value), "utf8");
const json = (value) => JSON.parse(read(value));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
const REVISION = "VELMERE_PASS36_A72R0_DOWNLOAD_RESPONSE_AND_CONTENT_DISPOSITION_TRUST_BOUNDARY_HARDENING";
const PARENT = "VELMERE_PASS36_A71R0_RELEASE_SIGNATURE_AND_TRUST_ANCHOR_BOUNDARY_HARDENING";

const policy = json("config/pass36/a72-download-response-and-content-disposition-trust-boundary.json");
const state = json("config/pass36/a72-current-state.json");
const receipt = json("config/pass36/a72-download-response-boundary-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const pkg = json("package.json");
const active = read("VELMERE_ACTIVE_PASS.txt").trim();
const boundary = read("lib/security/download-response-boundary.ts");
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

check("revision:policy", policy.revisionId === REVISION && policy.parentRevisionId === PARENT);
check("revision:state", state.revisionId === REVISION && state.parentRevisionId === PARENT);
check("revision:current", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("revision:active", active === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("current:a72", current.downloadResponseTrustBoundaryRevisionId === REVISION && current.downloadResponseTrustBoundaryImplemented === true);
check("current:a71-retained", current.releaseSignatureTrustBoundaryRevisionId === PARENT && current.releaseSignatureTrustBoundaryImplemented === true);
check("policy:central-builder", policy.requirements?.singleCentralContentDispositionBuilder === true);
check("policy:control-bidi", policy.requirements?.crlfAndControlCharactersRejected === true && policy.requirements?.bidiControlsRejected === true);
check("policy:path-reserved", policy.requirements?.pathSeparatorsRemoved === true && policy.requirements?.windowsReservedNamesAvoided === true);
check("policy:rfc5987", policy.requirements?.asciiFallbackAndRfc5987FilenameStarRequired === true && policy.requirements?.rfc5987SpecialCharactersStrictlyEncoded === true);
check("policy:media-binding", policy.requirements?.mediaKindControlsExtensionAndContentType === true);
check("policy:budgets", policy.requirements?.filenameAndHeaderBudgetsEnforced === true);
check("policy:coverage", policy.coveredProductionFiles === 11 && policy.coveredContentDispositionAssignments === 12);
check("boundary:id", boundary.includes("PASS36_A72_DOWNLOAD_RESPONSE_BOUNDARY_ID") && boundary.includes("velmere.pass36.a72.download-response-boundary.v1"));
check("boundary:closed-media", boundary.includes("MEDIA_PROFILES") && boundary.includes('pdf: { extension: "pdf"') && boundary.includes('json: { extension: "json"'));
check("boundary:control", boundary.includes("download_filename_control_character") && boundary.includes("download_filename_bidi_character"));
check("boundary:reserved", boundary.includes("WINDOWS_RESERVED_BASENAMES") && boundary.includes("avoidReservedBasename"));
check("boundary:rfc5987", boundary.includes("encodeRfc5987") && boundary.includes("[!'()*]"));
check("boundary:header-budget", boundary.includes("MAX_CONTENT_DISPOSITION_BYTES") && boundary.includes("download_filename_header_budget_exceeded"));
check("boundary:no-caller-extension", !boundary.includes("readonly extension:") || boundary.includes("SafeDownloadDisposition"));
for (const file of coveredFiles) {
  const text = read(file);
  check(`covered:${file}`, text.includes("download-response-boundary") && text.includes("contentDisposition"));
}
const assignments = [];
for (const base of ["app", "lib"]) {
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && /\.(?:ts|tsx|js|mjs|cjs)$/u.test(entry.name)) {
        const relative = path.relative(root, absolute).split(path.sep).join("/");
        const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/u);
        for (const [index, line] of lines.entries()) {
          if (/['"]content-disposition['"]\s*:/u.test(line)) assignments.push({ relative, line: index + 1, text: line.trim() });
        }
      }
    }
  };
  walk(path.join(root, base));
}
check("coverage:assignment-count", assignments.length === 12, assignments);
check("coverage:all-central", assignments.every((row) => row.text.includes("contentDisposition")), assignments.filter((row) => !row.text.includes("contentDisposition")));
const allCovered = coveredFiles.map(read).join("\n");
check("coverage:no-legacy-uri", !allCovered.includes("filename*=UTF-8''${encodeURIComponent"));
check("coverage:no-dynamic-template", !/content-disposition[^\n]*filename=\\?"?\$\{/u.test(allCovered));
check("test:all-pass", receipt.counts?.total >= 40 && receipt.counts?.passed === receipt.counts.total && receipt.counts.failed === 0, receipt.counts);
for (const id of [
  "crlf_rejected",
  "bidi_rejected",
  "path_separators_removed",
  "windows_reserved_avoided",
  "unicode_filename_preserved",
  "header_budget_bounded",
  "all_assignments_centralized",
  "legacy_encode_uri_removed"
]) check(`test:${id}`, receipt.checks?.some((row) => row.id === id && row.pass === true));
check("package:test", pkg.scripts?.["test:pass36:a72"] === "node --experimental-strip-types scripts/pass36/test-a72-download-response-boundary.mjs");
check("package:verify", pkg.scripts?.["verify:pass36:a72"] === "node scripts/pass36/verify-a72-download-response-boundary.mjs");
check("package:metadata", pkg.velmereDownloadResponseTrustBoundaryPass === REVISION);
check("truth:no-browser-credit", state.browserContentDispositionCompatibilityExecuted === false && state.productionDownloadRoutesExecuted === false);
check("truth:no-release-credit", state.exactFinalByteBuildExecuted === false && state.criticalOfflineGatePassed === false && state.realStagingExecuted === false && state.saleEnabled === false && state.liveProven === false);

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a72.download-response-boundary-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  assignments: assignments.length,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
