import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { withPass4825BrokeredEgressTestTransport } from "../../lib/network/brokered-egress";
import {
  applyApiRateLimit,
  applySoftRateLimit,
  getClientKey,
  resolveRateLimitRuntimeMode,
  resolveTrustedClientAddress,
} from "../../lib/security/api-guard";
import {
  getPass4395DurableIdempotencyRuntimeMode,
  reservePass4395DurableIdempotencyKey,
} from "../../lib/security/durable-idempotency-store";
import {
  buildVelmereProductionEnvContract,
  isObviousProductionSecretPlaceholder,
  redactVelmereEnvContractForPublic,
} from "../../lib/security/production-env-contract";
import {
  persistPass2469LiquidationReplay,
  resolvePass2469LiquidationReplayStorageMode,
} from "../../lib/market-integrity/liquidation-replay-store";
import { buildPass2468SignedLiquidationSnapshot } from "../../lib/market-integrity/liquidation-snapshot-ledger";
import { applyWriteApiRateLimit } from "../../lib/security/write-api-rate-limit";
import { buildPass4649StagingPreflight } from "../../lib/market-integrity/commercial-staging-proof";
import { signProviderRecoveryReleaseBundle } from "../../lib/market-integrity/provider-recovery-release-bundle";

const originalEnv = { ...process.env };
let assertions = 0;

function equal<T>(actual: T, expected: T, message: string) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function restoreEnvironment() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

function clearDurableStorageEnvironment() {
  for (const key of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) delete process.env[key];
}

function productionEnvironment() {
  process.env.NODE_ENV = "production";
  process.env.VERCEL_ENV = "production";
  process.env.VERCEL = "1";
  process.env.VELMERE_DURABLE_IDEMPOTENCY_REQUIRED = "0";
  process.env.VELMERE_IDEMPOTENCY_FAIL_CLOSED = "0";
  process.env.VELMERE_SECURITY_FINGERPRINT_SECRET = "hardening-rate-limit-fingerprint-secret-32-bytes";
  delete process.env.VELMERE_REQUIRE_DURABLE_RATE_LIMIT;
  delete process.env.VELMERE_REQUIRE_DURABLE_SECURITY_STATE;
  clearDurableStorageEnvironment();
}

function checkById(env: NodeJS.ProcessEnv, id: string) {
  const item = buildVelmereProductionEnvContract(env).checks.find((entry) => entry.id === id);
  ok(item, `environment check ${id} must exist`);
  return item;
}

