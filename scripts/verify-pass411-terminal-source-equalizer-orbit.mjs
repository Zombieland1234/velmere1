import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [
  ["pass411 module", read("lib/market-integrity/pass411-terminal-source-equalizer-orbit.ts"), ["PASS411_RUNTIME_CLOSE_EVENT", "buildPass411TerminalSourceEqualizerReadout", "buildPass411MarketCoverageUniverse", "pass411AssetVisualPatch", "pass411PseudoPricePatch", "pass411TerminalSourceEqualizerOrbit", "pass411ResearchBridge"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["PASS411_RUNTIME_CLOSE_EVENT", "pass411TerminalSourceEqualizerOrbit", "buildPass411MarketCoverageUniverse", "pass411Readout", "pass411SourceEqualizerTimeline", "data-pass411-terminal-source-equalizer-orbit"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["PASS411_RUNTIME_CLOSE_EVENT", "data-pass411-search-runtime-lock", "data-pass411-pdf-source-equalizer"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["PASS411_RUNTIME_CLOSE_EVENT", "data-pass411-search-runtime-lock"]],
  ["shield map search", read("components/market-integrity/ShieldMapClient.tsx"), ["PASS411_RUNTIME_CLOSE_EVENT", "data-pass411-search-runtime-lock"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS411 TERMINAL SOURCE EQUALIZER ORBIT", "page === 37", "pass411Readout", "pass411SourceEqualizerTimeline", "pass411TerminalSourceEqualizerOrbit", "data-pass411-preview-download-parity"]],
  ["catalog", read("app/api/market-integrity/real-markets/catalog/route.ts"), ["buildPass411MarketCoverageUniverse", "pass411TerminalSourceEqualizerOrbit"]],
  ["css", read("app/globals.css"), ["data-pass411-terminal-source-equalizer-orbit", "real-markets-pass411-source-equalizer-orbit"]],
];

for (const [label, content, needles] of checks) {
  for (const needle of needles) {
    if (!content.includes(needle)) {
      console.error(`PASS411 verify failed in ${label}: missing ${needle}`);
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
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}
walk(root);
const require = createRequire(import.meta.url);
const ts = require("typescript");
let count = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const bad = sf.parseDiagnostics || [];
  if (bad.length) {
    console.error(`PASS411 parser failed in ${file}`);
    for (const d of bad.slice(0, 5)) console.error(d.messageText);
    process.exit(1);
  }
  count += 1;
}
console.log(`PASS411 terminal source equalizer orbit verified · ${count} TS/TSX parsed`);
