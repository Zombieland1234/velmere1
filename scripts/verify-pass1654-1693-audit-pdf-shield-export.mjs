import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [
  ["PASS1654 export lib exists", () => exists("lib/security/pass1654-audit-pdf-shield-export.ts")],
  ["PASS1654 constants present", () => read("lib/security/pass1654-audit-pdf-shield-export.ts").includes("PASS1654_AUDIT_PDF_SHIELD_EXPORT_ID") && read("lib/security/pass1654-audit-pdf-shield-export.ts").includes("PASS1654_AUDIT_PDF_SHIELD_EXPORT_TASKS")],
  ["export payload builder present", () => read("lib/security/pass1654-audit-pdf-shield-export.ts").includes("buildAuditReportExportPayload")],
  ["payload contains Lens PDF sections", () => read("lib/security/pass1654-audit-pdf-shield-export.ts").includes("pdfSections") && read("lib/security/pass1654-audit-pdf-shield-export.ts").includes("executiveSummary")],
  ["payload contains Shield Map graph", () => read("lib/security/pass1654-audit-pdf-shield-export.ts").includes("graphNodes") && read("lib/security/pass1654-audit-pdf-shield-export.ts").includes("graphEdges")],
  ["release gate blocks unsafe claims", () => read("lib/security/pass1654-audit-pdf-shield-export.ts").includes("noCertifiedSafe") && read("lib/security/pass1654-audit-pdf-shield-export.ts").includes("noExploitInstructions")],
  ["export page route exists", () => exists("app/[locale]/security/audits/export/[id]/page.tsx")],
  ["export page component exists", () => exists("components/security/SecurityAuditExportPage.tsx")],
  ["export page has PASS marker", () => read("components/security/SecurityAuditExportPage.tsx").includes("data-pass1654-audit-pdf-shield-export")],
  ["export page renders Lens payload", () => read("components/security/SecurityAuditExportPage.tsx").includes("data-pass1654-lens-pdf-full-payload")],
  ["export page renders Shield Map payload", () => read("components/security/SecurityAuditExportPage.tsx").includes("data-pass1654-shield-map-full-payload")],
  ["report status links full export", () => read("components/security/SecurityAuditReportPage.tsx").includes("data-pass1654-full-export-link") && read("components/security/SecurityAuditReportPage.tsx").includes("data-pass1654-report-export-preview")],
  ["Audit Watch page previews full export", () => read("components/security/SecurityAuditWatchPage.tsx").includes("data-pass1654-audit-export-preview") && read("components/security/SecurityAuditWatchPage.tsx").includes("/security/audits/export/sample")],
  ["review console links full export", () => read("components/security/SecurityAuditReviewConsole.tsx").includes("data-pass1654-console-full-export")],
  ["audit report API returns export payload", () => read("app/api/security/audit-watch/report/route.ts").includes("exportPayload") && read("app/api/security/audit-watch/report/route.ts").includes("lensPdfPayload") && read("app/api/security/audit-watch/report/route.ts").includes("shieldMapPayload")],
  ["audit intake API returns export payload", () => read("app/api/security/audit-watch/route.ts").includes("sampleExportPayload") && read("app/api/security/audit-watch/route.ts").includes("exportRoute")],
  ["static smoke includes export route", () => read("scripts/smoke-routes-static.mjs").includes("/security/audits/export/sample") && read("scripts/smoke-routes-static.mjs").includes("security/audits/export/[id]")],
  ["docs progress exists", () => exists("docs/progress/PASS1654_1693_AUDIT_PDF_SHIELD_EXPORT.md")],
  ["package has verifier", () => read("package.json").includes("verify:pass1654-1693-audit-pdf-shield-export")],
];

const failures = [];
for (const [label, fn] of checks) {
  try {
    if (!fn()) failures.push(label);
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`PASS1654-1693 verifier failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS1654-1693 verifier PASS (${checks.length}/${checks.length})`);
