# Velmère Shield — Pass 42

## What changed
- simplified the main Shield landing experience
- removed the heavy hero copy and stacked dashboard blocks from the primary market-integrity page
- kept a clean top search bar
- added an icon-only shield shortcut on the right that links to the Shield explanation page
- kept the coin table as the main visible content below the search
- added quick star-toggle watchlist actions directly inside the table rows
- fixed crypto token icons by routing external icon URLs through the local `/api/market-integrity/icon` proxy
- applied the same icon proxy fix inside the token modal
- improved chart fallback logic in the modal:
  - candlestick mode is now the default
  - if live klines return too little data, the modal falls back to sparkline/chart-derived points instead of leaving an empty-looking chart area
  - if chart endpoint data is too sparse, fallback data is used automatically

## Main files touched
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`

## UX result
- page starts with a minimal search experience
- the right-side shield control is now visually clean and compact
- the lower section is focused on the market table only
- token icons should no longer disappear when remote image hosts are inconsistent
- modal chart area is more resilient against sparse or missing live data
