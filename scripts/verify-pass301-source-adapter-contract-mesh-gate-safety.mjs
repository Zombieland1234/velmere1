import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const moduleSource = read("lib/market-integrity/source-adapter-contract-mesh-gate.ts");
const lensSource = read("components/search/VelmereIntelligenceSearchClient.tsx");
const marketSource = read("components/market-integrity/MarketIntegrityClient.tsx");
const mapSource = read("components/market-integrity/ShieldMapClient.tsx");
const cssSource = read("app/globals.css");
const packageSource = read("package.json");

const required = [
  [moduleSource, "velmere_source_adapter_contract_mesh_gate_v1_pass301", "PASS301 module version"],
  [moduleSource, "PASS301_SOURCE_ADAPTER_CONTRACT_MESH_GATE", "PASS301 exported marker"],
  [moduleSource, "timeoutMs", "adapter timeout contract"],
  [moduleSource, "retryPolicy", "adapter retry policy"],
  [moduleSource, "customerBoundary", "customer boundary contract"],
  [moduleSource, "No countdown, no fake scarcity, no buy/sell command", "anti-FOMO safety boundary"],
  [lensSource, "data-pass301-source-adapter-contract-mesh=\"vlm-browser\"", "Lens PASS301 rail"],
  [lensSource, "data-pass301-result-mesh=\"source-adapter-contract-receipt\"", "Lens PASS301 receipt"],
  [marketSource, "data-pass301-source-adapter-contract-mesh=\"shield-terminal\"", "Shield terminal PASS301 rail"],
  [mapSource, "data-pass301-source-adapter-contract-mesh=\"shield-map\"", "Shield Map PASS301 rail"],
  [cssSource, ".shield-pass301-contract-mesh", "PASS301 CSS panel"],
  [cssSource, "data-pass301-lane-state", "PASS301 CSS lane states"],
  [packageSource, "verify:pass301-source-adapter-contract-mesh-gate", "PASS301 package script"],
];

const forbidden = [
  [moduleSource, /guaranteed profit/i, "forbidden profit guarantee"],
  [moduleSource, /guaranteed liquidity/i, "forbidden liquidity guarantee"],
  [moduleSource, /buy now|sell now|ape in/i, "forbidden trading command"],
  [lensSource + marketSource + mapSource, /countdown|last chance|only today/i, "forbidden dark-pattern pressure"],
];

const missing = required.filter(([source, needle]) => !source.includes(needle));
if (missing.length) {
  console.error("PASS301 source adapter contract mesh verification failed:");
  for (const [, , label] of missing) console.error(`- missing ${label}`);
  process.exit(1);
}

const hits = forbidden.filter(([source, pattern]) => pattern.test(source));
if (hits.length) {
  console.error("PASS301 source adapter contract mesh dark-pattern verification failed:");
  for (const [, , label] of hits) console.error(`- found ${label}`);
  process.exit(1);
}

console.log("PASS301 source adapter contract mesh gate verified.");
