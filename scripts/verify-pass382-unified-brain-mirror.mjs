import fs from "node:fs";

const checks = [
  ["lib/market-integrity/pass382-unified-brain-mirror.ts", ["pass382UnifiedBrainMirrorContract", "buildPass382UnifiedReadout", "pass382MarketExpansion", "pass382PdfMirror"]],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ["buildPass382MarketCoverageUniverse", "real-markets-pass382-unified-brain", "data-pass382-unified-brain-mirror", "pass382ProviderControlDeck"]],
  ["app/api/market-integrity/real-markets/catalog/route.ts", ["buildPass382MarketCoverageUniverse", "pass382UnifiedBrainMirrorContract", "pass382PdfMirror"]],
  ["app/api/search/lens-report/route.ts", ["PASS382 UNIFIED BRAIN MIRROR", "pass382-unified-brain-mirror", "pass382Readout"]],
  ["components/security/SecurityTrustPage.tsx", ["security-pass382-public-mirror", "Signature proof", "Real entropy"]],
  ["app/[locale]/research-lab/page.tsx", ["velmere-pass382-research-mirror", "Determinism animation", "Real RNG"]],
  ["app/globals.css", ["PASS382 · unified brain mirror", "real-markets-pass382-unified-brain", "velmere-pass382-research-mirror"]],
];

const failures = [];
for (const [file, needles] of checks) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${file}: missing ${needle}`);
  }
}

const component = fs.readFileSync("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "utf8");
if ((component.match(/<small>\{id\.name\} · \{id\.type\}<\/small>/g) ?? []).length > 1) {
  failures.push("Real Markets suggestion row repeats id.name/id.type twice");
}
if (!component.includes("...buildPass381MarketCoverageUniverse(), ...buildPass382MarketCoverageUniverse()")) {
  failures.push("PASS382 catalog rows are not merged into the Real Markets UI universe");
}

const route = fs.readFileSync("app/api/market-integrity/real-markets/catalog/route.ts", "utf8");
if (!route.includes("...buildPass382MarketCoverageUniverse()")) failures.push("catalog route missing PASS382 rows");

if (failures.length) {
  console.error("PASS382 verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("PASS382 verification passed: unified Brain mirror, Real Markets catalog, PDF marker, Security and Research Lab markers are present.");
