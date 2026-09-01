import assert from "node:assert/strict";
import { GET as getRiskCalibration } from "@/lib/server/market-integrity-route-modules/risk-calibration";
import { GET as getVenueHealth } from "@/lib/server/market-integrity-route-modules/venue-health";
import { withPass4825BrokeredEgressTestTransport } from "@/lib/network/brokered-egress";

let checks = 0;
function check(condition: unknown, message: string) {
  checks += 1;
  assert.ok(condition, message);
}

function equal(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function coinGeckoMarketFixture(url: URL) {
  const ids = url.searchParams.get("ids") || "bitcoin";
  const id = ids.split(",", 1)[0] || "bitcoin";
  const symbols: Record<string, string> = {
    bitcoin: "btc",
    ethereum: "eth",
    solana: "sol",
    dogecoin: "doge",
  };
  const symbol = symbols[id] ?? id.slice(0, 5);
  return [{
    id,
    symbol,
    name: id[0]?.toUpperCase() + id.slice(1),
    current_price: 100,
    market_cap: 1_000_000,
    market_cap_rank: 1,
    fully_diluted_valuation: 1_100_000,
    total_volume: 100_000,
    high_24h: 105,
    low_24h: 95,
    price_change_percentage_1h_in_currency: 0.1,
    price_change_percentage_24h_in_currency: 1,
    price_change_percentage_7d_in_currency: 2,
    price_change_percentage_14d_in_currency: 3,
    price_change_percentage_30d_in_currency: 4,
    circulating_supply: 10_000,
    total_supply: 11_000,
    max_supply: 12_000,
    ath: 120,
    ath_change_percentage: -10,
    last_updated: new Date().toISOString(),
    sparkline_in_7d: { price: [95, 98, 100] },
  }];
}

function providerFixture(url: URL) {
  if (url.hostname === "api.coingecko.com" && url.pathname.endsWith("/coins/markets")) {
    return Response.json(coinGeckoMarketFixture(url));
  }
  if (url.hostname === "api.dexscreener.com") return Response.json({ pairs: [] });
  if (url.hostname.endsWith("llama.fi")) return Response.json([]);
  return Response.json({});
}

async function waitFor(predicate: () => boolean, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("test_wait_timeout");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function main() {
  let providerCalls = 0;
  const zeroCallTransport = async (url: URL) => {
    providerCalls += 1;
    return providerFixture(url);
  };

  await withPass4825BrokeredEgressTestTransport(zeroCallTransport, async () => {
    const duplicateRisk = await getRiskCalibration(new Request(
      "https://velmere.test/api/market-integrity/risk-calibration?query=bitcoin&query=ethereum",
    ));
    equal(duplicateRisk.status, 400, "duplicate risk query must be rejected");

    const shadowedVenue = await getVenueHealth(new Request(
      "https://velmere.test/api/market-integrity/venue-health?venue=binance&asset=BTC&symbol=ETH",
    ));
    equal(shadowedVenue.status, 400, "asset/symbol shadowing must be rejected");

    const unicodeVenue = await getVenueHealth(new Request(
      "https://velmere.test/api/market-integrity/venue-health?venue=binance&asset=%E2%80%AEETH",
    ));
    equal(unicodeVenue.status, 400, "Unicode control asset must be rejected");
  });
  equal(providerCalls, 0, "input boundary failures must make zero provider calls");

  const coalescedUrls: string[] = [];
  const coalesced = await withPass4825BrokeredEgressTestTransport(async (url) => {
    coalescedUrls.push(url.toString());
    await new Promise((resolve) => setTimeout(resolve, 20));
    return providerFixture(url);
  }, () => Promise.all([
    getRiskCalibration(new Request(
      "https://velmere.test/api/market-integrity/risk-calibration?query=ethereum",
    )),
    getRiskCalibration(new Request(
      "https://velmere.test/api/market-integrity/risk-calibration?query=%20ETHEREUM%20",
    )),
  ]));
  equal(coalesced[0].status, 200, "first coalesced risk request must complete");
  equal(coalesced[1].status, 200, "second coalesced risk request must complete");
  equal(
    coalescedUrls.filter((url) => url.includes("/coins/markets")).length,
    1,
    "same canonical query must launch one CoinGecko computation",
  );
  equal(
    coalescedUrls.filter((url) => url.includes("api.dexscreener.com")).length,
    1,
    "same canonical query must launch one DEX computation",
  );

  const oldActive = process.env.VELMERE_CAPACITY_RISK_CALIBRATION_GET_ACTIVE;
  const oldQueue = process.env.VELMERE_CAPACITY_RISK_CALIBRATION_GET_QUEUE;
  process.env.VELMERE_CAPACITY_RISK_CALIBRATION_GET_ACTIVE = "1";
  process.env.VELMERE_CAPACITY_RISK_CALIBRATION_GET_QUEUE = "0";
  try {
    let releaseProvider!: () => void;
    const providerGate = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    let capacityProviderCalls = 0;
    const first = withPass4825BrokeredEgressTestTransport(async (url) => {
      capacityProviderCalls += 1;
      await providerGate;
      return providerFixture(url);
    }, () => getRiskCalibration(new Request(
      "https://velmere.test/api/market-integrity/risk-calibration?query=bitcoin",
    )));

    await waitFor(() => capacityProviderCalls >= 2);
    const beforeBlocked = capacityProviderCalls;
    const blocked = await withPass4825BrokeredEgressTestTransport(async (url) => {
      capacityProviderCalls += 1;
      return providerFixture(url);
    }, () => getRiskCalibration(new Request(
      "https://velmere.test/api/market-integrity/risk-calibration?query=solana",
    )));
    equal(blocked.status, 503, "capacity exhaustion must fail closed");
    equal(
      blocked.headers.get("x-velmere-capacity-budget"),
      "risk_calibration_get",
      "capacity response must identify its budget",
    );
    equal(capacityProviderCalls, beforeBlocked, "capacity rejection must make zero additional provider calls");
    releaseProvider();
    equal((await first).status, 200, "the admitted provider computation must finish after release");
  } finally {
    if (oldActive === undefined) delete process.env.VELMERE_CAPACITY_RISK_CALIBRATION_GET_ACTIVE;
    else process.env.VELMERE_CAPACITY_RISK_CALIBRATION_GET_ACTIVE = oldActive;
    if (oldQueue === undefined) delete process.env.VELMERE_CAPACITY_RISK_CALIBRATION_GET_QUEUE;
    else process.env.VELMERE_CAPACITY_RISK_CALIBRATION_GET_QUEUE = oldQueue;
  }

  let oversizedCalls = 0;
  const oversized = await withPass4825BrokeredEgressTestTransport(async () => {
    oversizedCalls += 1;
    return new Response("{}", {
      headers: {
        "content-type": "application/json",
        "content-length": String(5 * 1_048_576),
      },
    });
  }, () => getRiskCalibration(new Request(
    "https://velmere.test/api/market-integrity/risk-calibration?query=dogecoin",
  )));
  equal(oversized.status, 502, "oversized provider responses must not reach calibration");
  equal(oversizedCalls, 2, "oversized primary providers must not trigger a downstream provider call");

  let timeoutCalls = 0;
  const timeoutStartedAt = Date.now();
  const timedOut = await withPass4825BrokeredEgressTestTransport(async () => {
    timeoutCalls += 1;
    return new Promise<Response>(() => undefined);
  }, () => getRiskCalibration(new Request(
    "https://velmere.test/api/market-integrity/risk-calibration?query=solana",
  )));
  const timeoutElapsedMs = Date.now() - timeoutStartedAt;
  equal(timedOut.status, 502, "provider deadline failures must fail the route closed");
  equal(timeoutCalls, 2, "deadline failure must not start DefiLlama after both primary providers fail");
  check(timeoutElapsedMs >= 4_000 && timeoutElapsedMs < 6_500, "provider deadline must be bounded");

  let venueProviderCalls = 0;
  const partialVenue = await withPass4825BrokeredEgressTestTransport(async () => {
    venueProviderCalls += 1;
    return new Response("{}", {
      headers: {
        "content-type": "application/json",
        "content-length": String(700 * 1024),
      },
    });
  }, () => getVenueHealth(new Request(
    "https://velmere.test/api/market-integrity/venue-health?venue=binance&compare=coinbase&asset=A90TEST",
  )));
  equal(partialVenue.status, 200, "venue provider partial failure must remain an explicit degraded payload");
  const partialPayload = await partialVenue.json() as {
    snapshot?: { state?: string; providerErrors?: string[] };
    secondary?: { state?: string; providerErrors?: string[] };
  };
  check(venueProviderCalls > 0, "venue behavior test must exercise provider calls");
  check(
    (partialPayload.snapshot?.providerErrors?.length ?? 0) > 0
      && (partialPayload.secondary?.providerErrors?.length ?? 0) > 0,
    "oversized venue responses must remain explicit provider errors",
  );
  check(
    partialPayload.snapshot?.state !== "verified" && partialPayload.secondary?.state !== "verified",
    "oversized provider responses must never be promoted to verified venue state",
  );

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: "velmere.pass36.a90.provider-route-budgets.behavior.v1",
    checks,
    realExternalCalls: 0,
    blockedInputProviderCalls: providerCalls,
    timeoutElapsedMs,
    selectedSurfaces: ["risk-calibration", "venue-health"],
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
