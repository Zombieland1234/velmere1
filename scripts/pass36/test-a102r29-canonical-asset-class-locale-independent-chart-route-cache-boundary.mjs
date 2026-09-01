#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const helper = await import(
  pathToFileURL(path.resolve("lib/market-integrity/asset-detail-client-helpers.ts")).href
    + `?a102r29=${Date.now()}`
);

let checks = 0;
const results = [];
function ok(value, id, detail = null) {
  checks += 1;
  assert.ok(value, id);
  results.push({ id, passed: true, detail });
}

const ranges = { realMarketsRange: "15m", shieldRange: "15m" };
const cryptoLabels = [
  { locale: "en", assetClassLabel: "Crypto", exchangeLabel: "Shield" },
  { locale: "pl", assetClassLabel: "Kryptoaktywa", exchangeLabel: "Rynek krypto" },
  { locale: "de", assetClassLabel: "Kryptowährung", exchangeLabel: "Kryptomarkt" },
];

for (const labels of cryptoLabels) {
  const asset = {
    symbol: "BTC",
    providerSymbol: "BTCUSDT",
    assetClass: "crypto",
    venue: "BINANCE",
    marketDataState: "partial_not_live",
    ...labels,
  };
  ok(helper.isPass4408ShieldCryptoAsset(asset), `routing.crypto.${labels.locale}`);
  const url = helper.buildPass4408AssetDetailChartFetchUrl(asset, ranges);
  ok(url.startsWith("/api/market-integrity/klines?"), `routing.crypto-url.${labels.locale}`, url);
  ok(url.includes("symbol=BTCUSDT"), `routing.provider-symbol.${labels.locale}`, url);
}

for (const assetClass of ["crypto_reference", "exchange_token", "native_crypto"]) {
  const asset = { symbol: "BNB", providerSymbol: "BNBUSDT", assetClass, venue: "BINANCE" };
  ok(helper.isPass4408ShieldCryptoAsset(asset), `routing.canonical-class.${assetClass}`);
}

const legacyVenueAsset = { symbol: "ETH", providerSymbol: "ETHUSDT", venue: "MEXC" };
ok(helper.isPass4408ShieldCryptoAsset(legacyVenueAsset), "routing.legacy-canonical-venue");
ok(helper.buildPass4408AssetDetailChartFetchUrl(legacyVenueAsset, ranges).startsWith("/api/market-integrity/klines?"), "routing.legacy-venue-url");

const stockWithMisleadingCopy = {
  symbol: "COIN",
  providerSymbol: "COIN",
  assetClass: "stock",
  venue: "NASDAQ",
  assetClassLabel: "Crypto exchange stock",
  exchangeLabel: "Shield watch",
};
ok(!helper.isPass4408ShieldCryptoAsset(stockWithMisleadingCopy), "routing.copy-cannot-promote-stock-to-crypto");
ok(helper.buildPass4408AssetDetailChartFetchUrl(stockWithMisleadingCopy, ranges).startsWith("/api/market-integrity/real-markets?"), "routing.stock-real-markets");

const base = {
  symbol: "BTC",
  providerSymbol: "BTCUSDT",
  assetClass: "crypto",
  venue: "BINANCE",
  marketDataState: "partial_not_live",
};
const keys = cryptoLabels.map((labels) => helper.buildPass4408AssetDetailChartCacheKey({ ...base, ...labels }, "15M"));
ok(new Set(keys).size === 1, "cache.locale-copy-independent", keys);

const sameIdentityDifferentExchangeCopy = ["Binance", "Giełda Binance", "Börse Binance"].map((exchangeLabel) =>
  helper.buildPass4408AssetDetailChartCacheKey({ ...base, exchangeLabel }, "15M")
);
ok(new Set(sameIdentityDifferentExchangeCopy).size === 1, "cache.exchange-copy-independent", sameIdentityDifferentExchangeCopy);

const stockKey = helper.buildPass4408AssetDetailChartCacheKey({ ...base, assetClass: "stock" }, "15M");
ok(stockKey !== keys[0], "cache.asset-class-distinct");
const venueKey = helper.buildPass4408AssetDetailChartCacheKey({ ...base, venue: "MEXC" }, "15M");
ok(venueKey !== keys[0], "cache.venue-distinct");
const providerKey = helper.buildPass4408AssetDetailChartCacheKey({ ...base, providerSymbol: "BTCUSD" }, "15M");
ok(providerKey !== keys[0], "cache.provider-symbol-distinct");
const timeframeKey = helper.buildPass4408AssetDetailChartCacheKey(base, "1H");
ok(timeframeKey !== keys[0], "cache.timeframe-distinct");

const localizedOnly = {
  symbol: "BTC",
  providerSymbol: "BTCUSDT",
  assetClassLabel: "Kryptowährung",
  exchangeLabel: "Kryptomarkt",
  venue: "XETRA",
};
ok(!helper.isPass4408ShieldCryptoAsset(localizedOnly), "routing.localized-copy-with-noncrypto-venue-not-authority");

console.log(JSON.stringify({
  status: "PASS_A102R29_CANONICAL_ASSET_CLASS_LOCALE_INDEPENDENT_CHART_ROUTE_CACHE_NO_PROMOTION",
  checks,
  passed: checks,
  failed: 0,
  localeVariants: cryptoLabels.length,
  localizedLabelsInfluenceRouting: false,
  localizedLabelsInfluenceCacheIdentity: false,
  productionSyntheticCredit: false,
  exactBrowserCredit: false,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  results,
}, null, 2));
