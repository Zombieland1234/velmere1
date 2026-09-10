import { resolveRealMarketQuoteSafely } from "../../lib/market-integrity/real-markets-quote-hydration.ts";

async function testQuotes() {
  for (const sym of ["AAPL", "NVDA", "BTC-USD", "MSFT"]) {
    try {
      const q = await resolveRealMarketQuoteSafely({
        id: sym.toLowerCase(),
        symbol: sym,
        rangeKey: "1h",
        providerRangeKey: "1h",
        detail: true,
        requestedLength: 1,
      });
      console.log(`Symbol ${sym}: state=${q.state}, price=${q.currentPrice}, source=${q.source}`);
    } catch (e) {
      console.log(`Symbol ${sym} error:`, e.message);
    }
  }
}
testQuotes();
