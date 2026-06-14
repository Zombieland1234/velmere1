import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function must(condition, message) {
  if (!condition) {
    console.error(`PASS332 verify failed:\n- ${message}`);
    process.exit(1);
  }
}

const lib = read("lib/market-integrity/exchange-health-adapter.ts");
const panel = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const crossRoute = read("app/api/market-integrity/cross-asset/route.ts");
const route = read("app/api/market-integrity/exchange-health/route.ts");
const css = read("app/globals.css");

must(lib.includes('version: "PASS332.exchange_health_adapter_skeleton"'), "exchange health version marker missing");
must(lib.includes("ExchangeHealthAdapterContract") && lib.includes("ExchangeHealthMetricRow") && lib.includes("ExchangeHealthVenueScore"), "typed exchange health tables missing");
must(lib.includes("Binance") && lib.includes("MEXC") && lib.includes("Coinbase") && lib.includes("Kraken") && lib.includes("Bybit") && lib.includes("OKX"), "venue coverage missing");
must(lib.includes("GET /api/v3/depth") && lib.includes("GET /api/v3/klines") && lib.includes("second-source divergence"), "Binance/MEXC endpoint and divergence plans missing");
must(lib.includes("Not bankruptcy prediction") || lib.includes("No bankruptcy prediction"), "safe bankruptcy boundary missing");
must(panel.includes('data-pass332-exchange-health-adapter="true"') && panel.includes('data-pass332-exchange-health-table="true"'), "panel PASS332 markers missing");
must(panel.includes("Exchange Health adapter skeleton") && panel.includes("depth, klines, book ticker"), "panel exchange health section missing");
must(crossRoute.includes("buildExchangeHealthAdapterPreview") && crossRoute.includes("exchangeHealth"), "cross-asset API does not include exchangeHealth payload");
must(route.includes("not proof of solvency") && route.includes("not investment advice"), "exchange-health API boundary missing");
must(css.includes("PASS332 · Exchange Health adapter skeleton") && css.includes(".shield-exchange-score-grid") && css.includes(".shield-exchange-adapter-grid"), "PASS332 CSS missing");

console.log("PASS332 verify passed: Exchange Health adapter skeleton has venue tables, metric rows, safe AI rules, API payload and UI section.");
