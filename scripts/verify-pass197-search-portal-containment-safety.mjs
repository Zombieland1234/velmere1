import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function has(source, token, label) { if (!source.includes(token)) errors.push(`${label}: missing ${token}`); }

const client = read("components/market-integrity/MarketIntegrityClient.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");

for (const token of [
  'import { createPortal } from "react-dom";',
  "suggestPanelRef",
  "suggestPanelFrame",
  "syncSuggestionPanelFrame",
  "document.body",
  "shield-token-search-suggest-portal",
  "shield-token-search-suggest-scroll",
  "shield-market-search-dock",
  "PASS197 marker: Shield search suggestions render through a fixed body portal",
]) has(client, token, "MarketIntegrityClient");

for (const token of [
  "btc: \"₿\"",
  "eth: \"◆\"",
  "sol: \"◎\"",
  "usdt: \"₮\"",
  "usdc: \"$\"",
  "xrp: \"✕\"",
  "doge: \"Ð\"",
  "bnb: \"B\"",
  "ada: \"A\"",
  "trx: \"T\"",
  "link: \"L\"",
  "dot: \"D\"",
  "ltc: \"Ł\"",
  "shib: \"S\"",
  "pepe: \"P\"",
]) has(client, token, "MarketIntegrityClient glyph fallback");

for (const token of [
  "PASS197 · Shield search portal",
  ".shield-market-search-dock",
  "z-index: 2147483000",
  ".shield-token-search-suggest-portal",
  ".shield-token-search-suggest-scroll",
  "overflow: visible !important",
  "scrollbar-color: rgba(200,169,106,0.40)",
]) has(css, token, "globals.css");

if (client.includes('absolute left-1/2 top-[calc(100%+0.55rem)]')) {
  errors.push("MarketIntegrityClient: stale absolute in-form suggestion dropdown returned; use fixed body portal.");
}

for (const token of [
  '"verify:pass197-search-portal-containment"',
  "verify-pass197-search-portal-containment-safety.mjs",
]) has(pkg, token, "package.json");
for (const token of [
  "PASS197 search portal containment guard",
  "verify-pass197-search-portal-containment-safety.mjs",
  "shield-token-search-suggest-portal",
]) has(preflight, token, "vercel-preflight");

for (const token of ["PASS197 marker", "search-suggestions-ux", "shield-table"]) has(progress, token, "project-progress");
for (const token of ["PASS197", "body-level portal", "Shield search suggestions"]) has(audit, token, "site-page-audit");

const unsafe = `${client}\n${css}`.toLowerCase();
for (const word of ["guaranteed profit", "risk-free", "safe investment", "scam confirmed", "enter seed phrase", "buy signal", "sell signal"]) {
  if (unsafe.includes(word)) errors.push(`Forbidden wording found: ${word}`);
}

if (errors.length) {
  console.error("PASS197 search portal containment safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS197 search portal containment safety OK");
