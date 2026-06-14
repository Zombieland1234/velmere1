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

for (const file of [
  "lib/launch/admin-audit-write-contract.ts",
  "lib/launch/customer-safe-export-boundary.ts",
  "app/api/admin/audit-events/route.ts",
  "components/launch/AdminAuditWriteApiPanel.tsx",
  "components/launch/CustomerSafeExportBoundaryPanel.tsx",
  "app/[locale]/admin/import-products/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing audit write API/export boundary file or route integration.`);
}

const writeContract = read("lib/launch/admin-audit-write-contract.ts");
const exportBoundary = read("lib/launch/customer-safe-export-boundary.ts");
const apiRoute = read("app/api/admin/audit-events/route.ts");
const writePanel = read("components/launch/AdminAuditWriteApiPanel.tsx");
const exportPanel = read("components/launch/CustomerSafeExportBoundaryPanel.tsx");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const persistence = read("lib/launch/admin-audit-persistence.ts");
const timeline = read("lib/launch/support-safe-timeline.ts");
const progress = read("lib/launch/project-progress.ts");
const siteAudit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "adminAuditWriteRouteMatrix",
  "createAdminAuditWritePreview",
  "getAdminAuditServerGate",
  "validateAdminAuditWriteRequest",
  "idempotency key",
  "ADMIN_AUDIT_WRITE_ENABLED",
  "ADMIN_AUDIT_STORAGE_READY",
]) {
  if (!writeContract.includes(needle)) errors.push(`admin-audit-write-contract.ts missing marker: ${needle}`);
}

for (const needle of [
  "customerSafeExportBoundaryMatrix",
  "createCustomerSafeExportPreview",
  "Support-to-customer filter",
  "Approval gate",
  "Missing-data language",
  "Export redaction",
]) {
  if (!exportBoundary.includes(needle)) errors.push(`customer-safe-export-boundary.ts missing marker: ${needle}`);
}

for (const needle of [
  "createAdminAuditWritePreview",
  "storageWritePerformed: false",
  "locked-contract-preview",
  "POST",
  "GET",
]) {
  if (!apiRoute.includes(needle)) errors.push(`app/api/admin/audit-events/route.ts missing marker: ${needle}`);
}

for (const [label, source, needles] of [
  ["AdminAuditWriteApiPanel.tsx", writePanel, ["AdminAuditWriteApiPanel", "Audit write route exists", "Audit write route istnieje"]],
  ["CustomerSafeExportBoundaryPanel.tsx", exportPanel, ["CustomerSafeExportBoundaryPanel", "Support can export only a customer-safe version", "Support może eksportować"]],
]) {
  for (const needle of needles) {
    if (!source.includes(needle)) errors.push(`${label} missing marker: ${needle}`);
  }
}

for (const needle of [
  "AdminAuditWriteApiPanel",
  "CustomerSafeExportBoundaryPanel",
  "surface=\"admin\"",
]) {
  if (!adminPage.includes(needle)) errors.push(`admin import page missing panel marker: ${needle}`);
}

if (!persistence.includes("Audit write API route contract now exists") || !persistence.includes("progress: 32") || !persistence.includes("progress: 38")) {
  errors.push("admin-audit-persistence.ts must reflect audit write API/idempotency progress.");
}
if (!timeline.includes("Customer-safe export boundary now exists") || !timeline.includes("progress: 42")) {
  errors.push("support-safe-timeline.ts must reflect customer-safe export boundary progress.");
}
for (const needle of ['id: "admin-audit-write-api"', 'id: "customer-safe-export-boundary"', 'progress: 35', 'progress: 43']) {
  if (!progress.includes(needle)) errors.push(`project-progress.ts missing PASS146 marker: ${needle}`);
}
if (!siteAudit.includes("locked audit write API route") || !siteAudit.includes("customer-safe export boundary") || !(siteAudit.includes("progress: 81") || siteAudit.includes("progress: 85"))) {
  errors.push("site-page-audit.ts must include PASS146 audit write API/export boundary state/progress.");
}

for (const forbidden of [
  "storage write performed: true",
  "storageWritePerformed: true",
  "server auth is complete",
  "production persistence ready",
  "customer export approved automatically",
  "safe to expose secret",
  "raw api key",
]) {
  const haystack = `${writeContract}\n${exportBoundary}\n${apiRoute}\n${writePanel}\n${exportPanel}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`PASS146 contains forbidden wording/behavior: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Admin audit write API safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Admin audit write API safety checks passed.");
