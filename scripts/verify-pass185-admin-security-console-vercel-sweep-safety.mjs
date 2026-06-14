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
  "lib/security/security-alert-rules.ts",
  "components/admin/SecurityConsolePanel.tsx",
  "app/api/security/alerts/route.ts",
  "app/api/security/export/route.ts",
  "app/[locale]/admin/security/page.tsx",
  "VELMERE_PASS185_ADMIN_SECURITY_CONSOLE_VERCEL_SWEEP_REPORT.md",
  "VELMERE_PASS185_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const rules = read("lib/security/security-alert-rules.ts");
const consolePanel = read("components/admin/SecurityConsolePanel.tsx");
const adminPage = read("app/[locale]/admin/security/page.tsx");
const alertsRoute = read("app/api/security/alerts/route.ts");
const exportRoute = read("app/api/security/export/route.ts");
const readinessRoute = read("app/api/security/readiness/route.ts");
const abuseRoute = read("app/api/security/abuse-shield/route.ts");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS185_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "SecurityAlertRule",
  "evaluateSecurityAlertRules",
  "buildSecurityAlertSnapshot",
  "blocked_event_spike",
  "provider_fallback_seen",
  "waf_not_configured",
]) {
  if (!rules.includes(token)) errors.push(`security-alert-rules.ts missing token: ${token}`);
}

for (const token of [
  "SecurityConsolePanel",
  "buildSecurityAlertSnapshot",
  "buildSecurityEventLedgerSnapshot",
  "buildDurableRateLimitReadiness",
  "asc-shell",
]) {
  if (!consolePanel.includes(token) && !css.includes(token)) errors.push(`SecurityConsolePanel/CSS missing token: ${token}`);
}

for (const token of [
  "Velmère Admin Security Console",
  "robots",
  "index: false",
  "SecurityConsolePanel",
]) {
  if (!adminPage.includes(token)) errors.push(`admin security page missing token: ${token}`);
}

for (const token of ["applyApiAbuseShield", "buildSecurityAlertSnapshot", "securityJson"]) {
  if (!alertsRoute.includes(token)) errors.push(`security alerts route missing token: ${token}`);
}

for (const token of [
  "security_export_safe_preview",
  "buildSecurityAlertSnapshot",
  "buildSecurityEventLedgerSnapshot",
  "buildSecurityReadinessSnapshot",
  "buildDurableRateLimitReadiness",
  "no raw IP addresses",
  "no raw query payloads",
  "no secrets",
  "content-disposition",
]) {
  if (!exportRoute.includes(token)) errors.push(`security export route missing token: ${token}`);
}

for (const token of ["alertRules", "buildSecurityAlertSnapshot"]) {
  if (!readinessRoute.includes(token)) errors.push(`security readiness route missing PASS185 alert token: ${token}`);
  if (!abuseRoute.includes(token)) errors.push(`abuse shield route missing PASS185 alert token: ${token}`);
}

for (const token of [
  "PASS185 · Admin Security Console",
  ".asc-shell",
  ".asc-card",
  ".asc-link",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS185 marker: ${token}`);
}

for (const area of [
  "Vercel potential error sweep",
  "Admin security console",
  "Security alert rules",
  "Security safe export",
  "Całość launch-ready",
]) {
  if (!matrix.includes(area)) errors.push(`PASS185 full matrix missing area: ${area}`);
}

const exportLower = exportRoute.toLowerCase();
for (const forbidden of ["raw ip:", "raw query:", "secret:", "process.env.", "authorization bearer"]) {
  if (exportLower.includes(forbidden)) errors.push(`Unsafe export marker found: ${forbidden}`);
}

const publicSurface = `${rules}\n${consolePanel}\n${adminPage}\n${alertsRoute}\n${exportRoute}\n${readinessRoute}\n${abuseRoute}`.toLowerCase();
for (const forbidden of ["unhackable", "hack proof", "guaranteed secure"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Forbidden security wording found: ${forbidden}`);
}

for (const token of ["verify-pass185-admin-security-console-vercel-sweep-safety.mjs", "PASS185"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS185 marker: ${token}`);
}

if (consolePanel.includes("window.") || consolePanel.includes("document.")) {
  errors.push("SecurityConsolePanel must stay server-safe; no window/document usage.");
}

if (errors.length) {
  console.error("PASS185 admin security console / Vercel sweep safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS185 admin security console / Vercel sweep safety OK");
