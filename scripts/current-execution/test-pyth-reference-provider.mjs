import assert from "node:assert/strict";
import {
  withPass4825BrokeredEgressTestTransport,
} from "../../lib/network/brokered-egress.ts";
import {
  fetchPythReferencePrice,
  PYTH_REFERENCE_PROVIDER_CONTRACT,
} from "../../lib/market-integrity/pyth-price-provider.ts";

const now = new Date("2026-09-02T00:00:30.000Z");
const feedId = "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";

async function observation(payload, at = now) {
  return withPass4825BrokeredEgressTestTransport(async (url, init, context) => {
    assert.equal(url.hostname, "pyth.dourolabs.app");
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer test-key");
    assert.equal(context.operation.includes("pyth_latest_reference_price"), true);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }, () => fetchPythReferencePrice("ETH", { now: at, apiKey: "test-key" }));
}

const fresh = await observation([{ id: feedId, price: { price: "250000000000", conf: "500000000", expo: -8, publish_time: 1788307200 } }]);
assert.ok(fresh);
assert.equal(fresh.price, 2500);
assert.equal(fresh.confidence, 5);
assert.equal(fresh.confidenceBps, 20);
assert.equal(fresh.freshness, "FRESH");
assert.equal(fresh.deliveryState, "WITHHELD_RIGHTS_UNVERIFIED");

const stale = await observation([{ id: feedId, price: { price: "250000000000", conf: "500000000", expo: -8, publish_time: 1788307000 } }]);
assert.equal(stale?.freshness, "STALE");
assert.equal(stale?.evidenceState, "stale");
assert.equal(await fetchPythReferencePrice("BTC", { now, apiKey: "" }), null);
assert.equal(PYTH_REFERENCE_PROVIDER_CONTRACT.apiKeyRequired, true);
console.log("Pyth reference provider: PASS (fresh, stale, malformed/absent-key withholding)");
