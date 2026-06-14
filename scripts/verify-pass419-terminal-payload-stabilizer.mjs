import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  ["pass419 module", read("lib/market-integrity/pass419-terminal-payload-stabilizer.ts"), ["PASS419.terminal_payload_stabilizer", "PASS419_RUNTIME_CLOSE_EVENT", "pass419ClampSuggestions", "pass419SafeText", "buildPass419MarketCoverageUniverse", "buildPass419StableAnalysisFields", "pass419SecurityPlainCopy", "PASS419 stabilizer"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["PASS419_RUNTIME_CLOSE_EVENT", "pass419ClampSuggestions", "useDeferredValue", "data-pass419-input-pinned-search", "data-pass419-three-only", "{false && mounted && suggestionsOpen"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["PASS419_RUNTIME_CLOSE_EVENT", "pass419ClampSuggestions", "useDeferredValue", "data-pass419-three-only"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["buildPass419MarketCoverageUniverse", "pass419SafeText", "real-markets-pass419-field-grid", "data-pass419-terminal-payload-stabilizer", "data-pass419-three-only", "useDeferredValue", "Orbit 360 paused · PASS419"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS419 TERMINAL PAYLOAD STABILIZER", "pass419StableFields", "pass419TerminalChartAnchorStabilizer", "data-pass419-preview-download-parity", "page === 42"]],
  ["css", read("app/globals.css"), ["PASS419 · terminal payload stabilizer", "data-pass419-input-pinned-search", "real-markets-pass419-field-grid", "pass419-terminal-payload-stabilizer"]],
  ["report", read("VELMERE_PASS419_TERMINAL_PAYLOAD_STABILIZER_REPORT.md"), ["PASS419", "Terminal Payload Stabilizer", "PDF parity", "three suggestions", "Orbit remains parked"]],
];

for (const [label, source, needles] of checks) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`PASS419 verify failed in ${label}: missing ${needle}`);
      process.exit(1);
    }
  }
}

const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
if (!browser.includes("{false && mounted && suggestionsOpen")) {
  console.error("PASS419 verify failed: Browser floating portal must remain disabled until layout is rebuilt.");
  process.exit(1);
}

const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
if (realMarkets.includes("{id.price as any}") || realMarkets.includes("{id.change as any}")) {
  console.error("PASS419 verify failed: unsafe price/change JSX cast found.");
  process.exit(1);
}
if (!realMarkets.includes("pass419SafeText(record.price ?? record.change ?? record.value ?? record.label")) {
  console.error("PASS419 verify failed: Real Markets must flatten object metric records before JSX.");
  process.exit(1);
}

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && entry.name !== "next-env.d.ts") files.push(full);
  }
}
walk(root);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (sf.parseDiagnostics.length) {
    console.error(`PASS419 parser failed in ${path.relative(root, file)}`);
    for (const diagnostic of sf.parseDiagnostics.slice(0, 5)) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));
    process.exit(1);
  }
}

console.log(`PASS419 terminal payload stabilizer verified · ${files.length} TS/TSX parsed`);
