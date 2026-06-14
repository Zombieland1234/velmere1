import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", ["data-pass496-runtime-surface", "data-pass497-decision-brief", "buildPass497NeuralDecisionBrief"]],
  ["components/market-integrity/AdvancedMarketChart.tsx", ["data-pass498-chart-insight", "buildPass498ChartInsight", "aria-live=\"polite\""]],
  ["components/search/VelmereIntelligenceSearchClient.tsx", ["data-pass499-a4-reader-health", "buildPass499A4ReaderHealth", "Document health"]],
  ["components/market-integrity/ShieldMapCommandClient.tsx", ["data-pass500-command-dock", "buildPass500ShieldCommandDock"]],
  ["app/globals.css", ["PASS496–501", "prefers-reduced-transparency", "content-visibility: auto"]],
  ["lib/design/pass501-premium-surface-system.ts", ["One active focus", "adaptive visual cost"]],
];

const failures = [];
for (const [relative, markers] of checks) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    failures.push(`${relative}: missing`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${relative}: missing marker ${marker}`);
  }
  if (/Math\.random\s*\(/.test(source)) failures.push(`${relative}: random runtime data is not allowed`);
}

if (failures.length) {
  console.error("PASS496–502 verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("PASS496–502 verification PASS");
