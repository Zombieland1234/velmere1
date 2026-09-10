import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

const EXPECTED_20_CRYPTO = [
  "BTC", "ETH", "SOL", "BNB", "USDT", "USDC", "XRP", "ADA", "DOGE", "AVAX",
  "LINK", "DOT", "POL", "LTC", "TRX", "TON", "SHIB", "UNI", "ATOM", "PEPE"
];

const REAL_MARKETS_BATCH_1 = "btc,eth,sol,aapl,nvda,msft,eurusd,usdpln,gold,silver,wti,spy";
const REAL_MARKETS_BATCH_2 = "doge,link,tsla,lvmh,usdjpy,gbpusd,eurpln,copper,gld,vnq,coin";

function validateCandle(c: { open: number; high: number; low: number; close: number; timestamp: number; volume?: number | null }) {
  if (
    !Number.isFinite(c.timestamp) || c.timestamp <= 0 ||
    !Number.isFinite(c.open) || c.open <= 0 ||
    !Number.isFinite(c.high) || c.high <= 0 ||
    !Number.isFinite(c.low) || c.low <= 0 ||
    !Number.isFinite(c.close) || c.close <= 0 ||
    c.high < Math.max(c.open, c.close) ||
    c.low > Math.min(c.open, c.close)
  ) {
    return false;
  }
  return true;
}

