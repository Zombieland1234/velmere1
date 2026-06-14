import fs from "node:fs";

const required = [
  ["lib/market-integrity/pass517-provider-failover-runtime.ts", ["pass517-provider-failover-runtime", "failover_ready", "never fabricates missing candles"]],
  ["lib/market-integrity/pass518-cross-provider-chart-diff.ts", ["pass518-cross-provider-chart-diff", "medianCloseDivergenceBps", "matched source bars"]],
  ["lib/market-integrity/pass519-pdf-typography-qa.ts", ["pass519-pdf-typography-qa", "averageSentenceLength", "unbroken token"]],
  ["lib/market-integrity/pass520-ai-contradiction-lineage.ts", ["pass520-ai-contradiction-lineage", "contradicts", "visible fields only"]],
  ["lib/market-integrity/pass521-shield-evidence-drilldown.ts", ["pass521-shield-evidence-drilldown", "expectedConfidenceLift", "not a trading recommendation"]],
  ["lib/motion/pass522-mobile-gesture-qa.ts", ["pass522-mobile-gesture-qa", "minimumTargetPx", "Gesture ownership"]],
  ["components/market-integrity/AdvancedMarketChart.tsx", ["data-pass517-provider-failover", "data-pass518-cross-provider-diff", "data-pass522-mobile-gesture-qa"]],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", ["data-pass520-contradiction-lineage", "data-pass522-mobile-gesture-qa", "Genealogia sprzeczności"]],
  ["components/market-integrity/ShieldMapCommandClient.tsx", ["data-pass521-evidence-drilldown", "data-pass522-mobile-gesture-qa", "Drill-down dowodów"]],
  ["components/search/VelmereIntelligenceSearchClient.tsx", ["data-pass519-pdf-typography-qa", "Typografia PDF"]],
  ["app/api/search/lens-report/route.ts", ["pass519Typography", "Typography ${pass519Typography.state}"]],
  ["app/globals.css", ["PASS517–522", "data-pass520-ai-contradiction-lineage"]],
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

const criticalFiles = required.map(([file]) => file).filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of criticalFiles) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("Math.random(")) errors.push(`${file}: Math.random is forbidden on evidence surfaces`);
  if (/fake\s+live|mock\s+live|generated\s+candles/i.test(source)) errors.push(`${file}: substitute market-data language detected`);
  if (/iterationCount\s*:\s*-/.test(source)) errors.push(`${file}: negative animation iteration count detected`);
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (!packageJson.scripts?.["verify:pass517-523-resilient-intelligence-release"]) {
  errors.push("package.json: verifier script missing");
}
if (!String(packageJson.scripts?.build || "").includes("verify:pass517-523-resilient-intelligence-release")) {
  errors.push("package.json: build gate missing");
}

if (errors.length) {
  console.error("PASS517–523 verifier failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS517–523 verifier PASS");
