import assert from "node:assert/strict";

import {
  SEC_EDGAR_CACHE_POLICY,
  SEC_EDGAR_CUSTOMER_BOUNDARY,
  SEC_EDGAR_FAIR_ACCESS_POLICY,
  buildSecEdgarReferenceRequest,
  inspectSecEdgarOperatorUserAgent,
  reserveSecEdgarFairAccess,
  secEdgarReferencePolicyDependencies,
} from "../../lib/market-integrity/sec-edgar-reference-policy.js";
import { buildPass2503RealMarketsSecCompanyfactsHydrator } from "../../lib/market-integrity/real-markets-sec-companyfacts-hydrator.js";

const NOW = new Date("2026-08-21T15:00:00.000Z");
const VALID_USER_AGENT = "Velmere/1.0 (Owner Operations; contact=ops@owner-domain.zz)";

async function main() {
  const originalFetch = globalThis.fetch;
  const originalReserve = secEdgarReferencePolicyDependencies.reserveRateLimit;
  const originalSecUserAgent = process.env.SEC_USER_AGENT;
  let physicalNetworkCalls = 0;
  globalThis.fetch = (async () => {
    physicalNetworkCalls += 1;
    throw new Error("physical_network_forbidden");
  }) as typeof fetch;

  try {
    assert.deepEqual(inspectSecEdgarOperatorUserAgent(VALID_USER_AGENT), {
      ok: true,
      state: "identified_operator",
      productIdentity: "Velmere/1.0",
      operatorIdentity: "Owner Operations",
      contactSyntaxPresent: true,
    });

    for (const [label, value, expectedReason] of [
      ["missing", "", "sec_user_agent_missing"],
      ["missing operator", "Velmere/1.0 (; contact=ops@owner-domain.zz)", "sec_user_agent_format_invalid"],
      ["wrong product", "Other/1.0 (Owner Operations; contact=ops@owner-domain.zz)", "sec_user_agent_format_invalid"],
      ["missing contact", "Velmere/1.0 (Owner Operations)", "sec_user_agent_format_invalid"],
      ["control character", "Velmere/1.0 (Owner\nOperations; contact=ops@owner-domain.zz)", "sec_user_agent_control_character"],
      ["secret", "Velmere/1.0 (Owner Operations; contact=ops@owner-domain.zz; token=abc)", "sec_user_agent_secret_material_forbidden"],
      ["placeholder operator", "Velmere/1.0 (TODO; contact=ops@owner-domain.zz)", "sec_user_agent_operator_identity_invalid"],
    ] as const) {
      const result = inspectSecEdgarOperatorUserAgent(value);
      assert.equal(result.ok, false, label);
      if (result.ok) throw new Error(`${label} unexpectedly accepted`);
      assert.equal(result.reason, expectedReason, label);
    }

    const submissions = buildSecEdgarReferenceRequest({
      kind: "submissions",
      cik: "320193",
      userAgent: VALID_USER_AGENT,
      now: NOW,
    });
    assert.equal(submissions.ok, true);
    if (!submissions.ok) throw new Error(submissions.reason);
    assert.equal(submissions.url, "https://data.sec.gov/submissions/CIK0000320193.json");
    assert.deepEqual(submissions.headers, {
      accept: "application/json",
      "user-agent": VALID_USER_AGENT,
    });
    assert.equal(submissions.referencePolicy.referenceOnly, true);
    assert.equal(submissions.referencePolicy.liveClaimed, false);
    assert.equal(submissions.referencePolicy.executableQuote, false);
    assert.equal(submissions.referencePolicy.marketPriceFieldEligible, false);
    assert.equal(submissions.referencePolicy.thirdPartyContentExcluded, true);
    assert.match(submissions.referencePolicy.attribution, /SEC.*EDGAR/u);
    assert.match(submissions.referencePolicy.truthBoundary, /not legal advice/iu);

    const companyfacts = buildSecEdgarReferenceRequest({
      kind: "companyfacts",
      cik: "0000320193",
      userAgent: VALID_USER_AGENT,
      now: NOW,
    });
    assert.equal(companyfacts.ok, true);
    if (!companyfacts.ok) throw new Error(companyfacts.reason);
    assert.equal(companyfacts.url, "https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json");
    assert.equal(companyfacts.cacheTtlMs, SEC_EDGAR_CACHE_POLICY.positiveTtlMs);
    assert.equal(companyfacts.negativeCacheTtlMs, SEC_EDGAR_CACHE_POLICY.negativeTtlMs);

    process.env.SEC_USER_AGENT = VALID_USER_AGENT;
    const readyHydrator = buildPass2503RealMarketsSecCompanyfactsHydrator({
      query: "AAPL",
      symbol: "AAPL",
      now: NOW,
    });
    assert.equal(readyHydrator.state, "watch");
    assert.equal(readyHydrator.secReferencePreflightReady, true);
    assert.equal(readyHydrator.secHydrationAllowed, false);
    assert.equal(readyHydrator.paidFilingCopyAllowed, false);
    assert.equal(readyHydrator.referencePolicy.productionEgressAuthorized, false);
    assert.equal(readyHydrator.referencePolicy.customerDisplayAuthorized, false);
    assert.equal(readyHydrator.referencePolicy.customerFinalCredit, false);
    assert.equal(readyHydrator.endpoints.length, 2);
    assert.ok(readyHydrator.endpoints.every((endpoint) =>
      endpoint.state === "ready"
      && endpoint.referenceOnly
      && !endpoint.liveClaimed
      && !endpoint.executableQuote
      && endpoint.thirdPartyContentExcluded
      && endpoint.attribution === SEC_EDGAR_CUSTOMER_BOUNDARY.attribution));

    process.env.SEC_USER_AGENT = "Velmere/1.0 (missing contact)";
    const invalidUserAgentHydrator = buildPass2503RealMarketsSecCompanyfactsHydrator({
      query: "AAPL",
      symbol: "AAPL",
      now: NOW,
    });
    assert.equal(invalidUserAgentHydrator.state, "watch");
    assert.equal(invalidUserAgentHydrator.secHydrationAllowed, false);
    assert.equal(invalidUserAgentHydrator.secUserAgentConfigured, false);
    assert.ok(invalidUserAgentHydrator.endpoints.every((endpoint) => endpoint.blocker === "sec_user_agent_format_invalid"));

    process.env.SEC_USER_AGENT = VALID_USER_AGENT;
    const expiredHydrator = buildPass2503RealMarketsSecCompanyfactsHydrator({
      query: "AAPL",
      symbol: "AAPL",
      now: new Date("2026-08-29T00:00:00.000Z"),
    });
    assert.equal(expiredHydrator.state, "blocked");
    assert.equal(expiredHydrator.secHydrationAllowed, false);
    assert.ok(expiredHydrator.endpoints.every((endpoint) => endpoint.blocker === "sec_policy_review_expired"));

    for (const [label, input, expectedReason] of [
      ["non-numeric CIK", { kind: "submissions", cik: "CIK320193", userAgent: VALID_USER_AGENT, now: NOW }, "sec_cik_invalid"],
      ["overlong CIK", { kind: "submissions", cik: "12345678901", userAgent: VALID_USER_AGENT, now: NOW }, "sec_cik_invalid"],
      ["missing user agent", { kind: "submissions", cik: "320193", userAgent: "", now: NOW }, "sec_user_agent_missing"],
      ["expired authority", { kind: "submissions", cik: "320193", userAgent: VALID_USER_AGENT, now: new Date("2026-08-29T00:00:00.000Z") }, "sec_policy_review_expired"],
    ] as const) {
      const result = buildSecEdgarReferenceRequest(input);
      assert.equal(result.ok, false, label);
      if (result.ok) throw new Error(`${label} unexpectedly accepted`);
      assert.equal(result.reason, expectedReason, label);
    }

    const reservations: Array<{ namespace?: string; key: string; limit: number; windowMs: number; cost?: number }> = [];
    secEdgarReferencePolicyDependencies.reserveRateLimit = async (options) => {
      reservations.push(options);
      return {
        ok: true,
        mode: "upstash_rest",
        provider: "upstash",
        remaining: 7,
        resetAt: NOW.getTime() + 1_000,
        limit: options.limit,
        windowMs: options.windowMs,
        fixedWindowId: Math.floor(NOW.getTime() / 1_000),
        boundaryKey: "sec-edgar:data.sec.gov",
        degraded: false,
      };
    };
    const permit = await reserveSecEdgarFairAccess();
    assert.equal(permit.ok, true);
    assert.deepEqual(reservations, [{
      namespace: "sec-edgar:fair-access",
      key: "data.sec.gov",
      limit: SEC_EDGAR_FAIR_ACCESS_POLICY.requests,
      windowMs: SEC_EDGAR_FAIR_ACCESS_POLICY.windowMs,
      cost: 1,
    }]);

    secEdgarReferencePolicyDependencies.reserveRateLimit = async (options) => ({
      ok: false,
      mode: "unavailable",
      provider: "upstash",
      remaining: 0,
      resetAt: NOW.getTime() + 1_000,
      limit: options.limit,
      windowMs: options.windowMs,
      fixedWindowId: Math.floor(NOW.getTime() / 1_000),
      boundaryKey: "sec-edgar:data.sec.gov",
      degraded: true,
      reason: "rate_limit_store_unavailable",
      retryAfterSeconds: 1,
    });
    await assert.rejects(
      reserveSecEdgarFairAccess,
      (error: unknown) => error instanceof Error && error.message === "sec_edgar_rate_limit_store_unavailable",
    );

    secEdgarReferencePolicyDependencies.reserveRateLimit = async (options) => ({
      ok: false,
      mode: "upstash_rest",
      provider: "upstash",
      remaining: 0,
      resetAt: NOW.getTime() + 1_000,
      limit: options.limit,
      windowMs: options.windowMs,
      fixedWindowId: Math.floor(NOW.getTime() / 1_000),
      boundaryKey: "sec-edgar:data.sec.gov",
      degraded: false,
      reason: "rate_limit_exceeded",
      retryAfterSeconds: 1,
    });
    await assert.rejects(
      reserveSecEdgarFairAccess,
      (error: unknown) => error instanceof Error && error.message === "sec_edgar_rate_limit_exceeded",
    );

    secEdgarReferencePolicyDependencies.reserveRateLimit = async (options) => ({
      ok: true,
      mode: "disabled",
      remaining: options.limit - 1,
      resetAt: NOW.getTime() + 1_000,
      limit: options.limit,
      windowMs: options.windowMs,
      fixedWindowId: Math.floor(NOW.getTime() / 1_000),
      boundaryKey: "sec-edgar:data.sec.gov",
      degraded: false,
    });
    await assert.rejects(
      reserveSecEdgarFairAccess,
      (error: unknown) => error instanceof Error && error.message === "sec_edgar_rate_limit_store_unavailable",
    );

    assert.equal(SEC_EDGAR_FAIR_ACCESS_POLICY.requests, 8);
    assert.equal(SEC_EDGAR_FAIR_ACCESS_POLICY.officialMaximumRequestsPerSecond, 10);
    assert.equal(SEC_EDGAR_CACHE_POLICY.positiveTtlMs, 21_600_000);
    assert.equal(SEC_EDGAR_CACHE_POLICY.negativeTtlMs, 300_000);
    assert.equal(SEC_EDGAR_CUSTOMER_BOUNDARY.customerFinalCredit, false);
    assert.equal(physicalNetworkCalls, 0);

    console.log("PASS SEC EDGAR official reference policy is identified, throttled, cached and claim-bounded without network");
  } finally {
    secEdgarReferencePolicyDependencies.reserveRateLimit = originalReserve;
    globalThis.fetch = originalFetch;
    if (originalSecUserAgent === undefined) delete process.env.SEC_USER_AGENT;
    else process.env.SEC_USER_AGENT = originalSecUserAgent;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
