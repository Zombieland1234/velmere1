import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "lib/market-integrity/decision-flow-orchestrator-gate.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/globals.css",
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length) {
  throw new Error(`PASS295 missing files: ${missingFiles.join(", ")}`);
}

const moduleSource = readFileSync("lib/market-integrity/decision-flow-orchestrator-gate.ts", "utf8");
const lensSource = readFileSync("components/search/VelmereIntelligenceSearchClient.tsx", "utf8");
const marketSource = readFileSync("components/market-integrity/MarketIntegrityClient.tsx", "utf8");
const mapSource = readFileSync("components/market-integrity/ShieldMapClient.tsx", "utf8");
const cssSource = readFileSync("app/globals.css", "utf8");
const packageSource = readFileSync("package.json", "utf8");

const markers = [
  [moduleSource, "PASS295_DECISION_FLOW_ORCHESTRATOR_GATE"],
  [moduleSource, "velmere_decision_flow_orchestrator_gate_v1_pass295"],
  [moduleSource, "one calm operator action"],
  [moduleSource, "no hidden engagement-only ranking"],
  [lensSource, "buildDecisionFlowOrchestratorGate"],
  [lensSource, "data-pass295-decision-flow=\"vlm-browser\""],
  [lensSource, "data-pass295-result-decision=\"receipt\""],
  [marketSource, "data-pass295-decision-flow=\"shield-terminal\""],
  [mapSource, "data-pass295-decision-flow=\"shield-map\""],
  [cssSource, "PASS295 · Decision Flow Orchestrator"],
  [cssSource, ".shield-pass295-decision-flow"],
  [packageSource, "verify:pass295-decision-flow-orchestrator-gate"],
];

const missingMarkers = markers.filter(([source, marker]) => !source.includes(marker)).map(([, marker]) => marker);
if (missingMarkers.length) {
  throw new Error(`PASS295 missing markers: ${missingMarkers.join(", ")}`);
}

const publicSurface = [lensSource, marketSource, mapSource].join("\n").toLowerCase();
const forbidden = [
  "guaranteed profit",
  "guaranteed safety",
  "buy now before",
  "last chance",
  "risk free",
  "100% safe",
  "this is financial advice",
  "make money fast",
  "guaranteed outcome",
];
const hits = forbidden.filter((phrase) => publicSurface.includes(phrase));
if (hits.length) {
  throw new Error(`PASS295 forbidden public wording: ${hits.join(", ")}`);
}

if (!moduleSource.includes("source_first") || !moduleSource.includes("slow_down")) {
  throw new Error("PASS295 must preserve friction states for weak evidence.");
}

console.log("PASS295 Decision Flow Orchestrator Gate safety check passed.");