async function main() {
  let assertions = 0;
  const ok = (cond: boolean, msg: string) => {
    assertions += 1;
    assert.ok(cond, msg);
  };

  console.log("================================================================================");
  console.log("=== PAS 8: 20 ASSETS SHIELD / REAL MARKETS / SHIELD MAP TEST SUITE ===");
  console.log("================================================================================\n");

  // -----------------------------------------------------------------------------
  // TEST 1: SHIELD & SHIELD PRO - 20 COINS MARKET SNAPSHOT & RISK ENGINE
  // -----------------------------------------------------------------------------
  console.log("--- TEST 1: Shield / Shield Pro Markets API (20 Coins) ---");
  const marketsRes = await fetch(`${BASE_URL}/api/market-integrity/markets?page=1&perPage=25`, { cache: "no-store" });
  ok(marketsRes.ok, `Markets snapshot returned HTTP 200 (got ${marketsRes.status})`);
  const marketsData = await marketsRes.json();
  ok(Array.isArray(marketsData.rows) && marketsData.rows.length >= 20, `Returned at least 20 market rows (got ${marketsData.rows?.length})`);

  const foundSymbols = new Set(marketsData.rows.map((r: any) => r.symbol?.toUpperCase()));
  for (const expectedSym of EXPECTED_20_CRYPTO) {
    ok(foundSymbols.has(expectedSym), `Market snapshot contains expected asset: ${expectedSym}`);
  }

  const testedCryptoAssets: Array<{ symbol: string; name: string; price: number; risk: number; candles: number }> = [];

  for (const sym of EXPECTED_20_CRYPTO) {
    const row = marketsData.rows.find((r: any) => r.symbol?.toUpperCase() === sym);
    ok(Boolean(row), `Found row for ${sym}`);
    ok(typeof row.name === "string" && row.name.length > 0, `${sym} has valid name (${row.name})`);
    ok(typeof row.price === "number" && Number.isFinite(row.price) && row.price > 0, `${sym} has positive price ($${row.price})`);
    const priceChange = row.priceChange24h ?? row.change24h;
    ok(typeof priceChange === "number" && Number.isFinite(priceChange), `${sym} has finite 24h change (${priceChange}%)`);
    ok(typeof row.marketCap === "number" && Number.isFinite(row.marketCap) && row.marketCap > 0, `${sym} has positive market cap ($${row.marketCap})`);
    ok(Array.isArray(row.sparkline7d) && row.sparkline7d.length >= 10, `${sym} has valid sparkline7d history (got ${row.sparkline7d?.length} points)`);

    // Risk score check
    const riskScore = row.result?.score ?? row.riskScore;
    ok(typeof riskScore === "number" && Number.isFinite(riskScore) && riskScore >= 0 && riskScore <= 100,
      `${sym} has valid risk score in range [0, 100] (got ${riskScore})`);

    // Klines / Chart validation
    const klineRes = await fetch(
      `${BASE_URL}/api/market-integrity/klines?assetClass=crypto&marketId=${encodeURIComponent(row.id)}&symbol=${encodeURIComponent(row.symbol)}&quote=USD&range=7d`,
      { cache: "no-store" }
    );
    ok(klineRes.ok, `${sym} klines endpoint returned HTTP 200`);
    const klineData = await klineRes.json();
    ok(Array.isArray(klineData.candles) && klineData.candles.length >= 30, `${sym} returned valid candles array (got ${klineData.candles?.length})`);
    ok(klineData.mode !== "error" && klineData.mode !== "rate_limited", `${sym} chart mode is healthy (got ${klineData.mode})`);

    // Verify OHLC invariants across all candles
    let validCandleCount = 0;
    for (let i = 0; i < klineData.candles.length; i++) {
      const c = klineData.candles[i];
      ok(validateCandle(c), `${sym} candle[${i}] satisfies OHLC mathematical invariants`);
      if (i > 0) {
        ok(c.timestamp > klineData.candles[i - 1].timestamp, `${sym} candle[${i}] timestamp is strictly chronological`);
      }
      validCandleCount++;
    }

    testedCryptoAssets.push({
      symbol: sym,
      name: row.name,
      price: row.price,
      risk: riskScore,
      candles: validCandleCount,
    });
  }

  console.log(`\nVerified 20 Shield / Shield Pro crypto assets:`);
  console.table(testedCryptoAssets);

  // -----------------------------------------------------------------------------
  // TEST 2: REAL MARKETS - 20 MULTI-ASSET INSTRUMENTS ACROSS 6 ASSET CLASSES
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 2: Real Markets Multi-Asset API (20+ Instruments) ---");
  const batch1Res = await fetch(`${BASE_URL}/api/market-integrity/real-markets?ids=${REAL_MARKETS_BATCH_1}&detail=1`, { cache: "no-store" });
  ok(batch1Res.ok, "Real markets Batch 1 returned HTTP 200");
  const batch1Data = await batch1Res.json();
  ok(batch1Data.ok === true && Array.isArray(batch1Data.quotes), "Batch 1 payload has ok: true and quotes array");

  const batch2Res = await fetch(`${BASE_URL}/api/market-integrity/real-markets?ids=${REAL_MARKETS_BATCH_2}&detail=1`, { cache: "no-store" });
  ok(batch2Res.ok, "Real markets Batch 2 returned HTTP 200");
  const batch2Data = await batch2Res.json();
  ok(batch2Data.ok === true && Array.isArray(batch2Data.quotes), "Batch 2 payload has ok: true and quotes array");

  const allQuotes = [...batch1Data.quotes, ...batch2Data.quotes];
  ok(allQuotes.length >= 20, `Real Markets returned at least 20 quotes across batches (got ${allQuotes.length})`);

  const testedRealMarkets: Array<{ symbol: string; assetClass: string; price: number; change: string; candles: number; source: string }> = [];
  const coveredAssetClasses = new Set<string>();

  for (const q of allQuotes) {
    ok(typeof q.symbol === "string" && q.symbol.length > 0, `Quote has valid symbol (${q.symbol})`);
    ok(typeof q.currentPrice === "number" && Number.isFinite(q.currentPrice) && q.currentPrice > 0,
      `${q.symbol} has positive price (${q.currentPrice})`);
    ok(typeof q.changePercent === "number" && Number.isFinite(q.changePercent), `${q.symbol} has finite changePercent (${q.changePercent}%)`);
    ok(typeof q.assetClass === "string" && q.assetClass.length > 0, `${q.symbol} has explicit asset class (${q.assetClass})`);
    coveredAssetClasses.add(q.assetClass);

    ok(Array.isArray(q.candles) && q.candles.length >= 20, `${q.symbol} has sufficient historical candles (got ${q.candles?.length})`);

    // Verify OHLC invariants
    for (let i = 0; i < q.candles.length; i++) {
      ok(validateCandle(q.candles[i]), `${q.symbol} candle[${i}] satisfies OHLC invariants`);
    }

    ok(typeof q.source === "string" && q.source.length > 0, `${q.symbol} declares transparent provider source (${q.source.slice(0, 40)}...)`);

    testedRealMarkets.push({
      symbol: q.symbol,
      assetClass: q.assetClass,
      price: q.currentPrice,
      change: `${q.changePercent.toFixed(2)}%`,
      candles: q.candles.length,
      source: q.source.slice(0, 35),
    });
  }

  console.log(`\nVerified ${allQuotes.length} Real Markets multi-asset instruments:`);
  console.table(testedRealMarkets);

  console.log(`\nCovered Real Markets Asset Classes (${coveredAssetClasses.size}):`, Array.from(coveredAssetClasses).join(", "));
  ok(coveredAssetClasses.has("crypto"), "Real markets covers crypto");
  ok(coveredAssetClasses.has("stock"), "Real markets covers stock/equities");
  ok(coveredAssetClasses.has("fx"), "Real markets covers foreign exchange (FX)");
  ok(coveredAssetClasses.has("commodity"), "Real markets covers commodities");
  ok(coveredAssetClasses.has("etf"), "Real markets covers ETFs");

  // -----------------------------------------------------------------------------
  // TEST 3: SHIELD MAP - 6-AXIS RISK RADAR & CANONICAL IDENTITY BINDING
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 3: Shield Map 6-Axis Risk Engine (Archetype Assets) ---");
  const ARCHETYPES = ["BTC", "ETH", "SOL", "LINK", "DOGE"];

  for (const arc of ARCHETYPES) {
    const invRes = await fetch(`${BASE_URL}/api/market-integrity/investigator?query=${arc}&locale=en`, { cache: "no-store" });
    ok(invRes.ok, `Shield Map investigator for ${arc} returned HTTP 200`);
    const invData = await invRes.json();

    ok(invData.mode === "live", `${arc} investigator returned mode: live`);
    ok(invData.result?.token?.symbol?.toUpperCase() === arc, `${arc} resolved to canonical symbol`);
    ok(invData.publication?.evidenceState === "verified", `${arc} publication is verified`);
    ok(invData.publication?.scorePublished === true, `${arc} score is published`);

    const lanes = invData.investigator?.lanes;
    ok(Array.isArray(lanes) && lanes.length === 6, `${arc} returned 6 risk lanes (got ${lanes?.length})`);

    const laneIds = lanes.map((l: any) => l.id);
    ok(laneIds.includes("supply"), `${arc} has supply lane`);
    ok(laneIds.includes("unlock"), `${arc} has unlock lane`);
    ok(laneIds.includes("liquidity"), `${arc} has liquidity lane`);
    ok(laneIds.includes("insider"), `${arc} has insider lane`);
    ok(laneIds.includes("social"), `${arc} has social lane`);
    ok(laneIds.includes("contract"), `${arc} has contract lane`);

    // Verify BTC unlock semantics: reflects protocol emission instead of investor vesting
    if (arc === "BTC") {
      const unlockLane = lanes.find((l: any) => l.id === "unlock");
      ok(unlockLane.status === "confirmed", "BTC unlock lane is confirmed protocol emission");
    }

    console.log(`  ✓ ${arc}: 6 lanes intact, canonical identity ${invData.publication?.canonicalIdentity}`);
  }

  // -----------------------------------------------------------------------------
  // TEST 4: NO FAKE DATA & TRANSPARENT WITHHELD POLICY ON INVALID QUERIES
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 4: Fallback & No-Fake-Data Enforcement ---");
  const badQueryRes = await fetch(`${BASE_URL}/api/market-integrity/real-markets?symbols=TOTALLY_INVALID_TICKER_XYZ999&detail=1`, { cache: "no-store" });
  ok(badQueryRes.status === 400, `Unsupported symbol rejected cleanly with HTTP 400 (got ${badQueryRes.status})`);
  const badQueryData = await badQueryRes.json();
  ok(badQueryData.ok === false && badQueryData.error === "no_supported_instruments",
    "Invalid symbol returns explicit no_supported_instruments error, refusing to manufacture synthetic fake data");

  console.log("\n================================================================================");
  console.log(`=== PAS 8 SUITE COMPLETE: ALL ${assertions} ASSERTIONS PASSED WITH 100% SUCCESS ===`);
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("Test failure in PAS 8 suite:", err);
  process.exit(1);
});
