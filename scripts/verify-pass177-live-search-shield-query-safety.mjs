import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const required = [
  "lib/search/live-search-adapter-skeleton.ts",
  "app/api/search/live-preview/route.ts",
  "VELMERE_PASS177_LIVE_SEARCH_ADAPTER_SHIELD_QUERY_REPORT.md",
  "VELMERE_PASS177_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const adapter = read("lib/search/live-search-adapter-skeleton.ts");
const liveRoute = read("app/api/search/live-preview/route.ts");
const contract = read("lib/search/intelligence-search-contract.ts");
const searchClient = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shieldClient = read("components/market-integrity/MarketIntegrityClient.tsx");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "VelmereLiveSearchAdapter",
  "velmereLiveSearchAdapters",
  "externalFetchPerformed: false",
  "createLiveSearchAdapterPreview",
  "contract-analyzer-adapter",
  "osint-queue-adapter",
]) {
  if (!adapter.includes(token)) errors.push(`live-search-adapter-skeleton.ts missing token: ${token}`);
}

for (const token of [
  "live_search_adapter_preview_only",
  "externalFetchPerformed: false",
  "does not fetch public web or OSINT sources",
  "no-store",
]) {
  if (!liveRoute.includes(token)) errors.push(`live-preview route missing safety token: ${token}`);
}

for (const token of [
  "avatarImage?: string",
  "assets.coingecko.com",
  "buildVelmereShieldBridge",
]) {
  if (!contract.includes(token)) errors.push(`search contract missing PASS177 token: ${token}`);
}

for (const token of [
  "result.avatarImage",
  "vis-token-avatar-image",
  "vis-live-adapter-note",
]) {
  if (!searchClient.includes(token)) errors.push(`search client missing PASS177 token: ${token}`);
}

for (const token of [
  'routeParams.get("asset")',
  'routeParams.get("query")',
  'routeParams.get("from") === "velmere-search"',
  "cleanRouteScan",
]) {
  if (!shieldClient.includes(token)) errors.push(`MarketIntegrityClient missing Shield query bridge token: ${token}`);
}

for (const token of [
  "PASS177 · live search adapter skeleton",
  ".vis-token-avatar-image",
  ".vis-live-adapter-note",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS177 CSS marker: ${token}`);
}

const publicSurface = `${contract}\n${searchClient}\n${liveRoute}`.toLowerCase();
for (const forbidden of ["safe investment", "scam confirmed", "fraud proven", "buy signal", "sell signal", "enter seed phrase"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Forbidden public/search wording found: ${forbidden}`);
}

for (const token of ["verify-pass177-live-search-shield-query-safety.mjs", "PASS177"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS177 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS177 live search / Shield query safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS177 live search / Shield query safety OK");
