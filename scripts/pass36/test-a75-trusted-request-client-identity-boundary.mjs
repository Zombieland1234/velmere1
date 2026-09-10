import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PASS36_A75_TRUSTED_REQUEST_CLIENT_IDENTITY_BOUNDARY_ID,
  getClientKey,
  rateLimitAddressKey,
  resolveTrustedClientAddress,
  resolveTrustedRequestClientIdentity,
} from "../../lib/security/api-guard.ts";
import { createClientFingerprint } from "../../lib/security/security-event-ledger.ts";
import { buildDurableComputationIdentity } from "../../lib/jobs/durable-computation-replay.ts";
import { checkRateLimit } from "../../lib/market-integrity/api-guardrails.ts";

const REVISION = "VELMERE_PASS36_A75R0_TRUSTED_PROXY_AND_REQUEST_CLIENT_IDENTITY_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, id);
};
const request = (headers = {}) => new Request("https://velmere.example/api/test", { headers });
const originalEnv = { ...process.env };
async function withEnv(values, fn) {
  for (const key of ["NODE_ENV", "VERCEL_ENV", "VERCEL", "VELMERE_TRUSTED_PROXY_PROFILE", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "VELMERE_RATE_LIMIT_DISABLED"]) delete process.env[key];
  for (const [key, value] of Object.entries(values)) if (value !== undefined) process.env[key] = value;
  try { return await fn(); }
  finally {
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    for (const [key, value] of Object.entries(originalEnv)) process.env[key] = value;
  }
}

check("boundary_id_exact", PASS36_A75_TRUSTED_REQUEST_CLIENT_IDENTITY_BOUNDARY_ID === "velmere.pass36.a75.trusted-request-client-identity-boundary.v1");

const dev = resolveTrustedClientAddress(request({ "x-forwarded-for": "198.51.100.7", "user-agent": "curl/8" }), { NODE_ENV: "test" });
check("dev_compat_xff", dev.trusted && dev.profile === "nonproduction_compat" && dev.address === "198.51.100.7");
const prodNoProfile = resolveTrustedClientAddress(request({ "x-forwarded-for": "198.51.100.8", "x-real-ip": "198.51.100.9" }), { NODE_ENV: "production", VERCEL_ENV: "production" });
check("production_raw_forwarded_untrusted", !prodNoProfile.trusted && prodNoProfile.address === null && prodNoProfile.profile === "untrusted");
const prodVercel = resolveTrustedClientAddress(request({ "x-vercel-forwarded-for": "198.51.100.10", "x-forwarded-for": "203.0.113.99", "x-real-ip": "203.0.113.100" }), { NODE_ENV: "production", VERCEL_ENV: "production", VERCEL: "1", VELMERE_TRUSTED_PROXY_PROFILE: "vercel" });
check("production_vercel_exact_header", prodVercel.trusted && prodVercel.address === "198.51.100.10" && prodVercel.source === "x-vercel-forwarded-for");
check("production_spoof_headers_ignored", prodVercel.address !== "203.0.113.99" && prodVercel.address !== "203.0.113.100");
const comma = resolveTrustedClientAddress(request({ "x-vercel-forwarded-for": "198.51.100.10, 203.0.113.1" }), { NODE_ENV: "production", VERCEL_ENV: "production", VERCEL: "1", VELMERE_TRUSTED_PROXY_PROFILE: "vercel" });
check("production_vercel_chain_rejected", comma.trusted && comma.address === null && comma.reason === "trusted_header_missing_or_invalid");
for (const [id, value] of [
  ["leading_zero_ipv4_rejected", "198.051.100.1"],
  ["cidr_rejected", "198.51.100.1/24"],
  ["zone_id_rejected", "fe80::1%eth0"],
  ["garbage_rejected", "client.example"],
]) {
  const result = resolveTrustedClientAddress(request({ "x-vercel-forwarded-for": value }), { NODE_ENV: "production", VERCEL_ENV: "production", VERCEL: "1", VELMERE_TRUSTED_PROXY_PROFILE: "vercel" });
  check(id, result.address === null, result);
}
const mapped = resolveTrustedClientAddress(request({ "x-vercel-forwarded-for": "::ffff:192.0.2.1" }), { NODE_ENV: "production", VERCEL_ENV: "production", VERCEL: "1", VELMERE_TRUSTED_PROXY_PROFILE: "vercel" });
check("ipv4_mapped_normalized", mapped.address === "192.0.2.1", mapped);
check("ipv4_mapped_key_not_shared_ipv6_zero", rateLimitAddressKey(mapped.address) === "192.0.2.1");
check("ipv6_64_aggregation", rateLimitAddressKey("2001:db8:abcd:12::1") === rateLimitAddressKey("2001:db8:abcd:12:ffff::9"));
check("ipv6_different_64_separated", rateLimitAddressKey("2001:db8:abcd:12::1") !== rateLimitAddressKey("2001:db8:abcd:13::1"));

