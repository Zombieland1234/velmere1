import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [
  ["pass413 module", read("lib/market-integrity/pass413-terminal-stability-runtime.ts"), ["PASS413.terminal_stability_runtime", "PASS413_RUNTIME_CLOSE_EVENT", "max-3 search", "object-shaped metric"]],
  ["browser inline search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["data-pass413-inline-search", "routedVisibleSuggestions.slice(0, 3)", "false && mounted && suggestionsOpen", "PASS413_RUNTIME_CLOSE_EVENT"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["data-pass413-three-only", "suggestions.slice(0, 3)", "PASS413_RUNTIME_CLOSE_EVENT"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["data-pass413-three-only", "safePseudoText(record.price", "buildPass413MarketCoverageUniverse", "real-markets-pass413-orbit-disabled"]],
  ["css", read("app/globals.css"), ["PASS413 · stable max-3 search runtime", "data-pass413-inline-search", "data-pass413-three-only"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS413 TERMINAL STABILITY RUNTIME", "pass413TerminalStabilityRuntime.pdfRule", "pass413SecurityPlainCopy"]],
];

let failed = false;
for (const [label, content, needles] of checks) {
  for (const needle of needles) {
    if (!content.includes(needle)) {
      console.error(`PASS413 verify failed in ${label}: missing ${needle}`);
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
    console.error(`PASS413 parser failed in ${path.relative(root, file)}`);
    for (const diagnostic of sf.parseDiagnostics.slice(0, 5)) console.error(diagnostic.messageText);
    process.exit(1);
  }
}
console.log(`PASS413 terminal stability runtime verified · ${files.length} TS/TSX parsed`);
