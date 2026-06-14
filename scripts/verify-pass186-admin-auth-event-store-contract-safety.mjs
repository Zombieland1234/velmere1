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
  "lib/security/security-admin-auth.ts",
  "lib/security/security-event-store-contract.ts",
  "components/admin/SecurityConsoleLockedPanel.tsx",
  "app/api/security/event-store/route.ts",
  "VELMERE_PASS186_ADMIN_AUTH_EVENT_STORE_CONTRACT_REPORT.md",
  "VELMERE_PASS186_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const adminAuth = read("lib/security/security-admin-auth.ts");
const eventStore = read("lib/security/security-event-store-contract.ts");
const lockedPanel = read("components/admin/SecurityConsoleLockedPanel.tsx");
const consolePanel = read("components/admin/SecurityConsolePanel.tsx");
const adminPage = read("app/[locale]/admin/security/page.tsx");
const eventsRoute = read("app/api/security/events/route.ts");
const alertsRoute = read("app/api/security/alerts/route.ts");
const exportRoute = read("app/api/security/export/route.ts");
const eventStoreRoute = read("app/api/security/event-store/route.ts");
const readinessRoute = read("app/api/security/readiness/route.ts");
const abuseRoute = read("app/api/security/abuse-shield/route.ts");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS186_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "SecurityAdminScope",
  "verifySecurityAdminToken",
  "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
  "x-velmere-security-admin-token",
  "timingSafeEqual",
  "security_admin_token_required",
  "security_admin_token_invalid",
  "consoleVisible",
  "deny-by-default",
]) {
  if (!adminAuth.includes(token)) errors.push(`security-admin-auth.ts missing token: ${token}`);
}

for (const token of [
  "SecurityEventStoreItem",
  "securityEventStoreContract",
  "buildSecurityEventStoreSnapshot",
  "durable-append-contract",
  "retention-policy",
  "storageWritePerformed: false",
]) {
  if (!eventStore.includes(token)) errors.push(`security-event-store-contract.ts missing token: ${token}`);
}

for (const token of ["SecurityConsoleLockedPanel", "buildSecurityAdminGateReadiness", "consoleVisible", "Security Console jest zablokowana"]) {
  if (!lockedPanel.includes(token) && !adminPage.includes(token)) errors.push(`locked admin console marker missing: ${token}`);
}

for (const token of ["buildSecurityAdminGateReadiness", "buildSecurityEventStoreSnapshot", "/api/security/event-store"]) {
  if (!consolePanel.includes(token)) errors.push(`SecurityConsolePanel missing PASS186 token: ${token}`);
}

for (const token of ["SecurityConsoleLockedPanel", "buildSecurityAdminGateReadiness", "!gate.consoleVisible"]) {
  if (!adminPage.includes(token)) errors.push(`admin security page missing gate token: ${token}`);
}

for (const [fileName, source, scope] of [
  ["events", eventsRoute, "security:events"],
  ["alerts", alertsRoute, "security:alerts"],
  ["export", exportRoute, "security:export"],
  ["event-store", eventStoreRoute, "security:events"],
]) {
  if (!source.includes("verifySecurityAdminToken")) errors.push(`${fileName} route must verify security admin token`);
  if (!source.includes(scope)) errors.push(`${fileName} route missing required scope ${scope}`);
  if (!source.includes("applyApiAbuseShield")) errors.push(`${fileName} route must still use API Abuse Shield`);
}

for (const token of ["securityAdminGate", "buildSecurityAdminGateReadiness", "eventStore", "buildSecurityEventStoreSnapshot"]) {
  if (!readinessRoute.includes(token)) errors.push(`security readiness route missing PASS186 token: ${token}`);
  if (!abuseRoute.includes(token)) errors.push(`abuse shield route missing PASS186 token: ${token}`);
}

for (const area of [
  "Security admin API gate",
  "Security event store contract",
  "Security locked-state UX",
  "Admin security console",
  "Całość launch-ready",
]) {
  if (!matrix.includes(area)) errors.push(`PASS186 full matrix missing area: ${area}`);
}

const exportLower = exportRoute.toLowerCase();
for (const forbidden of ["raw ip:", "raw query:", "secret:", "process.env.", "authorization bearer"]) {
  if (exportLower.includes(forbidden)) errors.push(`Unsafe export marker found: ${forbidden}`);
}

const publicSurface = `${adminAuth}\n${eventStore}\n${lockedPanel}\n${consolePanel}\n${adminPage}\n${eventsRoute}\n${alertsRoute}\n${exportRoute}\n${eventStoreRoute}`.toLowerCase();
for (const forbidden of ["unhackable", "hack proof", "guaranteed secure"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Forbidden security wording found: ${forbidden}`);
}

for (const token of ["verify-pass186-admin-auth-event-store-contract-safety.mjs", "PASS186"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS186 marker: ${token}`);
}

if (consolePanel.includes("window.") || consolePanel.includes("document.") || lockedPanel.includes("window.") || lockedPanel.includes("document.")) {
  errors.push("Security admin panels must stay server-safe; no window/document usage.");
}

if (errors.length) {
  console.error("PASS186 admin auth / event store contract safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS186 admin auth / event store contract safety OK");
