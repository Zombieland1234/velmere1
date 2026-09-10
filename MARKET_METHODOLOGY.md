# VELMÈRE MARKET MICROSTRUCTURE METHODOLOGY
**Standard:** Directive v3 Sections 22–34, 65, 66

## 1. Crypto Shield Methodology
1. **Lorenz Curve Gini Index:** Measures wealth concentration across top holder addresses.
2. **Whale Coordinated Outflow:** On-chain tracking of top 100 wallet outflows over 24h/7d windows.
3. **Kyle Lambda Slippage:** Heuristic price impact for standardized $1M and $10M trade blocks based on L2/L3 order book depth.

## 2. Real Markets (Equities & Commodities) Methodology
1. **ATS / Dark Pool Reporting:** Strict prohibition of static values (such as universal 41.2%). If FINRA ATS data is not connected, status is explicitly marked `NOT_OBSERVED_INSUFFICIENT_DATA`.
2. **SEC EDGAR CIK Verification:** Tickers are matched against their registered CIK (e.g. Apple CIK 0000320193).
3. **Auditor Attribution:** Discloses PCAOB-registered audit firm from latest Form 10-K/10-Q filing (e.g. Ernst & Young LLP, PricewaterhouseCoopers LLP).
