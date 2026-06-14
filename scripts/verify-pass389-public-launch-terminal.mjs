import { readFileSync, existsSync } from "node:fs";

const checks = [
  ["lib/market-integrity/pass389-public-launch-terminal.ts", "PASS389.public_launch_terminal"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass389UnifiedReadout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass389-public-launch-terminal"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass389PublicLaunchTerminalContract"],
  ["app/api/market-integrity/cross-asset/route.ts", "pass389PublicLaunchTerminalContract"],
  ["app/api/search/lens-report/route.ts", "PASS389 PUBLIC LAUNCH TERMINAL"],
  ["app/api/search/lens-report/route.ts", "if (page === 20)"],
  ["app/api/search/lens-report/route.ts", "if (page === 21)"],
  ["app/api/search/lens-report/route.ts", "if (page === 22)"],
  ["app/api/search/lens-report/route.ts", "pass389-public-launch-terminal"],
  ["components/security/SecurityTrustPage.tsx", "security-pass389-public-launch"],
  ["app/[locale]/research-lab/page.tsx", "velmere-pass389-research-terminal"],
  ["app/globals.css", "PASS389 · public launch terminal"],
];

const missing = [];
for (const [file, marker] of checks) {
  if (!existsSync(file)) {
    missing.push(`${file} missing`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  if (!text.includes(marker)) missing.push(`${file} missing marker ${marker}`);
}
const lens = readFileSync("app/api/search/lens-report/route.ts", "utf8");
if (lens.includes("\n  {\n    pushPdfHeader(commands, report, 20")) {
  missing.push("lens-report still has unconditional PASS387/PASS388 PDF block");
}
if (missing.length) {
  console.error(missing.join("\n"));
  process.exit(1);
}
console.log("PASS389 public launch terminal guard passed");
