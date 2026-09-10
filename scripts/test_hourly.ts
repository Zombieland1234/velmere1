import { deriveRealMarketsHourlyMetrics } from "../lib/market-integrity/real-markets-hourly-metrics.ts";

async function run() {
  const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1mo&interval=1h&includePrePost=false", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const data = await res.json();
  const q = data.chart.result[0].indicators.quote[0];
  const t = data.chart.result[0].timestamp;
  const candles = t.map((ts, i) => ({
    timestamp: ts,
    open: q.open[i],
    high: q.high[i],
    low: q.low[i],
    close: q.close[i],
    volume: q.volume[i]
  })).filter(c => typeof c.close === "number");

  const m = deriveRealMarketsHourlyMetrics({
    candles,
    source: "Yahoo Finance chart adapter",
    sourceTimestamp: candles.at(-1).timestamp,
    nowSeconds: candles.at(-1).timestamp + 60
  });

  console.log("HOURLY RESULT:", {
    p1h: m.priceChange1h,
    p24h: m.priceChange24h,
    p7d: m.priceChange7d,
    v24h: m.volume24h,
    status: m.receipt.status,
    reason: m.receipt.reason,
    cadence: m.receipt.hourlyCadenceRatio
  });
}

run();
