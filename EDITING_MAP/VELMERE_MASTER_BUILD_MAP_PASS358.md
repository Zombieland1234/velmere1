# VELMERE MASTER BUILD MAP — PASS358

## Scope advanced in PASS358
- Browser-grade search logic moved into Lens/Shield/Shield Map ranking.
- Exact/prefix ranking prevents false substring matches like ETH returning Tether only because `eth` appears inside `Tether`.
- CoinGecko suggestion sorting now prioritizes exact symbol, exact id/name, prefix, word-prefix, and only then longer substring matches.
- Shield search uses the same scoring contract to reduce laggy/noisy suggestions.
- Shield Map suggestions now render token logo/avatar instead of plain glyph only.
- Exchange logo resolver strengthened for Binance, MEXC, Coinbase, Kraken, Bybit and OKX.
- Search dropdowns moved to stronger top-layer styling so they do not hide under cards/footers/reader panels.

## Concrete blocker repairs
1. VLM Browser ETH search noise: fixed by exact/prefix scoring.
2. Shield search noisy/laggy suggestion list: local result ranking reduced broad includes and returns fewer high-quality hits.
3. Shield Map missing token icons: added `ShieldMapSuggestionAvatar` + CoinGecko logo map.
4. Exchange logos missing: added exchange fallback badges with `data-pass358-exchange-logo-resolver`.
5. Lens dropdown too far from input: CSS and class adjusted to sit close under the input row.
6. Search panel clipping: stronger z-index/overflow visible rules for Lens, Shield and Shield Map.

## Next likely steps
- PASS359 should continue with a shared `market-logo-resolver` module instead of duplicated maps.
- Add provider-backed real stock/ETF/commodity logos once the provider lane is chosen.
- Continue Orbit 360 scroll leak checks.
- Continue PDF preview data density and no-clipping pass.
