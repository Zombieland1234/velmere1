# DATA QUALITY & PIPELINES AUDIT
**Status**: **PASS**

---

## 1. Numeric Precision & Decimals
- **Crypto Assets**: Maintained up to 8 decimal places for token units, satoshis, and wei representations. Floating point rounding errors are prevented via BigInt and fixed-precision string builders.
- **TradFi Equities & FX**: Strictly 2 decimal places with localized currency formatting.

---

## 2. Domain Vocabulary Segregation
Hostile inspection verified that Real Markets (TradFi) surfaces contain zero leaked cryptocurrency colloquialisms:
- 0 occurrences of "gas fees", "gwei", "slippage tolerance", or "wallet connection" on equity/commodity quote cards.
- TradFi data contracts enforce `schemaVersion: "velmere.p99.real-markets-reference-semantics.v1"`.

---

## 3. Provenance & Stamping
Every data payload returned by the server includes:
- `source`: Origin of the observation (e.g. "Binance Spot 24hr ticker", "Twelve Data Reference").
- `generatedAt`: ISO 8601 UTC timestamp.
- `currentnessClass`: Explicit indication of real-time vs snapshot age.
- `priceSemanticClass`: "reference" vs "live_execution".
