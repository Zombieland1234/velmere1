import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const must = (condition, message) => {
  if (!condition) {
    console.error(`PASS338 verify failed:\n- ${message}`);
    process.exit(1);
  }
};

const lib = read("lib/market-integrity/second-source-divergence-matrix.ts");
const panel = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const crossRoute = read("app/api/market-integrity/cross-asset/route.ts");
const route = read("app/api/market-integrity/second-source-divergence/route.ts");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const reportRoute = read("app/api/search/lens-report/route.ts");
const css = read("app/globals.css");
const pkg = read("package.json");

must(lib.includes("PASS338.second_source_divergence_matrix"), "second-source matrix version missing");
must(lib.includes('"exchange_depth"') && lib.includes('"exchange_api"') && lib.includes('"reserve_context"') && lib.includes('"stock_disclosure"') && lib.includes('"fx_reference"') && lib.includes('"real_estate_macro"') && lib.includes('"ftx_regression"'), "required divergence lanes missing");
must(lib.includes("not bankruptcy prediction") && lib.includes("not exchange certification") && lib.includes("not solvency proof") && lib.includes("not investment advice") && lib.includes("not a buy/sell signal"), "safe boundary weakened");
must(lib.includes("blockedCopy") && lib.includes("next FTX") && lib.includes("exchange is collapsing") && lib.includes("withdraw now"), "panic/accusation copy must stay blocked inside guard rules");
must(route.includes("buildSecondSourceDivergenceMatrix") && route.includes("no-store"), "dedicated second-source endpoint missing/no-store");
must(crossRoute.includes("buildSecondSourceDivergenceMatrix") && crossRoute.includes("secondSourceDivergence"), "cross-asset API does not expose second-source divergence");
must(panel.includes('data-pass338-second-source-divergence="true"') && panel.includes('data-pass338-second-source-table="true"') && panel.includes("secondSourceDivergence.rows.map"), "Cross-Asset panel does not render PASS338 table");
must(lens.includes("buildSecondSourceDivergenceMatrix") && lens.includes('data-pass338-a4-second-source="true"') && lens.includes("vlm-browser-a4-second-source-grid"), "Lens A4 preview lacks second-source section");
must(reportRoute.includes("buildSecondSourceDivergenceMatrix") && reportRoute.includes("SECOND-SOURCE CHECK") && reportRoute.includes("pass338-second-source"), "Lens PDF/HTML report lacks second-source check");
must(reportRoute.includes("not a safety certificate") && reportRoute.includes("not a guaranteed result") && reportRoute.includes("not a buy/sell signal"), "Lens report safety boundary weakened");
must(css.includes("PASS338 · Second Source Divergence Matrix") && css.includes(".shield-second-source-grid") && css.includes(".vlm-browser-a4-second-source-grid"), "PASS338 CSS missing");
must(pkg.includes("verify:pass338-second-source-divergence-matrix"), "package script missing");

console.log("PASS338 verify passed: Second Source Divergence Matrix is exposed in Cross-Asset Shield, Lens A4/PDF and guarded against panic/accusation copy.");
