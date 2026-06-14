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
  "lib/launch/admin-audit-persistence.ts",
  "lib/launch/publish-rollback-context.ts",
  "lib/launch/support-safe-timeline.ts",
  "components/launch/AdminAuditPersistencePanel.tsx",
  "components/launch/PublishRollbackContextPanel.tsx",
  "components/launch/SupportSafeTimelinePanel.tsx",
  "app/[locale]/admin/import-products/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing admin audit persistence file or route integration.`);
}

const persistence = read("lib/launch/admin-audit-persistence.ts");
const rollback = read("lib/launch/publish-rollback-context.ts");
const timeline = read("lib/launch/support-safe-timeline.ts");
const persistencePanel = read("components/launch/AdminAuditPersistencePanel.tsx");
const rollbackPanel = read("components/launch/PublishRollbackContextPanel.tsx");
const timelinePanel = read("components/launch/SupportSafeTimelinePanel.tsx");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const mutationAudit = read("lib/launch/admin-mutation-audit.ts");
const progress = read("lib/launch/project-progress.ts");
const siteAudit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "adminAuditPersistenceMatrix",
  "createAdminAuditPersistencePreview",
  "Persistent storage adapter",
  "Operator context",
  "Idempotent audit write",
  "Redacted source snapshot",
  "Retention and export policy",
]) {
  if (!persistence.includes(needle)) errors.push(`admin-audit-persistence.ts missing marker: ${needle}`);
}

for (const needle of [
  "publishRollbackContextMatrix",
  "createPublishRollbackDiff",
  "Before/after diff",
  "Rollback id",
  "Checklist snapshot",
  "Customer impact classification",
]) {
  if (!rollback.includes(needle)) errors.push(`publish-rollback-context.ts missing marker: ${needle}`);
}

for (const needle of [
  "supportSafeTimelineMatrix",
  "createSupportSafeTimelinePreview",
  "Timeline source ledger",
  "Support-safe copy",
  "Missing data visible",
  "Customer boundary",
]) {
  if (!timeline.includes(needle)) errors.push(`support-safe-timeline.ts missing marker: ${needle}`);
}

for (const [label, source, needles] of [
  ["AdminAuditPersistencePanel.tsx", persistencePanel, ["AdminAuditPersistencePanel", "Audit must be stored server-side", "Audit musi być zapisany"]],
  ["PublishRollbackContextPanel.tsx", rollbackPanel, ["PublishRollbackContextPanel", "Every publish needs a diff", "Każdy publish musi mieć diff"]],
  ["SupportSafeTimelinePanel.tsx", timelinePanel, ["SupportSafeTimelinePanel", "Support needs a safe event timeline", "Support ma widzieć bezpieczną"]],
]) {
  for (const needle of needles) {
    if (!source.includes(needle)) errors.push(`${label} missing marker: ${needle}`);
  }
}

for (const needle of [
  "AdminAuditPersistencePanel",
  "PublishRollbackContextPanel",
  "SupportSafeTimelinePanel",
  "surface=\"admin\"",
]) {
  if (!adminPage.includes(needle)) errors.push(`admin import page missing panel marker: ${needle}`);
}

for (const needle of [
  "Admin audit persistence contract now exists",
  "Publish rollback context now exists",
  "Rollback diff contract now exists",
  "Support-safe timeline contract now exists",
]) {
  if (!mutationAudit.includes(needle)) errors.push(`admin-mutation-audit.ts missing PASS145 marker: ${needle}`);
}

for (const needle of [
  'id: "admin-audit-persistence"',
  'id: "publish-rollback-context"',
  'id: "support-safe-timeline"',
  'progress: 52',
]) {
  if (!progress.includes(needle)) errors.push(`project-progress.ts missing PASS145 progress marker: ${needle}`);
}

if (!siteAudit.includes("audit persistence contract") || !siteAudit.includes("rollback context") || !siteAudit.includes("support-safe timeline") || !(siteAudit.includes("progress: 76") || (siteAudit.includes("progress: 81") || siteAudit.includes("progress: 85")))) {
  errors.push("site-page-audit.ts must include PASS145 admin audit persistence updated state/progress.");
}

for (const forbidden of [
  "storage is production ready",
  "server auth is complete",
  "safe to expose secret",
  "raw api key",
  "publish without review",
  "support can see secrets",
]) {
  const haystack = `${persistence}\n${rollback}\n${timeline}\n${persistencePanel}\n${rollbackPanel}\n${timelinePanel}\n${adminPage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Admin audit persistence contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Admin audit persistence safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Admin audit persistence safety checks passed.");
