import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  ["pass417 module", read("lib/market-integrity/pass417-terminal-chart-anchor-stabilizer.ts"), ["PASS417.terminal_chart_anchor_stabilizer", "PASS417_RUNTIME_CLOSE_EVENT", "pass417ClampSuggestions", "pass417SafeText", "buildPass417MarketCoverageUniverse", "buildPass417StableAnalysisFields", "pass417SecurityPlainCopy", "chartRule"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["PASS417_RUNTIME_CLOSE_EVENT", "pass417ClampSuggestions", "data-pass417-input-pinned-search", "data-pass417-three-only", "data-pass417-input-pinned-search"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["PASS417_RUNTIME_CLOSE_EVENT", "pass417ClampSuggestions", "data-pass417-three-only"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["buildPass417MarketCoverageUniverse", "pass417SafeText", "real-markets-pass417-field-grid", "data-pass417-terminal-chart-anchor-stabilizer", "data-pass417-three-only"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS417 TERMINAL CHART ANCHOR STABILIZER", "pass417StableFields", "pass417TerminalChartAnchorStabilizer", "data-pass417-preview-download-parity", "page === 41"]],
  ["css", read("app/globals.css"), ["PASS417 · terminal chart anchor stabilizer", "data-pass417-input-pinned-search", "real-markets-pass417-field-grid", "pass417-terminal-chart-anchor-stabilizer"]],
  ["report", read("VELMERE_PASS417_TERMINAL_CHART_ANCHOR_STABILIZER_REPORT.md"), ["PASS417", "Terminal Chart Anchor Stabilizer", "Orbit 360 remains parked", "PDF parity"]],
];

for (const [label, source, needles] of checks) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`PASS417 verify failed in ${label}: missing ${needle}`);
      process.exit(1);
    }
  }
}

const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
if (!browser.includes("{false && mounted && suggestionsOpen")) {
  console.error("PASS417 verify failed: Browser floating portal must remain disabled until layout is rebuilt.");
  process.exit(1);
}

const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const shellLine = realMarkets.split("\n").find((line) => line.includes("aria-label=\"Velmère Real Markets\"")) || "";
const duplicatePass407 = (shellLine.match(/data-pass407-terminal-exact-payload-orbit/g) || []).length;
if (duplicatePass407 > 1) {
  console.error(`PASS417 verify failed: duplicate PASS407 JSX marker in Real Markets shell count ${duplicatePass407}`);
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
    console.error(`PASS417 parser failed in ${path.relative(root, file)}`);
    for (const diagnostic of sf.parseDiagnostics.slice(0, 5)) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));
    process.exit(1);
  }
}

console.log(`PASS417 terminal chart anchor stabilizer verified · ${files.length} TS/TSX parsed`);
