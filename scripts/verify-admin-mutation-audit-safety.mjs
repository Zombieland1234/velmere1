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
  "lib/launch/redacted-logger.ts",
  "lib/launch/admin-mutation-audit.ts",
  "components/launch/AdminMutationAuditPanel.tsx",
  "app/[locale]/admin/import-products/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing admin mutation audit file or route integration.`);
}

const logger = read("lib/launch/redacted-logger.ts");
const auditModel = read("lib/launch/admin-mutation-audit.ts");
const panel = read("components/launch/AdminMutationAuditPanel.tsx");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const publishGate = read("lib/launch/publish-permission-gate.ts");
const secretPolicy = read("lib/launch/secret-redaction-policy.ts");
const progress = read("lib/launch/project-progress.ts");
const siteAudit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "redactOperatorLogValue",
  "createSafeOperatorLogLine",
  "REDACTION_PATTERNS",
  "redactedLoggerLaunchNote",
]) {
  if (!logger.includes(needle)) errors.push(`redacted-logger.ts missing marker: ${needle}`);
}

for (const needle of [
  "adminMutationAuditMatrix",
  "createAdminMutationAuditEnvelope",
  "Mutation event envelope",
  "Redacted payload",
  "Publish checklist snapshot",
  "Rollback context",
  "Support handoff",
]) {
  if (!auditModel.includes(needle)) errors.push(`admin-mutation-audit.ts missing marker: ${needle}`);
}

for (const needle of [
  "AdminMutationAuditPanel",
  "Every import and publish must leave a safe trail.",
  "Każdy import i publish musi zostawić bezpieczny ślad.",
  "createAdminMutationAuditEnvelope",
  "previewEnvelope",
]) {
  if (!panel.includes(needle)) errors.push(`AdminMutationAuditPanel.tsx missing marker: ${needle}`);
}

if (!adminPage.includes("AdminMutationAuditPanel") || !adminPage.includes('surface="admin"')) {
  errors.push("admin import page must render AdminMutationAuditPanel with surface=admin.");
}

if (!publishGate.includes("Admin mutation audit envelope now exists") || !publishGate.includes("progress: 44")) {
  errors.push("publish-permission-gate.ts must reflect admin mutation audit progress.");
}
if (!secretPolicy.includes("Redacted logger helper now exists") || !secretPolicy.includes("progress: 54") || !secretPolicy.includes("progress: 38")) {
  errors.push("secret-redaction-policy.ts must reflect redacted logger progress.");
}
if (!progress.includes('id: "admin-mutation-audit"') || !(progress.includes('progress: 37') || progress.includes('progress: 52')) || !progress.includes('progress: 39') || !progress.includes('progress: 45')) {
  errors.push("project-progress.ts must include admin mutation audit and updated publish/secret progress.");
}
if (!siteAudit.includes("mutation audit envelope") || !(siteAudit.includes("progress: 70") || (siteAudit.includes("progress: 76") || (siteAudit.includes("progress: 81") || siteAudit.includes("progress: 85"))))) {
  errors.push("site-page-audit.ts must include admin mutation audit updated state/progress.");
}

for (const forbidden of [
  "raw api key",
  "show secret",
  "publish without review",
  "redaction disabled",
  "safe to expose secret",
]) {
  const haystack = `${logger}\n${auditModel}\n${panel}\n${adminPage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Admin mutation audit contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Admin mutation audit safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Admin mutation audit safety checks passed.");
