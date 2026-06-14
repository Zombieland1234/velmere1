import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const moduleSource = read("lib/market-integrity/adapter-fault-sweep-gate.ts");
const lensSource = read("components/search/VelmereIntelligenceSearchClient.tsx");
const marketSource = read("components/market-integrity/MarketIntegrityClient.tsx");
const mapSource = read("components/market-integrity/ShieldMapClient.tsx");
const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
const cssSource = read("app/globals.css");
const packageSource = read("package.json");

const required = [
  [moduleSource, "velmere_adapter_fault_sweep_gate_v1_pass300", "PASS300 module version"],
  [moduleSource, "blockedDarkPatterns", "PASS300 anti-dark-pattern rules"],
  [moduleSource, "runtimeScore", "PASS300 runtime score"],
  [moduleSource, "adapterScore", "PASS300 adapter score"],
  [lensSource, "data-pass300-adapter-fault-sweep=\"vlm-browser\"", "Lens PASS300 rail"],
  [lensSource, "data-pass300-result-sweep=\"adapter-fault-receipt\"", "Lens PASS300 receipt"],
  [marketSource, "data-pass300-adapter-fault-sweep=\"shield-terminal\"", "Shield terminal PASS300 rail"],
  [mapSource, "data-pass300-adapter-fault-sweep=\"shield-map\"", "Shield Map PASS300 rail"],
  [cssSource, ".shield-pass300-fault-sweep", "PASS300 CSS panel"],
  [cssSource, "data-pass300-lane-state", "PASS300 CSS lane states"],
  [packageSource, "verify:pass300-adapter-fault-sweep-gate", "PASS300 package script"],
];

const failures = required.filter(([source, marker]) => !source.includes(marker));
if (failures.length) {
  console.error("PASS300 guard failed. Missing markers:");
  for (const [, marker, label] of failures) console.error(`- ${label}: ${marker}`);
  process.exit(1);
}

const forbidden = [
  [modalSource, /buildLayoutStabilitySentinelGate\([^\n]*,\s*mode\s*\)/, "TokenRiskModal must not call layout gate with undefined mode"],
  [marketSource, /suggestionsOpen && suggestions\.length && selected/, "Shield suggestions must not render above selected token modal"],
  [moduleSource, /guaranteed safe|guaranteed profit|buy now|sell now|only \d+ spots/i, "PASS300 module must not contain hard dark-pattern wording"],
];

const forbiddenHits = forbidden.filter(([source, pattern]) => pattern.test(source));
if (forbiddenHits.length) {
  console.error("PASS300 guard failed. Forbidden patterns:");
  for (const [, pattern, label] of forbiddenHits) console.error(`- ${label}: ${pattern}`);
  process.exit(1);
}

console.log("PASS300 Adapter Fault Sweep Gate safety verified.");
