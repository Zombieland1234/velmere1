import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function has(source, token, label) { if (!source.includes(token)) errors.push(`${label}: missing ${token}`); }

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const client = read("components/market-integrity/MarketIntegrityClient.tsx");
const home = read("components/home/HomePageClient.tsx");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");

has(home, "const locale = useLocale();", "HomePageClient");
has(home, '<FullSurfaceReadinessIndex locale={locale} surface="home" />', "HomePageClient");

has(modal, "const useStaticEvidenceBoard = false;", "TokenRiskModal");
has(modal, "const useRailLayout = false;", "TokenRiskModal");
has(modal, "shield-vlm-orbit-only", "TokenRiskModal");
has(modal, "setWindowOffset(clampOffset(dragRef.current.startOffset - deltaBars));", "TokenRiskModal chart drag");
has(modal, "document.body", "TokenRiskModal portal mode guide");
has(modal, "PASS196 marker: Orbit 360 only", "TokenRiskModal marker");
if (modal.includes('key={preset}') && modal.includes('ui.evidenceBoard')) errors.push("TokenRiskModal still renders preset-mapped Evidence Board toggle");
if (modal.includes('<section className="shield-token-popup-shell">\n        {vlmSequenceMode ?')) errors.push("VLM sequence overlay is still nested inside clipped popup shell");

has(client, "function knownTokenGlyph", "MarketIntegrityClient");
has(client, "knownTokenGlyph(symbol, id, name)", "MarketIntegrityClient");
has(client, "PASS196 marker: Shield search suggestions", "MarketIntegrityClient marker");

for (const token of [
  "PASS196 · Orbit 360 only",
  ".shield-vlm-static-evidence-board",
  ".shield-analysis-disclaimer",
  ".shield-source-spine-panel",
  ".shield-vlm-sequence-overlay",
  ".shield-token-search-suggest-panel",
]) has(css, token, "globals.css");

has(preflight, "verify-pass196-orbit360-final-runtime-hotfix-safety.mjs", "vercel-preflight");
has(preflight, "PASS196", "vercel-preflight");

const unsafe = `${modal}\n${client}\n${css}`.toLowerCase();
for (const word of ["guaranteed profit", "risk-free", "safe investment", "scam confirmed", "enter seed phrase"]) {
  if (unsafe.includes(word)) errors.push(`Forbidden wording found: ${word}`);
}

if (errors.length) {
  console.error("PASS196 Orbit360 final runtime hotfix safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS196 Orbit360 final runtime hotfix safety OK");
