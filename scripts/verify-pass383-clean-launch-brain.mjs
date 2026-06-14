import fs from "node:fs";

const checks = [
  ["lib/market-integrity/pass383-clean-launch-brain.ts", ["PASS383.clean_launch_brain", "buildPass383CleanReadout", "buildPass383MarketCoverageUniverse", "pass383SecurityCopy"]],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ["pass383-clean-launch-brain", "data-pass383-clean-launch-brain", "real-markets-pass383-clean-readout", "buildPass383MarketCoverageUniverse()"]],
  ["app/api/market-integrity/real-markets/catalog/route.ts", ["buildPass383MarketCoverageUniverse", "pass383CleanLaunchContract", "pass383ProviderLanes"]],
  ["app/api/search/lens-report/route.ts", ["PASS383 CLEAN LAUNCH BRAIN", "pass383Readout", "pass383-preview-download-parity"]],
  ["app/globals.css", ["PASS383 · clean launch brain", "real-markets-pass383-clean-readout", "security-pass383-clean-public", "velmere-pass383-research-clean"]],
];

const failures = [];
for (const [file, needles] of checks) {
  const text = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${file} missing ${needle}`);
  }
}
const lens = fs.readFileSync("app/api/search/lens-report/route.ts", "utf8");
if (lens.includes("pass381Readout pass382Readout")) failures.push("lens-report still contains broken pass381Readout pass382Readout syntax");
if (!lens.includes("pass381Readout: ReturnType")) failures.push("lens-report did not restore pass381Readout type");
const cross = fs.readFileSync("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "utf8");
if (!cross.includes("...buildPass383MarketCoverageUniverse()")) failures.push("Real Markets UI universe does not merge PASS383 rows");
if (!cross.includes("pass383BrainStages.slice")) failures.push("AI Brain phase row still uses legacy pass wall instead of PASS383 clean stages");

if (failures.length) {
  console.error("PASS383 verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("PASS383 verification passed: clean launch brain, real markets catalog, PDF parity and syntax repair are present.");
