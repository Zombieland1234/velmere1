import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const lib = () => read("lib/security/pass1574-audit-sample-report.ts");
const page = () => read("components/security/SecurityAuditSampleReportPage.tsx");
const auditsPage = () => read("components/security/SecurityAuditWatchPage.tsx");
const api = () => read("app/api/security/audit-watch/route.ts");

const checks = [
  ["PASS1574 lib exists", () => exists("lib/security/pass1574-audit-sample-report.ts")],
  ["PASS1574 id exported", () => lib().includes("PASS1574_AUDIT_SAMPLE_REPORT_ID")],
  ["96 task standard recorded", () => lib().includes("PASS1574_AUDIT_SAMPLE_REPORT_TASKS = 96")],
  ["sample report builder exists", () => lib().includes("buildAuditSampleReport")],
  ["PL EN DE sample copy", () => ["pl:", "en:", "de:"].every((needle) => lib().includes(needle))],
  ["sample input includes audit URL", () => lib().includes("https://example.com/public-audit.pdf")],
  ["safe release gate flags", () => ["noCertifiedSafe", "noExploitInstructions", "noCustody", "noSeedPhrase", "noInvestmentAdvice"].every((needle) => lib().includes(needle))],
  ["review packages implemented", () => ["Free Scan", "Basic Review", "Pro Review", "Advanced Review"].every((needle) => lib().includes(needle))],
  ["sample page component exists", () => exists("components/security/SecurityAuditSampleReportPage.tsx")],
  ["sample route exists", () => exists("app/[locale]/security/audits/sample/page.tsx")],
  ["sample page has PASS marker", () => page().includes("data-pass1574-audit-sample-report")],
  ["sample page has confidence cap", () => page().includes("confidence cap") || page().includes("report.verdict.confidence")],
  ["sample page has findings table", () => page().includes("Findings table")],
  ["sample page has Lens PDF outline", () => page().includes("Lens PDF outline")],
  ["sample page has Shield Map flow", () => page().includes("Shield Map flow")],
  ["audit watch links sample", () => auditsPage().includes("/security/audits/sample") && auditsPage().includes("data-pass1574-sample-report-link")],
  ["audit watch embeds sample preview", () => auditsPage().includes("data-pass1574-sample-preview") && auditsPage().includes("sampleReport.sections")],
  ["API imports PASS1574", () => api().includes("PASS1574_AUDIT_SAMPLE_REPORT_ID")],
  ["API returns sampleReport", () => api().includes("sampleReport") && api().includes("buildAuditSampleReport")],
  ["API header exposes sample report", () => api().includes("x-velmere-audit-sample-report")],
  ["static route smoke includes sample route", () => read("scripts/smoke-routes-static.mjs").includes("/security/audits/sample")],
  ["progress doc exists", () => exists("docs/progress/PASS1574_1613_AUDIT_SAMPLE_REPORT.md")],
  ["progress doc keeps next pass", () => read("docs/progress/PASS1574_1613_AUDIT_SAMPLE_REPORT.md").includes("PASS1614")],
  ["package has verifier", () => read("package.json").includes("verify:pass1574-1613-audit-sample-report")],
  ["no certified safe UI claim", () => !page().includes("Certified Safe") && !auditsPage().includes("Certified Safe")],
  ["no exploit instructions UI", () => !page().toLowerCase().includes("exploit instructions") && !auditsPage().toLowerCase().includes("exploit instructions")],
];

const failures = [];
for (const [label, fn] of checks) {
  let ok = false;
  try { ok = Boolean(fn()); } catch { ok = false; }
  if (!ok) failures.push(label);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

if (failures.length) {
  console.error(`\nPASS1574–1613 audit sample report failed ${failures.length}/${checks.length}`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`\nPASS1574–1613 audit sample report passed ${checks.length}/${checks.length}`);
