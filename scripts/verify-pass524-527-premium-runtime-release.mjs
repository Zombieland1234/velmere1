import fs from "node:fs";

const required = [
  ["lib/market-integrity/pass524-provider-route-ledger.ts", ["pass524-provider-route-ledger", "Route resilience describes source continuity only", "confidenceCap"]],
  ["lib/market-integrity/pass525-lineage-root-cause.ts", ["pass525-lineage-root-cause", "rootNodeId", "never invents hidden causal links"]],
  ["lib/market-integrity/pass526-pdf-release-scorecard.ts", ["pass526-pdf-release-scorecard", "Preview/download parity is broken", "recommendation"]],
  ["lib/motion/usePass527AdaptiveFrameBudget.ts", ["pass527-adaptive-frame-budget", "droppedFrameRatio", "prefers-reduced-motion"]],
  ["components/market-integrity/AdvancedMarketChart.tsx", ["data-pass524-provider-route-ledger", "data-pass524-route-truth-dock", "providerRouteLedger.nextAction"]],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", ["data-pass525-lineage-root-cause", "data-pass527-frame-budget", "lineageRootCause.nextVerification"]],
  ["components/search/VelmereIntelligenceSearchClient.tsx", ["data-pass526-pdf-release-scorecard", "PDF release gate", "pdfReleaseScorecard.recommendation"]],
  ["components/market-integrity/ShieldMapCommandClient.tsx", ["data-pass527-frame-budget", "data-pass527-shield-frame-budget", "fps budget"]],
  ["app/globals.css", ["PASS524–527", "data-pass524-route-truth-dock", "data-pass526-pdf-release-scorecard"]],
];

const errors = [];
for (const [file, markers] of required) {
  if (!fs.existsSync(file)) {
    errors.push(`missing ${file}`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const marker of markers) if (!source.includes(marker)) errors.push(`${file}: missing marker ${marker}`);
  if (/Math\.random\(/.test(source)) errors.push(`${file}: Math.random is forbidden on evidence surfaces`);
  if (/fake\s+live|mock\s+live|generated\s+candles/i.test(source)) errors.push(`${file}: substitute market-data language detected`);
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const script = "verify:pass524-527-premium-runtime-release";
if (!packageJson.scripts?.[script]) errors.push(`package.json: ${script} missing`);
if (!String(packageJson.scripts?.build || "").includes(script)) errors.push("package.json: PASS524–527 build gate missing");

if (errors.length) {
  console.error("PASS524–527 verifier failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("PASS524–527 verifier PASS");
