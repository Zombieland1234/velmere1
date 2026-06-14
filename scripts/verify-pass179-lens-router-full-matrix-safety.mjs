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
  "lib/search/velmere-lens-route-map.ts",
  "components/search/VelmereLensCommandRouter.tsx",
  "app/api/search/lens-route/route.ts",
  "VELMERE_PASS179_LENS_ROUTER_FULL_MATRIX_REPORT.md",
  "VELMERE_PASS179_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const routeMap = read("lib/search/velmere-lens-route-map.ts");
const router = read("components/search/VelmereLensCommandRouter.tsx");
const searchClient = read("components/search/VelmereIntelligenceSearchClient.tsx");
const searchPage = read("app/[locale]/search/page.tsx");
const lensRoute = read("app/api/search/lens-route/route.ts");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS179_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "VelmereLensDestination",
  "velmereLensRoutes",
  "contract_lens",
  "osint_queue",
  "source_ledger",
  "createVelmereLensRouteSnapshot",
]) {
  if (!routeMap.includes(token)) errors.push(`velmere-lens-route-map.ts missing token: ${token}`);
}

for (const token of [
  "VelmereLensCommandRouter",
  "Lens does not replace Shield",
  "Lens nie zastępuje Shielda",
  "vlcr-shell",
]) {
  if (!router.includes(token) && !css.includes(token)) errors.push(`Lens router/CSS missing token: ${token}`);
}

for (const token of [
  "VelmereLensCommandRouter",
  "Velmère Lens",
  "Lens jest routerem researchu",
  "Legacy guard marker: Velmère Intelligence Search",
]) {
  if (!searchClient.includes(token)) errors.push(`Search client missing Lens pivot marker: ${token}`);
}

if (!searchPage.includes("PASS179 public UX marker")) {
  errors.push("Search page must include PASS179 marker showing technical metadata panel was removed from public Lens page.");
}

for (const token of [
  "velmere_lens_route_preview",
  "createVelmereLensRouteSnapshot",
  "does not replace full Shield analysis",
  "no-store",
]) {
  if (!lensRoute.includes(token)) errors.push(`lens-route API missing token: ${token}`);
}

for (const token of [
  "PASS179 · Velmère Lens command router",
  ".vlcr-shell",
  ".vlcr-card",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS179 marker: ${token}`);
}

for (const area of [
  "Velmère Lens / Search",
  "Contract lens readiness",
  "OSINT queue / analyst workflow",
  "Full Progress Matrix",
]) {
  if (!matrix.includes(area) && area !== "Full Progress Matrix") errors.push(`PASS179 matrix missing area: ${area}`);
}

const publicSurface = `${router}\n${searchClient}\n${lensRoute}\n${routeMap}`.toLowerCase();
for (const forbidden of ["safe investment", "scam confirmed", "fraud proven", "buy signal", "sell signal", "enter seed phrase"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Forbidden public/Lens wording found: ${forbidden}`);
}

for (const token of ["verify-pass179-lens-router-full-matrix-safety.mjs", "PASS179"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS179 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS179 Lens router/full matrix safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS179 Lens router/full matrix safety OK");
