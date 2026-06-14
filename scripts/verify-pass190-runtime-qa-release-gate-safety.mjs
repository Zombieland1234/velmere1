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
  "lib/security/security-runtime-qa.ts",
  "lib/security/security-release-gate.ts",
  "app/api/security/runtime-qa/route.ts",
  "app/api/security/release-gate/route.ts",
  "docs/security/SECURITY_RUNTIME_QA_RESULT_CAPTURE.md",
  "docs/security/SECURITY_RELEASE_GATE_DASHBOARD.md",
  "VELMERE_PASS190_RUNTIME_QA_RELEASE_GATE_REPORT.md",
  "VELMERE_PASS190_FULL_MASTER_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const runtimeQa = read("lib/security/security-runtime-qa.ts");
const releaseGate = read("lib/security/security-release-gate.ts");
const runtimeQaRoute = read("app/api/security/runtime-qa/route.ts");
const releaseGateRoute = read("app/api/security/release-gate/route.ts");
const readinessRoute = read("app/api/security/readiness/route.ts");
const exportRoute = read("app/api/security/export/route.ts");
const operationsRoute = read("app/api/security/operations-checklist/route.ts");
const consolePanel = read("components/admin/SecurityConsolePanel.tsx");
const qaDoc = read("docs/security/SECURITY_RUNTIME_QA_RESULT_CAPTURE.md");
const releaseDoc = read("docs/security/SECURITY_RELEASE_GATE_DASHBOARD.md");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS190_FULL_MASTER_PROGRESS_MATRIX.md");

for (const token of [
  "RuntimeQaCheck",
  "runtimeQaChecks",
  "buildSecurityRuntimeQaSnapshot",
  "admin-api-deny-by-default",
  "export-redaction",
  "waf-rules-applied",
  "release-gate-signoff",
]) {
  if (!runtimeQa.includes(token)) errors.push(`security-runtime-qa.ts missing token: ${token}`);
}

for (const token of [
  "SecurityReleaseGateItem",
  "buildSecurityReleaseGateSnapshot",
  "payment-webhook-review",
  "Vercel WAF / bot layer",
  "security_release_gate_dashboard",
  "blocked until Vercel envs",
]) {
  if (!releaseGate.includes(token)) errors.push(`security-release-gate.ts missing token: ${token}`);
}

for (const [name, source] of [
  ["runtime-qa", runtimeQaRoute],
  ["release-gate", releaseGateRoute],
]) {
  for (const token of ["applyApiAbuseShield", "verifySecurityAdminToken", "security:events", "securityAdminGate", "operator"]) {
    if (!source.includes(token)) errors.push(`${name} route missing gated API token: ${token}`);
  }
}

for (const token of ["runtimeQa", "releaseGate", "buildSecurityRuntimeQaSnapshot", "buildSecurityReleaseGateSnapshot"]) {
  if (!readinessRoute.includes(token)) errors.push(`readiness route missing PASS190 token: ${token}`);
  if (!exportRoute.includes(token)) errors.push(`export route missing PASS190 token: ${token}`);
  if (!operationsRoute.includes(token)) errors.push(`operations checklist route missing PASS190 token: ${token}`);
}

for (const token of [
  "buildSecurityRuntimeQaSnapshot",
  "buildSecurityReleaseGateSnapshot",
  "/api/security/runtime-qa",
  "/api/security/release-gate",
  "releaseItems.map",
]) {
  if (!consolePanel.includes(token)) errors.push(`SecurityConsolePanel missing PASS190 token: ${token}`);
}

for (const token of ["/api/security/export", "No raw IP", "Vercel firewall logs", "npm run verify:shield-all"]) {
  if (!qaDoc.includes(token)) errors.push(`runtime QA doc missing token: ${token}`);
}

for (const token of ["Security Release Gate Dashboard", "Payment/webhook", "Vercel envs", "WAF"]) {
  if (!releaseDoc.includes(token)) errors.push(`release gate doc missing token: ${token}`);
}

for (const area of [
  "Security release gate dashboard",
  "Security runtime QA result capture",
  "Payment/webhook security",
  "Real browser QA lane",
  "Source adapters / live feeds",
  "VLM AI risk brain",
  "Całość launch-ready",
]) {
  if (!matrix.includes(area)) errors.push(`PASS190 full master matrix missing area: ${area}`);
}

const safeSurface = `${runtimeQa}\n${releaseGate}\n${runtimeQaRoute}\n${releaseGateRoute}\n${readinessRoute}\n${exportRoute}\n${operationsRoute}\n${consolePanel}`.toLowerCase();
for (const forbidden of ["unhackable", "hack proof", "guaranteed secure", "world's best security", "best security in the world"]) {
  if (safeSurface.includes(forbidden)) errors.push(`Forbidden security overclaim found: ${forbidden}`);
}

for (const token of ["verify-pass190-runtime-qa-release-gate-safety.mjs", "PASS190"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS190 marker: ${token}`);
}

if (consolePanel.includes("window.") || consolePanel.includes("document.")) {
  errors.push("SecurityConsolePanel must stay server-safe; no window/document usage.");
}

if (errors.length) {
  console.error("PASS190 runtime QA / release gate safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS190 runtime QA / release gate safety OK");
