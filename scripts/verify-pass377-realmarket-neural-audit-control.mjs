import fs from "node:fs";

const checks = [
  ["lib/market-integrity/pass377-realmarket-neural-audit-control.ts", ["pass377MarketExpansion", "buildPass377NeuralAuditReadout", "pass377PdfParityControl", "pass377UnifiedFidelityContract"]],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ["buildPass377MarketCoverageUniverse", "pass377NeuralAuditPhases", "real-markets-pass377-control-room", "real-markets-pass377-neural-readout"]],
  ["app/api/market-integrity/real-markets/catalog/route.ts", ["pass377UnifiedFidelityContract", "buildPass377MarketCoverageUniverse"]],
  ["app/api/search/lens-report/route.ts", ["PASS377 NEURAL AUDIT CONTROL", "pass377Readout", "pass377PdfParityControl"]],
  ["components/security/SecurityTrustPage.tsx", ["data-pass377-security-launch-plain", "Klucz prywatny zostaje prywatny"]],
  ["app/[locale]/research-lab/page.tsx", ["data-pass377-prime-crypto-fidelity", "fake-zero test", "neighbor-shift"]],
  ["app/globals.css", ["real-markets-pass377-control-room", "velmere-pass377-prime-fidelity"]],
];

const missing = [];
for (const [file, markers] of checks) {
  if (!fs.existsSync(file)) {
    missing.push(`${file}: missing file`);
    continue;
  }
  const content = fs.readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!content.includes(marker)) missing.push(`${file}: missing marker ${marker}`);
  }
}

const moduleText = fs.readFileSync("lib/market-integrity/pass377-realmarket-neural-audit-control.ts", "utf8");
const rows = (moduleText.match(/marketRow\(/g) || []).length;
if (rows < 40) missing.push(`PASS377 market expansion too small: ${rows}`);

if (missing.length) {
  console.error("PASS377 guard failed");
  for (const item of missing) console.error("-", item);
  process.exit(1);
}

console.log(`PASS377 guard passed · market rows ${rows} · neural audit + pdf parity + security/research copy present`);
