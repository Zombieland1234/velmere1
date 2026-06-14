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
  "components/market-integrity/TokenRiskModal.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/search/VelmereLensCommandRouter.tsx",
  "app/globals.css",
  "VELMERE_PASS194_ORBIT360_MODAL_LENS_POLISH_REPORT.md",
  "VELMERE_PASS194_FULL_MASTER_PROGRESS_MATRIX.md",
];
for (const file of required) if (!exists(file)) errors.push(`${file} is missing`);

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const marketClient = read("components/market-integrity/MarketIntegrityClient.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS194_FULL_MASTER_PROGRESS_MATRIX.md");

for (const token of [
  "Math.round(deltaX / 10)",
  "Evidence Board hidden for now",
  "setActiveCommand(\"deck\")",
  "shield-vlm-detail-panel-popup",
  "shield-mode-guide-popup",
  "shield-source-spine-panel hidden",
  "VLM Orbit 360",
]) {
  if (!modal.includes(token)) errors.push(`TokenRiskModal missing PASS194 token: ${token}`);
}

for (const token of [
  "PASS194 · full-screen Orbit 360 hotfix",
  ".shield-vlm-detail-panel-popup",
  ".shield-mode-guide-popup",
  ".shield-vlm-motion-toggle-mini button:not(.is-active)",
  ".vlcr-action-row",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS194 token: ${token}`);
}

for (const token of [
  "id?: string",
  "name?: string",
  "knownTokenLogo(symbol, id, name)",
  "<TokenAvatar image={item.image} symbol={item.symbol} id={item.id} name={item.name} />",
]) {
  if (!marketClient.includes(token)) errors.push(`MarketIntegrityClient missing PASS194 logo token: ${token}`);
}

for (const token of [
  "Lens cards are descriptive only",
  "Wyszukiwarka Velmère zbiera token",
  "Kapsuła raportu Velmère",
]) {
  if (!lens.includes(token)) errors.push(`VelmereLensCommandRouter missing PASS194 lens token: ${token}`);
}

if (lens.includes("<Link href={route.href}") || lens.includes("<a href={route.reportHref}")) {
  errors.push("Lens route cards still render Open/PDF action buttons; PASS194 should keep cards descriptive only.");
}

for (const area of [
  "Token chart drag UX",
  "Token modal mode info popup",
  "VLM mode return-to-chart",
  "VLM visual brain / motion",
  "Selected tile popup readability",
  "Lens card clutter",
  "Całość launch-ready",
]) {
  if (!matrix.includes(area)) errors.push(`PASS194 full matrix missing area: ${area}`);
}

for (const forbidden of ["buy signal", "sell signal", "guaranteed profit", "safe investment", "unhackable", "best security in the world"]) {
  const surface = `${modal}\n${lens}\n${css}`.toLowerCase();
  if (surface.includes(forbidden)) errors.push(`Forbidden public/security wording found: ${forbidden}`);
}

for (const token of ["verify-pass194-orbit360-modal-lens-polish-safety.mjs", "PASS194"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS194 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS194 Orbit360/modal/Lens polish safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS194 Orbit360/modal/Lens polish safety OK");
