import { resolveRealMarketQuoteSafely } from "../../lib/market-integrity/real-markets-quote-hydration.ts";

async function inspectQuote() {
  const btc = await resolveRealMarketQuoteSafely({
    id: "btc-usd",
    symbol: "BTC-USD",
    rangeKey: "1h",
    providerRangeKey: "1h",
    detail: true,
    requestedLength: 1,
  });
  console.log("BTC quote keys:", Object.keys(btc));
  console.log("BTC full object:", JSON.stringify(btc, null, 2).slice(0, 800));

  const aapl = await resolveRealMarketQuoteSafely({
    id: "aapl",
    symbol: "AAPL",
    rangeKey: "1h",
    providerRangeKey: "1h",
    detail: true,
    requestedLength: 1,
  });
  console.log("AAPL full object:", JSON.stringify(aapl, null, 2).slice(0, 800));
}
inspectQuote();
