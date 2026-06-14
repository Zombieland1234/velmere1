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
  "components/search/VelmereSearchDiscoveryRail.tsx",
  "app/api/search/bridge/route.ts",
  "VELMERE_PASS176_SEARCH_BRIDGE_DISCOVERY_RAIL_REPORT.md",
  "VELMERE_PASS176_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const contract = read("lib/search/intelligence-search-contract.ts");
const client = read("components/search/VelmereIntelligenceSearchClient.tsx");
const rail = read("components/search/VelmereSearchDiscoveryRail.tsx");
const route = read("app/api/search/bridge/route.ts");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "VelmereShieldBridge",
  "buildVelmereShieldBridge",
  "origin: \"velmere_search\"",
  "full_shield_analysis",
  "avatarLabel",
  "bridge?: VelmereShieldBridge",
]) {
  if (!contract.includes(token)) errors.push(`intelligence-search-contract.ts missing PASS176 bridge marker: ${token}`);
}

for (const token of [
  "VelmereSearchDiscoveryRail",
  "vis-bridge-box",
  "result.bridge?.href",
  "c.bridge",
]) {
  if (!client.includes(token)) errors.push(`VelmereIntelligenceSearchClient.tsx missing PASS176 marker: ${token}`);
}

for (const token of [
  "Velmère discovery layer",
  "Narrative radar",
  "Contract lens",
  "Source gap map",
  "VLM capsule",
]) {
  if (!rail.includes(token)) errors.push(`VelmereSearchDiscoveryRail.tsx missing discovery marker: ${token}`);
}

for (const token of [
  "search_to_shield_bridge_preview",
  "buildVelmereShieldBridge",
  "storageWritePerformed: false",
  "no-store",
  "does not create a final risk verdict",
]) {
  if (!route.includes(token)) errors.push(`search bridge route missing safety marker: ${token}`);
}

for (const token of [
  "PASS176 · Intelligence Search bridge",
  ".vsdr-shell",
  ".vis-bridge-box",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS176 marker: ${token}`);
}

const combinedPublicSearch = `${client}\n${rail}\n${route}\n${contract}`.toLowerCase();
for (const forbidden of ["safe investment", "scam confirmed", "fraud proven", "buy signal", "sell signal", "enter seed phrase"]) {
  if (combinedPublicSearch.includes(forbidden)) errors.push(`Forbidden public/search wording found: ${forbidden}`);
}

for (const token of ["verify-pass176-search-bridge-discovery-safety.mjs", "PASS176"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS176 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS176 search bridge/discovery safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS176 search bridge/discovery safety OK");