async function main() {
  productionEnvironment();
  const spoofed = new Request("https://velmere.test/api/security", {
    headers: {
      "x-vercel-forwarded-for": "198.51.100.42",
      "x-forwarded-for": "203.0.113.70",
      "x-real-ip": "203.0.113.71",
      "user-agent": "hardening-test",
    },
  });
  const untrusted = resolveTrustedClientAddress(spoofed);
  equal(untrusted.trusted, false, "raw forwarded headers must not establish trust in production");
  equal(untrusted.address, null, "unverified proxy headers must not produce a client address");
  ok(!getClientKey(spoofed).includes("203.0.113.70"), "unverified forwarded IP must not enter the limiter key");
  ok(!getClientKey(spoofed).includes("hardening-test"), "production limiter key must not use caller-variable user agent as a sharding dimension");

  process.env.VELMERE_TRUSTED_PROXY_PROFILE = "vercel";
  const verified = resolveTrustedClientAddress(spoofed);
  equal(verified.trusted, true, "explicit Vercel profile plus platform signals must be trusted");
  equal(verified.address, "198.51.100.42", "verified Vercel profile must prefer the platform-owned client IP header");
  equal(verified.source, "x-vercel-forwarded-for", "verified Vercel profile must record the trusted header source");
  equal(getClientKey(spoofed), "api:198.51.100.42", "production limiter key must bind only the trusted address, not caller-variable headers");
  const invalidForwarded = resolveTrustedClientAddress(new Request("https://velmere.test/api", {
    headers: { "x-vercel-forwarded-for": "spoofed-not-an-ip" },
  }));
  equal(invalidForwarded.address, null, "trusted profile must still reject malformed forwarded addresses");
  const ipv6Forwarded = resolveTrustedClientAddress(new Request("https://velmere.test/api", {
    headers: { "x-vercel-forwarded-for": "2001:db8::1" },
  }));
  equal(ipv6Forwarded.address, "2001:db8::1", "trusted profile must accept a valid IPv6 client without Node-only APIs");
  const ambiguousIpv4 = resolveTrustedClientAddress(new Request("https://velmere.test/api", {
    headers: { "x-vercel-forwarded-for": "010.000.000.001" },
  }));
  equal(ambiguousIpv4.address, null, "trusted profile must reject ambiguous zero-padded IPv4 input");

  const unverifiedProfile = resolveTrustedClientAddress(spoofed, {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    VELMERE_TRUSTED_PROXY_PROFILE: "vercel",
  });
  equal(unverifiedProfile.trusted, false, "profile without the server-owned Vercel signal must remain untrusted");
  const developmentCompat = resolveTrustedClientAddress(spoofed, { NODE_ENV: "test" });
  equal(developmentCompat.address, "203.0.113.70", "non-production compatibility must preserve existing tests and local behavior");
  process.env.NODE_ENV = "test";
  delete process.env.VERCEL_ENV;
  equal(getClientKey(spoofed), "api:203.0.113.70:other", "non-production client key must preserve the address while reducing user-agent entropy to a closed family");
  productionEnvironment();

  delete process.env.VELMERE_TRUSTED_PROXY_PROFILE;
  equal(resolveRateLimitRuntimeMode(), "durable_required_missing_fail_closed", "soft limiter must fail closed in production without a store");
  const softMissing = applySoftRateLimit(spoofed, { keyPrefix: "hardening", limit: 5, windowMs: 60_000 });
  equal(softMissing.ok, false, "production soft limiter must deny without a durable adapter");
  if (!softMissing.ok) equal(softMissing.response.status, 503, "production soft limiter denial must be an availability failure");

  process.env.UPSTASH_REDIS_REST_URL = "https://unit-upstash.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "unit-upstash-token-not-a-placeholder";
  equal(resolveRateLimitRuntimeMode(), "durable_configured_sync_adapter_forbidden_fail_closed", "synchronous soft limiter must identify configured-but-unusable durable state and stay closed");
  const softWithSignal = applySoftRateLimit(spoofed, { keyPrefix: "hardening", limit: 5, windowMs: 60_000 });
  equal(softWithSignal.ok, false, "configured credentials must not make the process-local soft adapter production-safe");
  let untrustedTransportCalls = 0;
  const untrustedDurableRouteLimit = await withPass4825BrokeredEgressTestTransport(
    async () => { untrustedTransportCalls += 1; return Response.json({ result: [1, 60_000] }); },
    () => applyApiRateLimit(spoofed, { keyPrefix: "hardening-untrusted", limit: 5, windowMs: 60_000 }),
  );
  equal(untrustedDurableRouteLimit.ok, false, "production route limiter must fail closed before storage when the proxy profile is untrusted");
  if (!untrustedDurableRouteLimit.ok) equal(untrustedDurableRouteLimit.response.status, 503, "untrusted production client identity must be a configuration availability failure");
  equal(untrustedTransportCalls, 0, "untrusted production client identity must not consume a shared durable bucket");
  process.env.VELMERE_TRUSTED_PROXY_PROFILE = "vercel";
  equal(
    getClientKey(new Request("https://velmere.test/api", { headers: { "x-vercel-forwarded-for": "2001:db8:abcd:12::1" } }), "ipv6"),
    getClientKey(new Request("https://velmere.test/api", { headers: { "x-vercel-forwarded-for": "2001:db8:abcd:12::ffff" } }), "ipv6"),
    "IPv6 clients inside one /64 must share a limiter bucket",
  );
  const durableRouteLimit = await withPass4825BrokeredEgressTestTransport(
    async () => Response.json({ result: [1, 60_000] }),
    () => applyApiRateLimit(spoofed, { keyPrefix: "hardening-durable", limit: 5, windowMs: 60_000 }),
  );
  equal(durableRouteLimit.ok, true, "migrated route limiter must use configured atomic Upstash storage");
  if (durableRouteLimit.ok) {
    equal(durableRouteLimit.decision.mode, "upstash_rest", "migrated route limiter must expose the durable storage mode");
    equal(durableRouteLimit.remaining, 4, "migrated route limiter must preserve route-specific capacity");
  }
  const durableRouteOutage = await withPass4825BrokeredEgressTestTransport(
    async () => Response.json({ error: "simulated_rate_limit_outage" }, { status: 503 }),
    () => applyApiRateLimit(spoofed, { keyPrefix: "hardening-durable-outage", limit: 5, windowMs: 60_000 }),
  );
  equal(durableRouteOutage.ok, false, "migrated route limiter must fail closed on durable-store outage");
  if (!durableRouteOutage.ok) equal(durableRouteOutage.response.status, 503, "durable-store outage must remain distinguishable from quota exhaustion");

  clearDurableStorageEnvironment();
  const noStoreMode = getPass4395DurableIdempotencyRuntimeMode();
  equal(noStoreMode.durableRequired, true, "production idempotency must be durable independently of opt-in flags");
  equal(noStoreMode.memoryAllowed, false, "production idempotency must never permit memory fallback");
  const noStore = await reservePass4395DurableIdempotencyKey({
    keyHash: "sha256:hardening-no-store",
    valueHash: "sha256:hardening-value",
    receipt: { source: "security-hardening-test" },
  });
  equal(noStore.storageMode, "durable_required_missing", "missing production idempotency storage must fail closed");
  equal(noStore.ok, false, "missing production idempotency storage must deny the reservation");
  const writeLimiterUnavailable = await applyWriteApiRateLimit(new Request("https://velmere.test/api/write", {
    headers: {
      "x-vercel-forwarded-for": "198.51.100.90",
      "x-forwarded-for": "203.0.113.90",
      "x-admin-import-token": "must-never-enter-a-rate-limit-key",
      "user-agent": "hardening-test",
    },
  }));
  equal(writeLimiterUnavailable.ok, false, "durable write limiter must fail closed without its production store");
  if (!writeLimiterUnavailable.ok) {
    equal(writeLimiterUnavailable.response.status, 503, "durable store outage must be reported as unavailable rather than a false 429");
    const decision = writeLimiterUnavailable.decision;
    ok(decision, "durable write limiter outage must retain a redacted boundary decision");
    ok(!decision.boundaryKey.includes("203.0.113.90"), "untrusted forwarded IP must not enter durable write limiter keys");
    ok(!decision.boundaryKey.includes("must-never"), "raw admin token must never enter durable limiter keys");
  }

  process.env.UPSTASH_REDIS_REST_URL = "https://unit-upstash.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "unit-upstash-token-not-a-placeholder";
  const outage = await withPass4825BrokeredEgressTestTransport(
    async () => new Response(JSON.stringify({ error: "simulated_outage" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    }),
    () => reservePass4395DurableIdempotencyKey({
      keyHash: "sha256:hardening-outage",
      valueHash: "sha256:hardening-value",
      receipt: { source: "security-hardening-test" },
    }),
  );
  equal(outage.storageMode, "durable_write_failed", "production provider outage must not fall back to memory");
  equal(outage.failClosed, true, "production provider outage must be marked fail-closed");
  equal(outage.ok, false, "production provider outage must deny the reservation");

  const placeholderMutations = [
    "replace-with-a-dedicated-random-secret-at-least-32-characters",
    "CHANGE_ME_TO_A_RANDOM_SECRET_1234567890",
    "SET_A_DEDICATED_RANDOM_SECRET_MIN_32_CHARS",
    "server_only_service_role_key_not_for_real_use",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "sk_test_51Q2placeholderbutlongenoughtopasslength",
  ];
  for (const mutation of placeholderMutations) {
    equal(isObviousProductionSecretPlaceholder(mutation), true, `placeholder mutation must be rejected: ${mutation.slice(0, 18)}`);
  }

  const placeholderEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    VELMERE_PROVIDER_HEALTH_SIGNING_SECRET_CURRENT: placeholderMutations[0],
  };
  equal(checkById(placeholderEnv, "provider_health_signing_secret").ok, false, "length-valid provider placeholder must be rejected");
  equal(checkById(placeholderEnv, "secret_placeholder_scan").ok, false, "central placeholder scan must block configured template material");
  const futureSecretEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    VELMERE_PROVIDER_HEALTH_SIGNING_SECRET_CURRENT: "health_9Qm7w2Xk4Lp8Vn6Rt3Ys5Ua1Bc0DeFgH",
    VELMERE_FUTURE_PROVIDER_SECRET: "fake_future_secret_that_is_long_enough_123456789",
  };
  equal(checkById(futureSecretEnv, "secret_placeholder_scan").ok, false, "central scan must cover future VELMERE secret names without registry edits");
  equal(checkById({ NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://..." }, "supabase_url").ok, false, "placeholder-shaped URL must not pass production readiness");
  equal(checkById({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://velmere.example" }, "site_url").ok, false, "production site URL must require HTTPS and a non-reserved hostname");
  equal(checkById({ NODE_ENV: "production" }, "trusted_proxy_profile").ok, false, "production contract must block an unverified proxy profile");
  equal(checkById({
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_ENV: "production",
    VELMERE_TRUSTED_PROXY_PROFILE: "vercel",
  }, "trusted_proxy_profile").ok, true, "production contract must accept the server-verified Vercel proxy profile");

  const uniqueEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    VELMERE_PROVIDER_HEALTH_SIGNING_SECRET_CURRENT: "health_9Qm7w2Xk4Lp8Vn6Rt3Ys5Ua1Bc0DeFgH",
    VELMERE_PAID_ACCESS_SECRET: "paid_2Vr8Lm4Qx9Tk6Wp3Ha7Ns1Cd5Ef0GjKu",
    VELMERE_VLM_RECEIPT_SECRET: "vlmr_6Za3Qp8Wk2Rc9Ty5Mn1Hs7Df4Gj0LvXe",
  };
  equal(checkById(uniqueEnv, "provider_health_signing_secret").ok, true, "non-placeholder provider key must pass the secret shape gate");
  equal(checkById(uniqueEnv, "secret_placeholder_scan").ok, true, "unique non-template secrets must pass placeholder scan");
  equal(checkById(uniqueEnv, "secret_key_separation").ok, true, "unique security-domain keys must pass separation");

  const reusedEnv: NodeJS.ProcessEnv = {
    ...uniqueEnv,
    VELMERE_VLM_RECEIPT_SECRET: uniqueEnv.VELMERE_PAID_ACCESS_SECRET,
  };
  equal(checkById(reusedEnv, "paid_access_key_separation").ok, false, "paid access and VLM receipts must not reuse a key");
  equal(checkById(reusedEnv, "secret_key_separation").ok, false, "central reuse scan must reject cross-domain key reuse");
  const futureReuseEnv: NodeJS.ProcessEnv = {
    ...uniqueEnv,
    VELMERE_FUTURE_PROVIDER_SECRET: uniqueEnv.VELMERE_PAID_ACCESS_SECRET,
  };
  equal(checkById(futureReuseEnv, "secret_key_separation").ok, false, "central reuse scan must cover future VELMERE security domains");
  const publicContract = redactVelmereEnvContractForPublic(buildVelmereProductionEnvContract(reusedEnv));
  ok(!JSON.stringify(publicContract).includes(String(uniqueEnv.VELMERE_PAID_ACCESS_SECRET)), "public contract must never disclose secret values");

  clearDurableStorageEnvironment();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-is-not-a-service-role-key";
  equal(resolvePass2469LiquidationReplayStorageMode(), "memory_fallback", "anon-only Supabase config must not claim durable replay readiness");
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-for-hardening-test";
  equal(resolvePass2469LiquidationReplayStorageMode(), "supabase_ready", "service-role config must enable durable replay readiness");
  let supabaseWriteCalls = 0;
  const failedReplayWrite = await withPass4825BrokeredEgressTestTransport(
    async () => {
      supabaseWriteCalls += 1;
      return new Response(JSON.stringify({ message: "simulated_supabase_outage" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    },
    () => persistPass2469LiquidationReplay({
      snapshot: buildPass2468SignedLiquidationSnapshot({
        symbol: "BTCUSDT",
        venue: "binance",
        events: [{ symbol: "BTCUSDT", venue: "binance", side: "sell", price: 60_000, quantity: 0.5 }],
      }),
    }),
  );
  equal(failedReplayWrite.persisted, false, "failed Supabase replay write must not claim persistence");
  equal(failedReplayWrite.storageMode, "memory_fallback", "failed Supabase replay write must downgrade storage mode");
  equal(failedReplayWrite.record.source, "memory", "failed Supabase replay write must not label its memory record as Supabase evidence");
  equal(supabaseWriteCalls, 1, "replay persistence outage test must exercise exactly one brokered Supabase write");

  const sourceOnlyEnvironmentPolicy = JSON.parse(
    fs.readFileSync("config/pass36/source-only-runtime-environment-policy.json", "utf8"),
  ) as {
    schemaVersion: string;
    artifactClass: string;
    containsSecretValues: boolean;
    sourceOnlyEnvFilesAllowed: boolean;
    forbiddenSourcePathPatterns: string[];
    forbiddenVariableFields: string[];
    requiredSecretVariables: Array<{ name: string; missingBehavior: string }>;
    invariants: Record<string, boolean>;
  };
  equal(
    sourceOnlyEnvironmentPolicy.schemaVersion,
    "velmere.pass36.source-only-runtime-environment-policy.v1",
    "SOURCE_ONLY must carry an explicit non-secret runtime environment policy",
  );
  equal(sourceOnlyEnvironmentPolicy.containsSecretValues, false, "runtime environment policy must never contain secret values");
  equal(sourceOnlyEnvironmentPolicy.sourceOnlyEnvFilesAllowed, false, "SOURCE_ONLY must not require or admit .env files");
  equal(
    sourceOnlyEnvironmentPolicy.forbiddenSourcePathPatterns,
    [".env", ".env.*"],
    "SOURCE_ONLY policy must explicitly forbid .env and .env.*",
  );
  const documentedSecretNames = sourceOnlyEnvironmentPolicy.requiredSecretVariables.map((entry) => entry.name);
  equal(new Set(documentedSecretNames).size, documentedSecretNames.length, "runtime environment policy must not duplicate secret names");
  equal(
    documentedSecretNames,
    [
      "VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET",
      "VELMERE_PROVIDER_HEALTH_SIGNING_SECRET_CURRENT",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "VELMERE_PROVIDER_RECOVERY_RELEASE_BUNDLE_SECRET",
    ],
    "runtime environment policy must document every security-critical variable without a value",
  );
  for (const variable of sourceOnlyEnvironmentPolicy.requiredSecretVariables) {
    for (const forbiddenField of sourceOnlyEnvironmentPolicy.forbiddenVariableFields) {
      equal(
        Object.hasOwn(variable, forbiddenField),
        false,
        `runtime environment policy must not carry ${forbiddenField} for ${variable.name}`,
      );
    }
  }
  equal(sourceOnlyEnvironmentPolicy.invariants.missingOrBlankSecretMustFailClosed, true, "policy must require blank-secret fail-closed behavior");
  equal(sourceOnlyEnvironmentPolicy.invariants.releaseEligibilityWhenAnyRequiredSecretIsMissing, false, "missing documented secrets must block release eligibility");
  equal(sourceOnlyEnvironmentPolicy.invariants.liveWhenAnyRequiredSecretIsMissing, false, "missing documented secrets must block LIVE");
  equal(sourceOnlyEnvironmentPolicy.invariants.saleEnabledWhenAnyRequiredSecretIsMissing, false, "missing documented secrets must block sale");

  const documentedBlankEnvironment = Object.fromEntries(
    documentedSecretNames.map((name) => [name, ""]),
  ) as NodeJS.ProcessEnv;
  documentedBlankEnvironment.NODE_ENV = "production";
  equal(checkById(documentedBlankEnvironment, "provider_health_signing_secret").ok, false, "blank documented provider-health secret must fail closed at runtime");
  equal(checkById(documentedBlankEnvironment, "stripe_secret").ok, false, "blank documented Stripe secret must fail closed at runtime");
  equal(checkById(documentedBlankEnvironment, "stripe_webhook_secret").ok, false, "blank documented Stripe webhook secret must fail closed at runtime");
  const blankStagingPreflight = buildPass4649StagingPreflight(documentedBlankEnvironment);
  equal(blankStagingPreflight.ready, false, "blank documented secrets must block staging preflight");
  equal(
    blankStagingPreflight.blockers.includes("provider_receipt_signing_secret_missing_or_short"),
    true,
    "blank provider-receipt secret must be an explicit staging blocker",
  );
  assert.throws(
    () => signProviderRecoveryReleaseBundle({} as never, documentedBlankEnvironment.VELMERE_PROVIDER_RECOVERY_RELEASE_BUNDLE_SECRET ?? ""),
    /provider_recovery_release_bundle_secret_missing_or_weak/u,
    "blank recovery release-bundle secret must fail closed before signing",
  );
  assertions += 1;

  const migrationPreflight = spawnSync(process.execPath, [
    "scripts/security-hardening/check-soft-rate-limit-migration.mjs",
  ], { cwd: process.cwd(), encoding: "utf8" });
  equal(migrationPreflight.status, 0, "migration preflight must accept the completed durable route migration");
  const migrationReceipt = JSON.parse(migrationPreflight.stdout) as {
    ok: boolean;
    status: string;
    callSiteCount: number;
    routeCallSiteCount: number;
    nodeBuiltinImportedByApiGuard: boolean;
    durableCallSiteCount: number;
    migrationViolationCount: number;
  };
  equal(migrationReceipt.ok, true, "all production routes must be free of the synchronous soft limiter");
  equal(migrationReceipt.status, "READY", "completed migration must clear the P0 availability blocker");
  equal(migrationReceipt.callSiteCount, 0, "preflight must find zero remaining soft limiter call sites");
  equal(migrationReceipt.routeCallSiteCount, 0, "preflight must find zero affected API routes");
  equal(migrationReceipt.migrationViolationCount, 0, "AST preflight must find zero legacy, unawaited, ignored or unguarded limiter calls");
  ok(migrationReceipt.durableCallSiteCount >= 100, "AST preflight must inventory the migrated durable call sites");
  equal(migrationReceipt.nodeBuiltinImportedByApiGuard, false, "API guard must stay portable to Edge-compatible runtimes");
  const migrationDetectorSelfTest = spawnSync(process.execPath, [
    "scripts/security-hardening/check-soft-rate-limit-migration.mjs",
    "--self-test-detection",
  ], { cwd: process.cwd(), encoding: "utf8" });
  equal(migrationDetectorSelfTest.status, 0, "migration preflight must detect a synthetic forbidden soft-limiter regression");
  const migrationDetectorReceipt = JSON.parse(migrationDetectorSelfTest.stdout) as {
    ok: boolean;
    status: string;
    callSiteCount: number;
    violationsByKind: Record<string, number>;
  };
  equal(migrationDetectorReceipt.ok, false, "synthetic soft-limiter regression must fail readiness");
  equal(migrationDetectorReceipt.status, "BLOCKED_P0", "synthetic availability regression must retain P0 severity");
  ok(migrationDetectorReceipt.callSiteCount >= 1, "self-test fixture must be present in the blocked inventory");
  ok((migrationDetectorReceipt.violationsByKind.legacy_import ?? 0) >= 1, "AST preflight must detect aliased legacy imports");
  ok((migrationDetectorReceipt.violationsByKind.durable_call_not_directly_awaited ?? 0) >= 1, "AST preflight must detect unawaited durable calls");
  ok((migrationDetectorReceipt.violationsByKind.durable_decision_ignored_or_not_bound ?? 0) >= 1, "AST preflight must detect ignored durable decisions");

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: "velmere.production-security-db-hardening-test.v1",
    assertions,
    productionSoftLimiterFailClosed: true,
    trustedProxyProfileVerified: true,
    softRateLimitMigrationRemaining: migrationReceipt.callSiteCount,
    productionIdempotencyNoConfigFailClosed: true,
    productionIdempotencyOutageFailClosed: true,
    placeholderMutationsRejected: placeholderMutations.length,
    secretReuseRejected: true,
    anonOnlySupabaseReadinessRejected: true,
    externalCalls: 0,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(restoreEnvironment);
