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
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS465 marker ${needle}`);
  }
}

expect("lib/market-integrity/pass463-canonical-pair-coverage.ts", [
  "function safeUpper(value: string | null | undefined)",
  "String(value ?? \"\").trim().toUpperCase()",
  "normalizePass463AssetSymbol(value: string | null | undefined)",
]);

expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  "Map as MapIcon",
  "new globalThis.Map(",
  "data-pass465-sec-xbrl-ready=\"true\"",
  "data-pass465-sec-xbrl-quality=\"true\"",
]);

expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  "type LensPdfDepth = \"basic\" | \"pro\" | \"advanced\"",
  "pdfDepthOrder",
  "selectedPdfDepthRef",
  "data-pass465-selectable-pdf-depth=\"true\"",
  "c.pdfDepthPrompt",
  "c.pdfDepthLabels[pdfPreview.depth]",
  "`/api/search/lens-report?tier=${encodeURIComponent(depth)}`",
]);

expect("app/api/search/lens-report/route.ts", [
  "type LensPdfDepth = \"basic\" | \"pro\" | \"advanced\"",
  "resolveLensPdfDepth",
  "buildPdf(report: LensReport, selectedDepth: LensPdfDepth = \"advanced\")",
  "PASS465: PDF route accepts ?tier=basic|pro|advanced",
  "x-velmere-pdf-depth",
]);

expect("lib/market-integrity/pass465-sec-xbrl-quality.ts", [
  'version: "pass465-sec-xbrl-quality"',
  "US_GAAP_CONCEPTS",
  "buildPass465SecXbrlQuality",
  "SEC Companyfacts/XBRL is a second-source audit lane",
  "Earnings cadence uses SEC submissions",
]);

expect("lib/market-integrity/pass459-alpha-vantage-provider.ts", [
  "fetchPass465SecJson",
  "SEC_USER_AGENT",
  "pass465CompanyfactsCache",
  "buildPass465SecXbrlQuality",
]);

const runtime = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import { normalizePass463AssetSymbol, resolvePass463VenuePair, assessPass463QuoteBasis } from './lib/market-integrity/pass463-canonical-pair-coverage.ts';
    import { buildPass465SecXbrlQuality, blankPass465SecXbrlQuality } from './lib/market-integrity/pass465-sec-xbrl-quality.ts';
    if (normalizePass463AssetSymbol(undefined) !== 'BTC') throw new Error('undefined symbol should fall back to BTC');
    if (resolvePass463VenuePair('coinbase', undefined).pair !== 'BTC-USD') throw new Error('undefined venue pair should resolve safely');
    const basis = assessPass463QuoteBasis('USD', 'USDT');
    if (basis.state !== 'fiat_stable_proxy' || basis.confidencePenalty <= 0) throw new Error('USD/USDT proxy penalty missing');
    const blank = blankPass465SecXbrlQuality();
    if (blank.state !== 'sec_required' || blank.confidenceCap > 52) throw new Error('blank SEC quality should stay capped');
    const alphaQuality = {
      confidenceCap: 88,
      revenueTtm: 1000,
      netIncomeTtm: 100,
      totalAssets: 5000,
      totalLiabilities: 2400,
      shareholderEquity: 2600,
      operatingCashFlowTtm: 300,
      capitalExpenditureTtm: 50,
    };
    const sec = {
      facts: { 'us-gaap': {
        RevenueFromContractWithCustomerExcludingAssessedTax: { units: { USD: [{ val: 1005, end: '2026-03-31', filed: '2026-05-01', form: '10-Q', accn: '0001' }] } },
        NetIncomeLoss: { units: { USD: [{ val: 99, end: '2026-03-31', filed: '2026-05-01', form: '10-Q', accn: '0001' }] } },
        Assets: { units: { USD: [{ val: 5000, end: '2026-03-31', filed: '2026-05-01', form: '10-Q', accn: '0001' }] } },
        Liabilities: { units: { USD: [{ val: 2400, end: '2026-03-31', filed: '2026-05-01', form: '10-Q', accn: '0001' }] } },
        StockholdersEquity: { units: { USD: [{ val: 2600, end: '2026-03-31', filed: '2026-05-01', form: '10-Q', accn: '0001' }] } },
        NetCashProvidedByUsedInOperatingActivities: { units: { USD: [{ val: 300, end: '2026-03-31', filed: '2026-05-01', form: '10-Q', accn: '0001' }] } },
        PaymentsToAcquirePropertyPlantAndEquipment: { units: { USD: [{ val: 50, end: '2026-03-31', filed: '2026-05-01', form: '10-Q', accn: '0001' }] } },
      }}
    };
    const submissions = { filings: { recent: { form: ['10-Q','10-K'], filingDate: ['2026-05-01','2026-02-01'] } } };
    const quality = buildPass465SecXbrlQuality({ cik: '0000320193', secCompanyFacts: sec, secSubmissions: submissions, secFiling: { filingDate: '2026-05-01', reportDate: '2026-03-31', form: '10-Q', accessionNumber: '0001', filingUrl: 'https://www.sec.gov/Archives/edgar/data/320193/0001-index.html' }, alphaQuality, now: Date.parse('2026-06-07T00:00:00Z') });
    if (quality.state !== 'sec_aligned') throw new Error('SEC aligned quality expected');
    if (!quality.filingUrl || quality.earningsCadence.cadenceState !== 'fresh') throw new Error('filing cadence/link expected');
    console.log('PASS465 runtime semantics ok');
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
    throw new Error(`PASS465 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS465 SEC/XBRL + PDF depth hotfix verified · ${parsed} TS/TSX parsed`);
