#!/usr/bin/env node
import assert from "node:assert/strict";

import { sha256Hex } from "../../lib/security/cryptographic-digest.ts";
import { canonicalJson } from "../../lib/security/canonical-json.ts";
import { buildMarketImpactAnalysis, verifyMarketImpactResultIntegrity } from "../../lib/market-integrity/market-impact-engine.ts";
import { buildWhaleWatchAnalysis, verifyWhaleWatchResultIntegrity } from "../../lib/market-integrity/whale-watch-engine.ts";
import { parseBinanceOrderBook, parseMexcOrderBook, parseCoinbaseOrderBook, parseKrakenOrderBook } from "../../lib/market-integrity/market-impact-provider-adapters.ts";
import { buildMarketImpactTierPacket, buildWhaleWatchTierPacket, verifyMarketImpactTierPacket, verifyWhaleWatchTierPacket } from "../../lib/market-integrity/market-impact-whale-tier-runtime.ts";
import { createWalletLabelRegistryArtifact } from "../../lib/market-integrity/wallet-label-registry.ts";
import { clearServerOwnedMarketIntelligenceCachesForTests, fetchServerOwnedMarketImpactEvidence, verifyServerOwnedMarketEvidenceIntegrity } from "../../lib/market-integrity/server-owned-market-intelligence-providers.ts";
import type { MarketImpactVenueSnapshot } from "../../lib/market-integrity/market-impact-types.ts";
import type { WhaleCapabilityReceipt, WhaleHolderSnapshot, WhaleTransferEvent } from "../../lib/market-integrity/whale-watch-types.ts";

const now = new Date("2026-07-22T22:30:00.000Z");
const observedAt = "2026-07-22T22:29:30.000Z";
const secret = "velmere-pass35-a11-wallet-label-secret-000000000001";
let checks = 0;
const check = (value: unknown, message: string) => { checks += 1; assert.ok(value, message); };
const digest = (value: unknown) => sha256Hex(canonicalJson(value));

function levels(mid: number, depthMultiplier = 1) {
  const bids: Array<{ price: number; baseQuantity: number }> = [];
  const asks: Array<{ price: number; baseQuantity: number }> = [];
  for (let i = 1; i <= 40; i += 1) {
    bids.push({ price: mid * (1 - i * 0.00025), baseQuantity: (50 + i * 3) * depthMultiplier });
    asks.push({ price: mid * (1 + i * 0.00025), baseQuantity: (50 + i * 3) * depthMultiplier });
  }
  return { bids, asks };
}

function venue(assetKey: string, providerFamily: string, mid: number, multiplier: number): MarketImpactVenueSnapshot {
  const book = levels(mid, multiplier);
  return {
    venueId: `${providerFamily}:${assetKey.toLowerCase()}usd`, providerFamily, assetKey,
    quoteCurrency: "USD", observedAt, status: "verified_fixture", feeBps: 10,
    bids: book.bids, asks: book.asks, sourceDigest: digest({ providerFamily, assetKey, mid, multiplier }),
  };
}

function buildHolders(assetKey: string) {
  const rows: WhaleHolderSnapshot[] = [
    { holderId: "0x1111111111111111111111111111111111111111", balance: 180_000, category: "private_whale", labelVerified: true, clusterId: "whale-cluster", observedAt, providerFamily: "arkham", status: "verified_fixture", sourceDigest: digest(`${assetKey}:h1`) },
    { holderId: "0x2222222222222222222222222222222222222222", balance: 140_000, category: "treasury", labelVerified: true, clusterId: "treasury-cluster", observedAt, providerFamily: "arkham", status: "verified_fixture", sourceDigest: digest(`${assetKey}:h2`) },
    { holderId: "0x3333333333333333333333333333333333333333", balance: 120_000, category: "exchange", labelVerified: true, clusterId: "exchange-cluster", observedAt, providerFamily: "arkham", status: "verified_fixture", sourceDigest: digest(`${assetKey}:h3`) },
    { holderId: "0x4444444444444444444444444444444444444444", balance: 100_000, category: "liquidity_pool", labelVerified: true, clusterId: "lp-cluster", observedAt, providerFamily: "arkham", status: "verified_fixture", sourceDigest: digest(`${assetKey}:h4`) },
    { holderId: "0x5555555555555555555555555555555555555555", balance: 100_000, category: "unknown", labelVerified: false, observedAt, providerFamily: "etherscan", status: "verified_fixture", sourceDigest: digest(`${assetKey}:h5`) },
    { holderId: "0x6666666666666666666666666666666666666666", balance: 80_000, category: "unknown", labelVerified: false, observedAt, providerFamily: "etherscan", status: "verified_fixture", sourceDigest: digest(`${assetKey}:h6`) },
    { holderId: "0x0000000000000000000000000000000000000000", balance: 80_000, category: "burn", labelVerified: false, observedAt, providerFamily: "etherscan", status: "verified_fixture", sourceDigest: digest(`${assetKey}:h7`) },
  ];
  const artifacts = rows.filter((row) => row.labelVerified).map((row, index) => createWalletLabelRegistryArtifact({
    secret,
    payload: {
      assetKey, holderId: row.holderId, category: row.category, clusterId: row.clusterId,
      providerFamily: row.providerFamily, sourceDigest: row.sourceDigest!, confidencePercent: 95,
      issuedAt: "2026-07-22T21:00:00.000Z", expiresAt: "2026-08-01T21:00:00.000Z",
      nonce: `${assetKey}-wallet-label-nonce-${index}-000000000000`,
    },
  }));
  return { rows, artifacts };
}

