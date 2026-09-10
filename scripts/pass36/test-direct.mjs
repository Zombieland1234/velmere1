import { loadQuote } from "../../lib/market-integrity/real-markets-quote-hydration.ts";

async function testDirect() {
  for (const sym of ["AAPL", "NVDA", "SPY"]) {
    try {
      const q = await loadQuote(sym.toLowerCase(), sym, "1h");
      console.log(`Direct ${sym}: state=${q.state}, price=${q.currentPrice}, candles=${q.candles.length}, source=${q.source}`);
    } catch (e) {
      console.log(`Direct ${sym} error:`, e.message);
    }
  }
}
testDirect();
