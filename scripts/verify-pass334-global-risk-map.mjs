import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function must(condition, message) {
  if (!condition) {
    console.error(`PASS334 verify failed: ${message}`);
    process.exit(1);
  }
}

const lib = read("lib/market-integrity/global-risk-map.ts");
const panel = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const route = read("app/api/market-integrity/global-risk-map/route.ts");
const crossRoute = read("app/api/market-integrity/cross-asset/route.ts");
const css = read("app/globals.css");

must(lib.includes('version: "PASS334.global_risk_map"'), "global risk map version missing");
must(lib.includes('"crypto"') && lib.includes('"exchange_health"') && lib.includes('"stocks"') && lib.includes('"fx"') && lib.includes('"real_estate"') && lib.includes('"commodities"') && lib.includes('"etf"'), "not all cross-asset lanes are present");
must(lib.includes("not investment advice") && lib.includes("not a bankruptcy prediction") && lib.includes("not exchange certification"), "safe boundary missing");
must(panel.includes('data-pass334-global-risk-map="true"') && panel.includes('data-pass334-global-risk-map-table="true"'), "panel PASS334 markers missing");
must(panel.includes("globalRiskMap.mapRows") && panel.includes("globalRiskMap.sourceRows") && panel.includes("globalRiskMap.scenarioRows"), "panel does not render map/source/scenario tables");
must(route.includes("buildGlobalRiskMap") && route.includes("cache-control"), "global-risk-map API route missing or cache unsafe");
must(crossRoute.includes("buildGlobalRiskMap") && crossRoute.includes("globalRiskMap"), "cross-asset API does not expose globalRiskMap");
must(css.includes("PASS334") && css.includes("shield-global-risk-map-grid"), "PASS334 CSS missing");

const forbidden = ["will collapse", "next FTX", "guaranteed safe", "buy now", "sell now"];
const joined = [lib, panel, route].join("\n").toLowerCase();
for (const phrase of forbidden) {
  must(!joined.includes(phrase.toLowerCase()), `forbidden public phrase present: ${phrase}`);
}

console.log("PASS334 verify passed: Global Risk Map renders cross-asset heat, source cadence and scenario review with safe copy boundaries.");
