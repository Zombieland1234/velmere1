import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const moduleSource = read("lib/market-integrity/depth-resilience-radar-gate.ts");
const lensSource = read("components/search/VelmereIntelligenceSearchClient.tsx");
const marketSource = read("components/market-integrity/MarketIntegrityClient.tsx");
const mapSource = read("components/market-integrity/ShieldMapClient.tsx");
const cssSource = read("app/globals.css");
const packageSource = read("package.json");

const checks = [
  [moduleSource, "PASS297_DEPTH_RESILIENCE_RADAR_GATE"],
  [moduleSource, "velmere_depth_resilience_radar_gate_v1_pass297"],
  [moduleSource, "MEXC-style market depth"],
  [moduleSource, "LVMH/Aura-style product passport"],
  [moduleSource, "FOMO becomes friction"],
  [moduleSource, "no forced urgency"],
  [lensSource, "buildDepthResilienceRadarGate"],
  [lensSource, "data-pass297-depth-resilience-radar=\"vlm-browser\""],
  [lensSource, "data-pass297-result-radar=\"resilience-receipt\""],
  [marketSource, "data-pass297-depth-resilience-radar=\"shield-terminal\""],
  [mapSource, "data-pass297-depth-resilience-radar=\"shield-map\""],
  [cssSource, ".shield-pass297-depth-radar"],
  [cssSource, "data-pass297-ring-state"],
  [packageSource, "verify:pass297-depth-resilience-radar-gate"],
];

const missing = checks.filter(([source, marker]) => !source.includes(marker)).map(([, marker]) => marker);

if (missing.length) {
  console.error("PASS297 depth resilience radar gate verification failed:");
  for (const marker of missing) console.error(`- missing ${marker}`);
  process.exit(1);
}

console.log("PASS297 depth resilience radar gate verification passed.");
