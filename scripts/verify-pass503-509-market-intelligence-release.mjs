import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [
  ["components/market-integrity/AdvancedMarketChart.tsx", ["data-pass503-provider-state", "data-pass504-chart-view-cache", "buildPass503ProviderRuntime", "writePass504ChartView"]],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", ["data-pass506-source-diff-timeline", "data-pass508-mobile-replay", "buildPass506SourceDiffTimeline", "buildPass508MobileReplay"]],
  ["components/search/VelmereIntelligenceSearchClient.tsx", ["data-pass505-pdf-page-break-audit", "buildPass505PdfPageBreakAudit"]],
  ["components/market-integrity/ShieldMapCommandClient.tsx", ["data-pass507-shield-scenario-comparator", "buildPass507ShieldScenarioComparator", "This is not a price forecast"]],
  ["lib/market-integrity/pass503-provider-state-runtime.ts", ["pass503-provider-state-runtime", "stale", "partial", "offline"]],
  ["lib/market-integrity/pass504-chart-view-cache.ts", ["sessionStorage", "MAX_AGE_MS", "pass504-chart-view-cache"]],
  ["lib/market-integrity/pass506-source-diff-timeline.ts", ["pass506-source-diff-timeline", "missing source is never replaced"]],
  ["lib/market-integrity/pass505-pdf-page-break-audit.ts", ["pass505-pdf-page-break-audit", "readerPageCount", "binaryPageCount"]],
  ["lib/market-integrity/pass507-shield-scenario-comparator.ts", ["pass507-shield-scenario-comparator", "baseline", "stress", "verified"]],
  ["lib/market-integrity/pass508-mobile-replay.ts", ["pass508-mobile-replay", "frames"]],
  ["app/globals.css", ["PASS503–508", "break-before: page", "prefers-reduced-motion"]],
];

const failures = [];
for (const [file, markers] of checks) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`${file}: missing file`);
    continue;
  }
  const body = read(file);
  for (const marker of markers) {
    if (!body.includes(marker)) failures.push(`${file}: missing marker ${marker}`);
  }
}

const critical = [
  "components/market-integrity/AdvancedMarketChart.tsx",
  "components/market-integrity/VlmNeuralAuditExperience.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/ShieldMapCommandClient.tsx",
].map(read).join("\n");
if (/Math\.random\s*\(/.test(critical)) failures.push("critical surfaces: Math.random() is forbidden");
if (/fake live|synthetic candle|substitute candle/i.test(critical)) failures.push("critical surfaces: substitute market data language detected");

if (failures.length) {
  console.error("PASS503–509 release gate failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("PASS503–509 release gate: PASS");
