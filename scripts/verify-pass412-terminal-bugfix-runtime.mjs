import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [
  ["pass412 module", read("lib/market-integrity/pass412-terminal-bugfix-runtime.ts"), ["PASS412.terminal_bugfix_runtime", "three suggestions", "object-shaped { price, change }", "Orbit 360 is temporarily paused"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["PseudoMarketPatchValue", "safePseudoText", "data-pass412-orbit-disabled", "data-pass412-three-suggestions", "real-markets-pass412-orbit-disabled", "suggestions.slice(0, 3)"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["data-pass412-three-suggestions", "Math.min(suggestions.length, 3)", "suggestions.slice(0, 3)", "max: 3"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["searchAnchorRef", "data-pass412-browser-three-suggestions", "routedVisibleSuggestions.slice(0, 3)", "max: 3"]],
  ["chart drag", read("components/market-integrity/TokenRiskModal.tsx"), ["PASS412: smooth start", "pixelsPerBar = 18", "deltaBars === 0"]],
  ["research lab", read("app/[locale]/research-lab/page.tsx"), ["pass390ProductionGradeTerminalContract", "pass391ProductionClosureContract", "pass392PublicFidelityCore"]],
];
for (const [label, content, needles] of checks) {
  for (const needle of needles) {
    if (!content.includes(needle)) {
      console.error(`PASS412 verify failed in ${label}: missing ${needle}`);
      process.exit(1);
    }
  }
}
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
    console.error(`PASS412 parser failed in ${file}`);
    for (const d of sf.parseDiagnostics.slice(0, 5)) console.error(d.messageText);
    process.exit(1);
  }
}
console.log(`PASS412 terminal bugfix runtime verified · ${files.length} TS/TSX parsed`);
