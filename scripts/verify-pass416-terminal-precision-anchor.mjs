import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  ["pass416 module", read("lib/market-integrity/pass416-terminal-precision-anchor.ts"), ["PASS416.terminal_precision_anchor", "PASS416_RUNTIME_CLOSE_EVENT", "pass416ClampSuggestions", "pass416SafeText", "buildPass416MarketCoverageUniverse", "buildPass416StableAnalysisFields", "pass416SecurityPlainCopy"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["PASS416_RUNTIME_CLOSE_EVENT", "pass416ClampSuggestions", "data-pass416-input-pinned-search", "data-pass416-three-only", "data-pass416-disabled-floating-portal", "data-pass416-pdf-modal-stable-payload"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["PASS416_RUNTIME_CLOSE_EVENT", "pass416ClampSuggestions", "data-pass416-search-runtime-lock", "data-pass416-three-only"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["buildPass416MarketCoverageUniverse", "pass416SafeText", "real-markets-pass416-field-grid", "data-pass416-terminal-precision-anchor", "data-pass416-three-only"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS416 TERMINAL PRECISION ANCHOR", "pass416StableFields", "pass416TerminalPrecisionAnchor", "data-pass416-preview-download-parity", "page === 40"]],
  ["css", read("app/globals.css"), ["PASS416 · terminal precision anchor", "data-pass416-input-pinned-search", "real-markets-pass416-field-grid", "pass416-terminal-precision-anchor"]],
  ["report", read("VELMERE_PASS416_TERMINAL_PRECISION_ANCHOR_REPORT.md"), ["PASS416", "Terminal Precision Anchor", "Orbit 360 still parked", "PDF parity"]],
];

for (const [label, source, needles] of checks) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`PASS416 verify failed in ${label}: missing ${needle}`);
      process.exit(1);
    }
  }
}

const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
if (!browser.includes("{false && mounted && suggestionsOpen")) {
  console.error("PASS416 verify failed: Browser floating portal must remain disabled until layout is rebuilt.");
  process.exit(1);
}

const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const shellLine = realMarkets.split("\n").find((line) => line.includes("aria-label=\"Velmère Real Markets\"")) || "";
const duplicatePass407 = (shellLine.match(/data-pass407-terminal-exact-payload-orbit/g) || []).length;
if (duplicatePass407 > 1) {
  console.error(`PASS416 verify failed: duplicate PASS407 JSX marker in Real Markets shell count ${duplicatePass407}`);
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
    console.error(`PASS416 parser failed in ${path.relative(root, file)}`);
    for (const diagnostic of sf.parseDiagnostics.slice(0, 5)) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));
    process.exit(1);
  }
}

console.log(`PASS416 terminal precision anchor verified · ${files.length} TS/TSX parsed`);
