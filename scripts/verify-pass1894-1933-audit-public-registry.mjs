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

const libPath = "lib/security/pass1894-audit-public-registry.ts";
const pagePath = "components/security/SecurityAuditRegistryPage.tsx";
const routePath = "app/[locale]/security/audits/registry/page.tsx";
const apiPath = "app/api/security/audit-watch/registry/route.ts";
const watchPath = "components/security/SecurityAuditWatchPage.tsx";
const mainApiPath = "app/api/security/audit-watch/route.ts";
const smokePath = "scripts/smoke-routes-static.mjs";
const docPath = "docs/progress/PASS1894_1933_AUDIT_PUBLIC_REGISTRY.md";
const pkgPath = "package.json";

const lib = read(libPath);
const page = read(pagePath);
const route = read(routePath);
const api = read(apiPath);
const watch = read(watchPath);
const mainApi = read(mainApiPath);
const smoke = read(smokePath);
const doc = read(docPath);
const pkg = read(pkgPath);

check("pass id exists", lib.includes("pass1894-audit-watch-public-registry"));
check("task count set", lib.includes("PASS1894_AUDIT_PUBLIC_REGISTRY_TASKS = 92"));
check("registry statuses exist", ["audit_verified", "scope_mismatch", "audit_outdated", "changed_after_audit", "needs_evidence", "private_disclosure"].every((item) => lib.includes(item)));
check("registry has sample records", ["Velmère sample token", "Proxy upgrade review", "Missing evidence project", "Disclosure guarded finding", "Bridge scope mismatch", "Liquidity lock watch"].every((item) => lib.includes(item)));
check("registry links to report status", lib.includes("publicReportRoute") && page.includes("Status"));
check("registry links to full export", lib.includes("exportRoute") && page.includes("Export"));
check("release gate no fake logos", lib.includes("noFakeClientLogos: true"));
check("release gate no certified safe", lib.includes("noCertifiedSafe: true"));
check("release gate no no-risk claim", lib.includes("noNoRiskClaim: true"));
check("release gate no public exploit", lib.includes("noPublicExploitInstructions: true"));
check("registry page has search marker", page.includes("data-pass1894-registry-search"));
check("registry page has listing marker", page.includes("data-pass1894-registry-listing"));
check("registry page has methodology marker", page.includes("data-pass1894-methodology"));
check("registry page has publication boundary", page.includes("data-pass1894-publication-boundary"));
check("route exists and renders component", exists(routePath) && route.includes("SecurityAuditRegistryPage"));
check("api route exists", exists(apiPath) && api.includes("x-velmere-audit-public-registry"));
check("main audit page links registry", watch.includes("/security/audits/registry") && watch.includes("data-pass1894-registry-preview"));
check("main api exposes registry", mainApi.includes("registryRoute") && mainApi.includes("buildAuditRegistryDashboard"));
check("smoke route includes registry", smoke.includes('"/security/audits/registry"'));
check("documentation exists", doc.includes("Audit Watch Public Registry"));
check("package script exists", pkg.includes("verify:pass1894-1933-audit-public-registry"));

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) {
  console.log(`${entry.passed ? "PASS" : "FAIL"} ${entry.label}`);
}
if (failed.length > 0) {
  console.error(`\n${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nPASS ${checks.length}/${checks.length} checks`);
