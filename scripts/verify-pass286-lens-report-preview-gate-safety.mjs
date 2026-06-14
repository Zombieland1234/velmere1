import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function mustInclude(file, needle) {
  const text = read(file);
  if (!text.includes(needle)) {
    throw new Error(`${file} missing required marker: ${needle}`);
  }
}

function mustNotInclude(file, needles) {
  const text = read(file).toLowerCase();
  for (const needle of needles) {
    if (text.includes(needle.toLowerCase())) {
      throw new Error(`${file} contains blocked wording: ${needle}`);
    }
  }
}

function main() {
  mustInclude("lib/market-integrity/lens-report-preview-gate.ts", "velmere_lens_report_preview_gate_v1_pass286");
  mustInclude("lib/market-integrity/lens-report-preview-gate.ts", "Proof Passport Scroll");
  mustInclude("lib/market-integrity/lens-report-preview-gate.ts", "Velvet Preview Seal");
  mustInclude("lib/market-integrity/lens-report-preview-gate.ts", "No buy/sell prompts");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass286-lens-report-preview-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildLensReportPreviewGate");
  mustInclude("app/globals.css", "shield-pass286-lens-report-preview");
  mustInclude("package.json", "verify:pass286-lens-report-preview-gate");
  mustInclude("package.json", "verify:pass285-customer-safe-risk-brief-gate && npm run verify:pass286-lens-report-preview-gate");
  mustNotInclude("lib/market-integrity/lens-report-preview-gate.ts", [
    "guaranteed safe",
    "safety certificate",
    "financial advice",
    "buy now",
    "sell now",
    "profit guaranteed",
    "100% safe",
  ]);
  console.log("PASS286 lens report preview gate safety verified");
}

main();