function buildTransfers(assetKey: string): WhaleTransferEvent[] {
  const ids = [
    "0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333", "0x4444444444444444444444444444444444444444",
    "0x5555555555555555555555555555555555555555", "0x0000000000000000000000000000000000000000",
  ];
  return [
    { eventId: `${assetKey}:1`, observedAt, amountBase: 10_000, fromHolderId: ids[1], toHolderId: ids[2], providerFamily: "alchemy", status: "verified_fixture", sourceDigest: digest(`${assetKey}:t1`) },
    { eventId: `${assetKey}:2`, observedAt, amountBase: 7_000, fromHolderId: ids[2], toHolderId: ids[0], providerFamily: "alchemy", status: "verified_fixture", sourceDigest: digest(`${assetKey}:t2`) },
    { eventId: `${assetKey}:3`, observedAt, amountBase: 5_000, fromHolderId: ids[1], toHolderId: ids[4], providerFamily: "alchemy", status: "verified_fixture", sourceDigest: digest(`${assetKey}:t3`) },
    { eventId: `${assetKey}:4`, observedAt, amountBase: 4_000, fromHolderId: ids[3], toHolderId: ids[4], kind: "liquidity_remove", providerFamily: "alchemy", status: "verified_fixture", sourceDigest: digest(`${assetKey}:t4`) },
    { eventId: `${assetKey}:5`, observedAt, amountBase: 3_000, fromHolderId: ids[4], toHolderId: ids[3], kind: "liquidity_add", providerFamily: "alchemy", status: "verified_fixture", sourceDigest: digest(`${assetKey}:t5`) },
    { eventId: `${assetKey}:6`, observedAt, amountBase: 2_000, fromHolderId: ids[5], toHolderId: ids[4], kind: "mint", providerFamily: "alchemy", status: "verified_fixture", sourceDigest: digest(`${assetKey}:t6`) },
    { eventId: `${assetKey}:7`, observedAt, amountBase: 1_000, fromHolderId: ids[4], toHolderId: ids[5], kind: "burn", providerFamily: "alchemy", status: "verified_fixture", sourceDigest: digest(`${assetKey}:t7`) },
    { eventId: `${assetKey}:8`, observedAt, amountBase: 6_000, fromHolderId: ids[0], toHolderId: ids[4], kind: "bridge", providerFamily: "alchemy", status: "verified_fixture", sourceDigest: digest(`${assetKey}:t8`) },
  ];
}

function capabilityReceipts(assetKey: string): WhaleCapabilityReceipt[] {
  return [
    { capability: "holder_distribution", providerFamily: "etherscan", observedAt, status: "verified_fixture", recordCount: 3, coverageComplete: false, sourceDigest: digest(`${assetKey}:holders`) },
    { capability: "wallet_labels", providerFamily: "arkham", observedAt, status: "verified_fixture", recordCount: 4, coverageComplete: false, sourceDigest: digest(`${assetKey}:labels`) },
    { capability: "transfer_history", providerFamily: "alchemy", observedAt, status: "verified_fixture", recordCount: 8, coverageComplete: false, sourceDigest: digest(`${assetKey}:transfers`) },
  ];
}

