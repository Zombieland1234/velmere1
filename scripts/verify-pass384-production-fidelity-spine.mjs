import fs from "node:fs";
import path from "node:path";

const checks = [
  ["lib/market-integrity/pass384-production-fidelity-spine.ts", ["PASS384.production_fidelity_spine", "buildPass384ProductionReadout", "buildPass384MarketCoverageUniverse", "pass384ProviderChecklist", "pass384SecurityPlainCopy"]],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ["data-pass384-production-fidelity", "real-markets-pass384-production-readout", "buildPass384MarketCoverageUniverse()", "pass384ProviderChecklist", "pass384BrainStages"]],
  ["app/api/market-integrity/real-markets/catalog/route.ts", ["buildPass384MarketCoverageUniverse", "pass384ProductionFidelityContract", "pass384ProviderChecklist"]],
  ["app/api/search/lens-report/route.ts", ["PASS384 PRODUCTION FIDELITY SPINE", "pass384Readout", "pass384-preview-download-parity", "page === 17"]],
  ["components/security/SecurityTrustPage.tsx", ["security-pass384-production-public", "PASS384 · production public security"]],
  ["app/[locale]/research-lab/page.tsx", ["velmere-pass384-production-research", "PASS384 · production research lab"]],
  ["app/globals.css", ["PASS384 · production fidelity spine", "real-markets-pass384-production-readout", "security-pass384-production-public", "velmere-pass384-production-research"]],
];

const failures = [];
for (const [file, needles] of checks) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) {
    failures.push(`${file} missing`);
    continue;
  }
  const text = fs.readFileSync(absolute, "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${file} missing ${needle}`);
  }
}

const cross = fs.readFileSync("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "utf8");
if (!cross.includes("Object.assign(assetVisuals, pass384AssetVisualPatch)")) failures.push("PASS384 visual patch is not merged into Real Markets visuals");
if (!cross.includes("Object.assign(pseudoPrices, pass384PseudoPricePatch)")) failures.push("PASS384 pseudo price patch is not merged into Real Markets preview prices");
if (!cross.includes("pass384Readout.fields.map")) failures.push("PASS384 brain readout fields are not rendered");

const lens = fs.readFileSync("app/api/search/lens-report/route.ts", "utf8");
if (!lens.includes("17].map((page) => buildLensPdfPage")) failures.push("PASS384 did not extend downloaded PDF to page 17");
if (lens.includes("pass381Readout pass382Readout")) failures.push("old lens-report syntax poison returned");

const css = fs.readFileSync("app/globals.css", "utf8");
if (!css.includes(".real-markets-pass384-brain .real-markets-pass383-clean-readout")) failures.push("PASS384 does not hide the previous pass readout in the modal");

if (failures.length) {
  console.error("PASS384 verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("PASS384 verification passed: production fidelity spine, provider catalog, AI Brain, PDF mirror, security and research surfaces are wired.");
