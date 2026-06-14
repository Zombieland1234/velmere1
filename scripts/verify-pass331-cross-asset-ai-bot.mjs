import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function must(condition, message) {
  if (!condition) {
    console.error(`PASS331 verify failed:\n- ${message}`);
    process.exit(1);
  }
}

const lib = read("lib/market-integrity/cross-asset-collapse-radar.ts");
const panel = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const route = read("app/api/market-integrity/cross-asset/route.ts");
const css = read("app/globals.css");

must(lib.includes('version: "PASS331.cross_asset_collapse_radar"'), "radar version was not upgraded to PASS331");
must(lib.includes("CrossAssetAdapterRow") && lib.includes("CollapseSignalRow") && lib.includes("BotDecisionRule"), "PASS331 typed adapter/signal/rule tables are missing");
must(lib.includes("Binance") && lib.includes("MEXC") && lib.includes("FTX historical"), "exchange coverage must include Binance, MEXC and FTX historical");
must(lib.includes("stocks") && lib.includes("fx") && lib.includes("real_estate"), "cross-asset universe must include stocks, FX and real estate");
must(lib.includes("not bankruptcy prediction") && lib.includes("not investment advice") && lib.includes("not a public accusation engine"), "safe boundary wording is missing from radar library");
must(panel.includes('data-pass331-cross-asset-ai-bot="true"'), "panel lacks PASS331 render marker");
must(panel.includes("Adapter blueprint / osobne tabele") && panel.includes("Collapse signal engine") && panel.includes("AI bot decision rules"), "PASS331 panel sections missing");
must(route.includes("not proof of solvency") && route.includes("not exchange certification"), "API boundary lacks solvency/certification guard");
must(css.includes("PASS331 · Cross-asset AI bot") && css.includes(".shield-cross-adapter-grid") && css.includes(".shield-cross-rules-grid"), "PASS331 CSS tables missing");

console.log("PASS331 verify passed: cross-asset exchange/stock/FX/real-estate/FTX radar has separate tables, bot rules and safe public boundaries.");
