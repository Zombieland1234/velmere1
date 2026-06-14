import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(file, markers) {
  const source = read(file);
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${file}: missing ${marker}`);
  }
}

function reject(file, markers) {
  const source = read(file);
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${file}: forbidden ${marker}`);
  }
}

expect("lib/market-integrity/pass485-evidence-reasoning-engine.ts", [
  'version: "pass485-evidence-reasoning-engine"',
  'id: "supported"',
  'id: "tension"',
  'id: "unknown"',
  'id: "next_probe"',
  "priceForecastsBlocked: true",
  "missingDataCannotBecomeFact: true",
  "confidenceCappedByEvidence: true",
  "deterministicRanking: true",
]);
reject("lib/market-integrity/pass485-evidence-reasoning-engine.ts", [
  "Math.random",
  "price target",
  "guaranteed return",
]);

expect("components/market-integrity/VlmNeuralAuditExperience.tsx", [
  "buildPass485EvidenceReasoning",
  'data-pass485-adaptive-neural-renderer="visibility-dpr-pointer"',
  'data-pass485-evidence-reasoning="true"',
  'data-pass485-reasoning-cockpit="fact-tension-unknown-probe"',
  "IntersectionObserver",
  "deviceMemory",
  "visibilitychange",
]);

expect("lib/market-integrity/pass486-pdf-forge-intelligence.ts", [
  'version: "pass486-pdf-forge-intelligence"',
  'id: "identity"',
  'id: "sources"',
  '["reasoning"',
  '["seal"',
  "confidenceCeiling",
  "qualityGates",
  "Preview = download",
]);

expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  "buildPass486PdfForgeIntelligence",
  'data-pass486-evidence-bound-pdf-forge="true"',
  'data-pass486-evidence-bound-forge="true"',
  'data-pass486-quality-gates="parity-missing-sources-signature"',
  "minimumForgeMs",
  'selectedPdfDepth === "basic"',
]);
reject("components/search/VelmereIntelligenceSearchClient.tsx", [
  "window.setTimeout(resolve, 1460)",
]);

if (failures.length) {
  console.error(`PASS485–486 verifier failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PASS485–486 evidence brain / PDF forge verifier OK");
