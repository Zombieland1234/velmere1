# VELMÈRE — DATA QUALITY & MICROSTRUCTURE AUDIT
**Forensic Audit of Data Integrity, Decimal Handling, and Freshness**

---

## 1. Asset Identity & Normalization
- **50 Canonical Assets**: 20 EVM contracts, 10 native Layer-1 chains, 10 TradFi assets (equities, ETFs, commodities, FX), 10 edge fixtures.
- **Asset-Class Firewall**: Strictly separates asset classes to prevent EVM attributes (e.g. `contractAddress`, `bytecode`) from leaking into TradFi equities (`AAPL`, `MSFT`) or commodities (`GLD`).
- **Ticker Collisions**: Fully mitigated by requiring unique chainId/address bindings alongside ticker symbols.

---

## 2. Missing-Data Causality & Error Classification
Velmère enforces the non-negotiable rule: **NO DATA -> NO DATA CLAIM**.
Synthetic scores are never generated when data is absent. Missing metrics are assigned standardized classifications:
- `PROVIDER_UNAVAILABLE`: Upstream RPC or market data API returned HTTP 5xx or timed out.
- `STALE_DATA`: Last confirmed quote is older than 72 hours (quarantined).
- `NOT_APPLICABLE`: Metric does not apply to this asset class (e.g., ERC-20 token supply for gold spot price).
