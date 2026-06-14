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
  "lib/launch/admin-route-gate.ts",
  "components/launch/AdminRouteGatePanel.tsx",
  "app/[locale]/admin/import-products/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing admin route gate file or route integration.`);
}

const model = read("lib/launch/admin-route-gate.ts");
const panel = read("components/launch/AdminRouteGatePanel.tsx");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "adminRouteGateMatrix",
  "getAdminRouteGateSummary",
  "getAdminRouteLaunchBlockers",
  "Admin authentication",
  "Environment gate",
  "Publish permission",
  "Import audit trail",
  "Secret redaction",
  "Public route fallback",
]) {
  if (!model.includes(needle)) errors.push(`admin-route-gate.ts missing marker: ${needle}`);
}

for (const needle of [
  "AdminRouteGatePanel",
  "surface: \"admin\" | \"ops\"",
  "Admin tooling must stay private and gated before public launch.",
  "Admin tooling musi być prywatne i zablokowane przed publicznym startem.",
  "Admin-Tools müssen vor öffentlichem Start privat und gesperrt sein.",
]) {
  if (!panel.includes(needle)) errors.push(`AdminRouteGatePanel.tsx missing marker: ${needle}`);
}

if (!adminPage.includes("AdminRouteGatePanel") || !adminPage.includes('surface="admin"')) {
  errors.push("admin import page must render AdminRouteGatePanel with surface=admin.");
}
if (!progress.includes('id: "admin-route-gate"') || !(progress.includes('progress: 27') || (progress.includes('progress: 38') || progress.includes('progress: 49')))) {
  errors.push("project-progress.ts must include admin-route-gate progress.");
}
if (!audit.includes('id: "admin-import"') || !(audit.includes('progress: 48') || (audit.includes('progress: 55') || (audit.includes('progress: 64') || (audit.includes('progress: 70') || (audit.includes('progress: 76') || (audit.includes('progress: 81') || audit.includes('progress: 85'))))))) || !audit.includes("Admin route gate matrix exists")) {
  errors.push("site-page-audit.ts must include updated admin import gate progress/state.");
}

for (const forbidden of [
  "admin is public",
  "auth disabled in production",
  "publish without review",
  "show secret",
  "raw api key",
  "customer admin access",
]) {
  const haystack = `${model}\n${panel}\n${adminPage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Admin route gate contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Admin route gate safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Admin route gate safety checks passed.");
