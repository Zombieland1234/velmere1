import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "lib/market-integrity/social-exchange-command-router-gate.ts",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "app/globals.css",
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length) {
  throw new Error(`PASS293 missing files: ${missingFiles.join(", ")}`);
}

const moduleSource = readFileSync("lib/market-integrity/social-exchange-command-router-gate.ts", "utf8");
const marketSource = readFileSync("components/market-integrity/MarketIntegrityClient.tsx", "utf8");
const mapSource = readFileSync("components/market-integrity/ShieldMapClient.tsx", "utf8");
const browserSource = readFileSync("components/search/VelmereIntelligenceSearchClient.tsx", "utf8");
const cssSource = readFileSync("app/globals.css", "utf8");

const requiredMarkers = [
  [moduleSource, "PASS293_SOCIAL_EXCHANGE_COMMAND_ROUTER_GATE"],
  [moduleSource, "velmere_social_exchange_command_router_gate_v1_pass293"],
  [moduleSource, "MEXC-style depth/orderbook context"],
  [moduleSource, "Meta/Instagram/X-style ranking"],
  [moduleSource, "no countdown pressure"],
  [moduleSource, "no buy/sell command"],
  [marketSource, "buildSocialExchangeCommandRouterGate"],
  [marketSource, "data-pass293-social-exchange-router=\"active\""],
  [mapSource, "investigatorSocialRouterGate"],
  [mapSource, "data-pass293-social-exchange-router=\"shield-map\""],
  [browserSource, "Social-Exchange Router · VLM Browser"],
  [browserSource, "data-pass293-social-exchange-router=\"vlm-browser\""],
  [cssSource, "PASS293 · Social-Exchange Command Router"],
  [cssSource, ".shield-social-exchange-router-rail"],
  [cssSource, ".shield-social-router-reason"],
];

const missingMarkers = requiredMarkers
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, marker]) => marker);

if (missingMarkers.length) {
  throw new Error(`PASS293 missing markers: ${missingMarkers.join(", ")}`);
}

const forbiddenDarkPatterns = [
  "guaranteed profit",
  "guaranteed safety",
  "buy now before",
  "countdown pressure",
  "safe investment",
];

const joinedLines = `${moduleSource}\n${marketSource}\n${mapSource}\n${browserSource}`
  .toLowerCase()
  .split(/\r?\n/);
const forbiddenHits = forbiddenDarkPatterns.filter((term) =>
  joinedLines.some((line) => line.includes(term) && !line.includes(`no ${term}`)),
);
if (forbiddenHits.length) {
  throw new Error(
    `PASS293 forbidden dark-pattern wording found outside the dark-pattern firewall: ${forbiddenHits.join(", ")}`,
  );
}

console.log("PASS293 Social-Exchange Command Router Gate safety check passed.");
