import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const required = [
  ["lib/market-integrity/pass404-terminal-exact-orbit.ts", "PASS404_RUNTIME_CLOSE_EVENT"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass404-terminal-exact-orbit"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass404MarketCoverageUniverse"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass404Readout"],
  ["components/market-integrity/MarketIntegrityClient.tsx", "PASS404_RUNTIME_CLOSE_EVENT"],
  ["components/market-integrity/MarketIntegrityClient.tsx", "data-pass404-search-runtime-lock"],
  ["components/market-integrity/ShieldMapClient.tsx", "PASS404_RUNTIME_CLOSE_EVENT"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "PASS404_RUNTIME_CLOSE_EVENT"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass404TerminalExactOrbit"],
  ["app/api/search/lens-report/route.ts", "PASS404 TERMINAL EXACT ORBIT"],
  ["app/api/search/lens-report/route.ts", "pass404Readout"],
  ["app/api/search/lens-report/route.ts", "page === 30"],
  ["app/globals.css", "PASS404 · terminal exact orbit"],
];
for (const [rel, marker] of required) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Missing PASS404 file: ${rel}`);
  const body = fs.readFileSync(file, "utf8");
  if (!body.includes(marker)) throw new Error(`Missing PASS404 marker ${marker} in ${rel}`);
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
      // Mixed ?? with || is only a blocker when TypeScript parser reports it; older files may contain parenthesized safe fallbacks.
      if (/\b[A-Z]{3}\/[A-Z]{3}\s*:/.test(body)) blockers.push(`${rel}: unquoted FX-like object key`);
      const kind = rel.endsWith(".tsx") ? ts.ScriptKind.TSX : rel.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;
      const source = ts.createSourceFile(rel, body, ts.ScriptTarget.Latest, true, kind);
      if (source.parseDiagnostics?.length) {
        blockers.push(`${rel}: ${source.parseDiagnostics[0].messageText}`);
      }
    }
  }
}
for (const rootName of scanRoots) {
  const dir = path.join(root, rootName);
  if (fs.existsSync(dir)) walk(dir);
}

const reportRoute = fs.readFileSync(path.join(root, "app/api/search/lens-report/route.ts"), "utf8");
if (!reportRoute.includes("page === 30") || !reportRoute.includes("page === 31")) blockers.push("lens-report: PASS404/PASS405 PDF pages are not both routed");
if (/page === 30[\s\S]{0,260}`[^`]*$/.test(reportRoute)) blockers.push("lens-report: possible broken PASS404 PDF template");

if (blockers.length) throw new Error(`PASS404 targeted kernel sweep failed: ${blockers.slice(0, 20).join(" | ")}`);
console.log(`PASS404 terminal exact orbit guard passed. Kernel sweep scanned ${scanned} changed code files.`);
