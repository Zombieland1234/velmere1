import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const root = process.cwd();
const nativeRequire = createRequire(import.meta.url);
let ts;
try {
  ts = nativeRequire("typescript");
} catch {
  ts = nativeRequire("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}
const cache = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function resolveTs(request, parent) {
  if (request.startsWith("@/")) return path.join(root, request.slice(2)) + ".ts";
  if (request.startsWith(".")) return path.resolve(path.dirname(parent), request) + (path.extname(request) ? "" : ".ts");
  return null;
}

function loadTs(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = fs.readFileSync(absolute, "utf8");
  const output = ts.transpileModule(source, {
    fileName: absolute,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  cache.set(absolute, module);
  const localRequire = (request) => {
    const resolved = resolveTs(request, absolute);
    return resolved ? loadTs(resolved) : nativeRequire(request);
  };
  const wrapper = `(function(require,module,exports,__filename,__dirname){${output}\n})`;
  vm.runInThisContext(wrapper, { filename: absolute })(
    localRequire,
    module,
    module.exports,
    absolute,
    path.dirname(absolute),
  );
  return module.exports;
}

const pass617 = loadTs(path.join(root, "lib/market-integrity/pass617-real-markets-noncrypto-taxonomy.ts"));
const pass618 = loadTs(path.join(root, "lib/market-integrity/pass618-real-markets-adaptive-surface.ts"));
const pass619 = loadTs(path.join(root, "lib/market-integrity/pass619-real-markets-provider-lineage.ts"));
const pass620 = loadTs(path.join(root, "lib/market-integrity/pass620-cross-asset-chart-parity.ts"));
const pass621 = loadTs(path.join(root, "lib/market-integrity/pass621-market-search-exactness.ts"));

const taxonomyRows = [
  { id: "btc", symbol: "BTC", assetClass: "crypto" },
  { id: "bnb", symbol: "BNB", assetClass: "exchange_token" },
  { id: "aapl", symbol: "AAPL", assetClass: "stock" },
  { id: "mexc-health", symbol: "MEXC", category: "exchanges" },
];
const publicRows = pass617.filterPass617PublicRealMarketsRows(taxonomyRows);
assert(publicRows.length === 2, "PASS617 must remove crypto and exchange-token rows");
assert(publicRows.some((row) => row.id === "mexc-health"), "PASS617 must preserve exchange-health rows");
assert(!pass617.PASS617_PUBLIC_REAL_MARKETS_CATEGORIES.includes("crypto"), "PASS617 public categories cannot include crypto");

const mobile = pass618.buildPass618AdaptiveSurface({ viewportWidth: 390, rowCount: 100 });
const desktop = pass618.buildPass618AdaptiveSurface({ viewportWidth: 1280, rowCount: 100 });
assert(mobile.mode === "cards" && mobile.horizontalOverflow === false, "PASS618 mobile must use cards without horizontal overflow");
assert(desktop.mode === "table" && desktop.tableColumns === 9, "PASS618 desktop must use the full-width nine-column table");
assert(mobile.touchTarget === 44, "PASS618 touch targets must remain 44px");

const now = Date.now();
const lineage = pass619.buildPass619ProviderLineage({
  assetId: "aapl",
  assetClass: "stocks",
  provider: "market-provider",
  backupProvider: "second-provider",
  state: "live",
  sourceTimestamp: now,
  candles: 48,
  expectedCandles: 48,
  currentPrice: 200,
  confidenceCap: 88,
  generatedAt: now,
});
assert(lineage.state === "live", "PASS619 fresh provider data must resolve to live");
assert(lineage.confidenceCap === 88, "PASS619 must keep the stricter supplied confidence cap");
assert(lineage.chartReady === true, "PASS619 must expose chart readiness");

const parity = pass620.buildPass620CrossAssetChartParity({
  assetClass: "stocks",
  candleCount: 48,
  lineage,
});
assert(parity.interactive && parity.renderMode === "candles", "PASS620 source-bound stock candles must unlock chart parity");
assert(parity.sourceRail && parity.timestampVisible && parity.confidenceVisible, "PASS620 chart parity must keep evidence visible");

const candidates = [
  { id: "aapl", symbol: "AAPL", providerSymbol: "AAPL", name: "Apple Inc.", category: "stocks" },
  { id: "appf", symbol: "APPF", providerSymbol: "APPF", name: "AppFolio", category: "stocks" },
  { id: "btc", symbol: "BTC", providerSymbol: "BTC-USD", name: "Bitcoin", category: "crypto" },
];
const exact = pass621.buildPass621MarketSearchResolution("AAPL", candidates);
const prefix = pass621.buildPass621MarketSearchResolution("app", candidates);
assert(exact.autoOpen && exact.exact?.symbol === "AAPL", "PASS621 exact ticker should auto-open");
assert(!prefix.autoOpen && prefix.requiresExplicitSelection, "PASS621 prefix search must require explicit selection");
assert(!exact.ranked.some((entry) => entry.item.symbol === "BTC"), "PASS621 must not return crypto in Real Markets");

const component = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const route = read("app/api/market-integrity/real-markets/search/route.ts");
const css = read("app/globals.css");
assert(component.includes("data-pass617-noncrypto-taxonomy=\"locked\""), "PASS617 integration marker missing");
assert(component.includes("buildPass619ProviderLineage"), "PASS619 component lineage integration missing");
assert(component.includes("selectedChartParity?.interactive"), "PASS620 chart parity gate missing");
assert(component.includes("pass621SearchResolution.exact"), "PASS621 exact Enter gate missing");
assert(route.includes("filterPass617PublicRealMarketsRows"), "PASS617 API filter missing");
assert(route.includes("requiresExplicitSelection"), "PASS621 API receipt missing");
assert(css.includes(".realmarkets-pass618-grid"), "PASS618 adaptive grid CSS missing");
assert(css.includes("horizontal") === true, "PASS618 CSS contract scan failed");

console.log("PASS617–621 gate PASS · crypto taxonomy locked out of Real Markets · full-width adaptive table/cards · provider lineage · cross-asset chart parity · exact-only auto-open search");
