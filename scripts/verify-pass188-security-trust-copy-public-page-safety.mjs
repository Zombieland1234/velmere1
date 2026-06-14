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
  "lib/security/security-trust-copy.ts",
  "components/security/SecurityTrustPage.tsx",
  "app/[locale]/security/page.tsx",
  "app/api/security/trust/route.ts",
  "VELMERE_PASS188_SECURITY_TRUST_COPY_PUBLIC_PAGE_REPORT.md",
  "VELMERE_PASS188_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const trustCopy = read("lib/security/security-trust-copy.ts");
const trustPage = read("components/security/SecurityTrustPage.tsx");
const routePage = read("app/[locale]/security/page.tsx");
const trustApi = read("app/api/security/trust/route.ts");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS188_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "securityTrustForbiddenClaims",
  "securityTrustPillars",
  "securityTrustRoadmap",
  "securityTrustCopy",
  "buildSecurityTrustSnapshot",
  "security-first",
  "Żaden system nie usuwa całego ryzyka",
  "No system can remove every risk",
]) {
  if (!trustCopy.includes(token)) errors.push(`security-trust-copy.ts missing token: ${token}`);
}

for (const token of [
  "SecurityTrustPage",
  "buildSecurityTrustSnapshot",
  "securityTrustPillars",
  "vst-hero",
  "Production boundary",
  "World-class direction, honest delivery",
]) {
  if (!trustPage.includes(token) && !css.includes(token)) errors.push(`SecurityTrustPage/CSS missing token: ${token}`);
}

for (const token of ["Velmère Security", "SecurityTrustPage", "metadata"]) {
  if (!routePage.includes(token)) errors.push(`security page route missing token: ${token}`);
}

for (const token of [
  "applyApiAbuseShield",
  "buildSecurityTrustSnapshot",
  "buildSecurityReadinessSnapshot",
  "buildDurableRateLimitReadiness",
  "buildSecurityEventAppendReadiness",
  "security-trust",
]) {
  if (!trustApi.includes(token)) errors.push(`security trust API missing token: ${token}`);
}

for (const token of [
  "PASS188 · Velmère Security Trust public surface",
  ".vst-hero",
  ".vst-card",
  ".vst-roadmap",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS188 CSS token: ${token}`);
}

for (const area of [
  "Security public trust page",
  "Security copy / positioning",
  "Security overclaim safety",
  "Brand trust / credibility",
  "Całość launch-ready",
]) {
  if (!matrix.includes(area)) errors.push(`PASS188 full matrix missing area: ${area}`);
}

const publicSurface = `${trustCopy}\n${trustPage}\n${routePage}\n${trustApi}`.toLowerCase();
const forbiddenPublicClaims = [
  "najlepsze zabezpieczenia świata",
  "nie do zhakowania",
  "gwarantowane bezpieczeństwo",
  "100% secure",
  "unhackable",
  "hack proof",
  "world's best security",
  "best security in the world",
  "military-grade security",
  "bank-level guaranteed",
];

for (const forbidden of forbiddenPublicClaims) {
  const inForbiddenListOnly =
    trustCopy.includes("securityTrustForbiddenClaims") &&
    trustCopy.toLowerCase().includes(forbidden) &&
    !`${trustPage}\n${routePage}\n${trustApi}`.toLowerCase().includes(forbidden);
  if (publicSurface.includes(forbidden) && !inForbiddenListOnly) {
    errors.push(`Unsafe public security overclaim found: ${forbidden}`);
  }
}

for (const forbidden of ["guaranteed secure", "absolute safety", "certified secure"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Unsafe public security wording found: ${forbidden}`);
}

for (const token of ["verify-pass188-security-trust-copy-public-page-safety.mjs", "PASS188"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS188 marker: ${token}`);
}

if (trustPage.includes("window.") || trustPage.includes("document.")) {
  errors.push("SecurityTrustPage must stay server-safe; no window/document usage.");
}

if (errors.length) {
  console.error("PASS188 security trust copy/public page safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS188 security trust copy/public page safety OK");
