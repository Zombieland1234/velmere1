import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const evidence = read("lib/market-integrity/evidence-report.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");

for (const needle of [
  "ShieldEvidenceExportManifest",
  "schemaVersion: \"vlm-shield-evidence-manifest-v1\"",
  "manifestMode: \"json_preview_only\"",
  "buildShieldEvidenceExportManifest",
  "serializeShieldEvidenceExportManifest",
  "exportBlockedReason",
  "redactionRules",
  "copyGuard",
  "Not financial advice. Algorithmic risk flag only",
]) {
  if (!evidence.includes(needle)) errors.push(`evidence-report.ts missing export manifest marker ${needle}`);
}

for (const needle of [
  "buildShieldEvidenceExportManifest(result, operatorCaseFile, evidenceReportDraft)",
  "serializeShieldEvidenceExportManifest(evidenceExportManifest)",
  "downloadEvidenceManifest",
  "copyEvidenceManifest",
  "evidenceExportJson",
  "shield-evidence-export-manifest",
  "evidenceExportManifest.manifestMode",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing export manifest UI/runtime ${needle}`);
}

for (const needle of [
  "PASS130 — evidence JSON manifest preview",
  ".shield-evidence-export-manifest",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing export manifest CSS ${needle}`);
}

for (const forbidden of [
  "safe investment",
  "guaranteed",
  "buy signal",
  "sell signal",
  "scam confirmed",
  "fraud proven",
  "risk-free",
]) {
  if (evidence.toLowerCase().includes(forbidden)) {
    errors.push(`evidence-report.ts contains forbidden wording: ${forbidden}`);
  }
}

if (modal.includes("window.open(")) errors.push("TokenRiskModal must not open raw JSON/windows for evidence export.");
if (modal.includes("innerHTML")) errors.push("TokenRiskModal must not use innerHTML for evidence export.");

if (errors.length) {
  console.error("Evidence export manifest safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Evidence export manifest safety checks passed.");
