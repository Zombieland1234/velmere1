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
  "lib/launch/admin-environment-gate.ts",
  "components/launch/AdminToolsLockedPanel.tsx",
  "app/[locale]/admin/import-products/page.tsx",
  "lib/launch/admin-route-gate.ts",
]) {
  if (!exists(file)) errors.push(`${file}: missing admin environment gate file or route integration.`);
}

const helper = read("lib/launch/admin-environment-gate.ts");
const panel = read("components/launch/AdminToolsLockedPanel.tsx");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const routeGate = read("lib/launch/admin-route-gate.ts");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "getClientAdminEnvironmentGate",
  "NEXT_PUBLIC_ADMIN_TOOLS_ENABLED",
  "NEXT_PUBLIC_ADMIN_TOOLS_ENV",
  "isUnlocked",
  "public_env_only",
  "getAdminEnvironmentGateLaunchNote",
]) {
  if (!helper.includes(needle)) errors.push(`admin-environment-gate.ts missing marker: ${needle}`);
}

for (const needle of [
  "AdminToolsLockedPanel",
  "Product import is hidden behind an environment gate.",
  "Import produktów jest schowany za environment gate.",
  "Produktimport liegt hinter einem Environment Gate.",
  "getAdminEnvironmentGateLaunchNote",
]) {
  if (!panel.includes(needle)) errors.push(`AdminToolsLockedPanel.tsx missing marker: ${needle}`);
}

for (const needle of [
  "getClientAdminEnvironmentGate",
  "AdminToolsLockedPanel",
  "if (!adminEnvironmentGate.isUnlocked)",
  "disabled={!adminEnvironmentGate.isUnlocked || isBusy || !token}",
  "surface=\"admin\"",
]) {
  if (!adminPage.includes(needle)) errors.push(`admin import page missing locked admin surface marker: ${needle}`);
}

if (!routeGate.includes("Locked admin surface now exists") || !routeGate.includes("progress: 38") || !routeGate.includes("progress: 46")) {
  errors.push("admin-route-gate.ts must reflect locked admin surface progress and next step.");
}
if (!progress.includes('id: "admin-route-gate"') || !(progress.includes('progress: 38') || progress.includes('progress: 49'))) {
  errors.push("project-progress.ts must include updated admin-route-gate progress.");
}
if (!(audit.includes('progress: 55') || (audit.includes('progress: 64') || (audit.includes('progress: 70') || (audit.includes('progress: 76') || (audit.includes('progress: 81') || audit.includes('progress: 85')))))) || !audit.includes("locked admin surface")) {
  errors.push("site-page-audit.ts must include updated admin import locked-surface progress/state.");
}

for (const forbidden of [
  "server auth is complete",
  "production auth ready",
  "admin is public",
  "customer admin access",
  "show secret",
  "raw api key",
]) {
  const haystack = `${helper}\n${panel}\n${adminPage}\n${routeGate}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Admin environment gate contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Admin environment gate safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Admin environment gate safety checks passed.");
