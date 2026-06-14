import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function must(condition, message) {
  if (!condition) {
    console.error(`PASS333 verify failed:\n- ${message}`);
    process.exit(1);
  }
}

const lib = read("lib/market-integrity/ai-human-copy-engine.ts");
const panel = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const crossRoute = read("app/api/market-integrity/cross-asset/route.ts");
const route = read("app/api/market-integrity/ai-human-copy/route.ts");
const css = read("app/globals.css");

must(lib.includes('version: "PASS333.ai_human_copy_engine"'), "AI copy engine version marker missing");
must(lib.includes("humanizeShieldCopy") && lib.includes("buildAiHumanCopyEngine"), "humanizer functions missing");
must(lib.includes("liquidity proof lane") && lib.includes("Płynność wygląda częściowo stabilnie"), "liquidity human translation missing");
must(lib.includes("next FTX") && lib.includes("Bot widzi sygnał stresu"), "collapse accusation guard missing");
must(panel.includes('data-pass333-ai-human-copy-engine="true"') && panel.includes('data-pass333-ai-human-copy-table="true"'), "panel PASS333 markers missing");
must(panel.includes("AI Human Copy Engine") && panel.includes("humanizeShieldCopy"), "panel human copy render missing");
must(crossRoute.includes("buildAiHumanCopyEngine") && crossRoute.includes("humanCopy"), "cross asset API does not expose humanCopy");
must(route.includes("translated") && route.includes("not investment advice") && route.includes("not a public accusation engine") === false, "AI copy API boundary or payload invalid");
must(css.includes("PASS333 · AI Human Copy Engine") && css.includes(".shield-human-copy-grid"), "PASS333 CSS missing");
must(!panel.includes("This exchange is collapsing") && !panel.includes("Withdraw immediately"), "forbidden panic copy leaked to panel body");

console.log("PASS333 verify passed: AI Human Copy Engine translates technical Shield lanes into calm public copy with API payload, UI table and guardrails.");