// Adapter contracts, including the newly added MEXC lane.
const rawBook = { lastUpdateId: 1, bids: [["99.9", "12"], ["99.8", "15"]], asks: [["100.1", "11"], ["100.2", "16"]] };
const quoteEvidence = { usdRate: 1, observedAt, status: "verified_fixture" as const, providerFamily: "coinbase", sourceDigest: digest("usdt-usd") };
const binance = parseBinanceOrderBook({ payload: rawBook, assetKey: "BTC", observedAt, status: "verified_fixture", marketId: "BTCUSDT" });
binance.quoteToUsd = quoteEvidence;
const mexc = parseMexcOrderBook({ payload: rawBook, assetKey: "BTC", observedAt, status: "verified_fixture", marketId: "BTCUSDT" });
mexc.quoteToUsd = quoteEvidence;
const coinbase = parseCoinbaseOrderBook({ payload: rawBook, assetKey: "BTC", observedAt, status: "verified_fixture", productId: "BTC-USD" });
const kraken = parseKrakenOrderBook({ payload: { error: [], result: { XBTUSD: rawBook } }, assetKey: "BTC", observedAt, status: "verified_fixture", pairId: "XBTUSD" });
check(mexc.providerFamily === "mexc" && mexc.venueId === "mexc:BTCUSDT", "MEXC adapter binding failed");
check([binance, mexc, coinbase, kraken].every((row) => row.bids.length === 2 && row.asks.length === 2), "provider adapter normalization failed");
assert.throws(() => parseMexcOrderBook({ payload: { bids: [], asks: [] }, assetKey: "BTC", observedAt, status: "verified_fixture" }), /order_book_side_empty/u); checks += 1;

let marketCases = 0;
let whaleCases = 0;
let tierPackets = 0;
for (let index = 0; index < 60; index += 1) {
  const assetKey = `A11ASSET${String(index + 1).padStart(2, "0")}`;
  const mid = 1 + index * 0.75;
  const snapshots = [venue(assetKey, "binance", mid, 1.2), venue(assetKey, "mexc", mid * 1.0002, 1), venue(assetKey, "coinbase", mid * 0.9998, 1.1), venue(assetKey, "kraken", mid * 1.0001, 0.9)];
  const market = buildMarketImpactAnalysis({ assetKey, snapshots, now, policy: { allowFixture: true, minimumVenueCount: 2, minimumProviderFamilies: 2 } });
  check(verifyMarketImpactResultIntegrity(market), `market integrity:${assetKey}`);
  check(market.venues.length === 4 && market.providerFamilies.length === 4, `market provider coverage:${assetKey}`);
  check(market.executions.length === 12 && market.scenarios.length === 5, `market matrix:${assetKey}`);
  for (const tier of ["basic", "pro", "advanced"] as const) {
    const packet = buildMarketImpactTierPacket(market, tier);
    check(verifyMarketImpactTierPacket(packet), `market tier integrity:${assetKey}:${tier}`);
    check(packet.paidDeliveryEligible === false && packet.sellEnabled === false, `market billing lock:${assetKey}:${tier}`);
    if (tier === "basic") check(packet.venueEvidence === null && packet.scenarios === null, `market basic scope:${assetKey}`);
    if (tier === "advanced") check(packet.scenarios?.length === 5 && packet.advancedStress !== null && packet.monitoringTriggers.length >= 6, `market advanced depth:${assetKey}`);
    tierPackets += 1;
  }
  marketCases += 1;

  const { rows: holders, artifacts } = buildHolders(assetKey);
  const whale = buildWhaleWatchAnalysis({
    assetKey, totalSupply: 1_000_000, priceUsd: mid, holders, transfers: buildTransfers(assetKey), capabilityReceipts: capabilityReceipts(assetKey),
    marketImpactSnapshots: snapshots, redactionSecret: `${secret}-${assetKey}`, walletLabelArtifacts: artifacts, walletLabelVerificationSecret: secret,
    now, policy: { allowFixture: true, minimumProviderFamilies: 2, minimumHolderCoveragePercent: 50, minimumVerifiedLabelCoveragePercent: 30, minimumClusterCoveragePercent: 15 },
  });
  check(verifyWhaleWatchResultIntegrity(whale), `whale integrity:${assetKey}`);
  check(whale.holderCoveragePercent >= 79.9 && whale.verifiedLabelCoveragePercent >= 60 && whale.clusterCoveragePercent >= 30, `whale coverage:${assetKey}`);
  check(whale.flowWindows.length === 3 && whale.holderExitStress.length > 0, `whale flow/stress:${assetKey}`);
  for (const tier of ["basic", "pro", "advanced"] as const) {
    const packet = buildWhaleWatchTierPacket(whale, tier);
    check(verifyWhaleWatchTierPacket(packet), `whale tier integrity:${assetKey}:${tier}`);
    check(packet.paidDeliveryEligible === false && packet.sellEnabled === false, `whale billing lock:${assetKey}:${tier}`);
    if (tier === "basic") check(packet.coverage.verifiedLabelCoveragePercent === null && packet.holderExitStress === null, `whale basic scope:${assetKey}`);
    if (tier === "pro") check(packet.flowWindows.length === 3 && packet.concentration.adjusted !== null, `whale pro depth:${assetKey}`);
    if (tier === "advanced") check(packet.holderExitStress !== null && packet.evidenceTrace !== null && packet.monitoringTriggers.length >= 7, `whale advanced depth:${assetKey}`);
    tierPackets += 1;
  }
  whaleCases += 1;
}

