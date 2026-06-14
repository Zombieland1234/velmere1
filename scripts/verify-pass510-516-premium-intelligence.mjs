import fs from "node:fs";

const required = [
  ["lib/market-integrity/pass510-neural-confidence-waterfall.ts", ["pass510-neural-confidence-waterfall", "gap", "cumulative"]],
  ["lib/market-integrity/pass511-chart-regime-lens.ts", ["pass511-chart-regime-lens", "expansion", "compression"]],
  ["lib/market-integrity/pass512-report-integrity-seal.ts", ["pass512-report-integrity-seal", "checksum", "readiness"]],
  ["lib/market-integrity/pass513-shield-verification-queue.ts", ["pass513-shield-verification-queue", "informationGain", "expectedConfidenceLift"]],
  ["lib/motion/pass514-interaction-motion-orchestrator.ts", ["pass514-interaction-motion-orchestrator", "reducedMotion", "easing"]],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", ["data-pass510-neural-confidence-waterfall", "data-pass515-mobile-command-rail", "neural-evidence"]],
  ["components/market-integrity/AdvancedMarketChart.tsx", ["data-pass511-chart-regime-lens", "data-pass511-regime-strip"]],
  ["components/search/VelmereIntelligenceSearchClient.tsx", ["data-pass512-report-integrity-seal", "Pieczęć integralności"]],
  ["components/market-integrity/ShieldMapCommandClient.tsx", ["data-pass513-shield-verification-queue", "Kolejka weryfikacji"]],
  ["app/api/search/lens-report/route.ts", ["pass512Seal", "Integrity ${pass512Seal.state}"]],
  ["app/globals.css", ["PASS510–515", "data-pass515-mobile-command-rail"]],
];

const errors = [];
for (const [file, markers] of required) {
  if (!fs.existsSync(file)) {
    errors.push(`missing ${file}`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) errors.push(`${file}: missing marker ${marker}`);
  }
}

const criticalFiles = required.map(([file]) => file).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
for (const file of criticalFiles) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("Math.random(")) errors.push(`${file}: Math.random is forbidden on evidence surfaces`);
  if (/fake\s+live|mock\s+live|generated\s+candles/i.test(source)) errors.push(`${file}: substitute live-data language detected`);
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (!packageJson.scripts?.["verify:pass510-516-premium-intelligence"]) {
  errors.push("package.json: verifier script missing");
}
if (!String(packageJson.scripts?.build || "").includes("verify:pass510-516-premium-intelligence")) {
  errors.push("package.json: build gate missing");
}

if (errors.length) {
  console.error("PASS510–516 verifier failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS510–516 verifier PASS");
