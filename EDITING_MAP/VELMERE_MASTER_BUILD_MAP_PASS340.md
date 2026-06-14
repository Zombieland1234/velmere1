# VELMÈRE MASTER BUILD MAP — PASS340

## Scope
PASS340 responds to screenshots where the token modal was polluted by a Cross Asset wall, the Real Markets page rendered too much text instead of tables, and search suggestions could still fall under hero layers.

## Fixed
- Removed CrossAssetCollapseRadarPanel from TokenRiskModal so token analysis stays chart-first.
- Kept chart footer runtime-safe through safeChartStatusLabel.
- Rebuilt CrossAssetCollapseRadarPanel as a table-first Real Markets page.
- Added separate tables for Global Market, Exchange Health, Stocks/FX/Real Estate, Second Source and FTX old-data regression.
- Added PASS340 floating VLM Browser search suggestions above hero layers.
- Added B-search suggestions to Shield Map: BNB, Bittensor, Bonk.

## Next
PASS341 should add table filters/tabs: Crypto, Exchanges, Stocks, FX, Real Estate, ETF, FTX History.
PASS342 should wire first adapter routes for Binance/MEXC table rows with source timestamp and fallback labels.
PASS343 should improve Security page copy so Velmère can explain what protections exist without overpromising.
