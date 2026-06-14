import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
function check(label, condition) {
  checks.push({ label, passed: Boolean(condition) });
}
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}
function exists(file) {
  return fs.existsSync(path.join(root, file));
}

const lib = read("lib/security/pass1854-audit-page-benchmark.ts");
const page = read("components/security/SecurityAuditBenchmarkPage.tsx");
const route = read("app/[locale]/security/audits/benchmark/page.tsx");
const watch = read("components/security/SecurityAuditWatchPage.tsx");
const pricing = read("components/security/SecurityAuditPricingPage.tsx");
const doc = read("docs/progress/PASS1854_1893_AUDIT_BENCHMARK_PREMIUM_PAGE.md");

check("pass id exists", lib.includes("pass1854-audit-page-benchmark-standard"));
check("task count set", lib.includes("PASS1854_AUDIT_PAGE_BENCHMARK_TASKS = 64"));
check("OpenZeppelin benchmark referenced", lib.includes("OpenZeppelin"));
check("Trail of Bits benchmark referenced", lib.includes("Trail of Bits"));
check("CertiK benchmark referenced", lib.includes("CertiK"));
check("Consensys benchmark referenced", lib.includes("Consensys Diligence"));
check("pipeline includes submit scope evidence findings report", lib.includes("submit") && lib.includes("scope") && lib.includes("evidence") && lib.includes("findings") && lib.includes("report"));
check("scorecard metrics exist", lib.includes("Source freshness") || lib.includes("Source Freshness"));
check("no fake client logos gate", lib.includes("noFakeClientLogos: true"));
check("no certified safe gate", lib.includes("noCertifiedSafe: true"));
check("benchmark page data marker", page.includes("data-pass1854-audit-benchmark-page"));
check("benchmark page has request review CTA", page.includes("/security/audits#review-console"));
check("benchmark page has scorecard marker", page.includes("data-pass1854-scorecard"));
check("benchmark route exists", exists("app/[locale]/security/audits/benchmark/page.tsx") && route.includes("SecurityAuditBenchmarkPage"));
check("main audit page imports benchmark", watch.includes("buildAuditBenchmarkPage"));
check("main audit page links benchmark", watch.includes("/security/audits/benchmark"));
check("main audit page has benchmark preview marker", watch.includes("data-pass1854-audit-benchmark-preview"));
check("pricing imports benchmark", pricing.includes("buildAuditBenchmarkPage"));
check("pricing has benchmark strip", pricing.includes("data-pass1854-pricing-benchmark-strip"));
check("documentation exists", doc.includes("Audit Benchmark Premium Page"));
check("no copied branding boundary", lib.includes("noCopiedBranding: true"));
check("no investment advice boundary", lib.includes("noInvestmentAdvice: true"));

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) {
  console.log(`${entry.passed ? "PASS" : "FAIL"} ${entry.label}`);
}
if (failed.length > 0) {
  console.error(`\n${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nPASS ${checks.length}/${checks.length} checks`);
