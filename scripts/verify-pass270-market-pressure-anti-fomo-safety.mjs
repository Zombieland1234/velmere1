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

mustInclude("components/market-integrity/TokenRiskModal.tsx", "PASS270 guard compatibility");
mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildMarketPressureRegime");
mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass270-market-pressure-rail");
mustInclude("components/market-integrity/TokenRiskModal.tsx", "marketPressureRegime.rails.map");
mustInclude("lib/market-integrity/market-pressure-regime.ts", "velmere_market_pressure_v1_pass270");
mustInclude("lib/market-integrity/market-pressure-regime.ts", "anti_fomo_gate");
mustInclude("lib/market-integrity/market-pressure-regime.ts", "float");
mustInclude("lib/market-integrity/market-pressure-regime.ts", "unlock");
mustInclude("lib/market-integrity/market-pressure-regime.ts", "depth");
mustInclude("lib/market-integrity/market-pressure-regime.ts", "hype");
mustInclude("app/globals.css", "PASS270 — C10 low-float");
mustInclude("app/globals.css", "shield-pass270-pressure-rail");
mustInclude("lib/launch/master-build-areas.ts", "PASS270 marker: Market-pressure anti-FOMO rail active");
mustInclude("lib/launch/master-build-areas.ts", "progress: 50");
mustInclude("lib/launch/project-progress.ts", "PASS270 marker: Market-pressure anti-FOMO rail active");
mustInclude("package.json", "verify:pass270-market-pressure-anti-fomo");

if (errors.length) {
  console.error("PASS270 market pressure anti-FOMO guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS270 market pressure anti-FOMO guard passed (${checks.length} checks).`);
