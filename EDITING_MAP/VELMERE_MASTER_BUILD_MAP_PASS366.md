# VELMERE MASTER BUILD MAP — PASS366

## Scope
- Runtime blocker on Real Markets modal: `timeframe` undefined in advanced candles.
- VLM Browser PDF modal: background page scroll must be disabled while forge/A4 preview is open.

## Changes
- `CrossAssetCollapseRadarPanel.tsx`: `AdvancedMarketCandles` now receives `timeframe` explicitly, passes it into generated candles, and recalculates on timeframe changes.
- `VelmereIntelligenceSearchClient.tsx`: PDF forge and A4 preview now apply hard document scroll lock: html overflow hidden, body fixed, scroll restored on close.
- Added guard `verify:pass366-runtime-scroll-lock`.

## Remaining next pass
- Real Markets original brand logos should move from favicon fallback into curated resolver for Microsoft, Nvidia, Apple, Binance, MEXC, etc.
- Real Markets chart visuals still need deeper parity with Shield candle chart.
- Main Shield search can be further unified with Real Markets/Browser component extraction.
