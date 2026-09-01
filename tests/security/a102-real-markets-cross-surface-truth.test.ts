import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { displayTrustedPrice, formatPrice } from "../../lib/market-integrity/pass4414-cross-asset-quote-format-helpers.js";
import {
  buildPass4418HumanMarketBrief,
  buildPass4418RealMarketsAssetDetailData,
} from "../../lib/market-integrity/pass4418-cross-asset-brief-detail-helpers.js";

const now = Math.floor(Date.now() / 1000);
const asset = {
  id: "btc",
  symbol: "BTC",
  providerSymbol: "BTC-USD",
  name: "Bitcoin",
  category: "crypto" as const,
  context: "methodology truth fixture",
  risk: 40,
};
const candles = [
  { timestamp: now - 7200, open: 100, high: 102, low: 99, close: 101, volume: 10 },
  { timestamp: now - 3600, open: 101, high: 104, low: 100, close: 103, volume: 12 },
  { timestamp: now - 60, open: 103, high: 106, low: 102, close: 105, volume: 15 },
];
const trusted = {
  id: "btc",
  symbol: "BTC",
  state: "live" as const,
  source: "Primary Provider",
  sourceTimestamp: now - 60,
  exchange: "X",
  currency: "USD",
  currentPrice: 105,
  changePercent: 4.5,
  priceChange24h: 4.5,
  candles,
  truthState: "source_bound" as const,
  providerStatus: "source_bound" as const,
  freshnessState: "fresh" as const,
  confidenceCap: 82,
};

assert.equal(displayTrustedPrice(trusted, "crypto"), 105);
assert.notEqual(formatPrice(trusted, "crypto"), "—");

for (const [name, quote] of Object.entries({
  stale: { ...trusted, currentPrice: 999, freshnessState: "stale" as const },
  missingClock: { ...trusted, currentPrice: 888, sourceTimestamp: null },
  fixture: { ...trusted, currentPrice: 777, source: "fixture provider" },
  providerError: { ...trusted, currentPrice: 666, providerStatus: "provider_error" as const },
  unavailable: { ...trusted, currentPrice: 555, state: "unavailable" as const },
})) {
  assert.equal(displayTrustedPrice(quote, "crypto"), null, `${name}: price leaked`);
  assert.equal(formatPrice(quote, "crypto"), "—", `${name}: formatted price leaked`);

  const human = buildPass4418HumanMarketBrief(asset, quote, "en", "1w");
  assert.equal(human.includes(String(quote.currentPrice)), false, `${name}: brief leaked price`);
  assert.equal(/\+?4\.50%/.test(human), false, `${name}: brief leaked movement`);

  const detail = buildPass4418RealMarketsAssetDetailData(asset, quote, "en", Date.now());
  assert.equal(detail.priceLabel, "—", `${name}: detail leaked price`);
  assert.equal(detail.changeLabel, "—", `${name}: detail leaked movement`);
  assert.equal(detail.candles.length, 0, `${name}: detail leaked chart`);
  assert.equal(detail.confidenceLabel, null, `${name}: detail leaked confidence`);
    assert.equal(detail.sourceVerified, false, `${name}: withheld/untrusted quote minted source authority`);
}

const trustedBrief = buildPass4418HumanMarketBrief(asset, trusted, "en", "1w");
assert.equal(trustedBrief.includes("105"), true, "trusted brief lost price");
const trustedDetail = buildPass4418RealMarketsAssetDetailData(asset, trusted, "en", Date.now());
assert.notEqual(trustedDetail.priceLabel, "—", "trusted detail lost price");
assert.equal(trustedDetail.candles.length, 3, "trusted detail lost candles");
assert.equal(trustedDetail.confidenceLabel, null, "uncalibrated quote completeness cap leaked as customer confidence");
assert.equal(trustedDetail.sourceVerified, true, "verified source-bound live quote must carry explicit source authority into Analysis");

const panelPath = path.join(process.cwd(), "components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const panel = fs.readFileSync(panelPath, "utf8");
const changeFn = panel.slice(panel.indexOf("function pass4570RealMarketsChange"), panel.indexOf("function pass4580PercentClass"));
assert.match(changeFn, /if \(!movement\.mayPrintValue\) return null;/, "movement truth gate missing");
assert.equal(changeFn.includes("if (!pass4618SourceBoundQuote(quote)) return null;"), false, "legacy weak fallback can bypass movement gate");
assert.equal(changeFn.includes("return Number(candidate.toFixed(2));"), false, "raw movement fallback still present");
assert.equal(panel.includes('if (sort.key === "price") return displayTrustedPrice(quote, asset.category);'), true, "sort leaks withheld raw price");
assert.equal(panel.includes("sourceBoundHistoricalMetric ||\n                      (movement.mayUseDirectionalTone"), false, "receipt status overrides directional truth gate");

console.log("A102 Real Markets cross-surface truth and policy-bypass regression: PASS");
