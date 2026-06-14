# Velmère PASS163 — Source Spine Readiness + Live Feed Roadmap

## Scope
PASS163 adds a visible source-spine/readiness panel inside the token modal so the operator can instantly see which data layers are live, partial, fallback, missing, or blocked.

## Implemented
- Token modal source spine panel.
- Live/partial/fallback/missing/blocked lane styling.
- Localized PL/DE/EN labels for the source panel.
- Source readiness count: layers ready / total layers.
- Guard script for source-spine UI tokens.

## Source lanes tracked
1. Market data / price / volume
2. Candles / OHLCV
3. Orderbook / spread / depth
4. Holders / holder concentration
5. Contract address / chain
6. OSINT / fresh research

## Remaining production work
- Attach real holder adapter.
- Attach real contract analyzer.
- Attach persistent OSINT source ledger.
- Store evidence snapshots with timestamps.
- Add admin/operator audit write path.
- Add source freshness warnings per lane.
