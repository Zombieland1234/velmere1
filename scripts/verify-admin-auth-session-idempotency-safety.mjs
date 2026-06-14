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
  "lib/launch/admin-auth-session-guard.ts",
  "lib/launch/admin-idempotency-store.ts",
  "components/launch/AdminAuthSessionGuardPanel.tsx",
  "components/launch/AdminIdempotencyStorePanel.tsx",
  "lib/launch/admin-audit-write-contract.ts",
  "app/api/admin/audit-events/route.ts",
  "app/[locale]/admin/import-products/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing auth session/idempotency file or integration.`);
}

const session = read("lib/launch/admin-auth-session-guard.ts");
const idem = read("lib/launch/admin-idempotency-store.ts");
const sessionPanel = read("components/launch/AdminAuthSessionGuardPanel.tsx");
const idemPanel = read("components/launch/AdminIdempotencyStorePanel.tsx");
const writeContract = read("lib/launch/admin-audit-write-contract.ts");
const apiRoute = read("app/api/admin/audit-events/route.ts");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const serverAuth = read("lib/launch/admin-server-auth-contract.ts");
const progress = read("lib/launch/project-progress.ts");
const siteAudit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "adminAuthSessionMatrix",
  "getAdminSessionPreviewFromEnv",
  "requireAdminScope",
  "roleScopeMap",
  "product:active_publish",
  "support:export",
  "fresh session / reauth timestamp",
]) {
  if (!session.includes(needle)) errors.push(`admin-auth-session-guard.ts missing marker: ${needle}`);
}

for (const needle of [
  "adminIdempotencyStoreMatrix",
  "createAdminIdempotencyPreview",
  "Idempotency key normalization",
  "Idempotency storage",
  "Duplicate response policy",
  "TTL and retention policy",
]) {
  if (!idem.includes(needle)) errors.push(`admin-idempotency-store.ts missing marker: ${needle}`);
}

for (const [label, source, needles] of [
  ["AdminAuthSessionGuardPanel.tsx", sessionPanel, ["AdminAuthSessionGuardPanel", "Admin route must know the operator session", "Route admina musi znać sesję"]],
  ["AdminIdempotencyStorePanel.tsx", idemPanel, ["AdminIdempotencyStorePanel", "Publish/import retries must not create a second mutation", "Retry publish/import nie może"]],
]) {
  for (const needle of needles) {
    if (!source.includes(needle)) errors.push(`${label} missing marker: ${needle}`);
  }
}

for (const needle of [
  "getAdminSessionPreviewFromEnv",
  "requireAdminScope",
  "createAdminIdempotencyPreview",
  "sessionPreview",
  "permissionPreview",
  "idempotencyPreview",
]) {
  if (!writeContract.includes(needle)) errors.push(`admin-audit-write-contract.ts missing PASS147 marker: ${needle}`);
}

for (const needle of [
  "getAdminSessionPreviewFromEnv",
  "sessionPreview",
  "storageWritePerformed: false",
]) {
  if (!apiRoute.includes(needle)) errors.push(`api/admin/audit-events route missing PASS147 marker: ${needle}`);
}

for (const needle of [
  "AdminAuthSessionGuardPanel",
  "AdminIdempotencyStorePanel",
  "surface=\"admin\"",
]) {
  if (!adminPage.includes(needle)) errors.push(`admin import page missing panel marker: ${needle}`);
}

if (!serverAuth.includes("Auth session guard contract now exists") || !serverAuth.includes("Role/scope map now exists") || !serverAuth.includes("Fresh session requirement now exists")) {
  errors.push("admin-server-auth-contract.ts must reflect auth session/scope/freshness updates.");
}

for (const needle of [
  'id: "admin-auth-session-guard"',
  'id: "admin-idempotency-store"',
  'progress: 36',
  'progress: 48',
]) {
  if (!progress.includes(needle)) errors.push(`project-progress.ts missing PASS147 progress marker: ${needle}`);
}

if (!siteAudit.includes("auth session guard") || !siteAudit.includes("idempotency store contract") || !siteAudit.includes("progress: 85")) {
  errors.push("site-page-audit.ts must include PASS147 auth/idempotency updated state/progress.");
}

for (const forbidden of [
  "server auth is complete",
  "production auth ready",
  "idempotency storage ready",
  "storageWritePerformed: true",
  "customer admin access",
  "safe to expose secret",
  "raw api key",
]) {
  const haystack = `${session}\n${idem}\n${sessionPanel}\n${idemPanel}\n${writeContract}\n${apiRoute}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`PASS147 contains forbidden wording/behavior: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Admin auth session/idempotency safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Admin auth session/idempotency safety checks passed.");
