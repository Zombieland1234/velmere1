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
  "lib/security/durable-rate-limit.ts",
  "lib/security/api-abuse-shield.ts",
  "app/api/security/abuse-shield/route.ts",
  "VELMERE_PASS183_DURABLE_RATE_LIMIT_ABUSE_SHIELD_REPORT.md",
  "VELMERE_PASS183_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const durable = read("lib/security/durable-rate-limit.ts");
const abuse = read("lib/security/api-abuse-shield.ts");
const abuseRoute = read("app/api/security/abuse-shield/route.ts");
const readinessRoute = read("app/api/security/readiness/route.ts");
const searchRoute = read("app/api/market-integrity/search/route.ts");
const analyzeRoute = read("app/api/market-integrity/analyze/route.ts");
const iconRoute = read("app/api/market-integrity/icon/route.ts");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS183_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "DurableRateLimitDecision",
  "applyDurableRateLimit",
  "buildDurableRateLimitReadiness",
  "UPSTASH_REDIS_REST_URL",
  "memoryFallback",
  "upstash_ready",
]) {
  if (!durable.includes(token)) errors.push(`durable-rate-limit.ts missing token: ${token}`);
}

for (const token of [
  "applyApiAbuseShield",
  "evaluateAbuseSignals",
  "scanner_like_user_agent",
  "malicious_url_pattern",
  "sensitive_or_script_query",
  "abuse_shield_blocked",
  "abuseShieldResponseMeta",
]) {
  if (!abuse.includes(token)) errors.push(`api-abuse-shield.ts missing token: ${token}`);
}

for (const token of [
  "api_abuse_shield_preview",
  "buildDurableRateLimitReadiness",
  "evaluateAbuseSignals",
  "distributed rate-limit store",
]) {
  if (!abuseRoute.includes(token)) errors.push(`abuse-shield route missing token: ${token}`);
}

for (const token of ["applyApiAbuseShield", "abuseShieldResponseMeta"]) {
  if (!searchRoute.includes(token)) errors.push(`market search route missing abuse shield token: ${token}`);
  if (!analyzeRoute.includes(token)) errors.push(`market analyze route missing abuse shield token: ${token}`);
}

for (const token of ["applyApiAbuseShield", "token-icon-proxy", "url.protocol !== \"https:\""]) {
  if (!iconRoute.includes(token)) errors.push(`icon route missing abuse/icon hardening token: ${token}`);
}

for (const token of ["buildDurableRateLimitReadiness", "abuseShieldResponseMeta"]) {
  if (!readinessRoute.includes(token)) errors.push(`security readiness route missing PASS183 token: ${token}`);
}

for (const area of ["Durable rate-limit readiness", "API abuse scoring", "Security launch readiness"]) {
  if (!matrix.includes(area)) errors.push(`PASS183 matrix missing area: ${area}`);
}

for (const token of ["verify-pass183-durable-rate-limit-abuse-shield-safety.mjs", "PASS183"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS183 marker: ${token}`);
}

const publicSurface = `${durable}\n${abuse}\n${abuseRoute}\n${readinessRoute}\n${searchRoute}\n${analyzeRoute}\n${iconRoute}`.toLowerCase();
for (const forbidden of ["unhackable", "hack proof", "guaranteed secure"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Forbidden security wording found: ${forbidden}`);
}

if (errors.length) {
  console.error("PASS183 durable rate-limit / abuse shield safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS183 durable rate-limit / abuse shield safety OK");
