import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const moduleSource = read("lib/market-integrity/reserve-provenance-twin-gate.ts");
const lensSource = read("components/search/VelmereIntelligenceSearchClient.tsx");
const marketSource = read("components/market-integrity/MarketIntegrityClient.tsx");
const mapSource = read("components/market-integrity/ShieldMapClient.tsx");
const cssSource = read("app/globals.css");
const packageSource = read("package.json");

const checks = [
  [moduleSource, "PASS298_RESERVE_PROVENANCE_TWIN_GATE"],
  [moduleSource, "velmere_reserve_provenance_twin_gate_v1_pass298"],
  [moduleSource, "MEXC-style Proof of Reserves"],
  [moduleSource, "LVMH/Aura-style DPP logic"],
  [moduleSource, "FOMO becomes a brake"],
  [moduleSource, "no buy/sell command"],
  [lensSource, "buildReserveProvenanceTwinGate"],
  [lensSource, "data-pass298-reserve-provenance-twin=\"vlm-browser\""],
  [lensSource, "data-pass298-result-twin=\"reserve-provenance-receipt\""],
  [marketSource, "data-pass298-reserve-provenance-twin=\"shield-terminal\""],
  [mapSource, "data-pass298-reserve-provenance-twin=\"shield-map\""],
  [cssSource, ".shield-pass298-reserve-twin"],
  [cssSource, "data-pass298-lane-state"],
  [packageSource, "verify:pass298-reserve-provenance-twin-gate"],
];

const missing = checks.filter(([source, marker]) => !source.includes(marker)).map(([, marker]) => marker);

if (missing.length) {
  console.error("PASS298 reserve provenance twin gate verification failed:");
  for (const marker of missing) console.error(`- missing ${marker}`);
  process.exit(1);
}

console.log("PASS298 reserve provenance twin gate verification passed.");
