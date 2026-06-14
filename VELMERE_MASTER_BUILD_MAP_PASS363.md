# VELMÈRE MASTER BUILD MAP — PASS363

## PASS363 scope
Real Markets and Shield Map focused repair after user screenshots.

### Fixed / advanced
- Real Markets search no longer filters the table live while typing; it opens Browser-style ranked suggestions.
- Real Markets suggestions search across all asset classes: stocks, FX, ETFs, commodities, real estate proxies and exchanges.
- Selecting a suggestion switches category and opens the chart-first modal.
- Real Markets rows expanded beyond the small starter set:
  - Stocks: AAPL, NVDA, LVMH/MC.PA, MSFT, COIN, JPM, GOOGL, AMZN, META, TSLA, AMD, AVGO, ASML, TSM, SAP, ORCL, PLTR, NFLX, V, MA, NKE.
  - FX: EUR/USD, EUR/PLN, USD/PLN, USD/JPY, GBP/USD, AUD/USD, USD/CHF, CHF/PLN, GBP/PLN, EUR/JPY, EUR/CHF, DXY.
  - ETF: SPY, QQQ, VNQ, GLD, VOO, VTI, DIA, IWM, TLT, HYG, SLV, USO.
  - Commodities: XAU/USD, XAG/USD, WTI, BRENT, NATGAS, COPPER, PLATINUM, WHEAT, CORN.
  - Real estate: VNQ, XLRE, IYR, RWO, VNQI, XHB, ITB, HOMZ.
  - Exchanges: Binance, MEXC, Coinbase, Kraken, Bybit, OKX.
- Replaced invisible/remote-only logo dependency with deterministic premium badge icons per asset.
- Real Markets modal is portaled to body and sits above header.
- Modal copy is trimmed: no paragraph under Risk / Second / Focus / Proof.
- Chart upgraded from simple candle preview into Shield-style advanced chart surface with OHLC toolbar, MA overlays, grid, volume and axis labels.
- Shield Map suggestion portal no longer floats through the page while scrolling; page scroll closes the dropdown, internal dropdown scroll remains allowed.

### Known remaining work
- Real Markets modal chart is still deterministic preview data until provider adapters are wired.
- Real Markets search should later share one extracted reusable search component with Velmère Browser and Shield.
- Shield main search still needs a direct migration to the Browser ranking/panel component.
- Logos can later be upgraded from deterministic badges to verified provider images once stable remote/provider cache exists.
- Basic / Pro / Advanced modes currently open as UI states/actions; next pass should wire mode-specific content panes.

### PASS363 verification
- verify:pass363-real-markets-deepening ✅
- verify:pass362-real-markets-shield-table ✅
- verify:pass361-modal-header-shieldmap-portal ✅
- verify:pass360-browser-pdf-modal-confidence ✅
- verify:pass359-browser-init-search-pdf-trim ✅
- check:i18n ✅
- vercel:preflight ✅

Typecheck/build not run because export package has no node_modules.
