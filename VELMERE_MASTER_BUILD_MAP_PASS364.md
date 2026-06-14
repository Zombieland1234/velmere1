# VELMÈRE MASTER BUILD MAP — PASS364

## PASS364 — Real Markets logo depth + Shield Browser search portal

### Done
- Real Markets asset identity now supports remote logo surfaces with premium badge fallback.
- Real Markets modal hard-portaled above the whole site and body scroll is locked while the chart modal is open.
- Basic / Pro / Advanced buttons now have active state, so this can evolve into real mode switching without UI confusion.
- Advanced chart has explicit PASS364 OHLC / MA / volume guard marker.
- Shield main search suggestions are now rendered through a body portal instead of an inline panel clipped/lagged by the sticky search dock.
- Shield search closes on page scroll to avoid the “dropdown follows me” bug.
- Real Markets keeps the Shield-style table, split tabs and no public text wall.

### Still next
- Replace preview prices with provider-backed live data by class: equities, FX, ETFs, commodities, real estate proxies and exchange health.
- Move Real Markets chart data from deterministic preview candles to provider adapters.
- Unify exact/prefix ranking as one shared module for Browser, Shield, Shield Map and Real Markets.
- Add official local SVG/logo packs for providers where remote logo loading is blocked.
- Turn Basic / Pro / Advanced buttons into separate panel states with different data density.

### Guard
- verify:pass364-real-markets-shield-search
