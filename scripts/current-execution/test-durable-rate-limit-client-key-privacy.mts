import assert from "node:assert/strict";

import { withPass4825BrokeredEgressTestTransport } from "../../lib/network/brokered-egress.ts";
import { applyApiRateLimit } from "../../lib/security/api-guard.ts";

const originalEnvironment = { ...process.env };
let assertions = 0;

function check(condition: unknown, message: string) {
  assert.ok(condition, message);
  assertions += 1;
}

function restoreEnvironment() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
}

async function main() {
  const rawIpv4 = "198.51.100.68";
  process.env.NODE_ENV = "production";
  process.env.VERCEL_ENV = "production";
  process.env.VERCEL = "1";
  process.env.VELMERE_TRUSTED_PROXY_PROFILE = "vercel";
  process.env.UPSTASH_REDIS_REST_URL = "https://unit-upstash.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "unit-upstash-token";
  process.env.VELMERE_SECURITY_FINGERPRINT_SECRET = "current-execution-rate-limit-privacy-secret-68";
  delete process.env.VELMERE_RATE_LIMIT_DISABLED;

  const providerBodies: string[] = [];
  const execute = (address: string, headers: Record<string, string> = {}, keyPrefix = "current-execution-privacy") =>
    withPass4825BrokeredEgressTestTransport(
      async (_input, init) => {
        providerBodies.push(typeof init.body === "string" ? init.body : "");
        return Response.json({ result: [1, 60_000] });
      },
      () => applyApiRateLimit(
        new Request("https://velmere.example/api/expensive", {
          headers: { "x-vercel-forwarded-for": address, ...headers },
        }),
        { keyPrefix, limit: 5, windowMs: 60_000 },
      ),
    );

  const decision = await execute(rawIpv4);

  check(decision.ok, "configured production limiter should execute through the atomic durable adapter");
  if (!decision.ok) return;
  check(decision.decision.mode === "upstash_rest", "test must exercise the production durable adapter");
  check(providerBodies[0]?.length, "test transport must observe the exact provider command body");
  check(!providerBodies[0]?.includes(rawIpv4), "raw trusted IPv4 must not leave the application in a durable-store key");
  check(!decision.decision.boundaryKey.includes(rawIpv4), "raw trusted IPv4 must not appear in rate-limit diagnostics");
  check(/rlc_[a-f0-9]{24}/u.test(decision.decision.boundaryKey), "durable boundary must use a fixed-shape keyed client fingerprint");

  const spoofed = await execute(rawIpv4, {
    authorization: "Bearer attacker-controlled-token",
    cookie: "session=attacker-controlled-cookie",
    "user-agent": "rotated-attacker-agent",
    "x-forwarded-for": "203.0.113.250",
    "x-real-ip": "203.0.113.251",
  });
  check(spoofed.ok, "caller-controlled headers must not break the trusted limiter path");
  if (spoofed.ok) {
    check(spoofed.decision.boundaryKey === decision.decision.boundaryKey, "token, cookie, user-agent and spoof headers must not create a fresh bucket");
    check(!providerBodies.at(-1)?.includes("attacker-controlled"), "secret transport material must never enter a provider command");
  }

  const ipv6A = await execute("2001:db8:68:1::1");
  const ipv6B = await execute("2001:db8:68:1:ffff::99");
  const ipv6OtherPrefix = await execute("2001:db8:68:2::1");
  check(ipv6A.ok && ipv6B.ok && ipv6OtherPrefix.ok, "valid trusted IPv6 addresses must reach the durable adapter");
  if (ipv6A.ok && ipv6B.ok && ipv6OtherPrefix.ok) {
    check(ipv6A.decision.boundaryKey === ipv6B.decision.boundaryKey, "one IPv6 subscriber /64 must share one keyed bucket");
    check(ipv6A.decision.boundaryKey !== ipv6OtherPrefix.decision.boundaryKey, "different IPv6 /64 prefixes must remain separated");
    check(!providerBodies.some((body) => body.includes("2001:db8:68")), "raw trusted IPv6 must never enter a provider command");
  }

  const otherRouteProfile = await execute(rawIpv4, {}, "current-execution-other-profile");
  check(otherRouteProfile.ok, "a separate server-owned rate-limit profile must remain operable");
  if (otherRouteProfile.ok) {
    const fingerprint = decision.decision.boundaryKey.match(/rlc_[a-f0-9]{24}/u)?.[0];
    check(Boolean(fingerprint) && !otherRouteProfile.decision.boundaryKey.includes(String(fingerprint)), "keyed client fingerprints must be domain-separated by server-owned profile");
  }

  delete process.env.VELMERE_SECURITY_FINGERPRINT_SECRET;
  const providerCallsBeforeMissingSecret = providerBodies.length;
  const missingSecret = await execute("198.51.100.69");
  check(!missingSecret.ok, "production limiter must fail closed without a stable fingerprint key");
  if (!missingSecret.ok) {
    check(missingSecret.response.status === 503, "missing fingerprint key must be an availability failure, not false quota exhaustion");
    check((await missingSecret.response.json()).mode === "stable_rate_limit_client_fingerprint_unavailable", "missing key response must state the exact safe boundary");
  }
  check(providerBodies.length === providerCallsBeforeMissingSecret, "missing fingerprint key must stop before the durable provider network boundary");

  console.log(JSON.stringify({
    schemaVersion: "velmere.current-execution.durable-rate-limit-client-key-privacy.v1",
    assertions,
    providerCalls: providerBodies.length,
    rawClientAddressDisclosed: providerBodies.some((body) => body.includes(rawIpv4) || body.includes("2001:db8:68")),
    boundaryKey: decision.decision.boundaryKey,
  }, null, 2));
}

main()
  .finally(restoreEnvironment)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
