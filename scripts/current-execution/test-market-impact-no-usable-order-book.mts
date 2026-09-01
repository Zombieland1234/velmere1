import assert from "node:assert/strict";
import {
  buildMarketImpactDeliveryPreflight,
  projectMarketImpactDelivery,
  type MarketImpactDeliveryPreflight,
  type MarketImpactDeliverySurface,
} from "../../lib/market-integrity/market-impact-delivery-policy.ts";
import { GET as getOrderbook } from "../../lib/server/market-integrity-route-modules/orderbook.ts";
import { GET as getLiquidityIntelligence } from "../../lib/server/market-integrity-route-modules/liquidity-intelligence.ts";
import { POST as postMarketIntelligence } from "../../lib/server/market-integrity-route-modules/market-intelligence.ts";

const surfaces: readonly MarketImpactDeliverySurface[] = [
  "market_intelligence",
  "orderbook",
  "liquidity_intelligence",
];
const forbiddenTopology = [
  "binance",
  "mexc",
  "coinbase",
  "kraken",
  "coingecko",
  "dexscreener",
  "defillama",
  "providerid",
  "decisionsha",
  "purpose_not_allowed",
];

async function assertNoUsableOrderBook(response: Response, binding?: {
  depth: string;
  surface: string;
  assetKey: string;
}) {
  assert.equal(response.status, 424);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.mode, "withheld");
  assert.equal(payload.availability, "WITHHELD");
  assert.equal(payload.error, "NO_USABLE_ORDER_BOOK");
  assert.equal(payload.orderbook, null);
  assert.equal(payload.marketImpact, null);
  assert.equal(payload.liquidityIntelligence, null);
  assert.equal(payload.referenceMidPrice, null);
  assert.deepEqual(payload.representativeExecutions, []);
  assert.equal(payload.confidence, null);
  assert.equal(payload.syntheticLiquidityUsed, false);
  assert.equal(payload.liveClaimed, false);
  assert.equal(payload.publication.liveClaimed, false);
  assert.deepEqual(payload.publication.blockers, ["NO_USABLE_ORDER_BOOK"]);
  if (binding) {
    assert.equal(payload.depth, binding.depth);
    assert.equal(payload.surface, binding.surface);
    assert.equal(payload.assetKey, binding.assetKey);
  }
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const forbidden of forbiddenTopology) assert(!serialized.includes(forbidden));
}

let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  networkCalls += 1;
  throw new Error("market impact delivery policy permitted provider network");
};

try {
  for (const surface of surfaces) {
    const decision = buildMarketImpactDeliveryPreflight(surface);
    assert.equal(decision.state, "NO_USABLE_ORDER_BOOK");
    assert.equal(decision.providerNetworkAllowed, false);
    assert.equal(decision.customerDeliveryAllowed, false);
    assert.equal(decision.liveClaimed, false);
    assert(decision.decisions.length > 0);

    const tampered = {
      ...structuredClone(decision),
      providerNetworkAllowed: true,
      customerDeliveryAllowed: true,
    } as MarketImpactDeliveryPreflight;
    const projected = projectMarketImpactDelivery({
      decision: tampered,
      payload: {
        ok: true,
        orderbook: { bids: [[1, 1]], asks: [[2, 1]] },
        referenceMidPrice: 1.5,
        representativeExecutions: [{ impactBps: 12 }],
      },
    });
    assert.equal(projected.allowed, false);
    assert.equal(projected.status, 424);
    assert.equal(projected.payload.orderbook, null);
    assert.deepEqual(projected.payload.representativeExecutions, []);
  }

  await assertNoUsableOrderBook(await getOrderbook(
    new Request("http://localhost/api/market-integrity/orderbook?symbol=BTC"),
  ));
  await assertNoUsableOrderBook(await getLiquidityIntelligence(
    new Request("http://localhost/api/market-integrity/liquidity-intelligence?query=BTC"),
  ));
  await assertNoUsableOrderBook(await postMarketIntelligence(new Request(
    "http://localhost/api/market-integrity/market-intelligence",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assetKey: "BTC",
        depth: "basic",
        locale: "en",
        surface: "shield",
        evidenceMode: "server_owned",
      }),
    },
  )), { depth: "basic", surface: "shield", assetKey: "BTC" });

  assert.equal(networkCalls, 0);
  process.stdout.write(`${JSON.stringify({
    status: "PASS_MARKET_IMPACT_NO_USABLE_ORDER_BOOK",
    surfaces: surfaces.length,
    customerRoutes: 3,
    networkCalls,
    syntheticLiquidityUsed: false,
    topologyDisclosure: false,
    customerFinalPromoted: false,
  }, null, 2)}\n`);
} finally {
  globalThis.fetch = originalFetch;
}
