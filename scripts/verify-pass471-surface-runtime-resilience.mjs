import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const contract = read("lib/market-integrity/pass471-surface-runtime-resilience.ts");
const pass470 = read("lib/market-integrity/pass470-browser-runtime-qa.ts");
const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
const orbit = read("components/market-integrity/ShieldMapClient.tsx");

function markers(source, expected, label) {
  const missing = expected.filter((item) => !source.includes(item));
  if (missing.length) throw new Error(`${label} missing: ${missing.join(", ")}`);
}

markers(contract, [
  "normalizePass471CatalogRows",
  "normalizePass471ProviderSearchRows",
  "normalizePass471Quotes",
  "auditPass471MalformedPayloads",
  "PASS471_SURFACE_RUNTIME_RESILIENCE_CONTRACT",
], "PASS471 contract");
markers(realMarkets, [
  "normalizePass471CatalogRows(payload.rows)",
  "normalizePass471ProviderSearchRows(payload.results)",
  "normalizePass471Quotes(payload?.ok ? payload.quotes : [])",
  "normalizePass471Quotes(payload?.quotes)[0]",
], "PASS471 Real Markets");
markers(orbit, [
  "safePass471Symbol",
  "function suggestionGlyph(symbol: unknown)",
  "function shieldMapTokenLogo(symbol: unknown)",
], "PASS471 Orbit");
markers(browser, [
  'data-pass471-surface-runtime-resilience="true"',
  'data-pass471-receipt-drawer-toggle="true"',
  'data-pass471-receipt-drawer="true"',
  "receiptHistory.total",
  "receiptHistoryBoundary",
], "PASS471 Browser");
markers(pass470, [
  "Number.isFinite(Date.parse(item.createdAt))",
  "const valid =",
  "total: valid.length",
], "PASS471 receipt hardening");

for (const [file, source, jsx] of [
  ["contract", contract, false],
  ["pass470", pass470, false],
  ["RealMarkets", realMarkets, true],
  ["Browser", browser, true],
  ["Orbit", orbit, true],
]) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      ...(jsx ? { jsx: ts.JsxEmit.Preserve } : {}),
    },
    reportDiagnostics: true,
    fileName: `${file}.${jsx ? "tsx" : "ts"}`,
  });
  const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    throw new Error(`${file} transpile errors: ${errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, " ")).join(" | ")}`);
  }
}

const runtimeSource = ts.transpileModule(contract, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeSource).toString("base64")}`);

if (runtime.safePass471Symbol(undefined) !== "UNKNOWN") {
  throw new Error("PASS471 safe symbol fallback failed");
}

const catalog = runtime.normalizePass471CatalogRows([
  null,
  { id: "a", symbol: undefined, name: "Broken" },
  { id: "b", symbol: " aapl ", name: undefined, assetClass: "stock", riskPressure: 500 },
  { id: "dup", symbol: "AAPL", name: "Duplicate", assetClass: "stock" },
  { id: "fx", symbol: "eur/usd", name: "Euro Dollar", assetClass: "fx", rank: 2 },
]);
if (catalog.length !== 2 || catalog[0].symbol !== "AAPL" || catalog[0].riskPressure !== 100) {
  throw new Error(`PASS471 catalog normalization failed: ${JSON.stringify(catalog)}`);
}

const providers = runtime.normalizePass471ProviderSearchRows([
  { symbol: undefined, name: "Broken" },
  { symbol: "MSFT", name: undefined, quoteType: undefined },
  { symbol: "MSFT", name: "Duplicate" },
]);
if (providers.length !== 1 || providers[0].name !== "MSFT" || providers[0].quoteType !== "UNKNOWN") {
  throw new Error(`PASS471 provider normalization failed: ${JSON.stringify(providers)}`);
}

const quotes = runtime.normalizePass471Quotes([
  null,
  { symbol: undefined, candles: {} },
  {
    symbol: "BTC-USD",
    state: "live",
    source: undefined,
    currentPrice: Number.NaN,
    candles: [
      { timestamp: 1, open: 10, high: 8, low: 12, close: 11, volume: 2 },
      { timestamp: undefined, open: 1, high: 2, low: 0, close: 1 },
    ],
    providerPlan: ["Primary", null, 42],
  },
]);
if (quotes.length !== 1 || quotes[0].currentPrice !== null || quotes[0].candles.length !== 1) {
  throw new Error(`PASS471 quote normalization failed: ${JSON.stringify(quotes)}`);
}
if (quotes[0].candles[0].high !== 12 || quotes[0].candles[0].low !== 8) {
  throw new Error("PASS471 candle bounds repair failed");
}

const fuzz = runtime.auditPass471MalformedPayloads({
  catalog: { invalid: true },
  providerResults: [undefined, "bad"],
  quotes: [undefined, { symbol: null }],
});
if (!fuzz.ok || fuzz.catalogRows !== 0 || fuzz.quotes !== 0) {
  throw new Error(`PASS471 malformed payload audit failed: ${JSON.stringify(fuzz)}`);
}

const pass470RuntimeSource = ts.transpileModule(pass470, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const pass470Runtime = await import(`data:text/javascript;base64,${Buffer.from(pass470RuntimeSource).toString("base64")}`);
const duplicateReceipt = {
  version: "pass469-pdf-download-receipt-v1",
  receiptId: "same",
  event: "download_initiated",
  createdAt: "2026-06-07T12:00:00.000Z",
  filename: "report.pdf",
  symbol: "BTC",
  depth: "advanced",
  reportChecksum: "x",
  sourceConfidence: 91,
  sourceCount: 4,
  containsRawPayload: false,
  checksum: "verified-before-pass470",
};
const history = pass470Runtime.buildPass470ReceiptHistory([
  duplicateReceipt,
  duplicateReceipt,
  { ...duplicateReceipt, receiptId: "bad-date", createdAt: "not-a-date" },
], 20);
if (history.total !== 1 || history.visible.length !== 1 || history.latest?.receiptId !== "same") {
  throw new Error(`PASS471 receipt dedupe/date validation failed: ${JSON.stringify(history)}`);
}

const nativeNames = ["Map", "Set", "URL", "Promise", "Date", "Symbol", "WeakMap", "WeakSet"];
for (const [label, source] of [["RealMarkets", realMarkets], ["Browser", browser], ["Orbit", orbit]]) {
  const collisions = [...source.matchAll(/import \{([^}]+)\} from "lucide-react"/gs)]
    .flatMap((match) => match[1].split(",").map((part) => { const names = part.trim().split(/\s+as\s+/); return names[names.length - 1].trim(); }))
    .filter((name) => nativeNames.includes(name));
  if (collisions.length) throw new Error(`PASS471 ${label} native constructor collision: ${collisions.join(", ")}`);
}

console.log("PASS471 surface runtime resilience, malformed payload fuzz and receipt drawer verified");
