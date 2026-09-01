#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const REVISION = "VELMERE_PASS36_A75R0_TRUSTED_PROXY_AND_REQUEST_CLIENT_IDENTITY_BOUNDARY_HARDENING";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });

const policy = json("config/pass36/a75-trusted-proxy-and-request-client-identity-boundary.json");
const state = json("config/pass36/a75-current-state.json");
const receipt = json("config/pass36/a75-trusted-request-client-identity-boundary-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const pkg = json("package.json");
const boundary = read("lib/security/api-guard.ts");
const eventLedger = read("lib/security/security-event-ledger.ts");
const durableReplay = read("lib/jobs/durable-computation-replay.ts");
const requestGuards = read("lib/api/request-guards.ts");
const marketGuardrails = read("lib/market-integrity/api-guardrails.ts");
const patch = read("VELMERE_A75_PATCH.txt");
const active = read("VELMERE_ACTIVE_PASS.txt").trim();

check("policy:revision", policy.revisionId === REVISION, policy.revisionId);
check("policy:parent", policy.parentRevisionId === "VELMERE_PASS36_A74R0_NAVIGATION_REDIRECT_AND_CALLBACK_TRUST_BOUNDARY_HARDENING", policy.parentRevisionId);
check("policy:single-boundary", policy.requirements?.singleRawForwardedHeaderBoundary === true);
check("policy:explicit-profile", policy.requirements?.productionTrustedProxyProfileMustBeExplicit === true);
check("policy:raw-forwarded-no-trust", policy.requirements?.productionRawXForwardedForAndXRealIpCannotEstablishTrust === true);
check("policy:single-vercel-value", policy.requirements?.vercelForwardedHeaderMustContainExactlyOneCanonicalIp === true);
check("policy:mapped-ipv6", policy.requirements?.ipv4MappedIpv6NormalizedToIpv4 === true);
check("policy:ipv6-64", policy.requirements?.ipv6RateLimitIdentityAggregatedAt64 === true);
check("policy:no-secret-fallback", policy.requirements?.authorizationCookieAndPaidTokenExcludedFromFallbackIdentity === true);
check("policy:durable-market", policy.requirements?.marketIntegrityGuardrailsUseDurableCentralLimiter === true);
check("policy:fail-closed", policy.requirements?.productionMissingTrustedAddressFailsClosed === true && policy.requirements?.productionMissingDurableRateLimitStoreFailsClosed === true);
check("policy:truth", policy.productionTrustedProxyObserved === false && policy.productionDurableRateLimitObserved === false && policy.realStagingExecuted === false && policy.liveProven === false && policy.saleEnabled === false);

check("boundary:id", boundary.includes("PASS36_A75_TRUSTED_REQUEST_CLIENT_IDENTITY_BOUNDARY_ID") && boundary.includes("velmere.pass36.a75.trusted-request-client-identity-boundary.v1"));
check("boundary:explicit-profile", boundary.includes("VELMERE_TRUSTED_PROXY_PROFILE") && boundary.includes('profile === "vercel"'));
check("boundary:platform-signals", boundary.includes('env.VERCEL === "1"') && boundary.includes("env.VERCEL_ENV"));
check("boundary:vercel-single-value", boundary.includes('raw.includes(",")') && boundary.includes('request.headers.get("x-vercel-forwarded-for")'));
check("boundary:raw-forwarded-nonprod-only", boundary.includes("if (!productionLike)") && boundary.includes("compatibilityForwardedClientAddress"));
check("boundary:mapped-normalization", boundary.includes("mapped[5] === 0xffff") && boundary.includes("mapped[6] >> 8"));
check("boundary:ipv6-prefix", boundary.includes('join(":")}::/64`'));
check("boundary:closed-user-agent-family", boundary.includes("requestUserAgentFamily") && boundary.includes('return "scanner"') && boundary.includes('return "browser"'));
check("boundary:privacy-material", boundary.includes("privacyMaterial") && boundary.includes("addressKey") && boundary.includes("userAgentFamily"));
check("boundary:production-trusted-required", boundary.includes("trusted_client_address_unavailable") && boundary.includes("trusted_client_address_required"));

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
check("inventory:single-consumer", forwardedHits.length === 1 && forwardedHits[0] === "lib/security/api-guard.ts", forwardedHits);
check("migration:event-ledger", eventLedger.includes("resolveTrustedRequestClientIdentity") && !eventLedger.includes('request.headers.get("x-forwarded-for")'));
check("migration:durable-replay", durableReplay.includes("resolveTrustedRequestClientIdentity") && durableReplay.includes("trusted_transport_fallback"));
check("migration:no-auth-cookie-paid", !durableReplay.includes('request.headers.get("authorization")') && !durableReplay.includes('request.headers.get("cookie")') && !durableReplay.includes('request.headers.get("x-velmere-paid-access")'));
check("migration:request-guards", requestGuards.includes("applyApiRateLimit") && requestGuards.includes("export async function rateLimit") && !requestGuards.includes("new Map"));
check("migration:market-guardrails", marketGuardrails.includes("applyApiRateLimit") && marketGuardrails.includes("export async function checkRateLimit") && !marketGuardrails.includes("__velmereMarketIntegrityApiGuardrails"));
check("migration:profile", read("app/api/profile/route.ts").includes("await rateLimit(request"));
check("migration:square-posts", !read("app/api/square/posts/route.ts").includes('rateLimit(request, "square-posts"'));
check("migration:square-comments", !read("app/api/square/comments/route.ts").includes('rateLimit(request, "square-comments"'));
for (const file of [
  "lib/server/market-integrity-route-modules/evidence-export.ts",
  "lib/server/market-integrity-route-modules/investigator.ts",
  "lib/server/market-integrity-route-modules/readiness.ts",
  "lib/server/market-integrity-route-modules/source-snapshots.ts",
]) check(`migration:await:${file}`, read(file).includes("await checkRateLimit(request"));

check("test:revision", receipt.revisionId === REVISION, receipt.revisionId);
check("test:all-pass", receipt.counts?.total >= 40 && receipt.counts?.passed === receipt.counts.total && receipt.counts.failed === 0, receipt.counts);
for (const id of [
  "production_raw_forwarded_untrusted",
  "production_vercel_exact_header",
  "production_vercel_chain_rejected",
  "ipv4_mapped_normalized",
  "ipv6_64_aggregation",
  "production_client_key_spoof_stable",
  "security_fingerprint_spoof_stable",
  "durable_identity_excludes_auth_cookie",
  "market_guardrail_missing_proxy_fail_closed",
  "market_guardrail_missing_durable_store_fail_closed",
  "single_forwarded_header_boundary",
]) check(`test:${id}`, receipt.checks?.some((row) => row.id === id && row.pass === true));

check("package:test", pkg.scripts?.["test:pass36:a75"] === "node --experimental-strip-types --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/test-a75-trusted-request-client-identity-boundary.mjs");
check("package:verify", pkg.scripts?.["verify:pass36:a75"] === "node scripts/pass36/verify-a75-trusted-request-client-identity-boundary.mjs");
check("package:metadata", pkg.velmereTrustedProxyRequestClientIdentityBoundaryPass === REVISION);
check("current:source", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("current:boundary", current.trustedProxyRequestClientIdentityBoundaryRevisionId === REVISION && current.trustedProxyRequestClientIdentityBoundaryImplemented === true);
check("current:inventory", current.rawForwardedHeaderProductionConsumers === 1 && current.rawForwardedHeaderBoundaryFile === "lib/security/api-guard.ts");
check("current:truth", current.productionTrustedProxyObserved === false && current.productionDurableRateLimitObserved === false && current.realStagingExecuted === false && current.liveProven === false && current.saleEnabled === false);
check("state:revision", state.revisionId === REVISION && state.parentRevisionId === policy.parentRevisionId);
check("state:counts", state.a75AdversarialChecks === receipt.counts.total && state.a75AdversarialPassed === receipt.counts.passed);
check("state:truth", state.productionTrustedProxyObserved === false && state.productionDurableRateLimitObserved === false && state.realSecurityEventPipelineObserved === false && state.saleEnabled === false && state.liveProven === false);
check("active:revision", active === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY", active);
check("patch:scope", patch.includes("TRUSTED PROXY + REQUEST CLIENT IDENTITY") && patch.includes("No UI, price, tier, LIVE or sale enablement changes"));

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a75.trusted-request-client-identity-boundary-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  coveredProductionFiles: policy.coveredProductionFiles,
  rawForwardedHeaderConsumers: forwardedHits,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