const identity = resolveTrustedRequestClientIdentity(request({ "x-vercel-forwarded-for": "2001:db8:abcd:12::99", "user-agent": "Mozilla/5.0 Chrome/150" }), { NODE_ENV: "production", VERCEL_ENV: "production", VERCEL: "1", VELMERE_TRUSTED_PROXY_PROFILE: "vercel" });
check("identity_exact_profile", identity.trusted && identity.profile === "vercel" && identity.userAgentFamily === "browser");
check("identity_ipv6_privacy_key", identity.addressKey === "2001:db8:abcd:12::/64", identity);
check("identity_material_no_raw_ip", !identity.privacyMaterial.includes("2001:db8:abcd:12::99"));

await withEnv({ NODE_ENV: "production", VERCEL_ENV: "production", VERCEL: "1", VELMERE_TRUSTED_PROXY_PROFILE: "vercel" }, async () => {
  const baseHeaders = { "x-vercel-forwarded-for": "198.51.100.20", "user-agent": "Mozilla/5.0 Chrome/150" };
  const a = request({ ...baseHeaders, "x-forwarded-for": "10.0.0.1", authorization: "Bearer secret-a", cookie: "session=a" });
  const b = request({ ...baseHeaders, "x-forwarded-for": "10.0.0.2", authorization: "Bearer secret-b", cookie: "session=b" });
  check("production_client_key_spoof_stable", getClientKey(a, "a75") === getClientKey(b, "a75"));
  check("security_fingerprint_spoof_stable", createClientFingerprint(a) === createClientFingerprint(b));
  const durableA = buildDurableComputationIdentity({ kind: "vlm_analysis", request: a, input: { asset: "BTC" } });
  const durableB = buildDurableComputationIdentity({ kind: "vlm_analysis", request: b, input: { asset: "BTC" } });
  check("durable_identity_excludes_auth_cookie", durableA.subjectHash === durableB.subjectHash, { a: durableA.subjectHash, b: durableB.subjectHash });
  check("durable_identity_trusted_source", durableA.subjectSource === "trusted_transport_fallback", durableA.subjectSource);
  const boundA = buildDurableComputationIdentity({ kind: "vlm_analysis", request: a, input: { asset: "BTC" }, subjectBinding: { kind: "account", value: "acct_a" } });
  const boundB = buildDurableComputationIdentity({ kind: "vlm_analysis", request: b, input: { asset: "BTC" }, subjectBinding: { kind: "account", value: "acct_b" } });
  check("explicit_subject_binding_separates", boundA.subjectHash !== boundB.subjectHash);
});

