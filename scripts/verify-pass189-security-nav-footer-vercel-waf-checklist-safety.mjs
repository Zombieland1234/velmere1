import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const required = [
  "lib/security/security-operations-checklist.ts",
  "components/security/SecurityOperationsChecklistPanel.tsx",
  "app/api/security/operations-checklist/route.ts",
  "docs/security/VERCEL_ENV_SECURITY_CHECKLIST.md",
  "docs/security/VERCEL_WAF_RULES_DRAFT.md",
  "docs/security/SECURITY_RUNTIME_QA_CHECKLIST.md",
  "VELMERE_PASS189_SECURITY_NAV_FOOTER_VERCEL_WAF_CHECKLIST_REPORT.md",
  "VELMERE_PASS189_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const checklist = read("lib/security/security-operations-checklist.ts");
const checklistPanel = read("components/security/SecurityOperationsChecklistPanel.tsx");
const securityPage = read("components/security/SecurityTrustPage.tsx");
const checklistApi = read("app/api/security/operations-checklist/route.ts");
const navbar = read("components/Navbar.tsx");
const footer = read("components/Footer.tsx");
const css = read("app/globals.css");
const envDoc = read("docs/security/VERCEL_ENV_SECURITY_CHECKLIST.md");
const wafDoc = read("docs/security/VERCEL_WAF_RULES_DRAFT.md");
const qaDoc = read("docs/security/SECURITY_RUNTIME_QA_CHECKLIST.md");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS189_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "securityChecklistItems",
  "wafRuleDrafts",
  "buildSecurityOperationsChecklistSnapshot",
  "UPSTASH_REDIS_REST_URL",
  "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
  "waf_rules",
  "runtime_qa",
]) {
  if (!checklist.includes(token)) errors.push(`security-operations-checklist.ts missing token: ${token}`);
}

for (const token of [
  "SecurityOperationsChecklistPanel",
  "buildSecurityOperationsChecklistSnapshot",
  "vso-shell",
  "WAF drafts",
]) {
  if (!checklistPanel.includes(token) && !css.includes(token)) errors.push(`SecurityOperationsChecklistPanel/CSS missing token: ${token}`);
}

for (const token of ["SecurityOperationsChecklistPanel", "<SecurityOperationsChecklistPanel locale={safeLocale} />"]) {
  if (!securityPage.includes(token)) errors.push(`SecurityTrustPage missing PASS189 checklist token: ${token}`);
}

for (const token of [
  "applyApiAbuseShield",
  "buildSecurityOperationsChecklistSnapshot",
  "buildSecurityReadinessSnapshot",
  "buildDurableRateLimitReadiness",
  "buildSecurityAdminGateReadiness",
  "buildSecurityEventAppendReadiness",
]) {
  if (!checklistApi.includes(token)) errors.push(`security operations API missing token: ${token}`);
}

for (const token of [
  "security: \"Security\"",
  "security: \"Sicherheit\"",
  'href: "/security"',
  "labels.security",
]) {
  if (!navbar.includes(token)) errors.push(`Navbar missing security nav token: ${token}`);
}

for (const token of [
  '{ href: "/security", label: "Security" }',
  "Velmère Security means layered protection",
  "Security Velmère to warstwy ochrony",
  "Velmère Security bedeutet Schutzschichten",
]) {
  if (!footer.includes(token)) errors.push(`Footer missing PASS189 security link/copy token: ${token}`);
}

for (const token of [
  "PASS189 · Security operations checklist",
  ".vso-shell",
  ".vso-card",
  ".vso-status",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS189 CSS token: ${token}`);
}

for (const token of ["UPSTASH_REDIS_REST_URL", "VELMERE_SECURITY_ADMIN_TOKEN_SHA256", "GET /api/security/readiness"]) {
  if (!envDoc.includes(token)) errors.push(`Vercel env checklist missing token: ${token}`);
}

for (const token of ["Block scanner paths", "Rate-limit public API", "Protect admin/security exports"]) {
  if (!wafDoc.includes(token)) errors.push(`WAF rules draft missing token: ${token}`);
}

for (const token of ["/security", "/admin/security", "/api/security/export", "No raw IP"]) {
  if (!qaDoc.includes(token)) errors.push(`Runtime QA checklist missing token: ${token}`);
}

for (const area of [
  "Security operations checklist",
  "Vercel env checklist",
  "Vercel WAF rules draft",
  "Security nav/footer integration",
  "Całość launch-ready",
]) {
  if (!matrix.includes(area)) errors.push(`PASS189 full matrix missing area: ${area}`);
}

const publicSurface = `${navbar}\n${footer}\n${securityPage}\n${checklistPanel}\n${checklistApi}`.toLowerCase();
for (const forbidden of [
  "najlepsze zabezpieczenia świata",
  "nie do zhakowania",
  "gwarantowane bezpieczeństwo",
  "100% secure",
  "unhackable",
  "hack proof",
  "world's best security",
  "best security in the world",
  "military-grade security",
  "bank-level guaranteed",
]) {
  if (publicSurface.includes(forbidden)) errors.push(`Unsafe public security overclaim found in PASS189 surface: ${forbidden}`);
}

for (const token of ["verify-pass189-security-nav-footer-vercel-waf-checklist-safety.mjs", "PASS189"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS189 marker: ${token}`);
}

if (checklistPanel.includes("window.") || checklistPanel.includes("document.")) {
  errors.push("SecurityOperationsChecklistPanel must stay server-safe; no window/document usage.");
}

if (errors.length) {
  console.error("PASS189 security nav/footer/Vercel WAF checklist safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS189 security nav/footer/Vercel WAF checklist safety OK");
