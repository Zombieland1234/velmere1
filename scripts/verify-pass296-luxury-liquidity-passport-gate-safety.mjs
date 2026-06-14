import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const moduleSource = read("lib/market-integrity/luxury-liquidity-passport-gate.ts");
const lensSource = read("components/search/VelmereIntelligenceSearchClient.tsx");
const marketSource = read("components/market-integrity/MarketIntegrityClient.tsx");
const mapSource = read("components/market-integrity/ShieldMapClient.tsx");
const cssSource = read("app/globals.css");
const packageSource = read("package.json");

const checks = [
  [moduleSource, "PASS296_LUXURY_LIQUIDITY_PASSPORT_GATE"],
  [moduleSource, "velmere_luxury_liquidity_passport_gate_v1_pass296"],
  [moduleSource, "MEXC-style depth"],
  [moduleSource, "LVMH/Aura-style traceability"],
  [moduleSource, "no artificial allocation scarcity"],
  [lensSource, "buildLuxuryLiquidityPassportGate"],
  [lensSource, "data-pass296-luxury-liquidity-passport=\"vlm-browser\""],
  [lensSource, "data-pass296-result-passport=\"proof-seal\""],
  [marketSource, "data-pass296-luxury-liquidity-passport=\"shield-terminal\""],
  [mapSource, "data-pass296-luxury-liquidity-passport=\"shield-map\""],
  [cssSource, ".shield-pass296-liquidity-passport"],
  [packageSource, "verify:pass296-luxury-liquidity-passport-gate"],
];

const missing = checks.filter(([source, marker]) => !source.includes(marker)).map(([, marker]) => marker);

if (missing.length) {
  console.error("PASS296 luxury liquidity passport gate verification failed:");
  for (const marker of missing) console.error(`- missing ${marker}`);
  process.exit(1);
}

console.log("PASS296 luxury liquidity passport gate verification passed.");
