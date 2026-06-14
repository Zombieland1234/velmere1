import fs from "node:fs";

const checks = [];
const errors = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function mustInclude(path, needle) {
  const haystack = read(path);
  if (!haystack.includes(needle)) {
    errors.push(`${path} missing ${needle}`);
  }
  checks.push(`${path}:${needle}`);
}

mustInclude("components/market-integrity/TokenRiskModal.tsx", "PASS272 guard compatibility");
mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildHolderConcentrationGate");
mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass272-holder-concentration-gate");
mustInclude("components/market-integrity/TokenRiskModal.tsx", "holderConcentrationGate.rails.map");
mustInclude("lib/market-integrity/holder-concentration-regime.ts", "velmere_holder_concentration_v1_pass272");
mustInclude("lib/market-integrity/holder-concentration-regime.ts", "holder concentration gate");
mustInclude("lib/market-integrity/holder-concentration-regime.ts", "CEX/custody wallet labels");
mustInclude("lib/market-integrity/holder-concentration-regime.ts", "unknown wallets");
mustInclude("lib/market-integrity/holder-concentration-regime.ts", "missing holder data");
mustInclude("app/globals.css", "PASS272 — L01 holder concentration gate");
mustInclude("app/globals.css", "shield-pass272-holder-gate");
mustInclude("lib/launch/master-build-areas.ts", "PASS272 marker: Holder concentration gate active");
mustInclude("lib/launch/master-build-areas.ts", "progress: 50");
mustInclude("lib/launch/master-build-areas.ts", "progress: 76");
mustInclude("lib/launch/project-progress.ts", "PASS272 marker: Holder concentration gate active");
mustInclude("lib/launch/master-build-progress-delta-pass272.ts", "pass272HolderConcentrationGateDelta");
mustInclude("VELMERE_PASS272_HOLDER_CONCENTRATION_GATE_REPORT.md", "PASS272 — Holder Concentration Gate");
mustInclude("package.json", "verify:pass272-holder-concentration-gate");

if (errors.length) {
  console.error("PASS272 holder concentration gate guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS272 holder concentration gate guard passed (${checks.length} checks).`);
