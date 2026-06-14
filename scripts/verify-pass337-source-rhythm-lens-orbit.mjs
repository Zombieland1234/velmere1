import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const must = (condition, message) => {
  if (!condition) {
    console.error(`PASS337 verify failed:\n- ${message}`);
    process.exit(1);
  }
};

const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const reportRoute = read("app/api/search/lens-report/route.ts");
const crossPanel = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const css = read("app/globals.css");

must(lens.includes("buildMarketSourceCadenceMatrix") && lens.includes('data-pass337-source-rhythm-lens="true"'), "Lens page does not import/render PASS337 source rhythm");
must(lens.includes('data-pass337-a4-source-rhythm="true"') && lens.includes("vlm-browser-a4-source-rhythm-grid"), "A4 preview lacks Source rhythm grid");
must(reportRoute.includes("buildMarketSourceCadenceMatrix") && reportRoute.includes("SOURCE RHYTHM") && reportRoute.includes("pass337-source-rhythm"), "PDF/HTML Lens route lacks Source Rhythm section");
must(reportRoute.includes("not a safety certificate") && reportRoute.includes("not a guaranteed result") && reportRoute.includes("not a buy/sell signal"), "Lens report safety boundary weakened");
must(crossPanel.includes('data-pass337-source-rhythm-orbit="true"') && crossPanel.includes('data-pass337-source-rhythm-orbit-nodes="true"'), "Global Risk/Orbit source rhythm nodes missing");
must(crossPanel.includes("cadenceByLane.get(row.lane)") && crossPanel.includes("shield-global-risk-rhythm-tag"), "Global Risk cards do not display cadence tags");
must(css.includes("PASS337 · Source Rhythm") && css.includes(".vlm-browser-a4-source-rhythm-grid") && css.includes(".shield-source-rhythm-orbit-grid"), "PASS337 CSS missing");
must(!reportRoute.includes("next FTX") && !reportRoute.includes("exchange is collapsing") && !reportRoute.includes("insolvent"), "Lens report route contains panic/accusation copy");

console.log("PASS337 verify passed: Source Rhythm is visible in Lens A4/PDF and Global Risk Orbit nodes with safe cadence boundaries.");
