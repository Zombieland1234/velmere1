import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [
  ["pass414 module", read("lib/market-integrity/pass414-terminal-parity-stabilizer.ts"), ["PASS414.terminal_parity_stabilizer", "PASS414_RUNTIME_CLOSE_EVENT", "buildPass414MarketCoverageUniverse", "pass414SafeMetricText", "buildPass414StableAnalysisFields"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["data-pass414-input-pinned-search", "routedVisibleSuggestions.slice(0, 3)", "PASS414_RUNTIME_CLOSE_EVENT"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["data-pass414-three-only", "suggestions.slice(0, 3)", "PASS414_RUNTIME_CLOSE_EVENT"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["buildPass414MarketCoverageUniverse", "formatPseudoChange", "real-markets-pass414-stable-output", "data-pass414-terminal-parity-stabilizer", "buildPass414StableAnalysisFields"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS414 TERMINAL PARITY STABILIZER", "pass414StableFields", "pass414TerminalParityStabilizer", "data-pass414-preview-download-parity", "page === 38"]],
  ["css", read("app/globals.css"), ["PASS414 · terminal parity stabilizer", "real-markets-pass414-field-grid", "data-pass414-preview-download-parity", "data-pass414-three-only"]],
];

let failed = false;
for (const [label, content, needles] of checks) {
  for (const needle of needles) {
    if (!content.includes(needle)) {
      console.error(`PASS414 verify failed in ${label}: missing ${needle}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}
walk(root);
const require = createRequire(import.meta.url);
const ts = require("typescript");
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (sf.parseDiagnostics.length) {
    console.error(`PASS414 parser failed in ${path.relative(root, file)}`);
    for (const diagnostic of sf.parseDiagnostics.slice(0, 5)) console.error(diagnostic.messageText);
    process.exit(1);
  }
}
console.log(`PASS414 terminal parity stabilizer verified · ${files.length} TS/TSX parsed`);
