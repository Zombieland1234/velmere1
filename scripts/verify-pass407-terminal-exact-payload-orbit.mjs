import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const required = [
  ["lib/market-integrity/pass407-terminal-exact-payload-orbit.ts", "PASS407_RUNTIME_CLOSE_EVENT"],
  ["lib/market-integrity/pass407-terminal-exact-payload-orbit.ts", "buildPass407MarketCoverageUniverse"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass407TerminalPayloadIntegrityOrbit"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass407MarketCoverageUniverse"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "PASS407_RUNTIME_CLOSE_EVENT"],
  ["components/market-integrity/MarketIntegrityClient.tsx", "PASS407_RUNTIME_CLOSE_EVENT"],
  ["components/market-integrity/ShieldMapClient.tsx", "PASS407_RUNTIME_CLOSE_EVENT"],
  ["app/api/search/lens-report/route.ts", "pass407Readout"],
  ["app/api/search/lens-report/route.ts", "page === 33"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "buildPass407MarketCoverageUniverse"],
  ["app/globals.css", "pass407-terminal-exact-payload-orbit"],
];

const failures = [];
for (const [file, marker] of required) {
  const body = readFileSync(join(root, file), "utf8");
  if (!body.includes(marker)) failures.push(`${file} missing ${marker}`);
}

function walk(dir, out = []) {
  for (const item of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "dist", "build"].includes(item)) continue;
    const path = join(dir, item);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if ([".ts", ".tsx"].includes(extname(path))) out.push(path);
  }
  return out;
}

let scanned = 0;
for (const file of walk(root)) {
  const body = readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, body, ts.ScriptTarget.Latest, true, kind);
  scanned += 1;
  if (source.parseDiagnostics.length) {
    failures.push(`${file}: ${source.parseDiagnostics.map((d) => d.messageText).join(" | ")}`);
  }
  const badFxKeys = body.match(/(^|[\s,{])(?:EUR|USD|GBP|JPY|CHF|AUD|CAD|NZD|NOK|SEK|PLN)\/(?:EUR|USD|GBP|JPY|CHF|AUD|CAD|NZD|NOK|SEK|PLN)\s*:/gm);
  if (badFxKeys) failures.push(`${file}: unquoted FX object key ${badFxKeys[0].trim()}`);
}

if (failures.length) {
  console.error("PASS407 verify failed:\n" + failures.slice(0, 60).join("\n"));
  process.exit(1);
}
console.log(`PASS407 terminal exact-payload orbit verified across ${scanned} TS/TSX files.`);
