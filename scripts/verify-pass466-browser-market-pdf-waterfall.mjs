import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function expect(file, needles) {
  const source = read(file);
  for (const needle of needles) {
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS466 marker ${needle}`);
  }
}

expect("lib/search/intelligence-search-contract.ts", [
  '| "market"',
  'market: "Markets"',
  'fundamentalFilingUrl?: string',
  'fundamentalSecState?:',
]);
expect("lib/search/pass466-real-market-lens.ts", [
  "buildPass466LensMarketCatalog",
  "searchPass466LensMarkets",
  "Suggestion requests remain catalog-only",
]);
expect("app/api/search/route.ts", [
  'intent: SearchIntent',
  'resolveSearchIntent',
  'loadPass466MarketMatches',
  'resolvePass459AlphaVantageSnapshot',
  'pass466RealMarketLensContract',
]);
expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  'market: "Rynki"',
  'intent: "suggest"',
  'intent: "detail"',
  'data-pass466-confidence-waterfall="true"',
  'data-pass466-sec-filing-link="true"',
  '.filter((tier) => tier.id === pdfPreview.depth)',
]);
expect("lib/market-integrity/pass466-confidence-waterfall.ts", [
  'version: "pass466-confidence-waterfall"',
  "buildPass466ConfidenceWaterfall",
  "The lowest confirmed cap controls wording",
]);
expect("lib/search/lens-report.ts", [
  "pass466: Pass466ConfidenceWaterfall",
  "buildPass466ConfidenceWaterfall",
]);
expect("app/api/search/lens-report/route.ts", [
  "waterfallPanel466",
  "PASS466 · CONFIDENCE WATERFALL",
  "report.pass466",
]);

const marketSources = fs
  .readdirSync(path.join(root, "lib/market-integrity"))
  .filter((name) => /^pass\d+.*\.ts$/.test(name))
  .map((name) => read(path.join("lib/market-integrity", name)))
  .join("\n");
for (const symbol of ["AAPL", "NVDA", "SPY", "VNQ", "O"]) {
  if (!marketSources.includes(`symbol: "${symbol}"`)) {
    throw new Error(`Real Markets catalog coverage missing ${symbol}`);
  }
}

const runtime = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import { buildPass466ConfidenceWaterfall } from './lib/market-integrity/pass466-confidence-waterfall.ts';
    const now = new Date().toISOString();
    const base = {
      id: 'market-stock-aapl', title: 'Apple', symbol: 'AAPL', category: 'market', tone: 'review',
      summary: 'x', whyItMatters: 'x', missingData: [], nextOperatorStep: 'x', sourceMode: 'live_table',
      sourceConfidence: 86, shieldHref: '/x', chips: [],
      sources: [
        { id: 'alpha', label: 'Alpha Vantage', mode: 'live', freshness: now, confidence: 86, note: 'x' },
        { id: 'sec', label: 'SEC', mode: 'live', freshness: '2026-05-01', confidence: 88, note: 'x' },
      ],
      marketSnapshot: {
        assetClass: 'stock', providerState: 'source_bound', observedAt: now,
        fundamentalConfidenceCap: 84, fundamentalSecState: 'sec_aligned',
        fundamentalFilingUrl: 'https://www.sec.gov/Archives/test',
        fundamentalFilingForm: '10-Q', fundamentalFilingDate: '2026-05-01',
      },
    };
    const advanced = buildPass466ConfidenceWaterfall(base, 'pl', 'advanced');
    if (advanced.finalConfidence !== 84) throw new Error('expected fundamental cap 84');
    if (advanced.stages.length !== 6 || !advanced.filingUrl) throw new Error('waterfall/filing missing');
    const missing = buildPass466ConfidenceWaterfall({ ...base, sourceConfidence: 45, sources: [], marketSnapshot: { assetClass: 'stock' } }, 'en', 'advanced');
    if (missing.finalConfidence > 45) throw new Error('missing source raised confidence');
    console.log('PASS466 waterfall runtime semantics ok');
  `],
  { cwd: root, encoding: "utf8" },
);
if (runtime.status !== 0) {
  console.error(runtime.stdout);
  console.error(runtime.stderr);
  process.exit(1);
}
process.stdout.write(runtime.stdout);

const skip = new Set(["node_modules", ".next", ".git", ".vercel", ".turbo", ".cache", "out", "dist"]);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
  }
}
walk(root);
let parsed = 0;
for (const file of files) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      isolatedModules: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n");
    throw new Error(`PASS466 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS466 Browser market/PDF waterfall verified · ${parsed} TS/TSX parsed`);
