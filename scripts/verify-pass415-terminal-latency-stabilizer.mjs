import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  ["pass415 module", read("lib/market-integrity/pass415-terminal-latency-stabilizer.ts"), ["PASS415.terminal_latency_stabilizer", "PASS415_RUNTIME_CLOSE_EVENT", "pass415ClampSuggestions", "buildPass415MarketCoverageUniverse", "buildPass415StableAnalysisFields"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["PASS415_RUNTIME_CLOSE_EVENT", "pass415ClampSuggestions", "data-pass415-input-pinned-search", "data-pass415-three-only"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["PASS415_RUNTIME_CLOSE_EVENT", "pass415ClampSuggestions", "data-pass415-search-runtime-lock", "data-pass415-three-only"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["buildPass415MarketCoverageUniverse", "pass415SafeText", "real-markets-pass415-field-grid", "data-pass415-terminal-latency-stabilizer"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS415 TERMINAL LATENCY STABILIZER", "pass415StableFields", "pass415TerminalLatencyStabilizer", "data-pass415-preview-download-parity", "page === 39"]],
  ["css", read("app/globals.css"), ["PASS415 · terminal latency stabilizer", "data-pass415-input-pinned-search", "real-markets-pass415-field-grid", "pass415-terminal-latency-stabilizer"]],
];

for (const [label, source, needles] of checks) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`PASS415 verify failed in ${label}: missing ${needle}`);
      process.exit(1);
    }
  }
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
    console.error(`PASS415 parser failed in ${path.relative(root, file)}`);
    for (const diagnostic of sf.parseDiagnostics.slice(0, 5)) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));
    process.exit(1);
  }
}

console.log(`PASS415 terminal latency stabilizer verified · ${files.length} TS/TSX parsed`);
