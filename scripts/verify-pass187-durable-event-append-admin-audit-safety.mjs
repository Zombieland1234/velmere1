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
  "lib/security/security-event-append-adapter.ts",
  "lib/security/security-admin-audit.ts",
  "app/api/security/admin-audit/route.ts",
  "VELMERE_PASS187_DURABLE_EVENT_APPEND_ADMIN_AUDIT_REPORT.md",
  "VELMERE_PASS187_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const append = read("lib/security/security-event-append-adapter.ts");
const adminAudit = read("lib/security/security-admin-audit.ts");
const eventLedger = read("lib/security/security-event-ledger.ts");
const adminAuth = read("lib/security/security-admin-auth.ts");
const eventStore = read("lib/security/security-event-store-contract.ts");
const adminAuditRoute = read("app/api/security/admin-audit/route.ts");
const eventStoreRoute = read("app/api/security/event-store/route.ts");
const exportRoute = read("app/api/security/export/route.ts");
const readinessRoute = read("app/api/security/readiness/route.ts");
const abuseRoute = read("app/api/security/abuse-shield/route.ts");
const consolePanel = read("components/admin/SecurityConsolePanel.tsx");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS187_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "appendSecurityEventBestEffort",
  "buildSecurityEventAppendReadiness",
  "UPSTASH_REDIS_REST_URL",
  "VELMERE_SECURITY_EVENT_UPSTASH_KEY",
  "LPUSH",
  "LTRIM",
  "safeRecord",
  "no raw IP",
]) {
  if (!append.includes(token)) errors.push(`security-event-append-adapter.ts missing token: ${token}`);
}

for (const token of [
  "SecurityAdminAuditRecord",
  "recordSecurityAdminAudit",
  "buildSecurityAdminAuditSnapshot",
  "security_export_read",
  "security_event_read",
  "security_alert_read",
  "no raw token",
]) {
  if (!adminAudit.includes(token)) errors.push(`security-admin-audit.ts missing token: ${token}`);
}

for (const token of ["appendSecurityEventBestEffort", "appendAdapter", "durableStorageReady"]) {
  if (!eventLedger.includes(token)) errors.push(`security-event-ledger.ts missing append token: ${token}`);
}

for (const token of ["recordSecurityAdminAudit", "not_configured", "denied", "allowed"]) {
  if (!adminAuth.includes(token)) errors.push(`security-admin-auth.ts missing admin audit token: ${token}`);
}

for (const token of ["buildSecurityEventAppendReadiness", "appendAdapter"]) {
  if (!eventStore.includes(token)) errors.push(`security-event-store-contract.ts missing append readiness token: ${token}`);
  if (!eventStoreRoute.includes(token)) errors.push(`security event-store route missing append readiness token: ${token}`);
}

for (const token of ["verifySecurityAdminToken", "security:events", "buildSecurityAdminAuditSnapshot", "listSecurityAdminAuditEvents"]) {
  if (!adminAuditRoute.includes(token)) errors.push(`security admin-audit route missing token: ${token}`);
}

for (const token of ["eventAppendAdapter", "securityAdminAudit", "buildSecurityEventAppendReadiness", "buildSecurityAdminAuditSnapshot"]) {
  if (!exportRoute.includes(token)) errors.push(`security export route missing PASS187 token: ${token}`);
  if (!readinessRoute.includes(token)) errors.push(`security readiness route missing PASS187 token: ${token}`);
  if (!abuseRoute.includes(token)) errors.push(`abuse shield route missing PASS187 token: ${token}`);
}

for (const token of ["buildSecurityEventAppendReadiness", "buildSecurityAdminAuditSnapshot", "/api/security/admin-audit", "appendAdapter", "adminAudit"]) {
  if (!consolePanel.includes(token)) errors.push(`SecurityConsolePanel missing PASS187 token: ${token}`);
}

for (const area of [
  "Security event append adapter",
  "Security admin audit",
  "Security launch readiness",
  "Admin audit / operator console",
  "Całość launch-ready",
]) {
  if (!matrix.includes(area)) errors.push(`PASS187 full matrix missing area: ${area}`);
}

const safeSurfaces = `${append}\n${adminAudit}\n${eventLedger}\n${adminAuth}\n${eventStore}\n${adminAuditRoute}\n${eventStoreRoute}\n${exportRoute}\n${readinessRoute}\n${abuseRoute}`.toLowerCase();
for (const forbidden of ["raw ip:", "raw query:", "authorization header stored", "secret:"]) {
  if (safeSurfaces.includes(forbidden)) errors.push(`Unsafe security append/audit marker found: ${forbidden}`);
}

for (const forbidden of ["unhackable", "hack proof", "guaranteed secure"]) {
  if (safeSurfaces.includes(forbidden)) errors.push(`Forbidden security wording found: ${forbidden}`);
}

for (const token of ["verify-pass187-durable-event-append-admin-audit-safety.mjs", "PASS187"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS187 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS187 durable event append / admin audit safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS187 durable event append / admin audit safety OK");
