import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const required = [
  ["lib/market-integrity/pass405-terminal-one-payload-orbit.ts", "PASS405_RUNTIME_CLOSE_EVENT"],
  ["lib/market-integrity/pass405-terminal-one-payload-orbit.ts", "buildPass405MarketCoverageUniverse"],
  ["lib/market-integrity/pass405-terminal-one-payload-orbit.ts", "buildPass405TerminalOnePayloadReadout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass405-terminal-one-payload-orbit"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass405MarketCoverageUniverse"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass405Readout"],
  ["components/market-integrity/MarketIntegrityClient.tsx", "PASS405_RUNTIME_CLOSE_EVENT"],
  ["components/market-integrity/MarketIntegrityClient.tsx", "data-pass405-search-runtime-lock"],
  ["components/market-integrity/ShieldMapClient.tsx", "PASS405_RUNTIME_CLOSE_EVENT"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "PASS405_RUNTIME_CLOSE_EVENT"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass405TerminalOnePayloadOrbit"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "buildPass405MarketCoverageUniverse"],
  ["app/api/search/lens-report/route.ts", "PASS405 TERMINAL ONE PAYLOAD ORBIT"],
  ["app/api/search/lens-report/route.ts", "pass405Readout"],
  ["app/api/search/lens-report/route.ts", "page === 31"],
  ["app/api/search/lens-report/route.ts", "31, 32].map"],
  ["app/globals.css", "PASS405 · terminal one-payload orbit"],
];
for (const [rel, marker] of required) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Missing PASS405 file: ${rel}`);
  const body = fs.readFileSync(file, "utf8");
  if (!body.includes(marker)) throw new Error(`Missing PASS405 marker ${marker} in ${rel}`);
}

const scanRoots = ["app", "components", "lib", "scripts"];
const exts = new Set([".ts", ".tsx", ".js", ".mjs"]);
const blockers = [];
let scanned = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (exts.has(path.extname(entry.name))) {
      scanned += 1;
      const rel = path.relative(root, full);
      const body = fs.readFileSync(full, "utf8");
      if (/\b[A-Z]{3}\/[A-Z]{3}\s*:/.test(body)) blockers.push(`${rel}: unquoted FX-like object key`);
      const kind = rel.endsWith(".tsx") ? ts.ScriptKind.TSX : rel.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;
      const source = ts.createSourceFile(rel, body, ts.ScriptTarget.Latest, true, kind);
      if (source.parseDiagnostics?.length) blockers.push(`${rel}: ${source.parseDiagnostics[0].messageText}`);
    }
  }
}
for (const rootName of scanRoots) {
  const dir = path.join(root, rootName);
  if (fs.existsSync(dir)) walk(dir);
}

const reportRoute = fs.readFileSync(path.join(root, "app/api/search/lens-report/route.ts"), "utf8");
if (!reportRoute.includes("page === 31")) blockers.push("lens-report: PASS405 PDF page 31 missing");
if (!reportRoute.includes("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]")) blockers.push("lens-report: PASS405 page 31 is not included in pageStreams");
if (/page === 31[\s\S]{0,280}`[^`]*$/.test(reportRoute)) blockers.push("lens-report: possible broken PASS405 PDF template");

if (blockers.length) throw new Error(`PASS405 targeted kernel sweep failed: ${blockers.slice(0, 30).join(" | ")}`);
console.log(`PASS405 terminal one-payload orbit guard passed. Kernel sweep scanned ${scanned} code files.`);
