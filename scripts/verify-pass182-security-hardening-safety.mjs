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
  "lib/security/http-security.mjs",
  "lib/security/api-guard.ts",
  "lib/security/security-readiness.ts",
  "app/api/security/readiness/route.ts",
  "VELMERE_PASS182_SECURITY_HARDENING_REPORT.md",
  "VELMERE_PASS182_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const nextConfig = read("next.config.mjs");
const headers = read("lib/security/http-security.mjs");
const guard = read("lib/security/api-guard.ts");
const readiness = read("app/api/security/readiness/route.ts");
const searchRoute = read("app/api/market-integrity/search/route.ts");
const analyzeRoute = read("app/api/market-integrity/analyze/route.ts");
const iconRoute = read("app/api/market-integrity/icon/route.ts");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS182_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "buildSecurityHeaders",
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
  "Permissions-Policy",
  "X-DNS-Prefetch-Control",
]) {
  if (!headers.includes(token) && !nextConfig.includes(token)) errors.push(`security header marker missing: ${token}`);
}

if (!nextConfig.includes("buildSecurityHeaders({ isDev })")) {
  errors.push("next.config.mjs must use centralized buildSecurityHeaders({ isDev }).");
}

for (const token of [
  "securityJson",
  "applySoftRateLimit",
  "sanitizeBoundedParam",
  "rejectOversizedUrl",
  "methodNotAllowed",
]) {
  if (!guard.includes(token)) errors.push(`api-guard.ts missing token: ${token}`);
}

for (const token of ["buildSecurityReadinessSnapshot", "security_headers_api_guard_preview", "no-store"]) {
  if (!readiness.includes(token) && !read("lib/security/security-readiness.ts").includes(token)) {
    errors.push(`security readiness missing token: ${token}`);
  }
}

for (const token of ["securityJson"]) {
  if (!searchRoute.includes(token)) errors.push(`market search route missing guard token: ${token}`);
  if (!analyzeRoute.includes(token)) errors.push(`market analyze route missing guard token: ${token}`);
}
for (const token of ["applySoftRateLimit", "sanitizeBoundedParam", "rejectOversizedUrl"]) {
  const wrappedByPass183 =
    searchRoute.includes("applyApiAbuseShield") &&
    analyzeRoute.includes("applyApiAbuseShield") &&
    read("lib/security/api-abuse-shield.ts").includes(token);
  if (!wrappedByPass183) {
    if (!searchRoute.includes(token)) errors.push(`market search route missing guard token: ${token}`);
    if (!analyzeRoute.includes(token)) errors.push(`market analyze route missing guard token: ${token}`);
  }
}

for (const token of [
  "url.protocol !== \"https:\"",
  "url.username",
  "url.password",
  "url.port",
  "contentType.toLowerCase().startsWith(\"image/\")",
  "body.byteLength > 600_000",
  "ALLOWED_HOSTS",
]) {
  if (!iconRoute.includes(token)) errors.push(`icon proxy hardening marker missing: ${token}`);
}

for (const area of ["Security headers / CSP", "API route defensive guards", "Security launch readiness"]) {
  if (!matrix.includes(area)) errors.push(`PASS182 matrix missing area: ${area}`);
}

for (const token of ["verify-pass182-security-hardening-safety.mjs", "PASS182"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS182 marker: ${token}`);
}

const publicSurface = `${headers}\n${guard}\n${readiness}\n${searchRoute}\n${analyzeRoute}\n${iconRoute}`.toLowerCase();
for (const forbidden of ["unhackable", "hack proof", "guaranteed secure", "bypass", "steal"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Forbidden security wording found: ${forbidden}`);
}

if (errors.length) {
  console.error("PASS182 security hardening safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS182 security hardening safety OK");
