import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");

const root = process.cwd();
function read(path) { return readFileSync(join(root, path), "utf8"); }
function assertIncludes(name, haystack, needles) {
  for (const needle of needles) {
    if (!haystack.includes(needle)) throw new Error(`${name} missing ${needle}`);
  }
}
const checks = [
  ["pass410 module", read("lib/market-integrity/pass410-terminal-live-parity-orbit.ts"), ["PASS410_RUNTIME_CLOSE_EVENT", "buildPass410TerminalLiveParityReadout", "buildPass410MarketCoverageUniverse", "pass410AssetVisualPatch", "pass410PseudoPricePatch", "pass410TerminalLiveParityOrbit"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["PASS410_RUNTIME_CLOSE_EVENT", "pass410TerminalLiveParityOrbit", "buildPass410MarketCoverageUniverse", "pass410Readout", "pass410LiveParityTimeline", "data-pass410-terminal-live-parity-orbit"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["PASS410_RUNTIME_CLOSE_EVENT", "data-pass410-search-runtime-lock", "data-pass410-pdf-exact-payload"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["PASS410_RUNTIME_CLOSE_EVENT", "data-pass410-search-runtime-lock"]],
  ["shield map search", read("components/market-integrity/ShieldMapClient.tsx"), ["PASS410_RUNTIME_CLOSE_EVENT", "data-pass410-search-runtime-lock"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS410 TERMINAL LIVE PARITY ORBIT", "page === 36", "pass410Readout", "pass410LiveParityTimeline", "pass410TerminalLiveParityOrbit", "data-pass410-preview-download-parity"]],
  ["catalog", read("app/api/market-integrity/real-markets/catalog/route.ts"), ["buildPass410MarketCoverageUniverse", "pass410TerminalLiveParityOrbit"]],
  ["css", read("app/globals.css"), ["data-pass410-terminal-live-parity-orbit", "real-markets-pass410-live-parity-orbit"]],
];
for (const [name, haystack, needles] of checks) assertIncludes(name, haystack, needles);
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "dist"].includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}
let count = 0;
for (const file of walk(root)) {
  const source = readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const diagnostics = sf.parseDiagnostics || [];
  if (diagnostics.length) {
    const first = diagnostics[0];
    throw new Error(`TypeScript parser diagnostic in ${file}: ${first.messageText}`);
  }
  count += 1;
}
console.log(`PASS410 terminal live parity orbit verified · ${count} TS/TSX parsed`);
