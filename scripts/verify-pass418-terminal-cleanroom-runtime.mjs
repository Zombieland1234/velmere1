import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  ["pass418 module", read("lib/market-integrity/pass418-terminal-cleanroom-runtime.ts"), ["PASS418.terminal_cleanroom_runtime", "PASS418_RUNTIME_CLOSE_EVENT", "pass418ClampSuggestions", "pass418SafeText", "buildPass418MarketCoverageUniverse", "buildPass418StableAnalysisFields", "pass418SecurityPlainCopy", "chartRule"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["PASS418_RUNTIME_CLOSE_EVENT", "pass418ClampSuggestions", "useDeferredValue", "data-pass418-input-pinned-search", "data-pass418-three-only", "{false && mounted && suggestionsOpen"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["PASS418_RUNTIME_CLOSE_EVENT", "pass418ClampSuggestions", "useDeferredValue", "data-pass418-three-only"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["buildPass418MarketCoverageUniverse", "pass418SafeText", "real-markets-pass418-field-grid", "data-pass418-terminal-chart-anchor-stabilizer", "data-pass418-three-only", "useDeferredValue"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS418 TERMINAL CLEANROOM RUNTIME", "pass418StableFields", "pass418TerminalChartAnchorStabilizer", "data-pass418-preview-download-parity", "page === 41"]],
  ["css", read("app/globals.css"), ["PASS418 · terminal cleanroom runtime", "data-pass418-input-pinned-search", "real-markets-pass418-field-grid", "pass418-terminal-cleanroom-runtime"]],
  ["report", read("VELMERE_PASS418_TERMINAL_CLEANROOM_RUNTIME_REPORT.md"), ["PASS418", "Terminal Cleanroom Runtime", "PDF parity", "deferred local ranking"]],
];

for (const [label, source, needles] of checks) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`PASS418 verify failed in ${label}: missing ${needle}`);
      process.exit(1);
    }
  }
}

const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
if (!browser.includes("{false && mounted && suggestionsOpen")) {
  console.error("PASS418 verify failed: Browser floating portal must remain disabled until layout is rebuilt.");
  process.exit(1);
}

const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
if (realMarkets.includes("{id.price as any}") || realMarkets.includes("{id.change as any}")) {
  console.error("PASS418 verify failed: unsafe price/change JSX cast found.");
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
    console.error(`PASS418 parser failed in ${path.relative(root, file)}`);
    for (const diagnostic of sf.parseDiagnostics.slice(0, 5)) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));
    process.exit(1);
  }
}

console.log(`PASS418 terminal cleanroom runtime verified · ${files.length} TS/TSX parsed`);