await withEnv({ NODE_ENV: "test" }, async () => {
  const result = await checkRateLimit(request({ "x-forwarded-for": "198.51.100.30", "user-agent": "curl/8" }), "investigator");
  check("market_guardrail_nonproduction_memory", result.ok && result.mode === "memory" && result.status === 200, result);
});
await withEnv({ NODE_ENV: "production", VERCEL_ENV: "production" }, async () => {
  const result = await checkRateLimit(request({ "x-forwarded-for": "198.51.100.31" }), "investigator");
  check("market_guardrail_missing_proxy_fail_closed", !result.ok && result.status === 503, result);
});
await withEnv({ NODE_ENV: "production" }, async () => {
  const result = await checkRateLimit(request({ "x-forwarded-for": "198.51.100.31" }), "investigator");
  check("self_hosted_production_missing_proxy_fail_closed", !result.ok && result.status === 503, result);
});
await withEnv({ NODE_ENV: "production", VERCEL_ENV: "production", VERCEL: "1", VELMERE_TRUSTED_PROXY_PROFILE: "vercel" }, async () => {
  const result = await checkRateLimit(request({ "x-vercel-forwarded-for": "198.51.100.32" }), "investigator");
  check("market_guardrail_missing_durable_store_fail_closed", !result.ok && result.status === 503, result);
});

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const productionRoots = ["app", "lib", "components", "proxy.ts"];
const forwardedHits = [];
const walk = (relative) => {
  const absolute = path.join(root, relative);
  const stat = fs.statSync(absolute);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(absolute)) walk(path.join(relative, child));
    return;
  }
  if (!/\.(?:ts|tsx|js|mjs|cjs)$/u.test(relative)) return;
  const source = fs.readFileSync(absolute, "utf8");
  if (/x-(?:vercel-)?forwarded-for|x-real-ip/iu.test(source)) forwardedHits.push(relative.split(path.sep).join("/"));
};
for (const entry of productionRoots) walk(entry);
check("single_forwarded_header_boundary", forwardedHits.length === 1 && forwardedHits[0] === "lib/security/api-guard.ts", forwardedHits);
const requestGuards = read("lib/api/request-guards.ts");
check("request_guards_central_rate_limit", requestGuards.includes("applyApiRateLimit") && !/x-forwarded-for|x-real-ip/u.test(requestGuards));
check("request_guards_no_memory_bucket", !requestGuards.includes("new Map<string, { count: number; resetAt: number }>()"));
const marketGuardrails = read("lib/market-integrity/api-guardrails.ts");
check("market_guardrails_central_rate_limit", marketGuardrails.includes("applyApiRateLimit") && marketGuardrails.includes("export async function checkRateLimit"));
check("market_guardrails_no_memory_store", !marketGuardrails.includes("__velmereMarketIntegrityApiGuardrails") && !marketGuardrails.includes("x-forwarded-for"));
const eventLedger = read("lib/security/security-event-ledger.ts");
check("security_event_fingerprint_central", eventLedger.includes("resolveTrustedRequestClientIdentity") && !eventLedger.includes('request.headers.get("x-forwarded-for")'));
const durableReplay = read("lib/jobs/durable-computation-replay.ts");
check("durable_identity_central", durableReplay.includes("resolveTrustedRequestClientIdentity"));
check("durable_identity_no_secret_transport_material", !durableReplay.includes('request.headers.get("authorization")') && !durableReplay.includes('request.headers.get("cookie")') && !durableReplay.includes('request.headers.get("x-velmere-paid-access")'));
for (const file of [
  "lib/server/market-integrity-route-modules/evidence-export.ts",
  "lib/server/market-integrity-route-modules/investigator.ts",
  "lib/server/market-integrity-route-modules/readiness.ts",
  "lib/server/market-integrity-route-modules/source-snapshots.ts",
]) {
  // Routes may use the direct guard or an injected guard for testability. In
  // either case, the security property is that its decision is awaited before
  // continuing with the request.
  check(
    `market_route_awaits:${file}`,
    /await\s+(?:checkRateLimit|checkRequestRateLimit)\(request\b/u.test(read(file)),
  );
}
check("profile_awaits_central_limiter", read("app/api/profile/route.ts").includes("await rateLimit(request"));
check("square_posts_no_double_limiter", !read("app/api/square/posts/route.ts").includes('rateLimit(request, "square-posts"'));
check("square_comments_no_double_limiter", !read("app/api/square/comments/route.ts").includes('rateLimit(request, "square-comments"'));

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a75.trusted-request-client-identity-boundary-test.v1",
  revisionId: REVISION,
  counts: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
  coveredProductionFiles: 12,
  rawForwardedHeaderConsumers: forwardedHits,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
