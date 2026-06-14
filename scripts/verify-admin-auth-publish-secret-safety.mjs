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
  "lib/launch/admin-server-auth-contract.ts",
  "lib/launch/publish-permission-gate.ts",
  "lib/launch/secret-redaction-policy.ts",
  "components/launch/AdminServerAuthContractPanel.tsx",
  "components/launch/PublishPermissionGatePanel.tsx",
  "components/launch/SecretRedactionPolicyPanel.tsx",
  "app/[locale]/admin/import-products/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing admin auth/publish/secret file or route integration.`);
}

const auth = read("lib/launch/admin-server-auth-contract.ts");
const publish = read("lib/launch/publish-permission-gate.ts");
const secret = read("lib/launch/secret-redaction-policy.ts");
const authPanel = read("components/launch/AdminServerAuthContractPanel.tsx");
const publishPanel = read("components/launch/PublishPermissionGatePanel.tsx");
const secretPanel = read("components/launch/SecretRedactionPolicyPanel.tsx");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const routeGate = read("lib/launch/admin-route-gate.ts");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "adminServerAuthContract",
  "Server auth provider",
  "Admin role contract",
  "Session expiry and reauth",
  "Mutation permission",
  "Server kill switch",
]) {
  if (!auth.includes(needle)) errors.push(`admin-server-auth-contract.ts missing marker: ${needle}`);
}

for (const needle of [
  "publishPermissionGate",
  "Draft-only import",
  "Provider truth required",
  "Shipping and returns required",
  "Active publish permission",
  "Audit before publish",
]) {
  if (!publish.includes(needle)) errors.push(`publish-permission-gate.ts missing marker: ${needle}`);
}

for (const needle of [
  "secretRedactionPolicy",
  "Browser-visible secret scan",
  "Raw provider response redaction",
  "Log redaction",
  "Private prompt redaction",
]) {
  if (!secret.includes(needle)) errors.push(`secret-redaction-policy.ts missing marker: ${needle}`);
}

for (const [label, source, needles] of [
  ["AdminServerAuthContractPanel.tsx", authPanel, ["AdminServerAuthContractPanel", "Admin needs real server auth", "Admin musi mieć prawdziwy server auth"]],
  ["PublishPermissionGatePanel.tsx", publishPanel, ["PublishPermissionGatePanel", "Product import must not mean product publication", "Import produktu nie może oznaczać publikacji produktu"]],
  ["SecretRedactionPolicyPanel.tsx", secretPanel, ["SecretRedactionPolicyPanel", "Secrets and raw provider output", "Sekrety i raw provider output"]],
]) {
  for (const needle of needles) {
    if (!source.includes(needle)) errors.push(`${label} missing marker: ${needle}`);
  }
}

for (const needle of [
  "AdminServerAuthContractPanel",
  "PublishPermissionGatePanel",
  "SecretRedactionPolicyPanel",
  "surface=\"admin\"",
]) {
  if (!adminPage.includes(needle)) errors.push(`admin import page missing panel marker: ${needle}`);
}

if (!routeGate.includes("Server auth contract now exists") || !routeGate.includes("Publish permission gate now exists") || !routeGate.includes("Secret redaction policy and static guard now exist")) {
  errors.push("admin-route-gate.ts must reference server auth, publish permission and secret redaction updates.");
}
for (const needle of ['id: "admin-server-auth"', 'id: "publish-permission-gate"', 'id: "secret-redaction-policy"', 'progress: 49']) {
  if (!progress.includes(needle)) errors.push(`project-progress.ts missing admin auth/publish/secret progress marker: ${needle}`);
}
if (!audit.includes("server auth contract") || !audit.includes("publish permission gate") || !audit.includes("secret redaction policy") || !(audit.includes("progress: 64") || audit.includes("progress: 85"))) {
  errors.push("site-page-audit.ts must include admin auth/publish/secret updated state and progress.");
}

for (const forbidden of [
  "server auth is complete",
  "production auth ready",
  "publish without review",
  "raw api key",
  "show secret",
  "customer admin access",
]) {
  const haystack = `${auth}\n${publish}\n${secret}\n${authPanel}\n${publishPanel}\n${secretPanel}\n${adminPage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Admin auth/publish/secret contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Admin auth/publish/secret safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Admin auth/publish/secret safety checks passed.");
