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
  "app/[locale]/search/page.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "app/api/search/route.ts",
  "lib/search/intelligence-search-contract.ts",
  "lib/search/intelligence-search-safety.ts",
  "VELMERE_PASS175_INTELLIGENCE_SEARCH_FOUNDATION_REPORT.md",
  "VELMERE_PASS175_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const page = read("app/[locale]/search/page.tsx");
const client = read("components/search/VelmereIntelligenceSearchClient.tsx");
const route = read("app/api/search/route.ts");
const contract = read("lib/search/intelligence-search-contract.ts");
const safety = read("lib/search/intelligence-search-safety.ts");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "VelmereIntelligenceSearchClient",
  "Velmère Intelligence Search",
  "Shield analysis",
]) {
  if (!page.includes(token) && !client.includes(token)) errors.push(`Search page/client missing token: ${token}`);
}

for (const token of [
  "VelmereSearchResult",
  "searchVelmereIntelligence",
  "buildFallbackResult",
  "shieldHref",
  "missingData",
  "nextOperatorStep",
]) {
  if (!contract.includes(token)) errors.push(`Search contract missing token: ${token}`);
}

for (const token of [
  "sanitizeSearchInput",
  "assertSearchCopyIsSafe",
  "velmereSearchSafetyBoundary",
]) {
  if (!safety.includes(token)) errors.push(`Search safety missing token: ${token}`);
}

for (const token of [
  "velmere_intelligence_search_preview",
  "cache-control",
  "no-store",
  "sanitizeSearchInput",
]) {
  if (!route.includes(token)) errors.push(`Search API route missing safety token: ${token}`);
}

for (const token of [
  "vis-search-shell",
  "vis-result-card",
  "vis-shield-link",
  "PASS175 · Velmère Intelligence Search",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS175 search CSS marker: ${token}`);
}

if (!client.includes("not financial advice") || !client.includes("safety certificate")) {
  errors.push("Search UI must include safe boundary copy.");
}

const combinedSearchSurface = `${page}\n${client}\n${route}\n${contract}`.toLowerCase();
for (const forbidden of ["safe investment", "scam confirmed", "fraud proven", "buy signal", "sell signal", "enter seed phrase"]) {
  if (combinedSearchSurface.includes(forbidden)) errors.push(`Forbidden public/search wording found: ${forbidden}`);
}

for (const token of ["verify-pass175-intelligence-search-safety.mjs", "PASS175"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS175 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS175 intelligence search safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS175 intelligence search safety OK");
