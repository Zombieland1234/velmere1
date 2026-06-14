import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [
  ["PASS1614 queue lib exists", () => exists("lib/security/pass1614-audit-report-queue.ts")],
  ["PASS1614 constants present", () => read("lib/security/pass1614-audit-report-queue.ts").includes("PASS1614_AUDIT_REPORT_QUEUE_ID") && read("lib/security/pass1614-audit-report-queue.ts").includes("PASS1614_AUDIT_REPORT_QUEUE_TASKS")],
  ["queue record builder present", () => read("lib/security/pass1614-audit-report-queue.ts").includes("buildAuditReportQueueRecord")],
  ["public page builder present", () => read("lib/security/pass1614-audit-report-queue.ts").includes("buildAuditReportPublicPage")],
  ["admin inbox builder present", () => read("lib/security/pass1614-audit-report-queue.ts").includes("buildAuditAdminInbox")],
  ["PDF manifest builder present", () => read("lib/security/pass1614-audit-report-queue.ts").includes("buildAuditReportPdfManifest")],
  ["public status component exists", () => exists("components/security/SecurityAuditReportPage.tsx")],
  ["public status component has no certified safe marker", () => read("components/security/SecurityAuditReportPage.tsx").includes("data-pass1614-no-certified-safe")],
  ["public status route exists", () => exists("app/[locale]/security/audits/report/[id]/page.tsx")],
  ["admin inbox component exists", () => exists("components/security/SecurityAuditAdminInbox.tsx")],
  ["admin inbox route exists", () => exists("app/[locale]/admin/security/audit-inbox/page.tsx")],
  ["admin inbox keeps security gate", () => read("app/[locale]/admin/security/audit-inbox/page.tsx").includes("buildSecurityAdminGateReadiness") && read("app/[locale]/admin/security/audit-inbox/page.tsx").includes("SecurityConsoleLockedPanel")],
  ["audit report API exists", () => exists("app/api/security/audit-watch/report/route.ts")],
  ["main audit API returns queue record", () => read("app/api/security/audit-watch/route.ts").includes("queueRecord") && read("app/api/security/audit-watch/route.ts").includes("PASS1614_AUDIT_REPORT_QUEUE_ID")],
  ["console links public report and admin inbox", () => read("components/security/SecurityAuditReviewConsole.tsx").includes("data-pass1614-console-queue-record") && read("components/security/SecurityAuditReviewConsole.tsx").includes("admin inbox")],
  ["audit watch page links report status", () => read("components/security/SecurityAuditWatchPage.tsx").includes("data-pass1614-report-status-link") && read("components/security/SecurityAuditWatchPage.tsx").includes("data-pass1614-report-queue-preview")],
  ["static smoke includes report and inbox routes", () => read("scripts/smoke-routes-static.mjs").includes("/security/audits/report/sample") && read("scripts/smoke-routes-static.mjs").includes("/admin/security/audit-inbox")],
  ["release blocks exploit detail", () => read("lib/security/pass1614-audit-report-queue.ts").includes("no public exploit detail") || read("components/security/SecurityAuditReportPage.tsx").includes("without exploit instructions")],
  ["release blocks certified safe", () => read("lib/security/pass1614-audit-report-queue.ts").includes("Certified Safe") && read("components/security/SecurityAuditReportPage.tsx").includes("blocked: {claim}")],
  ["docs progress exists", () => exists("docs/progress/PASS1614_1653_AUDIT_REPORT_QUEUE.md")],
  ["package has verifier", () => read("package.json").includes("verify:pass1614-1653-audit-report-queue")],
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
  console.error(`PASS1614-1653 verifier failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS1614-1653 verifier PASS (${checks.length}/${checks.length})`);
