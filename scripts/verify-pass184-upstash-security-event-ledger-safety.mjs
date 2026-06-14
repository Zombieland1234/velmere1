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
  "lib/security/security-event-ledger.ts",
  "app/api/security/events/route.ts",
  "VELMERE_PASS184_UPSTASH_SECURITY_EVENT_LEDGER_REPORT.md",
  "VELMERE_PASS184_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const durable = read("lib/security/durable-rate-limit.ts");
const eventLedger = read("lib/security/security-event-ledger.ts");
const abuse = read("lib/security/api-abuse-shield.ts");
const readiness = read("app/api/security/readiness/route.ts");
const abuseRoute = read("app/api/security/abuse-shield/route.ts");
const eventsRoute = read("app/api/security/events/route.ts");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS184_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "upstash_rest",
  "upstash_fallback_memory",
  "/pipeline",
  "authorization: `Bearer ${token}`",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "providerError",
  "upstashRestAdapter",
]) {
  if (!durable.includes(token)) errors.push(`durable-rate-limit.ts missing PASS184 token: ${token}`);
}

for (const token of [
  "SecurityEventRecord",
  "recordSecurityEvent",
  "buildSecurityEventLedgerSnapshot",
  "clientFingerprint",
  "in_memory_security_event_ledger",
  "storageWritePerformed: false",
  "durableStorageReady: false",
]) {
  if (!eventLedger.includes(token)) errors.push(`security-event-ledger.ts missing token: ${token}`);
}

for (const token of [
  "recordSecurityEvent",
  "abuse_blocked",
  "rate_limited",
  "suspicious_allowed",
  "provider_fallback",
  "url_too_large",
  "method_blocked",
]) {
  if (!abuse.includes(token)) errors.push(`api-abuse-shield.ts missing event logging token: ${token}`);
}

for (const token of [
  "buildSecurityEventLedgerSnapshot",
  "listSecurityEvents",
  "severity",
  "filtered",
]) {
  if (!eventsRoute.includes(token)) errors.push(`security events route missing token: ${token}`);
}

for (const token of ["securityEventLedger", "buildSecurityEventLedgerSnapshot"]) {
  if (!readiness.includes(token)) errors.push(`security readiness route missing PASS184 event ledger token: ${token}`);
  if (!abuseRoute.includes(token)) errors.push(`abuse shield route missing PASS184 event ledger token: ${token}`);
}

for (const area of ["Upstash/Redis adapter", "Security event ledger", "Monitoring / alerting readiness", "Całość launch-ready"]) {
  if (!matrix.includes(area)) errors.push(`PASS184 full matrix missing area: ${area}`);
}

for (const token of ["verify-pass184-upstash-security-event-ledger-safety.mjs", "PASS184"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS184 marker: ${token}`);
}

const publicSurface = `${durable}\n${eventLedger}\n${abuse}\n${eventsRoute}\n${readiness}\n${abuseRoute}`.toLowerCase();
for (const forbidden of ["unhackable", "hack proof", "guaranteed secure"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Forbidden security wording found: ${forbidden}`);
}

if (errors.length) {
  console.error("PASS184 Upstash/security event ledger safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS184 Upstash/security event ledger safety OK");
