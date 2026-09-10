import { pass4574QuoteDisplayState, pass4577QuoteReliabilityState } from "../lib/market-integrity/market-data-sanity-source.ts";

const quote = {
  currentPrice: 328.21,
  currency: "USD",
  state: "live",
  source: "Yahoo Finance chart adapter · compatibility fallback",
  truthState: "compatibility_adapter",
  candles: [{ timestamp: 1788465600, open: 320, high: 330, low: 319, close: 328.21, volume: 1000 }]
};

const patterns = ["fallback", "mock", "demo", "synthetic", "catalog", "sample", "fixture", "local", "placeholder", "unbound", "source required"];
const state = quote.state;
const source = quote.source.toLowerCase();
const truthState = quote.truthState;
const combined = [state, source, truthState].join(" · ").toLowerCase();

for (const p of patterns) {
  if (combined.includes(p)) console.log("MATCHED PATTERN:", p);
}

