import { readFileSync } from "node:fs";

const lens = readFileSync("components/search/VelmereIntelligenceSearchClient.tsx", "utf8");
const route = readFileSync("app/api/search/lens-report/route.ts", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const globalMap = readFileSync("lib/market-integrity/global-risk-map.ts", "utf8");

const errors = [];
function must(condition, message) {
  if (!condition) errors.push(message);
}

must(lens.includes('data-pass335-global-context-pdf="true"'), "Lens page lacks PASS335 global context marker");
must(lens.includes('data-pass335-a4-global-context="true"'), "A4 preview lacks PASS335 global-context section marker");
must(lens.includes("buildGlobalRiskMap"), "Lens preview does not import/use Global Risk Map");
must(lens.includes("Global market context"), "A4 preview missing Global market context heading");
must(route.includes("PASS335 adds Global Risk Map context"), "PDF route lacks PASS335 route marker");
must(route.includes("globalRiskRows"), "PDF route does not serialize global risk rows");
must(route.includes("GLOBAL MARKET CONTEXT"), "PDF binary builder lacks GLOBAL MARKET CONTEXT section");
must(route.includes("pass335-global-context"), "HTML export lacks PASS335 global context class");
must(route.includes("not a guaranteed result") && route.includes("not a buy/sell signal"), "PDF route lacks safe advice/guarantee boundary wording");
must(css.includes("PASS335 — Global Risk Map context"), "CSS lacks PASS335 A4 global context styles");
must(globalMap.includes("not investment advice") && globalMap.includes("not a bankruptcy prediction"), "Global Risk Map boundary weakened");

if (errors.length) {
  console.error("PASS335 verify failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS335 verify passed: Lens A4/PDF exports Global Risk Map context with safe boundaries.");
