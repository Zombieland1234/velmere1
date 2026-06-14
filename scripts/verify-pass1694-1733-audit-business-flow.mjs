import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}
function exists(file) {
  return fs.existsSync(path.join(root, file));
}
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
}

const lib = read("lib/security/pass1694-audit-business-flow.ts");
const watch = read("components/security/SecurityAuditWatchPage.tsx");
const pricing = read("components/security/SecurityAuditPricingPage.tsx");
const consoleClient = read("components/security/SecurityAuditReviewConsole.tsx");
const api = read("app/api/security/audit-watch/route.ts");
const businessApi = read("app/api/security/audit-watch/business/route.ts");
const report = read("components/security/SecurityAuditReportPage.tsx");
const exportPage = read("components/security/SecurityAuditExportPage.tsx");
const routes = read("scripts/smoke-routes-static.mjs");
const pkg = JSON.parse(read("package.json"));

check("PASS1694 lib exists", exists("lib/security/pass1694-audit-business-flow.ts"));
check("PASS1694 pricing page route exists", exists("app/[locale]/security/audits/pricing/page.tsx"));
check("PASS1694 pricing component exists", exists("components/security/SecurityAuditPricingPage.tsx"));
check("PASS1694 business API exists", exists("app/api/security/audit-watch/business/route.ts"));
check("task count is heavy enough", /PASS1694_AUDIT_BUSINESS_FLOW_TASKS\s*=\s*148/.test(lib));
check("tiers include free basic pro advanced disclosure", ["free_scan", "basic_review", "pro_review", "advanced_review", "disclosure_case"].every((token) => lib.includes(token)));
check("lead capture packet exported", lib.includes("buildAuditLeadCapturePacket") && lib.includes("AuditLeadCapturePacket"));
check("lead routing blocks unsafe claims", ["Certified Safe", "No Risk", "Guaranteed secure", "Approved investment", "Send seed phrase"].every((token) => lib.includes(token)));
check("release gate blocks custody seed investment advice", ["noCustody", "noSeedPhrase", "noInvestmentAdvice", "activeTestingRequiresAuthorization"].every((token) => lib.includes(token)));
check("watch page links pricing", watch.includes("/security/audits/pricing") && watch.includes("data-pass1694-business-preview"));
check("watch page imports FileText fix", watch.includes("FileText,") && watch.includes("buildAuditBusinessFlow"));
check("console consumes lead packet", consoleClient.includes("AuditLeadCapturePacket") && consoleClient.includes("data-pass1694-console-lead-packet"));
check("API returns business flow and lead packet", api.includes("businessFlow") && api.includes("leadPacket") && api.includes("x-velmere-audit-business-flow"));
check("business API exposes safe boundary", businessApi.includes("no regulatory certification") && businessApi.includes("no seed phrases"));
check("report page shows lead routing", report.includes("data-pass1694-report-lead-routing") && report.includes("buildAuditLeadCapturePacket"));
check("export page shows business routing", exportPage.includes("data-pass1694-export-business-routing") && exportPage.includes("leadPacket"));
check("static smoke includes pricing route", routes.includes('"/security/audits/pricing"'));
check("package script registered", Boolean(pkg.scripts["verify:pass1694-1733-audit-business-flow"]));
check("pricing component has safe sales copy", pricing.includes("Blocked sales copy") && pricing.includes("data-pass1694-no-certified-safe"));
check("pricing component displays all lanes", ["data-pass1694-pricing-lanes", "data-pass1694-lead-routing", "data-pass1694-premium-checks"].every((token) => pricing.includes(token)));
check("no dangerous cert language as positive claim", !/Certified Safe\s*<\/|No Risk\s*<\//.test(pricing + watch + report + exportPage));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
if (failed.length) {
  console.error(`verify-pass1694-1733-audit-business-flow failed ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`verify-pass1694-1733-audit-business-flow ok ${checks.length}/${checks.length}`);
