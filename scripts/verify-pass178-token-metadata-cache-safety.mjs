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
  "lib/search/token-metadata-cache.ts",
  "app/api/search/token-metadata/route.ts",
  "components/search/TokenMetadataProviderPanel.tsx",
  "VELMERE_PASS178_TOKEN_METADATA_CACHE_PROVIDER_READINESS_REPORT.md",
  "VELMERE_PASS178_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const cache = read("lib/search/token-metadata-cache.ts");
const route = read("app/api/search/token-metadata/route.ts");
const panel = read("components/search/TokenMetadataProviderPanel.tsx");
const page = read("app/[locale]/search/page.tsx");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");
const searchClient = read("components/search/VelmereIntelligenceSearchClient.tsx");

for (const token of [
  "TokenMetadataProvider",
  "TokenMetadataRecord",
  "tokenMetadataProviders",
  "curatedTokenMetadata",
  "createTokenMetadataCacheSnapshot",
  "externalFetchPerformed: false",
  "storageWritePerformed: false",
]) {
  if (!cache.includes(token)) errors.push(`token-metadata-cache.ts missing token: ${token}`);
}

for (const token of [
  "token_metadata_cache_preview",
  "createTokenMetadataCacheSnapshot",
  "externalFetchPerformed: false",
  "storageWritePerformed: false",
  "no-store",
  "performs no external provider fetch",
]) {
  if (!route.includes(token)) errors.push(`token-metadata route missing safety marker: ${token}`);
}

for (const token of [
  "TokenMetadataProviderPanel",
  "getTokenMetadataProviderSummary",
  "tokenMetadataProviders",
  "tmp-shell",
]) {
  if (!panel.includes(token) && !css.includes(token)) errors.push(`metadata provider panel/CSS missing token: ${token}`);
}

if (!page.includes("PASS179 public UX marker") && !page.includes("TokenMetadataProviderPanel")) {
  errors.push("search page must either render TokenMetadataProviderPanel or include the PASS179 public UX marker explaining why it is not public.");
}

for (const token of [
  "PASS178 · token metadata cache/provider readiness",
  ".tmp-shell",
  ".tmp-status-active",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS178 marker: ${token}`);
}

if (searchClient.includes("<img")) {
  errors.push("Search client must not use raw <img> for token logos; use controlled avatar background/fallback.");
}

const publicSurface = `${cache}\n${route}\n${panel}\n${searchClient}`.toLowerCase();
for (const forbidden of ["safe investment", "scam confirmed", "fraud proven", "buy signal", "sell signal", "enter seed phrase"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Forbidden public/search wording found: ${forbidden}`);
}

for (const token of ["verify-pass178-token-metadata-cache-safety.mjs", "PASS178"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS178 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS178 token metadata cache safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS178 token metadata cache safety OK");
