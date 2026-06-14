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
  "buildShieldEvidenceReportDraft",
  "ShieldEvidenceReportDraft",
  "sourceLedger",
  "missingDataAppendix",
  "redactionRules",
  "draft_only",
  "Not financial advice. Algorithmic risk flag only",
]) {
  if (!evidence.includes(needle)) errors.push(`evidence-report.ts missing ${needle}`);
}

for (const needle of [
  "buildShieldEvidenceReportDraft(result, operatorCaseFile)",
  "evidenceReportDraft.exportStatus",
  "shield-evidence-draft",
  "Source ledger report",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing evidence draft UI ${needle}`);
}

for (const needle of ["PASS129 — evidence draft source ledger", ".shield-evidence-draft"]) {
  if (!css.includes(needle)) errors.push(`globals.css missing evidence draft CSS ${needle}`);
}

for (const forbidden of ["safe investment", "guaranteed", "buy signal", "sell signal", "scam confirmed", "fraud proven", "risk-free"]) {
  if (evidence.toLowerCase().includes(forbidden)) errors.push(`evidence-report.ts contains forbidden wording: ${forbidden}`);
}

if (errors.length) {
  console.error("Evidence report safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Evidence report safety checks passed.");
