import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const must = (condition, message) => {
  if (!condition) {
    console.error(`PASS336 verify failed:\n- ${message}`);
    process.exit(1);
  }
};

const lib = read("lib/market-integrity/market-source-cadence-matrix.ts");
const panel = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const route = read("app/api/market-integrity/cross-asset/route.ts");
const cadenceRoute = read("app/api/market-integrity/market-source-cadence/route.ts");
const css = read("app/globals.css");

must(lib.includes("PASS336.market_source_cadence_matrix"), "cadence matrix version missing");
must(lib.includes('"crypto_spot"') && lib.includes('"exchange_health"') && lib.includes('"stocks"') && lib.includes('"fx"') && lib.includes('"real_estate"') && lib.includes('"commodities"') && lib.includes('"etf"') && lib.includes('"ftx_regression"'), "all market source lanes must be present");
must(lib.includes("not investment advice") && lib.includes("not a bankruptcy prediction") && lib.includes("not exchange certification") && lib.includes("not a solvency proof"), "safe boundary weakened");
must(lib.includes("forbiddenCopy") && lib.includes("next FTX") && lib.includes("exchange is collapsing"), "incident rules must block panic/accusation copy");
must(panel.includes('data-pass336-market-source-cadence="true"') && panel.includes('data-pass336-source-cadence-matrix="true"'), "panel lacks PASS336 render markers");
must(panel.includes("Market Source Cadence Matrix") && panel.includes("cadenceMatrix.rows.map"), "panel does not render cadence rows");
must(route.includes("buildMarketSourceCadenceMatrix") && route.includes("cadenceMatrix"), "cross-asset API does not expose cadence matrix");
must(cadenceRoute.includes("buildMarketSourceCadenceMatrix") && cadenceRoute.includes("no-store"), "dedicated cadence API route missing/no-store");
must(css.includes("PASS336 · Market Source Cadence Matrix") && css.includes(".shield-source-cadence-grid") && css.includes(".shield-source-incident-grid"), "PASS336 CSS missing");

console.log("PASS336 verify passed: Market Source Cadence Matrix separates live, daily, slow macro and historical FTX lanes with safe AI bot copy rules.");