// Tamper protection.
const sampleMarket = buildMarketImpactAnalysis({ assetKey: "TAMPER", snapshots: [venue("TAMPER", "binance", 10, 1), venue("TAMPER", "mexc", 10.001, 1), venue("TAMPER", "coinbase", 9.999, 1)], now, policy: { allowFixture: true } });
const tamperedMarketPacket = buildMarketImpactTierPacket(sampleMarket, "advanced");
tamperedMarketPacket.summary.venueCount = 999;
check(!verifyMarketImpactTierPacket(tamperedMarketPacket), "market packet tamper accepted");
const { rows: sampleHolders, artifacts: sampleArtifacts } = buildHolders("TAMPER");
const sampleWhale = buildWhaleWatchAnalysis({ assetKey: "TAMPER", totalSupply: 1_000_000, priceUsd: 10, holders: sampleHolders, transfers: buildTransfers("TAMPER"), capabilityReceipts: capabilityReceipts("TAMPER"), marketImpactSnapshots: [venue("TAMPER", "binance", 10, 1), venue("TAMPER", "mexc", 10.001, 1), venue("TAMPER", "coinbase", 9.999, 1)], redactionSecret: `${secret}-tamper`, walletLabelArtifacts: sampleArtifacts, walletLabelVerificationSecret: secret, now, policy: { allowFixture: true } });
const tamperedWhalePacket = buildWhaleWatchTierPacket(sampleWhale, "advanced");
tamperedWhalePacket.coverage.holderCount = 999;
check(!verifyWhaleWatchTierPacket(tamperedWhalePacket), "whale packet tamper accepted");

// Server-owned provider orchestration with mocked public endpoints; no internet and no live claim.
clearServerOwnedMarketIntelligenceCachesForTests();
const fakeFetch = async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  if (url.hostname === "api.binance.com" && url.pathname.includes("/depth")) return new Response(JSON.stringify(rawBook), { status: 200, headers: { "content-type": "application/json" } });
  if (url.hostname === "api.mexc.com" && url.pathname.includes("/depth")) return new Response(JSON.stringify(rawBook), { status: 200, headers: { "content-type": "application/json" } });
  if (url.hostname === "api.exchange.coinbase.com" && url.pathname.endsWith("/USDT-USD/ticker")) return new Response(JSON.stringify({ price: "1.0001" }), { status: 200, headers: { "content-type": "application/json" } });
  if (url.hostname === "api.exchange.coinbase.com" && url.pathname.includes("/book")) return new Response(JSON.stringify(rawBook), { status: 200, headers: { "content-type": "application/json" } });
  if (url.hostname === "api.kraken.com") return new Response(JSON.stringify({ error: [], result: { XBTUSD: rawBook } }), { status: 200, headers: { "content-type": "application/json" } });
  return new Response(JSON.stringify({ error: "unexpected_url" }), { status: 404, headers: { "content-type": "application/json" } });
};
const serverEvidence = await fetchServerOwnedMarketImpactEvidence({ assetKey: "BTC", now, fetchImpl: fakeFetch, bypassCache: true });
check(verifyServerOwnedMarketEvidenceIntegrity(serverEvidence), "server evidence integrity");
check(serverEvidence.snapshots.some((row) => row.providerFamily === "mexc"), "MEXC server runtime missing");
check(serverEvidence.snapshots.length === 4, "four provider snapshots expected");
check(serverEvidence.receipts.some((row) => row.endpointId === "mexc_spot_depth" && row.state === "ok"), "MEXC receipt missing");
check(serverEvidence.blockers.length === 0, `unexpected provider blockers:${serverEvidence.blockers.join(",")}`);

console.log(JSON.stringify({
  status: "PASS_A11_MARKET_IMPACT_WHALE_RUNTIME",
  checks,
  marketCases,
  whaleCases,
  tierPackets,
  mutationChecks: 2,
  providers: ["binance", "mexc", "coinbase", "kraken"],
  visualChangesMade: false,
  paidDeliveryEligible: false,
  liveClaimed: false,
}, null, 2));
