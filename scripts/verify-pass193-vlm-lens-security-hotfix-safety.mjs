import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function exists(relativePath) { return fs.existsSync(path.join(root, relativePath)); }

const required = [
  "components/security/SecurityTrustPage.tsx",
  "components/security/SecurityOperationsChecklistPanel.tsx",
  "components/market-integrity/TokenRiskModal.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/search/VelmereLensCommandRouter.tsx",
  "lib/search/velmere-lens-route-map.ts",
  "app/api/search/lens-report/route.ts",
  "VELMERE_PASS193_VLM_LENS_SECURITY_HOTFIX_REPORT.md",
  "VELMERE_PASS193_FULL_MASTER_PROGRESS_MATRIX.md",
];
for (const file of required) if (!exists(file)) errors.push(`${file} is missing`);

const securityPage = read("components/security/SecurityTrustPage.tsx");
const tokenModal = read("components/market-integrity/TokenRiskModal.tsx");
const marketClient = read("components/market-integrity/MarketIntegrityClient.tsx");
const lensRouter = read("components/search/VelmereLensCommandRouter.tsx");
const lensMap = read("lib/search/velmere-lens-route-map.ts");
const lensReport = read("app/api/search/lens-report/route.ts");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS193_FULL_MASTER_PROGRESS_MATRIX.md");

for (const token of ["import SecurityOperationsChecklistPanel", "<SecurityOperationsChecklistPanel locale={safeLocale} />"]) {
  if (!securityPage.includes(token)) errors.push(`SecurityTrustPage missing hotfix token: ${token}`);
}

for (const token of ["orbitZoom", "handleOrbitWheel", "shield-vlm-zoom-controls", "--vlm-static-transform", "translate(-8%, -50%)", "translate(-92%, -50%)"]) {
  if (!tokenModal.includes(token)) errors.push(`TokenRiskModal missing VLM layout token: ${token}`);
}

for (const token of ["PASS193 · VLM Brain viewport expansion", ".shield-vlm-zoom-controls", ".shield-vlm-static-stage", ".vst-hero", ".vlcr-report-preview", ".shield-token-search-suggest-panel"]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS193 CSS token: ${token}`);
}

for (const token of ["solana", "bonk", "shield-suggestion-token-avatar", "token suggestions · logo aware"]) {
  if (!marketClient.includes(token)) errors.push(`MarketIntegrityClient missing suggestion/logo token: ${token}`);
}

for (const token of ["reportHref", "reportTitle", "mode=shield", "mode=contract", "source_ledger"]) {
  if (!lensMap.includes(token)) errors.push(`velmere-lens-route-map missing report/routing token: ${token}`);
}

for (const token of ["vlcr-action-row", "vlcr-report-preview", "c.previewBody", "route.reportHref"]) {
  if (!lensRouter.includes(token)) errors.push(`VelmereLensCommandRouter missing report preview token: ${token}`);
}

for (const token of ["velmere-lens", "PDF-ready evidence note", "content-disposition", "not a safety certificate", "escapeHtml"]) {
  if (!lensReport.includes(token)) errors.push(`lens-report route missing token: ${token}`);
}

for (const area of ["SecurityOperationsChecklistPanel runtime hotfix", "VLM Brain window containment", "Evidence Board split lanes", "Velmère Lens report preview", "Search suggestions logo fallback", "Całość launch-ready"]) {
  if (!matrix.includes(area)) errors.push(`PASS193 full master matrix missing area: ${area}`);
}

const unsafeSurface = `${lensReport}\n${lensRouter}\n${lensMap}\n${securityPage}`.toLowerCase();
for (const forbidden of ["guaranteed profit", "safe investment", "scam confirmed", "security certificate", "100% secure", "unhackable", "best security in the world"]) {
  if (unsafeSurface.includes(forbidden)) errors.push(`Unsafe wording found after PASS193: ${forbidden}`);
}

for (const token of ["verify-pass193-vlm-lens-security-hotfix-safety.mjs", "PASS193"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight missing PASS193 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS193 VLM/Lens/security hotfix safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS193 VLM/Lens/security hotfix safety OK");
